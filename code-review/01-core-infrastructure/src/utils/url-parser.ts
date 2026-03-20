import { URLParseError } from "./errors.js";

export { URLParseError } from "./errors.js";

const PR_FORMAT = "https://github.com/owner/repo/pull/123";
const REPO_FORMAT = "https://github.com/owner/repo";

export function parsePRUrl(input: string): { owner: string; repo: string; number: number } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new URLParseError(`Invalid PR URL. Expected format: ${PR_FORMAT}`);
  }

  if (url.hostname !== "github.com") {
    throw new URLParseError(`Not a GitHub URL. Expected format: ${PR_FORMAT}`);
  }

  const segments = url.pathname.replace(/^\/|\/$/g, "").split("/");
  if (segments.length < 4 || segments[2] !== "pull") {
    throw new URLParseError(`Invalid PR URL. Expected format: ${PR_FORMAT}`);
  }

  const num = Number(segments[3]);
  if (!Number.isInteger(num) || num <= 0) {
    throw new URLParseError(`Invalid PR URL: pull number must be a positive integer. Expected format: ${PR_FORMAT}`);
  }

  return { owner: segments[0], repo: segments[1], number: num };
}

export function parseRepoUrl(input: string): { owner: string; repo: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new URLParseError(`Invalid repository URL. Expected format: ${REPO_FORMAT}`);
  }

  if (url.hostname !== "github.com") {
    throw new URLParseError(`Not a GitHub URL. Expected format: ${REPO_FORMAT}`);
  }

  const segments = url.pathname.replace(/^\/|\/$/g, "").split("/");
  if (segments.length < 2 || !segments[0] || !segments[1]) {
    throw new URLParseError(`Invalid repository URL. Expected format: ${REPO_FORMAT}`);
  }

  return { owner: segments[0], repo: segments[1] };
}
