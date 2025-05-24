import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import bcdRaw, { type Identifier } from "@mdn/browser-compat-data";
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
} from "./src/generators/data-generator";
import { generateIndexFile } from "./src/generators/index-generator";
import { generateTypesFile } from "./src/generators/types-generator";
import { ensureDir, getFeatureCategories, log } from "./src/utils";
import { SchemaValidator } from "./src/validation/schema-validator";
import type { PathInfo, RootBCDData } from "./src/types";

const __filename = fileURLToPath(import.meta.url);
const currentDirname = dirname(__filename);

export interface Config {
  outputDir: string;
  pathSeparator: string;
  typesPath: string;
  strict: boolean;
  autoFix: boolean;
}

export const CONFIG: Config = {
  outputDir: "generated",
  pathSeparator: ".",
  typesPath: "./src/types.ts",
  strict: true,
  autoFix: true,
} as const;

interface ExtendedGeneratedFiles {
  typesFile: string;
  dataFile: string;
  indexFile: string;
  baseTypesFileCopied: string;
}

async function validateAndFixData(
  validator: SchemaValidator,
  data: RootBCDData,
  categories: string[],
): Promise<void> {
  const browserValidation = validator.validateBrowserData({
    browsers: data.browsers,
  });

  if (!browserValidation.valid) {
    if (CONFIG.autoFix && browserValidation.fixedData) {
      const fixedData = browserValidation.fixedData as {
        browsers: typeof data.browsers;
      };
      data.browsers = fixedData.browsers;
      log("Applied auto-fixed browser data");
    } else {
      browserValidation.errors.forEach((err) =>
        log(validator.formatError(err)),
      );
      throw new Error("Browser data validation failed");
    }
  }

  for (const category of categories) {
    const categoryData = data[category as keyof typeof data];
    if (!categoryData) continue;

    const validation = validator.validateCompatData({
      [category]: categoryData,
    });

    if (!validation.valid) {
      if (CONFIG.autoFix && validation.fixedData) {
        if (category in validation.fixedData) {
          const fixedCategoryData = validation.fixedData[category as keyof typeof validation.fixedData];
          (data as any)[category] = fixedCategoryData;
        }
        log(`Applied auto-fixed ${category} data`);
      } else {
        validation.errors.forEach((err) => log(validator.formatError(err)));
        throw new Error(`Validation failed for category ${category}`);
      }
    }
  }
}

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

function collectPaths(
  data: Record<string, unknown>,
  currentPathParts: string[],
  depth: number,
  pathsMap: Map<string, PathInfo>,
): void {
  if (!data || typeof data !== "object") return;

  for (const [key, value] of Object.entries(data)) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    const newPathParts = [...currentPathParts, key];
    const currentPath = newPathParts.join(CONFIG.pathSeparator);
    const valueObj = value as Record<string, unknown>;

    pathsMap.set(currentPath, {
      path: key,
      fullPath: currentPath,
      hasCompat:
        valueObj && typeof valueObj === "object" && "__compat" in valueObj,
      depth,
    });

    if (
      key !== "__compat" &&
      valueObj &&
      typeof valueObj === "object" &&
      !("support" in valueObj)
    ) {
      collectPaths(valueObj, newPathParts, depth + 1, pathsMap);
    }
  }
}

