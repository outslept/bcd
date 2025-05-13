import fs from 'node:fs';
import path from 'node:path';
import { IndentationText, Project, QuoteKind, ScriptTarget, ModuleKind, NewLineKind } from 'ts-morph';
import { generateIndexFile } from './src/generators/index-generator';
import { generateBcdCategoryDataFile, generateAggregatedDataFile } from './src/generators/data-generator';
import { generateTypesFile } from './src/generators/types-generator';
import { generateUtilsFile } from './src/generators/utils-generator';
import { ensureDir, getOutputPath, log, getFeatureCategories } from './src/utils';
import bcdRaw from '@mdn/browser-compat-data';
import type { RootBCDData, PathInfo } from './src/types';

export interface Config {
  outputDir: string;
  pathSeparator: string;
  typesPath: string;
}

export const CONFIG: Config = {
  outputDir: '__generated__',
  pathSeparator: '.',
  typesPath: './types',
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
    }
  });

  for (const categoryName of featureCategories) {
    const categoryData = bcdDataSource[categoryName as keyof Omit<RootBCDData, '__meta' | 'browsers'>];
    if (categoryData) {
      try {
        generateBcdCategoryDataFile(project, categoryName, categoryData, bcdDataSource.browsers, CONFIG);
      } catch (e: any) {
        log(`Error generating data file for category ${categoryName}: ${e.message}\n${e.stack}`);
      }
    }
  }
  try {
    // project.saveSync();
    log('All data part files prepared in memory.');
  } catch (e: any) {
    log(`Error during data part file preparation: ${e.message}`);
  }

  let aggregatedDataSourceFile: import('ts-morph').SourceFile | undefined;
  try {
    aggregatedDataSourceFile = generateAggregatedDataFile(project, featureCategories, bcdDataSource, CONFIG);
  } catch (e: any) { log(`Error generating aggregated data file: ${e.message}\n${e.stack}`); }

  const pathsMapForTypes = new Map<string, PathInfo>();
  function simplePathCollector(data: any, currentPathParts: string[], depth = 0) {
    if (!data || typeof data !== 'object') return;
    for (const key in data) {
      if (!Object.hasOwn(data, key)) continue;
      const newPathParts = [...currentPathParts, key];
      const currentPath = newPathParts.join(CONFIG.pathSeparator);
      pathsMapForTypes.set(currentPath, {
        path: key,
        fullPath: currentPath,
        hasCompat: !!(data[key])?.__compat,
        childrenKeys: new Set(Object.keys(data[key] || {})),
        depth
      });
      if (key !== '__compat') {
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
    typesSourceFile = generateTypesFile(project, pathsMapForTypes, featureCategories, CONFIG);
  } catch (e: any) { log(`Error generating types file: ${e.message}\n${e.stack}`); }
  try {
    utilsSourceFile = generateUtilsFile(project, CONFIG);
  } catch (e: any) { log(`Error generating utils file: ${e.message}\n${e.stack}`); }
  try {
    indexSourceFile = generateIndexFile(project);
  } catch (e: any) { log(`Error generating index file: ${e.message}\n${e.stack}`); }


  const baseTypesFileCopiedPath = getOutputPath('types.ts', CONFIG);
  const baseTypesSourcePath = path.resolve(__dirname, './src/types.ts');
  log(`Copying ${baseTypesSourcePath} to ${baseTypesFileCopiedPath}...`);
  try {
    let baseTypesContent = fs.readFileSync(baseTypesSourcePath, 'utf-8');
    baseTypesContent = baseTypesContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    baseTypesContent = baseTypesContent.replace(/^\s*[\r\n]/gm, '');
    fs.writeFileSync(baseTypesFileCopiedPath, baseTypesContent);
  } catch (e: any) {
    log(`Error copying/processing types.ts: ${e.message}`);
  }


  const filesToSave = [
    { filePath: getOutputPath('bcd-types.ts', CONFIG), sourceFile: typesSourceFile },
    { filePath: getOutputPath('bcd-data.ts', CONFIG), sourceFile: aggregatedDataSourceFile },
    { filePath: getOutputPath('bcd-utils.ts', CONFIG), sourceFile: utilsSourceFile },
    { filePath: getOutputPath('index.ts', CONFIG), sourceFile: indexSourceFile },
  ];

  for (const { filePath, sourceFile } of filesToSave) {
    if (sourceFile) {
      log(`Writing ${filePath}...`);
      // sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
      // fs.writeFileSync(filePath, sourceFile.getFullText());
    } else {
      log(`Skipping write for ${filePath} as source file was not generated or generation failed.`);
    }
  }
  project.saveSync();
  log('All generated files saved.');


  return {
    typesFile: filesToSave.find(f => f.filePath.endsWith('bcd-types.ts') && f.sourceFile)?.filePath ?? '',
    dataFile: filesToSave.find(f => f.filePath.endsWith('bcd-data.ts') && f.sourceFile)?.filePath ?? '',
    utilsFile: filesToSave.find(f => f.filePath.endsWith('bcd-utils.ts') && f.sourceFile)?.filePath ?? '',
    indexFile: filesToSave.find(f => f.filePath.endsWith('index.ts') && f.sourceFile)?.filePath ?? '',
    baseTypesFileCopied: baseTypesFileCopiedPath,
  };
}

function main(): void {
  log('Starting BCD types generation (using @mdn/browser-compat-data)...');
  log(`Output directory: ${CONFIG.outputDir}`);
  ensureDir(CONFIG.outputDir);
  const overallStartTime = Date.now();

  const bcdDataSource = bcdRaw as RootBCDData;
  const featureCategories = getFeatureCategories(Object.keys(bcdDataSource));

  const generationStartTime = Date.now();
  const files = generateAllFiles(featureCategories, bcdDataSource);
  const generationTime = Date.now() - generationStartTime;
  log(`File generation took ${generationTime}ms`);

  log('Generation completed successfully!');
  const generatedFileList = [
    files.typesFile,
    files.dataFile,
    files.utilsFile,
    files.indexFile,
    files.baseTypesFileCopied,
  ].filter(Boolean).map(f => `  - ${path.relative(process.cwd(), f)}`).join('\n');
  log(`Generated files:\n${generatedFileList}\n`);
  log(`Total time: ${Date.now() - overallStartTime}ms`);
}

if (require.main === module) {
  main();
}
