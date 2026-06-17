import type { Logger } from "../utils/logger.js";

export interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}

export interface StageResult<T> {
  agentName: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  attempts: number;
}

export interface PipelineResult<T> {
  output: T;
  stages: StageResult<unknown>[];
  totalDuration: number;
}

export interface PipelineOptions {
  maxRetries?: number;
  logger?: Logger;
}
