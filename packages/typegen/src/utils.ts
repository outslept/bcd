import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { FeatureLevel } from "./types";
import type { Config } from "./index";
import type { Identifier } from "@mdn/browser-compat-data";

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputPath(
  fileName: string,
  config: Config,
  category?: string,
): string {
  if (category) {
    const categoryDir = resolve(config.outputDir, category);
    ensureDir(categoryDir);
    return resolve(categoryDir, fileName);
  }
  return resolve(config.outputDir, fileName);
}

export function getFeatureCategories(allTopLevelKeys: string[]): string[] {
  return allTopLevelKeys.filter(
    (key) => key !== "__meta" && key !== "browsers",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isIdentifier(value: unknown): value is Identifier {
  if (!isRecord(value)) return false;
  if ("support" in value) return false;
  if ("name" in value && "releases" in value) return false;
  if ("version" in value && "timestamp" in value) return false;
  return true;
}

export function analyzeFeatureStructure(
  data: Identifier,
  category: string,
  path: string[] = [],
): FeatureLevel[] {
  const levels: FeatureLevel[] = [];

  const hasCompat = "__compat" in data;

  if (hasCompat || path.length > 0) {
    const currentLevel: FeatureLevel = {
      category,
      subcategory: path[0],
      feature: path[1] || path[0] || "",
      subfeature: path[2],
      path: [...path],
      hasCompat,
    };
    levels.push(currentLevel);
  }

  Object.entries(data).forEach(([key, value]) => {
    if (key !== "__compat" && isIdentifier(value)) {
      const childLevels = analyzeFeatureStructure(
        value as Identifier,
        category,
        [...path, key],
      );
      levels.push(...childLevels);
    }
  });

  return levels;
}

export function isSpecialApiPattern(path: string[]): string | null {
  const feature = path.at(-1);

  if (!feature) return null;
  if (feature.endsWith("_event")) return "event";
  if (feature.endsWith("_permission")) return "permission";
  if (feature.endsWith("_static")) return "static";

  const specialSubfeatures = [
    "worker_support",
    "secure_context_required",
    "returns_promise",
    "toString",
  ];

  if (specialSubfeatures.includes(feature)) return "subfeature";

  return null;
}

export function extractDataByPath(
  data: Identifier,
  path: string[],
): Identifier | null {
  let current = data;

  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = current[segment];
    } else {
      return null;
    }
  }

  return isIdentifier(current) ? current : null;
}

export function groupByLevel(structure: FeatureLevel[]) {
  const subcategories: Record<string, FeatureLevel[]> = {};
  const features: Record<string, FeatureLevel[]> = {};
  const subfeatures: Record<string, FeatureLevel[]> = {};

  structure.forEach((level) => {
    if (level.subcategory && level.path.length === 1) {
      if (!subcategories[level.subcategory]) {
        subcategories[level.subcategory] = [];
      }
      subcategories[level.subcategory].push(level);
    }

    if (level.path.length === 2) {
      const featurePath = level.path.join("/");
      if (!features[featurePath]) {
        features[featurePath] = [];
      }
      features[featurePath].push(level);
    }

    if (level.path.length === 3) {
      const subfeaturePath = level.path.join("/");
      if (!subfeatures[subfeaturePath]) {
        subfeatures[subfeaturePath] = [];
      }
      subfeatures[subfeaturePath].push(level);
    }
  });

  return { subcategories, features, subfeatures };
}
