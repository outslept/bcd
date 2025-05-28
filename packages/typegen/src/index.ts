import process from "node:process";
import { fileURLToPath } from "node:url";
import bcdRaw, {
  type Identifier,
} from "@mdn/browser-compat-data/forLegacyNode";
import {
  IndentationText,
  ModuleKind,
  NewLineKind,
  Project,
  QuoteKind,
  ScriptTarget,
} from "ts-morph";
import {
  generateAggregatedDataFile,
  generateBcdCategoryDataFile,
} from "./generators/data-generator";
import { generateIndexFile } from "./generators/index-generator";
import { generateTypesFile } from "./generators/types-generator";
import { ensureDir, getFeatureCategories, log } from "./utils";
import type { PathInfo, RootBCDData } from "./types";

export interface Config {
  outputDir: string;
  pathSeparator: string;
}

export const CONFIG: Config = {
  outputDir: "generated",
  pathSeparator: ".",
} as const;

function setupProject(): Project {
  return new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      newLineKind: NewLineKind.LineFeed,
      quoteKind: QuoteKind.Single,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
    },
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      declaration: true,
      sourceMap: true,
      skipLibCheck: true,
      strict: true,
      removeComments: true,
      esModuleInterop: true,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasCompatProperty(value: unknown): boolean {
  return isRecord(value) && "__compat" in value;
}

function collectPaths(
  data: Record<string, unknown>,
  currentPathParts: string[],
  depth: number,
  pathsMap: Map<string, PathInfo>,
  pathSeparator: string,
): void {
  if (!isRecord(data)) return;

  Object.entries(data).forEach(([key, value]) => {
    const newPathParts = [...currentPathParts, key];
    const currentPath = newPathParts.join(pathSeparator);

    pathsMap.set(currentPath, {
      path: key,
      fullPath: currentPath,
      hasCompat: hasCompatProperty(value),
      depth,
    });

    if (key !== "__compat" && isRecord(value) && !("support" in value)) {
      collectPaths(value, newPathParts, depth + 1, pathsMap, pathSeparator);
    }
  });
}

function isIdentifier(value: unknown): value is Identifier {
  if (!isRecord(value)) return false;

  if ("support" in value) return false;

  if ("name" in value && "releases" in value) return false;

  if ("version" in value && "timestamp" in value) return false;

  return true;
}

export async function generateAllFiles(
  featureCategories: string[],
  bcdDataSource: RootBCDData,
): Promise<void> {
  const project = setupProject();
  const pathsMapForTypes = new Map<string, PathInfo>();

  featureCategories.forEach((categoryName) => {
    const categoryData = bcdDataSource[categoryName as keyof RootBCDData];
    if (isIdentifier(categoryData)) {
      generateBcdCategoryDataFile(
        project,
        categoryName,
        categoryData,
        bcdDataSource.browsers,
        CONFIG,
      );
    }
  });

  generateAggregatedDataFile(project, featureCategories, bcdDataSource, CONFIG);

  featureCategories.forEach((category) => {
    const categoryData = bcdDataSource[category as keyof RootBCDData];
    if (
      isIdentifier(categoryData) &&
      !("browsers" in categoryData) &&
      !("__meta" in categoryData)
    ) {
      collectPaths(
        categoryData,
        [category],
        0,
        pathsMapForTypes,
        CONFIG.pathSeparator,
      );
    }
  });

  generateTypesFile(project, pathsMapForTypes, featureCategories, CONFIG);
  generateIndexFile(project, CONFIG);

  await project.save();
}

function main(): void {
  ensureDir(CONFIG.outputDir);
  const featureCategories = getFeatureCategories(Object.keys(bcdRaw));

  generateAllFiles(featureCategories, bcdRaw as RootBCDData)
    .then(() => log("Generation completed successfully!"))
    .catch((error) => {
      log(`Generation failed: ${error.message}`);
      process.exit(1);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
