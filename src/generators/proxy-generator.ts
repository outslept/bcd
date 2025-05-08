import type { Project, SourceFile } from 'ts-morph'
import { Scope, VariableDeclarationKind } from 'ts-morph'
import { getAllCategories } from '../utils'

export function generateProxyFile(project: Project): SourceFile {
  const sourceFile = project.createSourceFile('bcd-proxy.ts', '', {
    overwrite: true,
  })
  const categories = getAllCategories()

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`)

  sourceFile.addImportDeclaration({
    defaultImport: 'bcdData',
    moduleSpecifier: '@mdn/browser-compat-data/forLegacyNode',
  })

  sourceFile.addImportDeclaration({
    namedImports: ['BCDDataType', 'BCDPath', 'TypedBCD', 'BCDGetter'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  })

  sourceFile.addImportDeclaration({
    namedImports: ['BrowserName', 'CompatStatement', 'SupportStatement'],
    moduleSpecifier: '@mdn/browser-compat-data',
    isTypeOnly: true,
  })

  const classDeclaration = sourceFile.addClass({
    name: 'BCDProxy',
    implements: ['BCDGetter'],
    isExported: true,
  })

  classDeclaration.addProperty({
    name: 'data',
    type: 'any',
    scope: Scope.Private,
    isReadonly: true,
  })

  classDeclaration.addConstructor({
    parameters: [
      {
        name: 'data',
        type: 'any',
      },
    ],
    statements: ['this.data = data;'],
  })

  classDeclaration.addMethod({
    name: 'compareVersions',
    parameters: [
      {
        name: 'versionA',
        type: 'string | boolean | null',
      },
      {
        name: 'versionB',
        type: 'string | boolean | null',
      },
    ],
    returnType: 'number',
    scope: Scope.Private,
    statements: [
      'const normalizeVersion = (version: string | boolean | null): string => {',
      '  if (version === null || version === false) return \'-1\';',
      '  if (version === true) return \'0\';',
      '  if (typeof version === \'string\' && version.startsWith(\'≤\')) {',
      '    return version.substring(1);',
      '  }',
      '  return version as string;',
      '};',
      '',
      'const normalizedA = normalizeVersion(versionA);',
      'const normalizedB = normalizeVersion(versionB);',
      '',
      'const numA = Number.parseFloat(normalizedA);',
      'const numB = Number.parseFloat(normalizedB);',
      '',
      'if (!Number.isNaN(numA) && !Number.isNaN(numB)) {',
      '  return numA === numB ? 0 : numA < numB ? -1 : 1;',
      '}',
      '',
      'const partsA = normalizedA.split(\'.\');',
      'const partsB = normalizedB.split(\'.\');',
      '',
      'const maxLength = Math.max(partsA.length, partsB.length);',
      '',
      'for (let i = 0; i < maxLength; i++) {',
      '  const partA = i < partsA.length ? Number.parseInt(partsA[i], 10) : 0;',
      '  const partB = i < partsB.length ? Number.parseInt(partsB[i], 10) : 0;',
      '',
      '  if (partA === partB) continue;',
      '  return partA < partB ? -1 : 1;',
      '}',
      '',
      'return 0;',
    ],
  })

  classDeclaration.addMethod({
    name: 'get',
    typeParameters: [
      {
        name: 'P',
        constraint: 'BCDPath',
      },
    ],
    parameters: [
      {
        name: 'path',
        type: 'P',
      },
    ],
    returnType: 'BCDDataType<P>',
    scope: Scope.Public,
    statements: ['return this.resolvePath(path);'],
  })

  classDeclaration.addMethod({
    name: 'resolvePath',
    parameters: [
      {
        name: 'path',
        type: 'string',
      },
    ],
    returnType: 'any',
    scope: Scope.Private,
    statements: [
      'const parts = path.split(\'.\');',
      'let current = this.data;',
      '',
      'for (const part of parts) {',
      '  if (current && typeof current === \'object\' && part in current) {',
      '    current = current[part];',
      '  } else {',
      '    return undefined;',
      '  }',
      '}',
      'return current;',
    ],
  })

  classDeclaration.addMethod({
    name: 'isSupported',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
      {
        name: 'browser',
        type: 'BrowserName | string',
      },
      {
        name: 'version',
        type: 'string',
      },
    ],
    returnType: 'boolean',
    scope: Scope.Public,
    statements: [
      'const compatPath = path.endsWith(\'.__compat\') ? path : (path + \'.__compat\') as BCDPath;',
      'const compat = this.get(compatPath) as CompatStatement | undefined;',
      'if (!compat?.support) return false;',
      'const browserSupport = compat.support[browser as BrowserName];',
      'if (!browserSupport) return false;',
      '',
      'if (Array.isArray(browserSupport)) {',
      '  return browserSupport.some(item => {',
      '    if (!item.version_added && item.version_added !== null && item.version_added !== false) return false;',
      '    if (item.version_added === true) {',
      '      if (item.version_removed) {',
      '        if (item.version_removed === true) return false;',
      '        return this.compareVersions(version, item.version_removed) < 0;',
      '      }',
      '      return true;',
      '    }',
      '',
      '    const isAddedSupported = this.compareVersions(version, item.version_added) >= 0;',
      '',
      '    if (isAddedSupported && item.version_removed) {',
      '      return this.compareVersions(version, item.version_removed) < 0;',
      '    }',
      '',
      '    return isAddedSupported;',
      '  });',
      '}',
      '',
      'if (!browserSupport.version_added && browserSupport.version_added !== null && browserSupport.version_added !== false) return false;',
      'if (browserSupport.version_added === true) {',
      '  if (browserSupport.version_removed) {',
      '    if (browserSupport.version_removed === true) return false;',
      '    return this.compareVersions(version, browserSupport.version_removed) < 0;',
      '  }',
      '  return true;',
      '}',
      '',
      'const isAddedSupported = this.compareVersions(version, browserSupport.version_added) >= 0;',
      '',
      'if (isAddedSupported && browserSupport.version_removed) {',
      '  return this.compareVersions(version, browserSupport.version_removed) < 0;',
      '}',
      '',
      'return isAddedSupported;',
    ],
  })

  classDeclaration.addMethod({
    name: 'getSupportMap',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'Record<string, SupportStatement | SupportStatement[]> | undefined',
    scope: Scope.Public,
    statements: [
      'const compatPath = path.endsWith(\'.__compat\') ? path : (path + \'.__compat\') as BCDPath;',
      'const compat = this.get(compatPath) as CompatStatement | undefined;',
      'if (!compat?.support) return undefined;',
      'return compat.support as Record<string, SupportStatement | SupportStatement[]>;',
    ],
  })

  classDeclaration.addMethod({
    name: 'getAllBrowsers',
    returnType: 'string[]',
    scope: Scope.Public,
    statements: ['return Object.keys(bcdData.browsers || {});'],
  })

  classDeclaration.addMethod({
    name: 'getCategories',
    returnType: 'string[]',
    scope: Scope.Public,
    statements: [`return ${JSON.stringify(categories)};`],
  })

  classDeclaration.addGetAccessor({
    name: 'raw',
    returnType: 'typeof bcdData',
    statements: ['return this.data;'],
  })

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'BCD',
        type: 'BCDGetter & TypedBCD',
        initializer: 'new BCDProxy(bcdData) as any',
      },
    ],
    isExported: true,
  })

  return sourceFile
}
