export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(
      `${message}. Remediation: Set GITHUB_TOKEN env var, install gh CLI, or add githubToken to .codereview.json`,
    );
    this.name = "AuthError";
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class PipelineError extends Error {
  public readonly agentName: string;
  public readonly attempts: number;

  constructor(agentName: string, attempts: number, cause: Error) {
    super(`Agent '${agentName}' failed after ${attempts} attempt(s): ${cause.message}`, { cause });
    this.name = "PipelineError";
    this.agentName = agentName;
    this.attempts = attempts;
    Object.setPrototypeOf(this, PipelineError.prototype);
  }
}

export class GitHubAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAPIError";
    Object.setPrototypeOf(this, GitHubAPIError.prototype);
  }
}

export class ClaudeAPIError extends Error {
  public readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ClaudeAPIError";
    this.retryable = retryable;
    Object.setPrototypeOf(this, ClaudeAPIError.prototype);
  }
}

export class URLParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "URLParseError";
    Object.setPrototypeOf(this, URLParseError.prototype);
  }
}
