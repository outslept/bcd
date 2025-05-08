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
    namedImports: [
      'BrowserName',
      'CompatStatement',
      'SimpleSupportStatement',
      'StatusBlock',
    ],
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
    isExported: true,
    statements: [
      'const supportMap = BCD.getSupportMap(path);',
      'if (!supportMap) return [];',
      'const result: FeatureSupport[] = [];',
      'for (const browser of Object.keys(supportMap)) {',
      '  const browserSupportItems = supportMap[browser as BrowserName];',
      '  const itemsArray: SimpleSupportStatement[] = Array.isArray(browserSupportItems) ? browserSupportItems : [browserSupportItems];',
      '  for (const item of itemsArray) {',
      '    result.push({',
      '      browser,',
      '      supported: item.version_added !== false && item.version_added !== undefined,',
      '      version_added: item.version_added === undefined ? undefined : item.version_added,',
      '      version_removed: item.version_removed === undefined ? undefined : item.version_removed,',
      '      prefix: item.prefix,',
      '      alternative_name: item.alternative_name,',
      '      partial_implementation: item.partial_implementation,',
      '      notes: item.notes,',
      '      flags: item.flags,',
      '    });',
      '  }',
      '}',
      'return result;',
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
    isExported: true,
    statements: [
      'return [...new Set(getFeatureSupport(path).filter(s => s.supported).map(s => s.browser))];',
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
    returnType: 'string | undefined',
    isExported: true,
    statements: [
      'const supportEntries = getFeatureSupport(path).filter(s => s.browser === browser && s.supported);',
      'if (supportEntries.length === 0) return undefined;',
      'const versions = supportEntries',
      '  .map(s => s.version_added)',
      '  .filter(v => typeof v === "string") as string[];',
      'if (versions.length === 0) {',
      '  if (supportEntries.some(s => s.version_added === true || s.version_added === null)) return "true";',
      '  return undefined;',
      '}',
      'return versions.sort((a, b) => {',
      '  const numA = Number.parseFloat(a);',
      '  const numB = Number.parseFloat(b);',
      '  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;',
      '  if (!isNaN(numA)) return -1;',
      '  if (!isNaN(numB)) return 1;',
      '  return a.localeCompare(b);',
      '})[0];',
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
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.status?.deprecated === true;',
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
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.status?.experimental === true;',
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
    returnType: 'string | undefined',
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.description;',
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
    returnType: 'string | undefined',
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.mdn_url;',
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
    returnType: 'string | string[] | undefined',
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.spec_url;',
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
    returnType: 'Record<string, string | undefined>',
    isExported: true,
    statements: [
      'const browsers = BCD.getAllBrowsers();',
      'const result: Record<string, string | undefined> = {};',
      'for (const browser of browsers) {',
      '  result[browser] = getMinimumSupportedVersion(path, browser);',
      '}',
      'return result;',
    ],
  });

  const getAllRawPathsRecursiveDefinition = {
    name: 'getAllRawPathsRecursive',
    parameters: [
      {
        name: 'obj',
        type: 'any',
      },
      {
        name: 'prefix',
        type: 'string',
      },
    ],
    returnType: 'string[]',
    statements: `
const result = new Set<string>();
function _traverse(currentObj: any, currentPrefix: string) {
  if (currentPrefix && !currentPrefix.endsWith(".__compat")) {
    result.add(currentPrefix);
  }
  if (currentObj && typeof currentObj === 'object') {
    if ('__compat' in currentObj) {
      const compatPath = currentPrefix ? \`\${currentPrefix}.__compat\` : '__compat';
      result.add(compatPath);
    }
    for (const key in currentObj) {
      if (key === '__compat') continue;
      if (currentObj[key] && typeof currentObj[key] === 'object') {
        const newPrefix = currentPrefix ? \`\${currentPrefix}.\${key}\` : key;
        _traverse(currentObj[key], newPrefix);
      }
    }
  }
}
_traverse(obj, prefix);
return Array.from(result);
    `.trim().split('\n'),
  };
  sourceFile.addFunction(getAllRawPathsRecursiveDefinition);

  sourceFile.addFunction({
    name: 'getFeatureStatus',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'StatusBlock | undefined',
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (path + '.__compat') as BCDPath;",
      'const compat = BCD.get(compatPath) as CompatStatement | undefined;',
      'return compat?.status;',
    ],
  });

  return sourceFile;
}
