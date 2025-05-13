import type { Project, SourceFile } from 'ts-morph';
import type { PathInfo } from '../types';
import type { Config } from '../../generate-bcd-types';
import { log } from '../utils';

export function generateTypesFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
  rootCategories: string[],
  config: Config
): SourceFile {
  log('Starting generation of bcd-types.ts...');

  const sourceFileName = 'bcd-types.ts';
  let sourceFile = project.getSourceFile(sf => sf.getFilePath().endsWith(sourceFileName));
  if (sourceFile) {
    project.removeSourceFile(sourceFile);
  }
  sourceFile = project.createSourceFile(sourceFileName, '', { overwrite: true });

  const allPaths = Array.from(pathsMap.keys()).sort((a, b) => a.localeCompare(b));

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  log('Adding base BCD type imports for bcd-types.ts...');
  sourceFile.addImportDeclaration({
    moduleSpecifier: config.typesPath,
    namedImports: [
      'RootBCDData',
      'CompatStatement',
      'SupportStatement',
      'FlagStatement',
      'VersionValue',
      'BrowserName',
    ],
    isTypeOnly: true,
  });
  sourceFile.addExportDeclaration({
    moduleSpecifier: config.typesPath,
    isTypeOnly: true,
  });

  log(`Generating BCDPath type alias with ${allPaths.length} paths using raw text insertion...`);
  const startTimeBCDPath = Date.now();

  const bcdPathTypeStringContent = allPaths.length > 0
    ? allPaths.map(p => `'${p.replace(/'/g, "\\'")}'`).join('\n  | ')
    : 'never';

  sourceFile.addStatements([`export type BCDPath = \n  ${bcdPathTypeStringContent};`]);

  log(`BCDPath type alias (raw text) added. Generation took ${Date.now() - startTimeBCDPath}ms`);

  log('Generating BCDCategory type alias...');
  sourceFile.addTypeAlias({
    name: 'BCDCategory',
    type: rootCategories.length > 0 ? rootCategories.map(c => `'${c}'`).join(' | ') : 'never',
    isExported: true,
  });

  sourceFile.addTypeAlias({
    name: 'Root',
    type: 'RootBCDData',
    isExported: true,
  });

  sourceFile.addTypeAlias({
    name: 'TypedBCD',
    type: 'RootBCDData',
    isExported: true,
  });

  const escapedPathSeparatorForRegex = config.pathSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  log('Generating BCDDataType type alias...');
  const startTimeBCDDataType = Date.now();
  sourceFile.addTypeAlias({
    name: 'BCDDataType',
    typeParameters: [
      { name: 'P', constraint: 'BCDPath' },
      { name: 'T', constraint: 'any', default: 'RootBCDData' }
    ],
    type: `P extends \`\${string}${config.pathSeparator}__compat\`
      ? CompatStatement
      : P extends keyof T
      ? T[P]
      : P extends \`\${infer K1}${escapedPathSeparatorForRegex}\${infer Rest}\`
      ? K1 extends keyof T
        ? BCDDataType<Rest, NonNullable<T[K1]>>
        : never
      : never`,
    isExported: true
  });
  log(`BCDDataType generation took ${Date.now() - startTimeBCDDataType}ms`);

  log('Adding BCDGetter, FeatureSupport, BCDPathConstant interfaces...');
  sourceFile.addInterface({
    name: 'BCDGetter',
    isExported: true,
    properties: [
      { name: 'get', type: '<P extends BCDPath>(path: P) => BCDDataType<P>' },
      { name: 'isSupported', type: '(path: BCDPath, browser: BrowserName, version: string) => boolean' },
      { name: 'getSupportMap', type: '(path: BCDPath) => Readonly<Record<BrowserName, SupportStatement>> | undefined' },
      { name: 'getAllBrowsers', type: '() => BrowserName[]' },
      { name: 'getCategories', type: '() => BCDCategory[]' },
    ],
    methods: [{ name: 'raw', returnType: 'Readonly<RootBCDData>' }],
  });

  sourceFile.addInterface({
    name: 'FeatureSupport',
    isExported: true,
    properties: [
      { name: 'browser', type: 'BrowserName' },
      { name: 'supported', type: 'boolean' },
      { name: 'version_added', type: 'VersionValue | undefined', hasQuestionToken: true },
      { name: 'version_removed', type: 'string | true | undefined', hasQuestionToken: true },
      { name: 'prefix', type: 'string', hasQuestionToken: true },
      { name: 'alternative_name', type: 'string', hasQuestionToken: true },
      { name: 'partial_implementation', type: 'boolean', hasQuestionToken: true },
      { name: 'notes', type: 'string | readonly string[] | undefined', hasQuestionToken: true },
      { name: 'flags', type: 'ReadonlyArray<FlagStatement> | undefined', hasQuestionToken: true },
    ],
  });

  sourceFile.addInterface({
    name: 'BCDPathConstant',
    isExported: true,
    properties: [{ name: '[key: string]', type: 'BCDPath' }],
  });

  log('Finished generation of bcd-types.ts.');
  return sourceFile;
}
