import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { AuthError, GitHubAPIError } from "../utils/errors.js";
import type { Logger } from "../utils/logger.js";

const ThrottledOctokit = Octokit.plugin(throttling, retry);

export function resolveGitHubToken(config: { githubToken?: string }, logger: Logger): string {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  try {
    const result = execSync("gh auth token", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });
    const token = result.toString().trim();
    if (token) return token;
  } catch {
    // gh not installed or not authenticated — fall through
  }

  if (config.githubToken) {
    logger.warn("Using token from config file — storing tokens in config files is a security risk");
    return config.githubToken;
  }

  throw new AuthError("No GitHub authentication found");
}

export class GitHubClient {
  private octokit: InstanceType<typeof ThrottledOctokit>;
  private logger: Logger;

  constructor(options: { token: string; logger: Logger }) {
    this.logger = options.logger;
    this.octokit = new ThrottledOctokit({
      auth: options.token,
      throttle: {
        onRateLimit: (retryAfter: number, opts: Record<string, unknown>) => {
          const request = opts.request as { retryCount?: number } | undefined;
          this.logger.warn(`Rate limited, retrying after ${retryAfter}s`);
          return (request?.retryCount ?? 0) < 2;
        },
        onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>) => {
          const request = opts.request as { retryCount?: number } | undefined;
          this.logger.warn(`Secondary rate limit, retrying after ${retryAfter}s`);
          return (request?.retryCount ?? 0) < 2;
        },
      },
    });
  }

  async getPR(owner: string, repo: string, number: number): Promise<{
    title: string;
    description: string | null;
    author: string;
    state: string;
    baseBranch: string;
    headBranch: string;
  }> {
    this.logger.verbose(`GitHub API: getPR(${owner}/${repo}#${number})`);
    try {
      const { data } = await this.octokit.rest.pulls.get({ owner, repo, pull_number: number });
      return {
        title: data.title,
        description: data.body ?? null,
        author: data.user?.login ?? "unknown",
        state: data.state,
        baseBranch: data.base.ref,
        headBranch: data.head.ref,
      };
    } catch (e) {
      throw new GitHubAPIError(`getPR(${owner}/${repo}#${number}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async getPRFiles(owner: string, repo: string, number: number): Promise<Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string | null;
  }>> {
    this.logger.verbose(`GitHub API: getPRFiles(${owner}/${repo}#${number})`);
    try {
      const files = await this.octokit.paginate(this.octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: number,
        per_page: 100,
      });
      return files.map((f: Record<string, unknown>) => ({
        path: f.filename as string,
        status: f.status as string,
        additions: f.additions as number,
        deletions: f.deletions as number,
        patch: f.patch as string | null | undefined,
      }));
    } catch (e) {
      throw new GitHubAPIError(`getPRFiles(${owner}/${repo}#${number}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async getPRDiff(owner: string, repo: string, number: number): Promise<string> {
    this.logger.verbose(`GitHub API: getPRDiff(${owner}/${repo}#${number})`);
    try {
      const response = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: number,
        mediaType: { format: "diff" },
      });
      return response.data as unknown as string;
    } catch (e) {
      throw new GitHubAPIError(`getPRDiff(${owner}/${repo}#${number}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async postPRComment(owner: string, repo: string, number: number, body: string): Promise<void> {
    this.logger.verbose(`GitHub API: postPRComment(${owner}/${repo}#${number})`);
    try {
      await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: number,
        body,
      });
    } catch (e) {
      throw new GitHubAPIError(`postPRComment(${owner}/${repo}#${number}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async getRepoTree(owner: string, repo: string, branch?: string): Promise<string[]> {
    this.logger.verbose(`GitHub API: getRepoTree(${owner}/${repo}@${branch ?? "HEAD"})`);
    try {
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch ?? "HEAD",
        recursive: "true",
      });
      const paths = response.data.tree
        .filter((item: { type?: string }) => item.type === "blob")
        .map((item: { path?: string }) => item.path as string);

      if (response.data.truncated) {
        this.logger.warn(
          `Repository tree is truncated (${paths.length} files returned). Results may be incomplete for large repositories.`,
        );
      }

      return paths;
    } catch (e) {
      throw new GitHubAPIError(`getRepoTree(${owner}/${repo}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }
}
