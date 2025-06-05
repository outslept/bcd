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
import { ensureDir, getFeatureCategories } from "./utils";
import type { RootBCDData } from "./types";

export interface Config {
  outputDir: string;
  pathSeparator: string;
}

const CONFIG: Config = {
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
  generateIndexFile(project, CONFIG);

  await project.save();
}

function main(): void {
  ensureDir(CONFIG.outputDir);
  generateAllFiles(
    getFeatureCategories(Object.keys(bcdRaw)),
    bcdRaw as RootBCDData,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
