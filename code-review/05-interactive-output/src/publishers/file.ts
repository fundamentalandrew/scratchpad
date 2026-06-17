import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Logger } from "@core/utils/logger.js";

export async function publishMarkdownFile(
  content: string,
  filePath: string,
  logger: Logger,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  logger.info(`Report written to ${filePath}`);
}
