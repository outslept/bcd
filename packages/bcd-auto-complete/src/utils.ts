import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ValidationError } from "./types";

export function log(
  message: string,
  level: "info" | "warn" | "error" = "info",
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case "warn":
      console.warn(`${prefix} ${message}`);
      break;
    case "error":
      console.error(`${prefix} ${message}`);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(`${prefix} ${message}`);
  }
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputPath(
  fileName: string,
  config: { outputDir: string },
): string {
  return resolve(config.outputDir, fileName);
}

export function getFeatureCategories(allTopLevelKeys: string[]): string[] {
  return allTopLevelKeys.filter(
    (key) => key !== "__meta" && key !== "browsers",
  );
}

export function createValidationError(
  message: string,
  path: string,
  value?: unknown,
  code?: string,
): ValidationError {
  const error: ValidationError = { path, message };
  if (value !== undefined) error.value = value;
  if (code !== undefined) error.code = code;
  return error;
}
