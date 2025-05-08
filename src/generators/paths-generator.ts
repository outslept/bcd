import type { Project, SourceFile } from 'ts-morph';
import type { PathInfo } from '../types';
import { VariableDeclarationKind } from 'ts-morph';
import { createPathKey, log, ensureDir, getOutputPath } from '../utils';
import type { Config } from '../../generate-bcd-types';
import path from 'node:path';
import fs from 'node:fs'

function getGroupKeyFromPath(bcdPath: string, config: Config): string {
  const parts = bcdPath.split(config.pathSeparator);
  return parts[0] || 'misc';
}

export function generatePathsFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
  config: Config
): SourceFile {
  log('Starting generation of bcd-paths.ts (multi-file strategy)...');

  const outputDir = getOutputPath('');
  const pathsSubDir = path.join(outputDir, 'paths');
  ensureDir(pathsSubDir);

  const allPaths = Array.from(pathsMap.keys()).sort((a, b) => a.localeCompare(b));

  const groupedPaths: Record<string, { key: string, path: string }[]> = {};
  const uniqueKeysOverall = new Map<string, string>();

  log(`Grouping ${allPaths.length} paths...`);
  for (const bcdPath of allPaths) {
    const groupKey = getGroupKeyFromPath(bcdPath, config);
    if (!groupedPaths[groupKey]) {
      groupedPaths[groupKey] = [];
    }

    let safeKey = createPathKey(bcdPath);
    if (uniqueKeysOverall.has(safeKey)) {
      let counter = 1;
      while (uniqueKeysOverall.has(`${safeKey}_${counter}`)) {
        counter++;
      }
      safeKey = `${safeKey}_${counter}`;
    }
    uniqueKeysOverall.set(safeKey, bcdPath);
    groupedPaths[groupKey].push({ key: safeKey, path: bcdPath });
  }
  log(`Grouped paths into ${Object.keys(groupedPaths).length} groups.`);

  const mainPathsFile = project.createSourceFile(getOutputPath('bcd-paths.ts'), '', { overwrite: true });
  mainPathsFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);
  mainPathsFile.addImportDeclaration({
    namedImports: ['BCDPath', 'BCDPathConstant'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  });

  const generatedPathPartFiles: string[] = [];

  for (const groupName of Object.keys(groupedPaths).sort()) {
    const groupPathConstants = groupedPaths[groupName];
    if (groupPathConstants.length === 0) continue;

    const groupFileName = `bcd-paths-${groupName.replace(/[^a-zA-Z0-9]/g, '_')}.ts`;
    const groupFilePath = path.join(pathsSubDir, groupFileName);
    generatedPathPartFiles.push(`./paths/${groupFileName.replace(/\.ts$/, '')}`);

    log(`Generating paths part file: ${groupFileName} with ${groupPathConstants.length} entries...`);
    const groupSourceFile = project.createSourceFile(groupFilePath, '', { overwrite: true });
    groupSourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);
    groupSourceFile.addImportDeclaration({
      namedImports: ['BCDPath'],
      moduleSpecifier: '../bcd-types',
      isTypeOnly: true,
    });

    const constName = `PATHS_${groupName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
    groupSourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: constName,
          initializer: writer => {
            writer.block(() => {
              groupPathConstants.forEach(({ key, path: bcdPath }) => {
                writer.writeLine(`${key}: '${bcdPath.replace(/'/g, "\\'")}' as BCDPath,`);
              });
            });
          },
        },
      ],
      isExported: true,
    });
    groupSourceFile.formatText();
    fs.writeFileSync(groupFilePath, groupSourceFile.getFullText());
    log(`Created: ${groupFilePath}`);
  }

  log('Aggregating path parts in main bcd-paths.ts...');
  const pathSpreadProperties: string[] = [];
  generatedPathPartFiles.forEach((filePath, index) => {
    const importName = `pathsPart${index}`;
    const groupNameFromFile = filePath.substring(filePath.lastIndexOf('-') + 1);
    const constNameInPartFile = `PATHS_${groupNameFromFile.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;

    mainPathsFile.addImportDeclaration({
      namespaceImport: importName,
      moduleSpecifier: filePath,
    });
    pathSpreadProperties.push(`...${importName}.${constNameInPartFile}`);
  });

  mainPathsFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'PATHS',
        type: 'BCDPathConstant',
        initializer: writer => {
          writer.write('{\n');
          pathSpreadProperties.forEach(spread => {
            writer.indent(() => writer.writeLine(`${spread},`));
          });
          writer.write('}');
        },
      },
    ],
    isExported: true,
  });

  mainPathsFile.addFunction({
    name: 'createPathKey',
    parameters: [{ name: 'path', type: 'string' }],
    returnType: 'string',
    statements: ['return path.replace(/\\./g, \'_\').replace(/-/g, \'_\').replace(/@@/g, \'at_at_\');'],
    isExported: true,
  });

  mainPathsFile.addFunction({
    name: 'getPathByKey',
    parameters: [{ name: 'key', type: 'string' }],
    returnType: 'BCDPath | undefined',
    statements: ['return PATHS[key as keyof typeof PATHS];'],
    isExported: true,
  });

  mainPathsFile.addFunction({
    name: 'getKeyByPath',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'string | undefined',
    statements: [
      'for (const [key, value] of Object.entries(PATHS)) {',
      '  if (value === path) return key;',
      '}',
      'return undefined;',
    ],
    isExported: true,
  });

  mainPathsFile.formatText();
  log('Finished generation of main bcd-paths.ts.');
  return mainPathsFile;
}
