import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import bcdRaw from "@mdn/browser-compat-data";
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
import { generateUtilsFile } from "./src/generators/utils-generator";
import {
  ensureDir,
  getFeatureCategories,
  getOutputPath,
  log,
} from "./src/utils";
import type { PathInfo, RootBCDData } from "./src/types";

export interface Config {
  outputDir: string;
  pathSeparator: string;
  typesPath: string;
}

export const CONFIG: Config = {
  outputDir: "__generated__",
  pathSeparator: ".",
  typesPath: "./types",
};

interface ExtendedGeneratedFiles {
  typesFile: string;
  dataFile: string;
  utilsFile: string;
  indexFile: string;
  baseTypesFileCopied: string;
}

export function generateAllFiles(
  featureCategories: string[],
  bcdDataSource: RootBCDData,
): ExtendedGeneratedFiles {
  ensureDir(CONFIG.outputDir);
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      newLineKind: NewLineKind.LineFeed,
      quoteKind: QuoteKind.Single,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
    },
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.Preserve,
      declaration: true,
      sourceMap: false,
      skipLibCheck: true,
      strict: true,
      removeComments: true,
    },
  });

  for (const categoryName of featureCategories) {
    const categoryData =
      bcdDataSource[
        categoryName as keyof Omit<RootBCDData, "__meta" | "browsers">
      ];
    if (categoryData) {
      try {
        generateBcdCategoryDataFile(
          project,
          categoryName,
          categoryData,
          bcdDataSource.browsers,
          CONFIG,
        );
      } catch (error: any) {
        log(
          `Error generating data file for category ${categoryName}: ${error.message}\n${error.stack}`,
        );
      }
    }
  }
  try {
    // project.saveSync();
    log("All data part files prepared in memory.");
  } catch (error: any) {
    log(`Error during data part file preparation: ${error.message}`);
  }

  let aggregatedDataSourceFile: import("ts-morph").SourceFile | undefined;
  try {
    aggregatedDataSourceFile = generateAggregatedDataFile(
      project,
      featureCategories,
      bcdDataSource,
      CONFIG,
    );
  } catch (error: any) {
    log(
      `Error generating aggregated data file: ${error.message}\n${error.stack}`,
    );
  }

  const pathsMapForTypes = new Map<string, PathInfo>();
  function simplePathCollector(
    data: any,
    currentPathParts: string[],
    depth = 0,
  ) {
    if (!data || typeof data !== "object") return;
    for (const key in data) {
      if (!Object.hasOwn(data, key)) continue;
      const newPathParts = [...currentPathParts, key];
      const currentPath = newPathParts.join(CONFIG.pathSeparator);
      pathsMapForTypes.set(currentPath, {
        path: key,
        fullPath: currentPath,
        hasCompat: !!data[key]?.__compat,
        childrenKeys: new Set(Object.keys(data[key] || {})),
        depth,
      });
      if (key !== "__compat") {
        simplePathCollector(data[key], newPathParts, depth + 1);
      }
    }
  }

  for (const category of featureCategories) {
    const categoryData = bcdDataSource[category as keyof typeof bcdDataSource];
    if (categoryData) {
      simplePathCollector(categoryData, [category], 0);
    }
  }

  let typesSourceFile, utilsSourceFile, indexSourceFile;
  try {
    typesSourceFile = generateTypesFile(
      project,
      pathsMapForTypes,
      featureCategories,
      CONFIG,
    );
  } catch (error: any) {
    log(`Error generating types file: ${error.message}\n${error.stack}`);
  }
  try {
    utilsSourceFile = generateUtilsFile(project, CONFIG);
  } catch (error: any) {
    log(`Error generating utils file: ${error.message}\n${error.stack}`);
  }
  try {
    indexSourceFile = generateIndexFile(project, CONFIG);
  } catch (error: any) {
    log(`Error generating index file: ${error.message}\n${error.stack}`);
  }

  const baseTypesFileCopiedPath = getOutputPath("types.ts", CONFIG);
  const baseTypesSourcePath = path.resolve(__dirname, "./src/types.ts");
  log(`Copying ${baseTypesSourcePath} to ${baseTypesFileCopiedPath}...`);
  try {
    let baseTypesContent = fs.readFileSync(baseTypesSourcePath, "utf-8");
    baseTypesContent = baseTypesContent.replaceAll(
      /\/\*[\s\S]*?\*\/|\/\/.*/g,
      "",
    );
    baseTypesContent = baseTypesContent.replaceAll(/^\s*[\r\n]/gm, "");
    fs.writeFileSync(baseTypesFileCopiedPath, baseTypesContent);
  } catch (error: any) {
    log(`Error copying/processing types.ts: ${error.message}`);
  }

  const filesToSave = [
    {
      filePath: getOutputPath("bcd-types.ts", CONFIG),
      sourceFile: typesSourceFile,
    },
    {
      filePath: getOutputPath("bcd-data.ts", CONFIG),
      sourceFile: aggregatedDataSourceFile,
    },
    {
      filePath: getOutputPath("bcd-utils.ts", CONFIG),
      sourceFile: utilsSourceFile,
    },
    {
      filePath: getOutputPath("index.ts", CONFIG),
      sourceFile: indexSourceFile,
    },
  ];

  for (const { filePath, sourceFile } of filesToSave) {
    if (sourceFile) {
      log(`Writing ${filePath}...`);
      // sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
      // fs.writeFileSync(filePath, sourceFile.getFullText());
    } else {
      log(
        `Skipping write for ${filePath} as source file was not generated or generation failed.`,
      );
    }
  }
  project.saveSync();
  log("All generated files saved.");

  return {
    typesFile:
      filesToSave.find(
        (f) => f.filePath.endsWith("bcd-types.ts") && f.sourceFile,
      )?.filePath ?? "",
    dataFile:
      filesToSave.find(
        (f) => f.filePath.endsWith("bcd-data.ts") && f.sourceFile,
      )?.filePath ?? "",
    utilsFile:
      filesToSave.find(
        (f) => f.filePath.endsWith("bcd-utils.ts") && f.sourceFile,
      )?.filePath ?? "",
    indexFile:
      filesToSave.find((f) => f.filePath.endsWith("index.ts") && f.sourceFile)
        ?.filePath ?? "",
    baseTypesFileCopied: baseTypesFileCopiedPath,
  };
}

function main(): void {
  log("Starting BCD types generation (using @mdn/browser-compat-data)...");
  log(`Output directory: ${CONFIG.outputDir}`);
  ensureDir(CONFIG.outputDir);
  const overallStartTime = Date.now();

  const bcdDataSource = bcdRaw as RootBCDData;
  const featureCategories = getFeatureCategories(Object.keys(bcdDataSource));

  const generationStartTime = Date.now();
  const files = generateAllFiles(featureCategories, bcdDataSource);
  const generationTime = Date.now() - generationStartTime;
  log(`File generation took ${generationTime}ms`);

  log("Generation completed successfully!");
  const generatedFileList = [
    files.typesFile,
    files.dataFile,
    files.utilsFile,
    files.indexFile,
    files.baseTypesFileCopied,
  ]
    .filter(Boolean)
    .map((f) => `  - ${path.relative(process.cwd(), f)}`)
    .join("\n");
  log(`Generated files:\n${generatedFileList}\n`);
  log(`Total time: ${Date.now() - overallStartTime}ms`);
}

if (require.main === module) {
  main();
}
