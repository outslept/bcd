import type { CodeBlockWriter, Project, SourceFile } from 'ts-morph';
import type { PathInfo } from '../types';
import type { Config } from '../../generate-bcd-types';
import { log } from '../utils';

function quotePropertyName(name: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) && name !== '__compat' && name !== '__meta') {
        return name;
    }
    return `'${name.replace(/'/g, "\\'")}'`;
}

export function generateTypesFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
  rootCategories: string[],
  config: Config
): SourceFile {
  log('Starting generation of bcd-types.ts...');
  const sourceFile = project.createSourceFile('bcd-types.ts', '', {
    overwrite: true,
  });
  const allPaths = Array.from(pathsMap.keys()).sort((a, b) => a.localeCompare(b));

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  log('Adding standard BCD type imports for bcd-types.ts...');
  sourceFile.addImportDeclaration({
    namedImports: [
      'BrowserName', 'CompatStatement', 'SupportStatement',
      'SimpleSupportStatement', 'FlagStatement', 'StatusBlock', 'VersionValue',
    ],
    moduleSpecifier: '@mdn/browser-compat-data',
    isTypeOnly: true,
  });

  log(`Generating BCDPath type alias with ${allPaths.length} paths...`);
  const startTimeBCDPath = Date.now();
  sourceFile.addTypeAlias({
    name: 'BCDPath',
    type: allPaths.length > 0 ? allPaths.map(p => `'${p.replace(/'/g, "\\'")}'`).join('\n  | ') : 'never',
    isExported: true,
  });
  log(`BCDPath generation took ${Date.now() - startTimeBCDPath}ms`);

  log('Generating BCDCategory type alias...');
  sourceFile.addTypeAlias({
    name: 'BCDCategory',
    type: rootCategories.length > 0 ? rootCategories.map(c => `'${c}'`).join(' | ') : 'never',
    isExported: true,
  });

  log('Generating Root interface...');
  const startTimeRoot = Date.now();
  const rootInterface = sourceFile.addInterface({
    name: 'Root',
    isExported: true,
  });

  function buildNestedPropertiesForInterface(
    targetInterface: { addProperty: (prop: { name: string; type: string | ((writer: CodeBlockWriter) => void); hasQuestionToken?: boolean; }) => void },
    parentPathInfo: PathInfo,
    currentPathMap: Map<string, PathInfo>,
    isRootLevelProperty: boolean
  ) {
    if (parentPathInfo.hasCompat) {
      targetInterface.addProperty({
        name: quotePropertyName('__compat'),
        type: 'CompatStatement',
      });
    }

    const sortedChildren = [...parentPathInfo.children].sort((a,b) => a.localeCompare(b));

    sortedChildren.forEach(childKey => {
      const childFullPath = `${parentPathInfo.path ? parentPathInfo.path + config.pathSeparator : ''}${childKey}`;
      const childInfo = currentPathMap.get(childFullPath);
      const propertyName = quotePropertyName(childKey);

      const isOptional = !isRootLevelProperty ||
                         (isRootLevelProperty && !rootCategories.includes(childKey) && childKey !== '__meta' && childKey !== 'browsers');

      if (childInfo && (childInfo.children.length > 0 || childInfo.hasCompat)) {
        targetInterface.addProperty({
          name: propertyName,
          type: writer => {
            writer.block(() => {
              buildNestedPropertiesForInterface(
                { addProperty: (prop: any) => {
                    const qToken = prop.hasQuestionToken ? '?' : '';
                    if (typeof prop.type === 'function') {
                        writer.write(`${prop.name}${qToken}: `);
                        prop.type(writer);
                        writer.writeLine(';');
                    } else {
                        writer.writeLine(`${prop.name}${qToken}: ${prop.type};`);
                    }
                }},
                childInfo,
                currentPathMap,
                false
              );
            });
          },
          hasQuestionToken: isOptional,
        });
      } else {
        targetInterface.addProperty({
          name: propertyName,
          type: 'any',
          hasQuestionToken: isOptional,
        });
      }
    });
  }

  const topLevelKeys = [...rootCategories];
  if (pathsMap.has('__meta') && !topLevelKeys.includes('__meta')) topLevelKeys.push('__meta');
  if (pathsMap.has('browsers') && !topLevelKeys.includes('browsers')) topLevelKeys.push('browsers');
  topLevelKeys.sort((a,b) => a.localeCompare(b));

  log(`Populating Root interface with ${topLevelKeys.length} top-level keys...`);
  topLevelKeys.forEach(key => {
    const pathInfo = pathsMap.get(key);
    if (pathInfo) {
        buildNestedPropertiesForInterface(rootInterface, pathInfo, pathsMap, true);
    } else {
        rootInterface.addProperty({ name: quotePropertyName(key), type: 'any' });
    }
  });
  log(`Root interface generation took ${Date.now() - startTimeRoot}ms`);

  sourceFile.addTypeAlias({
    name: 'TypedBCD',
    type: 'Root',
    isExported: true,
  });

  const escapedPathSeparator = config.pathSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  log('Generating BCDDataType type alias...');
  const startTimeBCDDataType = Date.now();
  sourceFile.addTypeAlias({
    name: 'BCDDataType',
    typeParameters: [
      { name: 'P', constraint: 'BCDPath' },
      { name: 'T', constraint: 'any', default: 'Root' }
    ],
    type: `P extends \`\${string}.__compat\`
      ? CompatStatement
      : P extends keyof T
      ? T[P]
      : P extends \`\${infer K1}\${infer Rest}\`
      ? K1 extends keyof T
        ? BCDDataType<Rest, T[K1]>
        : any
      : any`,
    isExported: true
  });

  log(`BCDDataType generation took ${Date.now() - startTimeBCDDataType}ms`);

  log('Adding BCDGetter, FeatureSupport, BCDPathConstant interfaces...');
  sourceFile.addInterface({
    name: 'BCDGetter',
    isExported: true,
    properties: [
      { name: 'get', type: '<P extends BCDPath>(path: P) => BCDDataType<P>' },
      { name: 'isSupported', type: '(path: BCDPath, browser: string, version: string) => boolean' },
      { name: 'getSupportMap', type: '(path: BCDPath) => Record<string, SupportStatement | ReadonlyArray<SupportStatement>> | undefined' },
      { name: 'getAllBrowsers', type: '() => string[]' },
      { name: 'getCategories', type: '() => BCDCategory[]' },
      { name: 'raw', type: 'Readonly<Root>' },
    ],
  });

  sourceFile.addInterface({
    name: 'FeatureSupport',
    isExported: true,
    properties: [
      { name: 'browser', type: 'string' },
      { name: 'supported', type: 'boolean' },
      { name: 'version_added', type: 'VersionValue | undefined' },
      { name: 'version_removed', type: 'VersionValue | undefined', hasQuestionToken: true },
      { name: 'prefix', type: 'string', hasQuestionToken: true },
      { name: 'alternative_name', type: 'string', hasQuestionToken: true },
      { name: 'partial_implementation', type: 'boolean', hasQuestionToken: true },
      { name: 'notes', type: 'string | string[] | undefined', hasQuestionToken: true },
      { name: 'flags', type: 'ReadonlyArray<FlagStatement> | undefined', hasQuestionToken: true },
    ],
  });

  sourceFile.addInterface({
    name: 'BCDPathConstant',
    isExported: true,
    properties: [{ name: '[key: string]', type: 'BCDPath' }],
  });

  log('Formatting bcd-types.ts...');
  sourceFile.formatText();
  log('Finished generation of bcd-types.ts.');
  return sourceFile;
}
