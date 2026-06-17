export interface IssueReference {
  owner?: string;
  repo?: string;
  number: number;
}

/**
 * Extracts GitHub closing-reference issue numbers from a PR description.
 * Only matches references preceded by closing keywords (fixes, closes, resolves, etc.).
 * Ignores references inside code blocks.
 */
export function parseClosingReferences(body: string): IssueReference[] {
  if (!body) return [];

  // Strip fenced code blocks, then inline code
  const stripped = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  const results: IssueReference[] = [];
  const seen = new Set<string>();

  const keywordPattern =
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*[:(\s]/gi;

  // Reference patterns — compiled once outside the loop
  const urlRefAnchored =
    /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/;
  const crossRepoRefAnchored = /^([\w.-]+)\/([\w.-]+)#(\d+)/;
  const sameRepoRefAnchored = /^#(\d+)/;

  let keywordMatch: RegExpExecArray | null;
  while ((keywordMatch = keywordPattern.exec(stripped)) !== null) {
    // Extract the rest of the string after the keyword
    let rest = stripped.slice(keywordMatch.index + keywordMatch[0].length);

    // Parse first reference and any comma-separated follow-ups
    let continueScanning = true;
    while (continueScanning) {
      rest = rest.replace(/^[\s,()]+/, ""); // trim leading whitespace, commas, parens

      let match: RegExpMatchArray | null;
      if ((match = rest.match(urlRefAnchored))) {
        addRef(results, seen, { owner: match[1], repo: match[2], number: parseInt(match[3], 10) });
        rest = rest.slice(match[0].length);
      } else if ((match = rest.match(crossRepoRefAnchored))) {
        addRef(results, seen, { owner: match[1], repo: match[2], number: parseInt(match[3], 10) });
        rest = rest.slice(match[0].length);
      } else if ((match = rest.match(sameRepoRefAnchored))) {
        addRef(results, seen, { number: parseInt(match[1], 10) });
        rest = rest.slice(match[0].length);
      } else {
        continueScanning = false;
      }

      // Continue only if next non-whitespace is a comma followed by a reference
      if (continueScanning && !/^\s*,/.test(rest)) {
        continueScanning = false;
      }
    }
  }

  return results;
}

function addRef(
  results: IssueReference[],
  seen: Set<string>,
  ref: IssueReference,
): void {
  const key = ref.owner ? `${ref.owner}/${ref.repo}#${ref.number}` : `#${ref.number}`;
  if (!seen.has(key)) {
    seen.add(key);
    results.push(ref);
  }
}
