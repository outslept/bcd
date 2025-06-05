import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Config } from "./index";

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputPath(fileName: string, config: Config): string {
  return resolve(config.outputDir, fileName);
}

export function getFeatureCategories(allTopLevelKeys: string[]): string[] {
  return allTopLevelKeys.filter(
    (key) => key !== "__meta" && key !== "browsers",
  );
}
