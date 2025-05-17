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
      console.log(`${prefix} ${message}`);
  }
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    try {
      mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log(
        `Failed to create output directory: "${dirPath}": ${errorMessage}`,
        "error",
      );
      throw error;
    }
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

export function isValidIdentifier(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((err) => {
      let message = `${err.path}: ${err.message}`;
      if (err.value !== undefined) {
        message += `\n  Current value: ${JSON.stringify(err.value)}`;
      }
      if (err.suggestion !== undefined) {
        message += `\n  Suggestion: ${JSON.stringify(err.suggestion)}`;
      }
      return message;
    })
    .join("\n");
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }

  const result: T = Object.create(null);
  Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (result as Record<string, unknown>)[key] = deepClone(value);
    }
  });

  return result;
}

export function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => {
    return v
      .replace(/^≤/, "")
      .split(".")
      .map((x) => Number.parseInt(x, 10));
  };

  const parts1 = normalize(v1);
  const parts2 = normalize(v2);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

export function validateVersionNumber(version: string): boolean {
  if (version === "preview") return true;
  const versionPattern = /^≤?\d+(?:\.\d+)*$/;
  return versionPattern.test(version);
}

export function createValidationError(
  message: string,
  path: string,
  value?: unknown,
  code?: string,
  suggestion?: unknown,
): ValidationError {
  const error: ValidationError = {
    path,
    message,
  };

  if (value !== undefined) {
    error.value = value;
  }

  if (code !== undefined) {
    error.code = code;
  }

  if (suggestion !== undefined) {
    error.suggestion = suggestion;
  }

  return error;
}
