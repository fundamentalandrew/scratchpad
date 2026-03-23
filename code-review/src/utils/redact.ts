const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]+/g,
  /ghp_[A-Za-z0-9]+/g,
  /gho_[A-Za-z0-9]+/g,
  /ghs_[A-Za-z0-9]+/g,
  /github_pat_[A-Za-z0-9_]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/g,
  /Authorization:\s*\S+/g,
];

export function redactSecrets(text: string): string {
  if (text == null) return "";

  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED]");
  }
  return result;
}
