import type { GitHubClient } from "../clients/github.js";
import type { TechStack } from "../agents/schemas.js";
import type { Logger } from "../utils/logger.js";

const FRAMEWORK_MAP: Record<string, string> = {
  react: "React",
  vue: "Vue",
  express: "Express",
  next: "Next.js",
  "@angular/core": "Angular",
  svelte: "Svelte",
  fastify: "Fastify",
  nestjs: "NestJS",
  "@nestjs/core": "NestJS",
};

const PYTHON_FRAMEWORK_MAP: Record<string, string> = {
  flask: "Flask",
  django: "Django",
  fastapi: "FastAPI",
};

const MANIFEST_LANGUAGES: Record<string, string> = {
  "package.json": "JavaScript",
  "go.mod": "Go",
  "requirements.txt": "Python",
  "pyproject.toml": "Python",
  "setup.py": "Python",
  "Cargo.toml": "Rust",
  "pom.xml": "Java",
  "build.gradle": "Java",
  "Gemfile": "Ruby",
};

function isRootLevel(path: string): boolean {
  return !path.includes("/");
}

function parsePackageJson(
  content: string,
  languages: Set<string>,
  frameworks: Set<string>,
  dependencies: Record<string, string>,
): void {
  const pkg = JSON.parse(content);
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  for (const [name, version] of Object.entries(deps)) {
    dependencies[name] = version as string;
  }
  for (const [name, version] of Object.entries(devDeps)) {
    dependencies[name] = version as string;
  }

  languages.add("JavaScript");
  if (devDeps.typescript) {
    languages.add("TypeScript");
  }

  for (const name of [...Object.keys(deps), ...Object.keys(devDeps)]) {
    if (FRAMEWORK_MAP[name]) {
      frameworks.add(FRAMEWORK_MAP[name]);
    }
  }
}

function parseGoMod(
  content: string,
  dependencies: Record<string, string>,
): void {
  const requireBlockRe = /require\s*\(([\s\S]*?)\)/g;
  let match;
  while ((match = requireBlockRe.exec(content)) !== null) {
    const block = match[1];
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        dependencies[parts[0]] = parts[1];
      }
    }
  }

  const singleRequireRe = /^require\s+(\S+)\s+(\S+)/gm;
  while ((match = singleRequireRe.exec(content)) !== null) {
    dependencies[match[1]] = match[2];
  }
}

function parseRequirementsTxt(
  content: string,
  frameworks: Set<string>,
  dependencies: Record<string, string>,
): void {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;

    const splitMatch = trimmed.match(/^([a-zA-Z0-9_.-]+(?:\[[^\]]*\])?)\s*([=!<>~]=?\s*.*)?$/);
    if (!splitMatch) continue;

    const name = splitMatch[1].replace(/\[.*\]/, "");
    const versionPart = splitMatch[2]?.trim();
    let version = "*";
    if (versionPart) {
      version = versionPart.replace(/^[=!<>~]{1,2}\s*/, "");
    }
    dependencies[name] = version;

    const lower = name.toLowerCase();
    if (PYTHON_FRAMEWORK_MAP[lower]) {
      frameworks.add(PYTHON_FRAMEWORK_MAP[lower]);
    }
  }
}

function parseCargoToml(
  content: string,
  dependencies: Record<string, string>,
): void {
  const lines = content.split("\n");
  let inDeps = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inDeps = trimmed === "[dependencies]";
      continue;
    }
    if (!inDeps || !trimmed || trimmed.startsWith("#")) continue;

    const simpleMatch = trimmed.match(/^(\S+)\s*=\s*"([^"]+)"/);
    if (simpleMatch) {
      dependencies[simpleMatch[1]] = simpleMatch[2];
      continue;
    }
    const tableMatch = trimmed.match(/^(\S+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
    if (tableMatch) {
      dependencies[tableMatch[1]] = tableMatch[2];
    }
  }
}

export async function detectTechStack(options: {
  github: GitHubClient;
  owner: string;
  repo: string;
  ref?: string;
  filePaths: string[];
  logger?: Logger;
}): Promise<TechStack> {
  const { github, owner, repo, ref, filePaths, logger } = options;

  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const dependencies: Record<string, string> = {};

  const rootManifests = filePaths.filter(
    (p) => isRootLevel(p) && MANIFEST_LANGUAGES[p] !== undefined,
  );

  for (const manifest of rootManifests) {
    const content = await github.getFileContent(owner, repo, manifest, ref);
    if (content === null) continue;

    const language = MANIFEST_LANGUAGES[manifest];
    languages.add(language);

    try {
      switch (manifest) {
        case "package.json":
          parsePackageJson(content, languages, frameworks, dependencies);
          break;
        case "go.mod":
          parseGoMod(content, dependencies);
          break;
        case "requirements.txt":
          parseRequirementsTxt(content, frameworks, dependencies);
          break;
        case "Cargo.toml":
          parseCargoToml(content, dependencies);
          break;
        // Other manifests: just detect language presence
      }
    } catch (e) {
      logger?.warn(`Failed to parse ${manifest}: ${(e as Error).message}`);
    }
  }

  return {
    languages: [...languages],
    frameworks: [...frameworks],
    dependencies,
  };
}
