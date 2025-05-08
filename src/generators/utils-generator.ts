import type { Project, SourceFile } from 'ts-morph';
import { log } from '../utils';

export function generateUtilsFile(project: Project): SourceFile {
  log('Starting generation of bcd-utils.ts...');
  const sourceFile = project.createSourceFile('bcd-utils.ts', '', {
    overwrite: true,
  });

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  sourceFile.addImportDeclaration({
    namedImports: ['BCDPath', 'BCDCategory', 'FeatureSupport', 'Root'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  });

  sourceFile.addImportDeclaration({
    namedImports: ['BCD'],
    moduleSpecifier: './bcd-proxy',
  });

  sourceFile.addImportDeclaration({
    namedImports: [
      'BrowserName', 'CompatStatement', 'SimpleSupportStatement',
      'StatusBlock', 'SupportStatement', 'VersionValue', 'FlagStatement',
    ],
    moduleSpecifier: '@mdn/browser-compat-data',
    isTypeOnly: true,
  });

  sourceFile.addFunction({
    name: 'getFeatureSupport',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'FeatureSupport[]',
    isExported: true,
    statements: [
      "const supportMap = BCD.getSupportMap(path);",
      "if (!supportMap) return [];",
      "const result: FeatureSupport[] = [];",
      "for (const browser of Object.keys(supportMap)) {",
      "  const browserSupportItems = supportMap[browser as BrowserName] as SupportStatement | ReadonlyArray<SupportStatement> | undefined;",
      "  if (!browserSupportItems) continue;",
      "  const itemsArray: ReadonlyArray<SimpleSupportStatement> = Array.isArray(browserSupportItems) ? browserSupportItems : [browserSupportItems];",
      "  for (const item of itemsArray) {",
      "    if (!item) continue;",
      "    let supported = false;",
      "    if (typeof item.version_added === 'string' && item.version_added.length > 0) supported = true;",
      "    else if (item.version_added === true || item.version_added === null) supported = true;",
      "    if (item.version_removed === true || (typeof item.version_removed === 'string' && item.version_removed.length > 0)) {",
      "         if (item.version_removed === true) supported = false; ",
      "    }",
      "    result.push({",
      "      browser,",
      "      supported,",
      "      version_added: item.version_added === undefined ? undefined : item.version_added,",
      "      version_removed: item.version_removed === undefined ? undefined : item.version_removed,",
      "      prefix: item.prefix,",
      "      alternative_name: item.alternative_name,",
      "      partial_implementation: item.partial_implementation,",
      "      notes: item.notes,",
      "      flags: item.flags,",
      "    });",
      "  }",
      "}",
      "return result;",
    ],
  });

  sourceFile.addFunction({
    name: 'getBrowsersWithSupport',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'string[]',
    isExported: true,
    statements: [
        'return [...new Set(getFeatureSupport(path).filter(s => s.supported).map(s => s.browser))];',
    ]
  });

  sourceFile.addFunction({
    name: 'getMinimumSupportedVersion',
    parameters: [
        { name: 'path', type: 'BCDPath' },
        { name: 'browser', type: 'string' },
    ],
    returnType: 'string | undefined',
    isExported: true,
    statements: [
        "const supportEntries = getFeatureSupport(path).filter(s => s.browser === browser && s.supported);",
        "if (supportEntries.length === 0) return undefined;",
        "let minVersion: VersionValue | undefined = undefined;",
        "let foundTrueSupport = false;",
        "for (const entry of supportEntries) {",
        "  if (entry.version_added === true || entry.version_added === null) {",
        "    foundTrueSupport = true;",
        "    continue;",
        "  }",
        "  if (typeof entry.version_added === 'string') {",
        "    if (minVersion === undefined || BCD.compareVersions(entry.version_added, minVersion as string | boolean | null) < 0) {",
        "      minVersion = entry.version_added;",
        "    }",
        "  }",
        "}",
        "if (typeof minVersion === 'string') return minVersion;",
        "if (foundTrueSupport) return 'true';",
        "return undefined;",
    ]
  });

  sourceFile.addFunction({
    name: 'isFeatureDeprecated',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'boolean',
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
      "const compat = BCD.get(compatPath) as CompatStatement | undefined;",
      "return compat?.status?.deprecated === true;",
    ],
  });

  sourceFile.addFunction({
    name: 'isFeatureExperimental',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'boolean',
    isExported: true,
    statements: [
        "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
        "const compat = BCD.get(compatPath) as CompatStatement | undefined;",
        "return compat?.status?.experimental === true;",
    ]
  });

  sourceFile.addFunction({
    name: 'getFeatureDescription',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'string | undefined',
    isExported: true,
    statements: [
        "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
        "const compat = BCD.get(compatPath) as CompatStatement | undefined;",
        "return compat?.description;",
    ]
  });

  sourceFile.addFunction({
    name: 'getFeatureUrl',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'string | undefined',
    isExported: true,
    statements: [
        "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
        "const compat = BCD.get(compatPath) as CompatStatement | undefined;",
        "return compat?.mdn_url;",
    ]
  });

  sourceFile.addFunction({
    name: 'getFeatureSpecUrl',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'string | ReadonlyArray<string> | undefined',
    isExported: true,
    statements: [
        "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
        "const compat = BCD.get(compatPath) as CompatStatement | undefined;",
        "return compat?.spec_url;",
    ]
  });

  sourceFile.addFunction({
    name: 'getCompatibilityTable',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'Record<string, string | undefined>',
    isExported: true,
    statements: [
      'const browsers = BCD.getAllBrowsers();',
      'const result: Record<string, string | undefined> = {};',
      'for (const browser of browsers) {',
      '  result[browser] = getMinimumSupportedVersion(path, browser);',
      '}',
      'return result;',
    ]
  });

   sourceFile.addFunction({
        name: 'findFeaturesByPattern',
        parameters: [{ name: 'pattern', type: 'string | RegExp' }],
        returnType: 'BCDPath[]',
        isExported: true,
        statements: [
            'const results: BCDPath[] = [];',
            'const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;',
            'try {',
            '  const { PATHS } = require("./bcd-paths");',
            '  for (const key in PATHS) {',
            '    if (regex.test(PATHS[key as keyof typeof PATHS])) {',
            '      results.push(PATHS[key as keyof typeof PATHS]);',
            '    }',
            '  }',
            '} catch (e) {',
            '  console.warn("[BCD-Generator] Could not load PATHS for findFeaturesByPattern.");',
            '}',
            'return results;'
        ]
    });

    sourceFile.addFunction({
        name: 'getPathsInCategory',
        parameters: [{ name: 'category', type: 'BCDCategory' }],
        returnType: 'BCDPath[]',
        isExported: true,
        statements: [
            'const results: BCDPath[] = [];',
            'const prefix = `${category}.`;',
            'try {',
            '  const { PATHS } = require("./bcd-paths");',
            '  for (const key in PATHS) {',
            '    const currentPath = PATHS[key as keyof typeof PATHS];',
            '    if (currentPath.startsWith(prefix) || currentPath === category) {',
            '      results.push(currentPath);',
            '    }',
            '  }',
            '} catch (e) {',
            '  console.warn("[BCD-Generator] Could not load PATHS for getPathsInCategory.");',
            '}',
            'return results;'
        ]
    });

  sourceFile.addFunction({
    name: 'getFeatureStatus',
    parameters: [{ name: 'path', type: 'BCDPath' }],
    returnType: 'StatusBlock | undefined',
    isExported: true,
    statements: [
      "const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);",
      "const compat = BCD.get(compatPath) as CompatStatement | undefined;",
      "return compat?.status;",
    ],
  });

  sourceFile.formatText();
  log('Finished generation of bcd-utils.ts.');
  return sourceFile;
}
