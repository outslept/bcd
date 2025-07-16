import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { isRecord } from "./internal";
import type { Config } from "./index";
import type { Identifier } from "@mdn/browser-compat-data";

export function getOutputPath(
  fileName: string,
  config: Config,
  category?: string,
): string {
  if (category) {
    const categoryDir = resolve(config.outputDir, category);
    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }
    return resolve(categoryDir, fileName);
  }
  return resolve(config.outputDir, fileName);
}

export function isIdentifier(value: unknown): value is Identifier {
  if (!isRecord(value)) return false;
  if ("support" in value) return false;
  if ("name" in value && "releases" in value) return false;
  if ("version" in value && "timestamp" in value) return false;
  return true;
}
