import fs from "node:fs";
import path from "node:path";
import { configSchema, partialConfigSchema, defaultConfig } from "./schema.js";
import type { CodeReviewConfig } from "./schema.js";
import { ConfigError } from "../utils/errors.js";

const CONFIG_FILENAME = ".codereview.json";

export function discoverConfigFile(startDir: string): string | null {
  let current = path.resolve(startDir);

  for (;;) {
    const configPath = path.join(current, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    const gitDir = path.join(current, ".git");
    if (fs.existsSync(gitDir)) {
      return null; // reached git root without finding config
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null; // filesystem root
    }
    current = parent;
  }
}

export function loadConfig(options?: {
  configPath?: string;
  cliFlags?: Partial<CodeReviewConfig>;
  startDir?: string;
}): CodeReviewConfig {
  let fileConfig: Record<string, unknown> = {};

  // Step 1: Discovery or direct load
  if (options?.configPath) {
    if (!fs.existsSync(options.configPath)) {
      throw new ConfigError(`Config file not found: ${options.configPath}`);
    }
    const raw = fs.readFileSync(options.configPath, "utf-8");
    try {
      fileConfig = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new ConfigError(`Invalid JSON in config file: ${options.configPath}`);
    }
  } else {
    const discovered = discoverConfigFile(options?.startDir ?? process.cwd());
    if (discovered) {
      const raw = fs.readFileSync(discovered, "utf-8");
      try {
        fileConfig = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new ConfigError(`Invalid JSON in config file: ${discovered}`);
      }
    }
  }

  // Step 2: Validate file config against partial schema
  const partialResult = partialConfigSchema.safeParse(fileConfig);
  if (!partialResult.success) {
    const issues = partialResult.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`Invalid config values:\n${issues}`);
  }

  // Step 3: Merge in priority order: defaults < file < env < CLI flags
  const envOverrides: Record<string, unknown> = {};
  if (process.env.ANTHROPIC_API_KEY) {
    envOverrides.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (process.env.GITHUB_TOKEN) {
    envOverrides.githubToken = process.env.GITHUB_TOKEN;
  }

  const merged = {
    ...defaultConfig,
    ...partialResult.data,
    ...envOverrides,
    ...(options?.cliFlags ?? {}),
    output: {
      ...defaultConfig.output,
      ...(partialResult.data.output ?? {}),
      ...(options?.cliFlags?.output ?? {}),
    },
  };

  // Step 4: Validate final merged config
  const finalResult = configSchema.safeParse(merged);
  if (!finalResult.success) {
    const issues = finalResult.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`Invalid final config:\n${issues}`);
  }

  return finalResult.data;
}
