import type { Agent } from "@core/pipeline/types.js";
import type { ContextOutput } from "@core/agents/schemas.js";
import type { GitHubClient } from "@core/clients/github.js";
import type { CodeReviewConfig } from "@core/config/schema.js";
import type { Logger } from "@core/utils/logger.js";
import { filterFiles } from "@core/utils/file-filter.js";
import { parseClosingReferences } from "@core/utils/issue-parser.js";
import { loadDomainRules } from "@core/context/domain-rules.js";
import { detectTechStack } from "@core/context/tech-stack.js";

export interface ContextAgentInput {
  mode: "pr" | "repo";
  owner: string;
  repo: string;
  number?: number;
  config: CodeReviewConfig;
}

export function createContextAgent(options: {
  github: GitHubClient;
  logger?: Logger;
}): Agent<ContextAgentInput, ContextOutput> {
  const { github, logger } = options;

  return {
    name: "ContextAgent",
    idempotent: true,

    async run(input: ContextAgentInput): Promise<ContextOutput> {
      const { mode, owner, repo, config } = input;

      if (!owner) {
        logger?.error("Validation failed: owner is required");
        throw new Error("owner is required");
      }
      if (!repo) {
        logger?.error("Validation failed: repo is required");
        throw new Error("repo is required");
      }

      if (mode === "pr") {
        return runPRMode({ github, logger, owner, repo, number: input.number, config });
      }

      if (mode === "repo") {
        return runRepoMode({ github, logger, owner, repo, config });
      }

      throw new Error(`Unknown mode: ${mode as string}`);
    },
  };
}

async function runPRMode(params: {
  github: GitHubClient;
  logger?: Logger;
  owner: string;
  repo: string;
  number: number | undefined;
  config: CodeReviewConfig;
}): Promise<ContextOutput> {
  const { github, logger, owner, repo, number, config } = params;

  if (number === undefined) {
    throw new Error("PR number is required for pr mode");
  }

  // Step 1: Fetch PR metadata (sequential — provides SHAs for subsequent calls)
  logger?.verbose(`Fetching PR #${number} metadata...`);
  const prMeta = await github.getPR(owner, repo, number);

  // Step 2: Parallel fetch of files, diff, issues, comments, domain rules
  logger?.verbose("Fetching PR files, diff, issues, comments, and domain rules in parallel...");
  const [rawFiles, diff, issues, comments, domainResult] = await Promise.all([
    github.getPRFiles(owner, repo, number),
    github.getPRDiff(owner, repo, number),
    fetchReferencedIssues(github, owner, repo, prMeta.description),
    github.getReviewComments(owner, repo, number),
    loadDomainRules({ github, owner, repo, ref: prMeta.baseSha, config, logger }),
  ]);

  // Apply file filtering
  const filteredFiles = filterFiles(rawFiles, config.ignorePatterns, (f) => f.path);

  // Map to output format
  const files = filteredFiles.map((f) => ({
    path: f.path,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch ?? null,
    ...(f.previousPath ? { previousPath: f.previousPath } : {}),
  }));

  return {
    mode: "pr",
    repository: { owner, repo, defaultBranch: prMeta.baseBranch },
    pr: {
      number,
      title: prMeta.title,
      description: prMeta.description ?? "",
      author: prMeta.author,
      baseBranch: prMeta.baseBranch,
      headBranch: prMeta.headBranch,
      files,
      diff,
    },
    referencedIssues: issues,
    comments,
    domainRules: domainResult.domainRules,
    architectureDoc: domainResult.architectureDoc,
  };
}

async function runRepoMode(params: {
  github: GitHubClient;
  logger?: Logger;
  owner: string;
  repo: string;
  config: CodeReviewConfig;
}): Promise<ContextOutput> {
  const { github, logger, owner, repo, config } = params;

  // Step 1: Fetch file tree
  logger?.verbose(`Fetching repository file tree for ${owner}/${repo}...`);
  const filePaths = await github.getRepoTree(owner, repo);

  // Step 2: Filter files
  const filtered = filterFiles(filePaths, config.ignorePatterns, (p) => p);

  // Step 3: Parallel fetch of tech stack and domain rules
  logger?.verbose("Detecting tech stack and loading domain rules in parallel...");
  const [techStack, domainResult] = await Promise.all([
    detectTechStack({ github, owner, repo, filePaths: filtered, logger }),
    loadDomainRules({ github, owner, repo, config, logger }),
  ]);

  return {
    mode: "repo",
    repository: { owner, repo, defaultBranch: "main" },
    repoFiles: filtered.map((p) => ({ path: p })),
    domainRules: domainResult.domainRules,
    architectureDoc: domainResult.architectureDoc,
    techStack,
  };
}

async function fetchReferencedIssues(
  github: GitHubClient,
  owner: string,
  repo: string,
  description: string | null,
): Promise<Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }>> {
  const refs = parseClosingReferences(description ?? "");
  if (refs.length === 0) return [];

  const sameRepoNumbers = refs.filter((r) => !r.owner).map((r) => r.number);
  const crossRepoRefs = refs
    .filter((r) => r.owner && r.repo)
    .map((r) => ({ owner: r.owner!, repo: r.repo!, number: r.number }));

  return github.getReferencedIssues(owner, repo, sameRepoNumbers, crossRepoRefs);
}
