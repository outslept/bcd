import type { Project, SourceFile } from 'ts-morph';

export function generateUtilsFile(project: Project): SourceFile {
  const sourceFile = project.createSourceFile('bcd-utils.ts', '', {
    overwrite: true,
  });

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  sourceFile.addImportDeclaration({
    namedImports: ['BCDPath', 'BCDCategory', 'FeatureSupport'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  });

  sourceFile.addImportDeclaration({
    namedImports: ['BCD'],
    moduleSpecifier: './bcd-proxy',
  });

  sourceFile.addImportDeclaration({
    namedImports: ['BrowserName', 'CompatStatement'],
    moduleSpecifier: '@mdn/browser-compat-data',
    isTypeOnly: true,
  });

  sourceFile.addFunction({
    name: 'getFeatureSupport',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'FeatureSupport[]',
    statements: [
      'const support = BCD.getSupportMap(path);',
      'if (!support) return [];',
      '',
      'const result: FeatureSupport[] = [];',
      '',
      'for (const browser of Object.keys(support)) {',
      '  const browserSupport = support[browser as BrowserName];',
      '  if (Array.isArray(browserSupport)) {',
      '    for (const item of browserSupport) {',
      '      result.push({',
      '        browser,',
      '        supported: !!item.version_added,',
      '        version_added: item.version_added,',
      '        version_removed: item.version_removed,',
      '        partial_implementation: item.partial_implementation,',
      '        notes: item.notes,',
      '      });',
      '    }',
      '  } else if (browserSupport) {',
      '    result.push({',
      '      browser,',
      '      supported: !!browserSupport.version_added,',
      '      version_added: browserSupport.version_added,',
      '      version_removed: browserSupport.version_removed,',
      '      partial_implementation: browserSupport.partial_implementation,',
      '      notes: browserSupport.notes,',
      '    });',
      '  }',
      '}',
      'return result;',
    ],
    isExported: true,
    docs: [
      'Gets standardized support information for a given BCD path.',
      'Normalizes the BCD support data into a consistent FeatureSupport array.',
      '@param path The BCD path to the feature.',
      '@returns An array of FeatureSupport objects, one for each browser with support data.',
    ],
  });

  sourceFile.addFunction({
    name: 'getBrowsersWithSupport',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'string[]',
    statements: [
      'const support = getFeatureSupport(path);',
      'return [...new Set(support.filter(s => s.supported).map(s => s.browser))];',
    ],
    isExported: true,
    docs: [
      'Gets a list of browser names that support a given feature.',
      '@param path The BCD path to the feature.',
      '@returns An array of browser names that support the feature.',
    ],
  });

  sourceFile.addFunction({
    name: 'getMinimumSupportedVersion',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
      {
        name: 'browser',
        type: 'BrowserName | string',
      },
    ],
    returnType: 'string | null',
    statements: [
      'const support = getFeatureSupport(path).filter(s => s.browser === browser && s.supported);',
      'if (support.length === 0) return null;',
      '',
      'const versions = support',
      "  .filter(s => typeof s.version_added === 'string')",
      '  .map(s => s.version_added as string);',
      '',
      "if (versions.length === 0) return 'true';",
      '',
      'const sortedVersions = [...versions].sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));',
      'return sortedVersions[0] || null;',
    ],
    isExported: true,
    docs: [
      'Gets the minimum browser version that supports a given feature for a specific browser.',
      '@param path The BCD path to the feature.',
      '@param browser The browser name.',
      "@returns The minimum version string, 'true' if supported in all versions, or null if not supported.",
    ],
  });

  sourceFile.addFunction({
    name: 'isFeatureDeprecated',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'boolean',
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.status?.deprecated === true;',
    ],
    isExported: true,
    docs: [
      'Checks if a feature is marked as deprecated in the BCD data.',
      '@param path The BCD path to the feature.',
      '@returns True if the feature is deprecated, false otherwise.',
    ],
  });

  sourceFile.addFunction({
    name: 'isFeatureExperimental',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'boolean',
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.status?.experimental === true;',
    ],
    isExported: true,
    docs: [
      'Checks if a feature is marked as experimental in the BCD data.',
      '@param path The BCD path to the feature.',
      '@returns True if the feature is experimental, false otherwise.',
    ],
  });

  sourceFile.addFunction({
    name: 'getFeatureDescription',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'string | null',
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.description ?? null;',
    ],
    isExported: true,
    docs: [
      'Gets the description of a feature from the BCD data.',
      '@param path The BCD path to the feature.',
      '@returns The feature description string, or null if not found.',
    ],
  });

  sourceFile.addFunction({
    name: 'getFeatureUrl',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'string | null',
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.mdn_url ?? null;',
    ],
    isExported: true,
    docs: [
      'Gets the MDN documentation URL for a feature from the BCD data.',
      '@param path The BCD path to the feature.',
      '@returns The MDN URL string, or null if not found.',
    ],
  });

  sourceFile.addFunction({
    name: 'getFeatureSpecUrl',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'string | string[] | null',
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.spec_url || null;',
    ],
    isExported: true,
    docs: [
      'Gets the specification URL(s) for a feature from the BCD data.',
      'Can return a single URL string or an array of URL strings.',
      '@param path The BCD path to the feature.',
      '@returns The specification URL(s), or null if not found.',
    ],
  });

  sourceFile.addFunction({
    name: 'getCompatibilityTable',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'Record<string, string | boolean | null>',
    statements: [
      'const browsers = BCD.getAllBrowsers();',
      'const result: Record<string, string | boolean | null> = {};',
      '',
      'for (const browser of browsers) {',
      '  result[browser] = getMinimumSupportedVersion(path, browser);',
      '}',
      'return result;',
    ],
    isExported: true,
    docs: [
      'Generates a compatibility table for a feature, showing support for all browsers.',
      '@param path The BCD path to the feature.',
      '@returns A record where keys are browser names and values are their minimum supported versions or null.',
    ],
  });

  sourceFile.addFunction({
    name: 'getAllPaths',
    parameters: [
      {
        name: 'obj',
        type: 'any',
      },
      {
        name: 'prefix',
        type: 'string',
        initializer: "''",
      },
    ],
    returnType: 'string[]',
    statements: [
      'const result: string[] = [];',
      'if (prefix) {',
      '  result.push(prefix);',
      '}',
      "if (obj && typeof obj === 'object') {",
      "  if ('__compat' in obj) {",
      "    result.push(prefix + '.__compat');",
      '  }',
      '  for (const key in obj) {',
      "    if (key !== '__compat' && typeof obj[key] === 'object') {",
      "      const newPrefix = prefix ? (prefix + '.' + key) : key;",
      '      result.push(...getAllPaths(obj[key], newPrefix));',
      '    }',
      '  }',
      '}',
      'return result;',
    ],
    docs: [
      'Helper function to recursively collect all paths within a BCD category object.',
      'Used by findFeaturesByPattern to traverse and gather paths.',
      '@param obj The BCD category object to traverse.',
      '@param prefix Path prefix for recursion (initially category name).',
      '@returns An array of BCD paths within the given object.',
      '@private',
    ],
  });

  sourceFile.addFunction({
    name: 'findFeaturesByPattern',
    parameters: [
      {
        name: 'pattern',
        type: 'string | RegExp',
      },
    ],
    returnType: 'BCDPath[]',
    statements: [
      "const regexp = typeof pattern === 'string' ? new RegExp(pattern) : pattern;",
      'const allPaths: string[] = [];',
      'for (const category of BCD.getCategories()) {',
      '  const categoryData = BCD.raw[category as BCDCategory];',
      '  allPaths.push(...getAllPaths(categoryData, category));',
      '}',
      'return allPaths.filter(path => regexp.test(path)) as BCDPath[];',
    ],
    isExported: true,
    docs: [
      'Finds BCD paths that match a given pattern (string or RegExp).',
      'Searches through all collected BCD paths.',
      '@param pattern String or RegExp pattern to match against paths.',
      '@returns An array of BCD paths that match the pattern.',
    ],
  });

  sourceFile.addFunction({
    name: 'getPathsInCategory',
    parameters: [
      {
        name: 'category',
        type: 'BCDCategory',
      },
    ],
    returnType: 'BCDPath[]',
    statements: [
      'const categoryData = BCD.raw[category];',
      'if (!categoryData) return [];',
      'return getAllPaths(categoryData, category) as BCDPath[];',
    ],
    isExported: true,
    docs: [
      'Gets all paths under a specific category.',
      'Useful for exploring available features within a category.',
      "@param category The BCD category (e.g., 'api', 'css').",
      '@returns An array of BCD paths within the specified category.',
    ],
  });

  sourceFile.addFunction({
    name: 'getFeatureStatus',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType:
      '{ deprecated: boolean; experimental: boolean; standard_track: boolean } | null',
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.status || null;',
    ],
    isExported: true,
    docs: [
      'Gets feature status information.',
      '@param path The BCD path to the feature.',
      '@returns An object with status flags, or null if not found.',
    ],
  });

  return sourceFile;
}
