import fs from "node:fs";
import path from "node:path";
import type { Logger } from "../utils/logger.js";

const DOMAIN_RULES_TEMPLATE = `# Domain Rules

## Business Rules
<!-- Describe key business rules that reviewers should be aware of -->

## Naming Conventions
<!-- Document naming patterns specific to this project -->

## Review Criteria
<!-- List domain-specific things to watch for in code reviews -->
`;

const ARCHITECTURE_TEMPLATE = `# Architecture

## System Overview
<!-- High-level description of the system architecture -->

## Key Patterns
<!-- Document architectural patterns used in this project -->

## Architectural Decisions
<!-- List key decisions and their rationale -->
`;

const FILES: Array<{ name: string; template: string }> = [
  { name: "DOMAIN_RULES.md", template: DOMAIN_RULES_TEMPLATE },
  { name: "ARCHITECTURE.md", template: ARCHITECTURE_TEMPLATE },
];

export async function initProject(
  targetDir: string,
  logger: Logger,
): Promise<void> {
  for (const { name, template } of FILES) {
    const filePath = path.join(targetDir, name);
    if (fs.existsSync(filePath)) {
      logger.info(`Skipped ${name} (already exists)`);
    } else {
      fs.writeFileSync(filePath, template, "utf-8");
      logger.info(`Created ${name}`);
    }
  }
}
