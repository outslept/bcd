import type { Project, SourceFile } from 'ts-morph';
import { Scope, VariableDeclarationKind } from 'ts-morph';
import type { Config } from '../../generate-bcd-types';
import { log } from '../utils';

export function generateProxyFile(
  project: Project,
  rootCategories: string[],
  config: Config
): SourceFile {
  log('Starting generation of bcd-proxy.ts...');
  const sourceFile = project.createSourceFile('bcd-proxy.ts', '', {
    overwrite: true,
  });

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  sourceFile.addImportDeclaration({
    defaultImport: 'bcdData',
    moduleSpecifier: '@mdn/browser-compat-data',
  });

  sourceFile.addImportDeclaration({
    namedImports: ['BCDDataType', 'BCDPath', 'TypedBCD', 'BCDGetter', 'Root'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  });

  sourceFile.addImportDeclaration({
    namedImports: ['BrowserName', 'CompatStatement', 'SupportStatement', 'SimpleSupportStatement', 'VersionValue'],
    moduleSpecifier: '@mdn/browser-compat-data/types',
    isTypeOnly: true,
  });

  const classDeclaration = sourceFile.addClass({
    name: 'BCDProxy',
    implements: ['BCDGetter'],
    isExported: true,
  });

  classDeclaration.addProperty({
    name: 'data',
    type: 'Readonly<Root>',
    scope: Scope.Private,
    isReadonly: true,
  });

  classDeclaration.addConstructor({
    parameters: [
      {
        name: 'data',
        type: 'Root',
      },
    ],
    statements: ['this.data = data;'],
  });

  classDeclaration.addMethod({
    name: 'compareVersions',
    parameters: [
      { name: 'versionA', type: 'string | boolean | null | undefined' },
      { name: 'versionB', type: 'string | boolean | null | undefined' },
    ],
    returnType: 'number',
    scope: Scope.Private,
    statements: [
      'const normalizeVersion = (version: string | boolean | null | undefined): string => {',
      '  if (version === null || version === false || version === undefined) return \'-1\';',
      '  if (version === true) return \'0\';',
      '  if (typeof version === \'string\' && version.startsWith(\'≤\')) {',
      '    return version.substring(1);',
      '  }',
      '  return version as string;',
      '};',
      'const normalizedA = normalizeVersion(versionA);',
      'const normalizedB = normalizeVersion(versionB);',
      'const numA = Number.parseFloat(normalizedA);',
      'const numB = Number.parseFloat(normalizedB);',
      'if (!Number.isNaN(numA) && !Number.isNaN(numB)) {',
      '  return numA === numB ? 0 : numA < numB ? -1 : 1;',
      '}',
      `const partsA = normalizedA.split('${config.pathSeparator}');`,
      `const partsB = normalizedB.split('${config.pathSeparator}');`,
      'const maxLength = Math.max(partsA.length, partsB.length);',
      'for (let i = 0; i < maxLength; i++) {',
      '  const partAVal = partsA[i] !== undefined ? Number.parseInt(partsA[i], 10) : 0;',
      '  const partBVal = partsB[i] !== undefined ? Number.parseInt(partsB[i], 10) : 0;',
      '  const partA = Number.isNaN(partAVal) ? 0 : partAVal;',
      '  const partB = Number.isNaN(partBVal) ? 0 : partBVal;',
      '  if (partA === partB) continue;',
      '  return partA < partB ? -1 : 1;',
      '}',
      'return 0;',
    ],
  });

  classDeclaration.addMethod({
    name: 'get',
    typeParameters: [{ name: 'P', constraint: 'BCDPath' }],
    parameters: [{ name: 'path', type: 'P' }],
    returnType: 'BCDDataType<P>',
    scope: Scope.Public,
    statements: ['return this.resolvePath(path) as BCDDataType<P>;'],
  });

  classDeclaration.addMethod({
    name: 'resolvePath',
    parameters: [{ name: 'path', type: 'string' }],
    returnType: 'any',
    scope: Scope.Private,
    statements: [
      `const parts = path.split('${config.pathSeparator}');`,
      'let current: any = this.data;',
      'for (const part of parts) {',
      '  if (current && typeof current === \'object\' && part in current) {',
      '    current = current[part];',
      '  } else {',
      '    return undefined;',
      '  }',
      '}',
      'return current;',
    ],
  });

  classDeclaration.addMethod({
    name: 'isSupported',
    parameters: [
      { name: 'path', type: 'BCDPath' },
      { name: 'browser', type: 'string' },
      { name: 'version', type: 'string' },
    ],
    returnType: 'boolean',
    scope: Scope.Public,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
      "const compat = this.get(compatPath) as CompatStatement | undefined;",
      "if (!compat || !compat.support) return false;",
      "const browserSupport = compat.support[browser as BrowserName];",
      "if (!browserSupport) return false;",
      "const supportEntries: ReadonlyArray<SimpleSupportStatement> = Array.isArray(browserSupport) ? browserSupport : [browserSupport];",
      "for (const item of supportEntries) {",
      "  if (!item) continue;",
      "  let versionAdded = item.version_added;",
      "  if (versionAdded === null || versionAdded === false || versionAdded === undefined) continue;",
      "  if (versionAdded === true) {",
      "    if (item.version_removed) {",
      "      if (item.version_removed === true) continue;",
      "      if (this.compareVersions(version, item.version_removed) >= 0) continue;",
      "    }",
      "    return true;",
      "  }",
      "  const isAdded = this.compareVersions(version, versionAdded) >= 0;",
      "  if (isAdded) {",
      "    if (item.version_removed) {",
      "      if (item.version_removed === true) continue;",
      "      if (this.compareVersions(version, item.version_removed) < 0) return true;",
      "    } else {",
      "      return true;",
      "    }",
      "  }",
      "}",
      "return false;",
    ],
  });

  classDeclaration.addMethod({
    name: 'getSupportMap',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'Record<string, SupportStatement | ReadonlyArray<SupportStatement>> | undefined',
    scope: Scope.Public,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
      "const compat = this.get(compatPath) as CompatStatement | undefined;",
      "if (!compat || !compat.support) return undefined;",
      "return compat.support as Record<string, SupportStatement | ReadonlyArray<SupportStatement>>;",
    ],
  });

  classDeclaration.addMethod({
    name: 'getAllBrowsers',
    returnType: 'string[]',
    scope: Scope.Public,
    statements: ['return Object.keys((this.data as any)?.browsers || {});'],
  });

  classDeclaration.addMethod({
    name: 'getCategories',
    returnType: 'string[]',
    scope: Scope.Public,
    statements: [`return ${JSON.stringify(rootCategories)};`],
  });

  classDeclaration.addGetAccessor({
    name: 'raw',
    returnType: 'Readonly<Root>',
    statements: ['return this.data;'],
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'BCD',
        type: 'BCDGetter & TypedBCD',
        initializer: 'new BCDProxy(bcdData as unknown as Root) as any',
      },
    ],
    isExported: true,
  });

  sourceFile.formatText();
  log('Finished generation of bcd-proxy.ts.');
  return sourceFile;
}
