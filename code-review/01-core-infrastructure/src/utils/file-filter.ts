import picomatch from "picomatch";

/**
 * Filters out files whose paths match any of the given glob patterns.
 *
 * Patterns are split into two groups to work around a picomatch limitation:
 * - Bare globs (no `/`) like `*.lock` use `matchBase: true` so they match
 *   against the filename portion at any depth (e.g. `subdir/yarn.lock`).
 * - Path globs (contain `/`) like `dist/**` use default mode, because
 *   `matchBase: true` breaks directory-anchored patterns.
 */
export function filterFiles<T>(
  files: T[],
  patterns: string[],
  getPath: (file: T) => string,
): T[] {
  if (patterns.length === 0) {
    return files;
  }

  // Separate bare globs (no path separator) from path-based patterns.
  // Bare globs like "*.lock" need matchBase to match nested files.
  // Path globs like "dist/**" break with matchBase, so use default mode.
  const barePatterns = patterns.filter((p) => !p.includes("/"));
  const pathPatterns = patterns.filter((p) => p.includes("/"));

  const matchers: picomatch.Matcher[] = [];
  if (barePatterns.length > 0) {
    matchers.push(picomatch(barePatterns, { matchBase: true }));
  }
  if (pathPatterns.length > 0) {
    matchers.push(picomatch(pathPatterns));
  }

  return files.filter((file) => {
    const path = getPath(file);
    return !matchers.some((m) => m(path));
  });
}
