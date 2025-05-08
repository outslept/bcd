import type { Project, SourceFile } from 'ts-morph'
import { Scope, VariableDeclarationKind } from 'ts-morph'
import { getAllCategories } from '../lib/utils'

/**
 * Generates the BCD Proxy file that provides type-safe access to BCD data
 */
export function generateProxyFile(project: Project): SourceFile {
  const sourceFile = project.createSourceFile('bcd-proxy.ts', '', {
    overwrite: true,
  })
  const categories = getAllCategories()

  // Add generation date
  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`)

  // Imports
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

  // BCDProxy class
  const classDeclaration = sourceFile.addClass({
    name: 'BCDProxy',
    implements: ['BCDGetter'],
    isExported: true,
    docs: [
      'Proxy class for accessing Browser Compatibility Data (BCD).',
      'Provides a type-safe and convenient API to query BCD data.',
      'Implements the BCDGetter interface.',
    ],
  })

  // Private data field
  classDeclaration.addProperty({
    name: 'data',
    type: 'any',
    scope: Scope.Private,
    isReadonly: true,
    docs: ['Holds the raw BCD data (imported from @mdn/browser-compat-data)'],
  })

  // Constructor
  classDeclaration.addConstructor({
    parameters: [
      {
        name: 'data',
        type: 'any',
      },
    ],
    docs: [
      'Constructor for BCDProxy.',
      'Initializes the proxy with the BCD data.',
      '@param data The raw BCD data object.',
    ],
    statements: ['this.data = data;'],
  })

  // compareVersions method
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
    docs: [
      'Compares two version strings or version indicators.',
      '@param versionA First version to compare',
      '@param versionB Second version to compare',
      '@returns -1 if versionA < versionB, 0 if equal, 1 if versionA > versionB',
      '@private',
    ],
  })

  // get method
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
    docs: [
      'Retrieves BCD data for a given path.',
      '@param path The BCD path string (e.g., \'api.Element.querySelector\').',
      '@returns The BCD data at the specified path, or undefined if not found.',
    ],
  })

  // resolvePath method
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
    docs: [
      'Internal method to resolve a BCD path and retrieve the corresponding data.',
      '@param path The BCD path string.',
      '@returns The resolved BCD data, or undefined if path is invalid.',
      '@private',
    ],
  })

  // isSupported method
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
      '// Handle array of support statements',
      'if (Array.isArray(browserSupport)) {',
      '  // If any statement indicates support, consider it supported',
      '  return browserSupport.some(item => {',
      '    if (!item.version_added) return false;',
      '    if (item.version_added === true) {',
      '      // Check if support was removed in a later version',
      '      if (item.version_removed) {',
      '        if (item.version_removed === true) return false;',
      '        return this.compareVersions(version, item.version_removed) < 0;',
      '      }',
      '      return true;',
      '    }',
      '',
      '    // Handle version comparison with version_added',
      '    const isAddedSupported = this.compareVersions(version, item.version_added) >= 0;',
      '',
      '    // Check if support was removed in a later version',
      '    if (isAddedSupported && item.version_removed) {',
      '      return this.compareVersions(version, item.version_removed) < 0;',
      '    }',
      '',
      '    return isAddedSupported;',
      '  });',
      '}',
      '',
      '// Handle single support statement',
      'if (!browserSupport.version_added) return false;',
      'if (browserSupport.version_added === true) {',
      '  // Check if support was removed in a later version',
      '  if (browserSupport.version_removed) {',
      '    if (browserSupport.version_removed === true) return false;',
      '    return this.compareVersions(version, browserSupport.version_removed) < 0;',
      '  }',
      '  return true;',
      '}',
      '',
      '// Handle version comparison with version_added',
      'const isAddedSupported = this.compareVersions(version, browserSupport.version_added) >= 0;',
      '',
      '// Check if support was removed in a later version',
      'if (isAddedSupported && browserSupport.version_removed) {',
      '  return this.compareVersions(version, browserSupport.version_removed) < 0;',
      '}',
      '',
      'return isAddedSupported;',
    ],
    docs: [
      'Checks if a feature is supported in a specific browser and version.',
      'Handles special version formats like "≤80" (less than or equal to 80).',
      '@param path The BCD path to the feature.',
      '@param browser The browser name (e.g., \'chrome\', \'firefox\').',
      '@param version The browser version string (e.g., \'80\', \'68\').',
      '@returns True if the feature is supported, false otherwise.',
    ],
  })

  // getSupportMap method
  classDeclaration.addMethod({
    name: 'getSupportMap',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'Record<string, SupportStatement> | null',
    scope: Scope.Public,
    statements: [
      'const compatPath = path.endsWith(\'.__compat\') ? path : (path + \'.__compat\') as BCDPath;',
      'const compat = this.get(compatPath) as CompatStatement | undefined;',
      'if (!compat?.support) return null;',
      'return compat.support;',
    ],
    docs: [
      'Gets the browser support map for a given feature path.',
      '@param path The BCD path to the feature.',
      '@returns A record of browser support information, or null if not found.',
    ],
  })

  // getAllBrowsers method
  classDeclaration.addMethod({
    name: 'getAllBrowsers',
    returnType: 'string[]',
    scope: Scope.Public,
    statements: ['return Object.keys(bcdData.browsers || {});'],
    docs: [
      'Gets a list of all browser names available in the BCD data.',
      '@returns An array of browser names.',
    ],
  })

  // getCategories method
  classDeclaration.addMethod({
    name: 'getCategories',
    returnType: 'string[]',
    scope: Scope.Public,
    statements: [`return ${JSON.stringify(categories)};`],
    docs: [
      'Gets a list of all top-level categories in the BCD data.',
      '@returns An array of category names.',
    ],
  })

  // raw property accessor
  classDeclaration.addGetAccessor({
    name: 'raw',
    returnType: 'typeof bcdData',
    statements: ['return this.data;'],
    docs: [
      'Provides direct access to the raw BCD data object.',
      'Useful for advanced operations or when direct access is needed.',
    ],
  })

  // Export BCD singleton
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
    docs: [
      'Singleton instance of BCDProxy for global access to BCD data.',
      'Export this instance to use throughout your application.',
    ],
  })

  return sourceFile
}
