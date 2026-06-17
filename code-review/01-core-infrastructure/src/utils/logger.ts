import chalk from "chalk";

export interface Logger {
  info(msg: string): void;
  verbose(msg: string): void;
  error(msg: string): void;
  warn(msg: string): void;
  success(msg: string): void;
}

export function createLogger(options: { verbose: boolean }): Logger {
  return {
    info(msg: string): void {
      process.stdout.write(msg + "\n");
    },
    verbose(msg: string): void {
      if (options.verbose) {
        process.stdout.write(chalk.dim(msg) + "\n");
      }
    },
    error(msg: string): void {
      process.stderr.write(chalk.red(msg) + "\n");
    },
    warn(msg: string): void {
      process.stderr.write(chalk.yellow(msg) + "\n");
    },
    success(msg: string): void {
      process.stdout.write(chalk.green(msg) + "\n");
    },
  };
}
