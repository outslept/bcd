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
}

export const CONFIG: Config = {
  outputDir: '__generated__',
  pathSeparator: '.',
};

interface ExtendedGeneratedFiles {
  typesFile: string;
  dataFile: string;
  utilsFile: string;
  indexFile: string;
  baseTypesFile: string;
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
        module: ModuleKind.CommonJS,
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
        generateBcdCategoryDataFile(project, categoryName, categoryData);
      } catch (e: any) {
        log(`Error generating data file for category ${categoryName}: ${e.message}\n${e.stack}`);
      }
    }
  }
  try {
    project.saveSync();
    log('All data part files saved.');
  } catch (e: any) {
    log(`Error saving data part files: ${e.message}`);
  }

  let aggregatedDataSource: import('ts-morph').SourceFile | undefined;
  try {
    aggregatedDataSource = generateAggregatedDataFile(project, featureCategories);
  } catch (e: any) { log(`Error generating aggregated data file: ${e.message}\n${e.stack}`); }

  const pathsMapForTypes = new Map<string, PathInfo>();
  function simplePathCollector(data: any, prefix = '', depth = 0) {
    if (!data || typeof data !== 'object') return;
    for (const key in data) {
      if (!Object.hasOwn(data, key)) continue;
      const currentPath = prefix ? `${prefix}${CONFIG.pathSeparator}${key}` : key;
      pathsMapForTypes.set(currentPath, { path: currentPath, fullPath: currentPath, hasCompat: !!(data[key])?.__compat, childrenKeys: new Set(Object.keys(data[key] || {})), depth });
      simplePathCollector(data[key], currentPath, depth + 1);
    }
  }
  simplePathCollector(bcdDataSource);


  let typesSource, utilsSource, indexSource;
  try {
    typesSource = generateTypesFile(project, pathsMapForTypes, featureCategories, CONFIG);
  } catch (e: any) { log(`Error generating types file: ${e.message}\n${e.stack}`); }
  try {
    utilsSource = generateUtilsFile(project, CONFIG);
  } catch (e: any) { log(`Error generating utils file: ${e.message}\n${e.stack}`); }
  try {
    indexSource = generateIndexFile(project);
  } catch (e: any) { log(`Error generating index file: ${e.message}\n${e.stack}`); }

  const filesToSave = [
    { filePath: getOutputPath('bcd-types.ts'), sourceFile: typesSource },
    { filePath: getOutputPath('bcd-data.ts'), sourceFile: aggregatedDataSource },
    { filePath: getOutputPath('bcd-utils.ts'), sourceFile: utilsSource },
    { filePath: getOutputPath('index.ts'), sourceFile: indexSource },
  ];

  for (const { filePath, sourceFile } of filesToSave) {
    if (sourceFile) {
      log(`Writing ${filePath}...`);
      sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
      let text = sourceFile.getFullText();
      text = text.replace(/^\s*[\r\n]/gm, '');
      fs.writeFileSync(filePath, text);
    } else {
      log(`Skipping write for ${filePath} as source file was not generated or generation failed.`);
    }
  }
  project.saveSync();

  const baseTypesFile = getOutputPath('bcd-base-types.ts');
  const baseTypesSourcePath = path.resolve(__dirname, './src/bcd-base-types.ts');
  log(`Copying ${baseTypesSourcePath} to ${baseTypesFile}...`);
  try {
    let baseTypesContent = fs.readFileSync(baseTypesSourcePath, 'utf-8');
    baseTypesContent = baseTypesContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    baseTypesContent = baseTypesContent.replace(/^\s*[\r\n]/gm, '');
    fs.writeFileSync(baseTypesFile, baseTypesContent);
  } catch (e: any) {
    log(`Error copying/processing bcd-base-types.ts: ${e.message}`);
  }

  return {
    typesFile: filesToSave.find(f => f.filePath.endsWith('bcd-types.ts') && f.sourceFile)?.filePath ?? '',
    dataFile: filesToSave.find(f => f.filePath.endsWith('bcd-data.ts') && f.sourceFile)?.filePath ?? '',
    utilsFile: filesToSave.find(f => f.filePath.endsWith('bcd-utils.ts') && f.sourceFile)?.filePath ?? '',
    indexFile: filesToSave.find(f => f.filePath.endsWith('index.ts') && f.sourceFile)?.filePath ?? '',
    baseTypesFile,
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
    files.baseTypesFile,
  ].filter(Boolean).map(f => `  - ${f}`).join('\n');
  log(`Generated files:\n${generatedFileList}\n`);
  log(`Total time: ${Date.now() - overallStartTime}ms`);
}

if (require.main === module) {
  main();
}
