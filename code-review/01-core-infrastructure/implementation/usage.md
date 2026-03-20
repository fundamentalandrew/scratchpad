# Usage Guide

## Quick Start

### Installation

```bash
cd 01-core-infrastructure
npm install
npm run build
```

### Commands

**Review a Pull Request:**
```bash
npx code-review review-pr https://github.com/owner/repo/pull/42
```

**Review a Repository:**
```bash
npx code-review review-repo https://github.com/owner/repo
```

**Initialize Config Files:**
```bash
npx code-review init
```

### Global Options

- `--verbose` — Enable verbose output (shows API calls, timing info)
- `--config <path>` — Path to a custom `.codereview.json` config file

### Environment Variables

- `ANTHROPIC_API_KEY` — Required. Your Anthropic API key for Claude.
- `GITHUB_TOKEN` — Required. GitHub token for API access. Also supports `gh auth token` if GitHub CLI is installed.

## Configuration

Create a `.codereview.json` in your project root:

```json
{
  "criticalThreshold": 8,
  "model": "claude-sonnet-4-5-20250514",
  "maxRetries": 3,
  "ignorePatterns": ["node_modules/**", "dist/**"],
  "output": {
    "console": true,
    "markdown": false,
    "githubComment": false
  }
}
```

Config values merge in priority order: defaults < file < env vars < CLI flags.

## Example Output

```
Running StubContextAgent...
Running StubAnalysisAgent...
Running StubReviewAgent...
Running StubOutputAgent...
Pipeline completed in 402ms
{
  "recommendations": [
    {
      "file": "src/index.ts",
      "line": 5,
      "severity": "medium",
      "category": "maintainability",
      "message": "Consider adding error handling",
      "suggestion": "Wrap in try/catch block"
    }
  ],
  "coreDecision": "Approve with minor suggestions",
  "focusAreas": ["Error handling in entry point"]
}
```

> Note: The current implementation uses stub agents. Real Claude-powered agents will replace stubs in future work.

## API Reference

### Pipeline

- `runPipeline<T>(agents, initialInput, options?)` — Run a sequence of agents, passing output from each as input to the next. Returns `PipelineResult<T>` with output, stage results, and timing.

### Agents (Stubs)

- `createStubContextAgent(logger?)` — Stub that returns sample PR context
- `createStubAnalysisAgent(logger?)` — Stub that returns file scores and risk analysis
- `createStubReviewAgent(logger?)` — Stub that returns code review recommendations
- `createStubOutputAgent(logger?)` — Stub that passes through review output

### Config

- `loadConfig(options?)` — Load and merge config from file, env vars, and CLI flags
- `discoverConfigFile(startDir)` — Walk up directory tree to find `.codereview.json`

### Clients

- `ClaudeClient` — Wrapped Anthropic SDK client with structured JSON output and token tracking
- `GitHubClient` — Wrapped Octokit client with throttling, retry, and pagination
- `resolveGitHubToken(config, logger)` — Resolve GitHub token from env, gh CLI, or config

### CLI Entry Point

- `createProgram()` — Create the Commander.js program (exported for testing)

## Running Tests

```bash
npm test           # Run all tests once
npm run test:watch # Watch mode
```

131 tests across 16 test files covering all modules.
