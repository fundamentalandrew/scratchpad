import type { GitHubClient } from "../clients/github.js";
import type { CodeReviewConfig } from "../config/schema.js";
import type { Logger } from "../utils/logger.js";

const DOMAIN_RULES_FALLBACKS = [
  "DOMAIN_RULES.md",
  ".github/DOMAIN_RULES.md",
  "docs/DOMAIN_RULES.md",
];

const ARCHITECTURE_FALLBACKS = [
  "ARCHITECTURE.md",
  ".github/ARCHITECTURE.md",
  "docs/architecture.md",
];

function stripDotSlash(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}

async function findFile(
  github: GitHubClient,
  owner: string,
  repo: string,
  ref: string | undefined,
  configPath: string,
  fallbackPaths: string[],
): Promise<string | null> {
  const normalizedConfig = stripDotSlash(configPath);
  const content = await github.getFileContent(owner, repo, normalizedConfig, ref);
  if (content !== null) return content;

  for (const path of fallbackPaths) {
    if (path === normalizedConfig) continue;
    const result = await github.getFileContent(owner, repo, path, ref);
    if (result !== null) return result;
  }

  return null;
}

export async function loadDomainRules(options: {
  github: GitHubClient;
  owner: string;
  repo: string;
  ref?: string;
  config: CodeReviewConfig;
  logger?: Logger;
}): Promise<{ domainRules: string | null; architectureDoc: string | null }> {
  const { github, owner, repo, ref, config } = options;

  const [domainRules, architectureDoc] = await Promise.all([
    findFile(github, owner, repo, ref, config.domainRulesPath, DOMAIN_RULES_FALLBACKS),
    findFile(github, owner, repo, ref, config.architecturePath, ARCHITECTURE_FALLBACKS),
  ]);

  return { domainRules, architectureDoc };
}
