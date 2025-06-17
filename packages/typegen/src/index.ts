import process from "node:process";
import { fileURLToPath } from "node:url";
import bcdRaw from "@mdn/browser-compat-data/forLegacyNode";
import {
  IndentationText,
  ModuleKind,
  NewLineKind,
  Project,
  QuoteKind,
  ScriptTarget,
} from "ts-morph";
import { generateBrowserFiles } from "./generators/browsers-generator";
import { generateFilesByLevel } from "./generators/level-generator";
import { ensureDir, getFeatureCategories, isIdentifier } from "./utils";
import type { GenerationOptions, RootBCDData } from "./types";

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

export async function generateAllFiles(
  featureCategories: string[],
  bcdDataSource: RootBCDData,
  options: GenerationOptions = {
    byCategory: false,
    bySubcategory: true,
    byFeature: false,
    bySubfeature: false,
  },
): Promise<void> {
  const project = setupProject();

  featureCategories.forEach((categoryName) => {
    const categoryData = bcdDataSource[categoryName as keyof RootBCDData];
    if (
      isIdentifier(categoryData) &&
      (options.bySubcategory || options.byFeature || options.bySubfeature)
    ) {
      const levelFiles = generateFilesByLevel(
        project,
        categoryName,
        categoryData,
        options,
        CONFIG,
      );
      console.log(
        `Generated ${levelFiles.length} level files for ${categoryName}`,
      );
    }
  });

  const browserFiles = generateBrowserFiles(project, bcdDataSource, CONFIG);
  console.log(`Generated ${browserFiles.length} browser files`);

  await project.save();
}

function main(): void {
  ensureDir(CONFIG.outputDir);

  const options: GenerationOptions = {
    byCategory: false,
    bySubcategory: true,
    byFeature: false,
    bySubfeature: false,
  };

  generateAllFiles(
    getFeatureCategories(Object.keys(bcdRaw)),
    bcdRaw as RootBCDData,
    options,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
