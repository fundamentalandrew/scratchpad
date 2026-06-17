import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { AuthError, GitHubAPIError } from "../utils/errors.js";
import type { Logger } from "../utils/logger.js";

const ThrottledOctokit = Octokit.plugin(throttling, retry);

const SENSITIVE_EXTENSIONS = [".pem", ".key", ".p12", ".pfx"];
const SENSITIVE_NAMES = ["id_rsa", "id_ed25519", ".credentials", "credentials.json"];

function isSensitivePath(filePath: string): boolean {
  const basename = filePath.split("/").pop() ?? filePath;
  if (basename.endsWith(".env") || basename.startsWith(".env.")) return true;
  if (basename.startsWith("secrets.")) return true;
  if (SENSITIVE_NAMES.includes(basename)) return true;
  for (const ext of SENSITIVE_EXTENSIONS) {
    if (basename.endsWith(ext)) return true;
  }
  return false;
}

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
    headSha: string;
    baseSha: string;
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
        headSha: data.head.sha,
        baseSha: data.base.sha,
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
    previousPath?: string;
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
        previousPath: f.previous_filename as string | undefined,
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

  async createOrUpdatePRComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    marker: string,
  ): Promise<{ commentId: number; updated: boolean }> {
    this.logger.verbose(`GitHub API: createOrUpdatePRComment(${owner}/${repo}#${prNumber})`);
    try {
      const comments = await this.octokit.paginate(
        this.octokit.rest.issues.listComments,
        { owner, repo, issue_number: prNumber, per_page: 100 },
      );
      const existing = (comments as Array<{ id: number; body?: string | null }>).find(
        (c) => c.body?.includes(marker),
      );
      if (existing) {
        await this.octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existing.id,
          body,
        });
        return { commentId: existing.id, updated: true };
      }
      const { data } = await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      return { commentId: data.id, updated: false };
    } catch (e) {
      throw new GitHubAPIError(
        `createOrUpdatePRComment(${owner}/${repo}#${prNumber}) failed: ${(e as Error).message}`,
        { cause: e as Error },
      );
    }
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
    if (isSensitivePath(path)) {
      this.logger.warn(`Skipping sensitive file: ${path}`);
      return null;
    }
    this.logger.verbose(`GitHub API: getFileContent(${owner}/${repo}/${path}${ref ? `@${ref}` : ""})`);
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ...(ref ? { ref } : {}),
      });
      if (Array.isArray(data)) return null;
      if ((data as { type: string }).type !== "file") return null;
      const content = (data as { content: string }).content;
      return Buffer.from(content, "base64").toString("utf-8");
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw new GitHubAPIError(`getFileContent(${owner}/${repo}/${path}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async getReviewComments(owner: string, repo: string, prNumber: number): Promise<Array<{
    id: number;
    author: string;
    body: string;
    path?: string;
    line?: number;
    createdAt: string;
  }>> {
    this.logger.verbose(`GitHub API: getReviewComments(${owner}/${repo}#${prNumber})`);
    try {
      const comments = await this.octokit.paginate(this.octokit.rest.pulls.listReviewComments, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });
      return (comments as Array<Record<string, unknown>>).map((c) => ({
        id: c.id as number,
        author: (c.user as { login: string })?.login ?? "unknown",
        body: c.body as string,
        path: c.path as string | undefined,
        line: (c.original_line ?? c.line) as number | undefined,
        createdAt: c.created_at as string,
      }));
    } catch (e) {
      if ((e as { status?: number }).status === 403) {
        this.logger.warn(`Insufficient permissions to fetch review comments for ${owner}/${repo}#${prNumber}`);
        return [];
      }
      throw new GitHubAPIError(`getReviewComments(${owner}/${repo}#${prNumber}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async getReferencedIssues(
    owner: string,
    repo: string,
    issueNumbers: number[],
    crossRepoRefs?: Array<{ owner: string; repo: string; number: number }>,
  ): Promise<Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }>> {
    const tasks: Array<{ owner: string; repo: string; number: number; isCrossRepo: boolean }> = [
      ...issueNumbers.map((n) => ({ owner, repo, number: n, isCrossRepo: false })),
      ...(crossRepoRefs ?? []).map((r) => ({ owner: r.owner, repo: r.repo, number: r.number, isCrossRepo: true })),
    ];

    if (tasks.length === 0) return [];

    this.logger.verbose(`GitHub API: getReferencedIssues(${tasks.length} issues)`);

    const results = await Promise.allSettled(
      tasks.map(async (t) => {
        const { data } = await this.octokit.rest.issues.get({
          owner: t.owner,
          repo: t.repo,
          issue_number: t.number,
        });
        return {
          number: data.number as number,
          title: data.title as string,
          state: data.state as string,
          body: data.body as string | undefined,
          ...(t.isCrossRepo ? { owner: t.owner, repo: t.repo } : {}),
        };
      }),
    );

    const issues: Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }> = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        issues.push(result.value);
      } else {
        const status = (result.reason as { status?: number }).status;
        this.logger.warn(`Failed to fetch issue: ${result.reason?.message ?? "unknown error"} (status: ${status})`);
      }
    }

    return issues;
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    this.logger.verbose(`GitHub API: getDefaultBranch(${owner}/${repo})`);
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });
      return data.default_branch;
    } catch (e) {
      throw new GitHubAPIError(`getDefaultBranch(${owner}/${repo}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async getRecentCommits(owner: string, repo: string, branch?: string, count = 20): Promise<Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>> {
    this.logger.verbose(`GitHub API: getRecentCommits(${owner}/${repo}@${branch ?? "default"}, count=${count})`);
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        ...(branch ? { sha: branch } : {}),
        per_page: count,
      });
      return data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name ?? c.author?.login ?? "unknown",
        date: c.commit.author?.date ?? "",
      }));
    } catch (e) {
      throw new GitHubAPIError(`getRecentCommits(${owner}/${repo}) failed: ${(e as Error).message}`, { cause: e as Error });
    }
  }

  async compareCommits(owner: string, repo: string, base: string, head: string): Promise<{
    files: Array<{
      path: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string | null;
      previousPath?: string;
    }>;
    diff: string;
  }> {
    this.logger.verbose(`GitHub API: compareCommits(${owner}/${repo}, ${base.slice(0, 7)}...${head.slice(0, 7)})`);
    try {
      const { data } = await this.octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${base}...${head}`,
      });

      const files = (data.files ?? []).map((f) => ({
        path: f.filename,
        status: f.status ?? "modified",
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch ?? null,
        previousPath: f.previous_filename,
      }));

      // Fetch the diff format separately
      const diffResponse = await this.octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${base}...${head}`,
        mediaType: { format: "diff" },
      });

      return { files, diff: diffResponse.data as unknown as string };
    } catch (e) {
      throw new GitHubAPIError(`compareCommits(${owner}/${repo}) failed: ${(e as Error).message}`, { cause: e as Error });
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
