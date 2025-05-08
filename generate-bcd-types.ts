import type { GeneratedFiles, PathInfo } from './src/types';
import fs from 'node:fs';
import { IndentationText, Project, QuoteKind, ScriptTarget, ModuleKind } from 'ts-morph';
import { generateIndexFile } from './src/generators/index-generator';
import { generatePathsFile } from './src/generators/paths-generator';
import { generateProxyFile } from './src/generators/proxy-generator';
import { generateTypesFile } from './src/generators/types-generator';
import { generateUtilsFile } from './src/generators/utils-generator';
import { collectPaths } from './src/path-collector';
import { ensureDir, getOutputPath, log } from './src/utils';

export interface Config {
  outputDir: string;
  maxDepth: number;
  pathSeparator: string;
  excludePaths: string[];
}

export const CONFIG: Config = {
  outputDir: '__generated__',
  maxDepth: Infinity,
  pathSeparator: '.',
  excludePaths: [],
};

export function generateFiles(pathsMap: Map<string, PathInfo>, rootCategories: string[]): GeneratedFiles {
  ensureDir(CONFIG.outputDir);

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      newLineKind: 1,
      quoteKind: QuoteKind.Single,
    },
    compilerOptions: {
        target: ScriptTarget.ESNext,
        module: ModuleKind.CommonJS,
        declaration: false,
        sourceMap: false,
        skipLibCheck: true,
        strict: true,
    }
  });

  const typesSource = generateTypesFile(project, pathsMap, rootCategories, CONFIG);
  const proxySource = generateProxyFile(project, rootCategories, CONFIG);
  const pathsSource = generatePathsFile(project, pathsMap, CONFIG);
  const utilsSource = generateUtilsFile(project);
  const indexSource = generateIndexFile(project);

  const typesFile = getOutputPath('bcd-types.ts');
  const proxyFile = getOutputPath('bcd-proxy.ts');
  const constantsFile = getOutputPath('bcd-paths.ts');
  const utilsFile = getOutputPath('bcd-utils.ts');
  const indexFile = getOutputPath('index.ts');

  log(`Writing ${typesFile}...`);
  fs.writeFileSync(typesFile, typesSource.getFullText());
  log(`Created: ${typesFile}`);

  log(`Writing ${proxyFile}...`);
  fs.writeFileSync(proxyFile, proxySource.getFullText());
  log(`Created: ${proxyFile}`);

  log(`Writing ${constantsFile}...`);
  fs.writeFileSync(constantsFile, pathsSource.getFullText());
  log(`Created: ${constantsFile}`);

  log(`Writing ${utilsFile}...`);
  fs.writeFileSync(utilsFile, utilsSource.getFullText());
  log(`Created: ${utilsFile}`);

  log(`Writing ${indexFile}...`);
  fs.writeFileSync(indexFile, indexSource.getFullText());
  log(`Created: ${indexFile}`);

  return {
    typesFile,
    proxyFile,
    constantsFile,
    utilsFile,
    indexFile,
  };
}

function main(): void {
  log('Starting BCD types generation (using @mdn/browser-compat-data)...');
  log(`Output directory: ${CONFIG.outputDir}`);
  log(`Max depth: ${CONFIG.maxDepth === Infinity ? 'Unlimited' : CONFIG.maxDepth}`);

  ensureDir(CONFIG.outputDir);

  const startTime = Date.now();
  const { pathsMap, categories: rootCategories } = collectPaths(CONFIG);
  const collectionTime = Date.now() - startTime;
  log(`Path collection took ${collectionTime}ms`);

  const generationStartTime = Date.now();
  const files = generateFiles(pathsMap, rootCategories);
  const generationTime = Date.now() - generationStartTime;
  log(`File generation took ${generationTime}ms`);

  log('Generation completed successfully!');
  log(
    `Generated files:\n  - ${files.typesFile}\n  - ${files.proxyFile}\n  - ${files.constantsFile}\n  - ${files.utilsFile}\n  - ${files.indexFile}\n`,
  );
  log(`Total time: ${Date.now() - startTime}ms`);
}

if (require.main === module) {
  main();
}
