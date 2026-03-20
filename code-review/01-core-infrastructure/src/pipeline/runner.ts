import type { Agent, PipelineOptions, PipelineResult, StageResult } from "./types.js";
import { PipelineError } from "../utils/errors.js";

export async function runPipeline<TFinal>(
  agents: Agent<any, any>[],
  initialInput: unknown,
  options?: PipelineOptions,
): Promise<PipelineResult<TFinal>> {
  const maxRetries = options?.maxRetries ?? 3;
  const logger = options?.logger;
  const pipelineStart = Date.now();
  const stages: StageResult<unknown>[] = [];
  let currentInput: unknown = initialInput;

  for (const agent of agents) {
    logger?.info(`Running ${agent.name}...`);
    const stageStart = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;
    let data: unknown;
    let success = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      attempts = attempt + 1;
      try {
        data = await agent.run(currentInput);
        success = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (!agent.idempotent) {
          throw new PipelineError(agent.name, 1, lastError);
        }

        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!success) {
      throw new PipelineError(agent.name, attempts, lastError!);
    }

    stages.push({
      agentName: agent.name,
      success: true,
      data,
      duration: Date.now() - stageStart,
      attempts,
    });

    currentInput = data;
  }

  return {
    output: currentInput as TFinal,
    stages,
    totalDuration: Date.now() - pipelineStart,
  };
}