export async function generateAllFiles(
  featureCategories: string[],
  bcdDataSource: RootBCDData,
): Promise<ExtendedGeneratedFiles> {
  const validator = new SchemaValidator();
  const generatedFiles: ExtendedGeneratedFiles = {
    typesFile: "",
    dataFile: "",
    indexFile: "",
    baseTypesFileCopied: "",
  };

  try {
    log("Starting data validation...");
    await validateAndFixData(validator, bcdDataSource, featureCategories);
    log("Data validation completed");

    const project = setupProject();
    const pathsMapForTypes = new Map<string, PathInfo>();

    for (const categoryName of featureCategories) {
      const categoryData =
        bcdDataSource[categoryName as keyof typeof bcdDataSource];
      if (categoryData && typeof categoryData === "object") {
        try {
          const sourceFile = await generateBcdCategoryDataFile(
            project,
            categoryName,
            categoryData as Identifier,
            bcdDataSource.browsers,
            CONFIG,
          );
          if (sourceFile) {
            log(`Generated category file for ${categoryName}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log(
            `Error generating data file for category ${categoryName}: ${errorMessage}`,
          );
          if (CONFIG.strict) throw error;
        }
      }
    }

    try {
      const dataFile = await generateAggregatedDataFile(
        project,
        featureCategories,
        bcdDataSource,
        CONFIG,
      );
      generatedFiles.dataFile = dataFile.getFilePath();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error generating aggregated data file: ${errorMessage}`);
      if (CONFIG.strict) throw error;
    }

    for (const category of featureCategories) {
      const categoryData =
        bcdDataSource[category as keyof typeof bcdDataSource];
      if (
        categoryData &&
        typeof categoryData === "object" &&
        !("browsers" in categoryData) &&
        !("__meta" in categoryData)
      ) {
        collectPaths(
          categoryData as Record<string, unknown>,
          [category],
          0,
          pathsMapForTypes,
        );
      }
    }

    try {
      const typesFile = await generateTypesFile(
        project,
        pathsMapForTypes,
        featureCategories,
        CONFIG,
      );
      generatedFiles.typesFile = typesFile.getFilePath();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error generating types file: ${errorMessage}`);
      if (CONFIG.strict) throw error;
    }

    try {
      const indexFile = await generateIndexFile(project, CONFIG);
      generatedFiles.indexFile = indexFile.getFilePath();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error generating index file: ${errorMessage}`);
      if (CONFIG.strict) throw error;
    }

    const baseTypesFileCopiedPath = join(CONFIG.outputDir, "types.ts");
    const baseTypesSourcePath = resolve(currentDirname, CONFIG.typesPath);
    log("Copying base types file...");

    try {
      let baseTypesContent = readFileSync(baseTypesSourcePath, "utf-8");
      baseTypesContent = baseTypesContent
        .replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
        .replaceAll(/^\s*[\r\n]/gm, "");
      writeFileSync(baseTypesFileCopiedPath, baseTypesContent);
      generatedFiles.baseTypesFileCopied = baseTypesFileCopiedPath;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error copying base types file: ${errorMessage}`);
      if (CONFIG.strict) throw error;
    }

    await project.save();
    log("All files generated and saved successfully");

    return generatedFiles;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Fatal error during generation: ${errorMessage}`);
    throw error;
  }
}

function main(): void {
  log("Starting BCD types generation...");
  log(`Output directory: ${CONFIG.outputDir}`);

  const overallStartTime = Date.now();

  try {
    ensureDir(CONFIG.outputDir);
    const bcdDataSource = bcdRaw as RootBCDData;
    const featureCategories = getFeatureCategories(Object.keys(bcdDataSource));

    generateAllFiles(featureCategories, bcdDataSource)
      .then((files) => {
        const totalTime = Date.now() - overallStartTime;
        log("Generation completed successfully!");

        const generatedFileList = Object.entries(files)
          .filter(([, path]) => path)
          .map(
            ([type, path]) => `  - ${type}: ${relative(process.cwd(), path)}`,
          )
          .join("\n");

        log(`Generated files:\n${generatedFileList}`);
        log(`Total time: ${totalTime}ms`);
      })
      .catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        log("Generation failed:");
        log(errorMessage);
        if (error instanceof Error && error.stack) {
          log(error.stack);
        }
        process.exit(1);
      });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("Generation failed:");
    log(errorMessage);
    if (error instanceof Error && error.stack) {
      log(error.stack);
    }
    process.exit(1);
  }
}

const currentProcessPath = fileURLToPath(import.meta.url);
if (process.argv[1] === currentProcessPath) {
  main();
}
