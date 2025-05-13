import path from "node:path";
import { log } from "../utils";
import type { Config } from "../../generate-bcd-types";
import type { Project, SourceFile } from "ts-morph";

export function generateUtilsFile(
  project: Project,
  config: Config,
): SourceFile {
  log("Starting generation of bcd-utils.ts...");
  const targetFileName = "bcd-utils.ts";
  const outputFilePath = path.join(config.outputDir, targetFileName);

  const existingSourceFile = project.getSourceFile(outputFilePath);
  if (existingSourceFile) {
    project.removeSourceFile(existingSourceFile);
  }
  const sourceFile = project.createSourceFile(outputFilePath, "", {
    overwrite: true,
  });

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  sourceFile.addImportDeclaration({
    namedImports: ["BCD_DATA"],
    moduleSpecifier: "./bcd-data",
  });

  sourceFile.addImportDeclaration({
    namedImports: [
      "BCDPath",
      "FeatureSupport",
      "CompatStatement",
      "StatusBlock",
      "BrowserName",
      "SimpleSupportStatement",
      "BCDCategory",
      "SupportStatement",
      "BcdFeatureData",
      "VersionValue",
      "RootBCDData",
      "SupportBlock",
      "FlagStatement",
    ],
    moduleSpecifier: "./bcd-types",
    isTypeOnly: true,
  });

  sourceFile.addImportDeclaration({
    namedImports: ["compareVersions"],
    moduleSpecifier: "compare-versions",
  });

  const BCDPathSeparator = config.pathSeparator;

  sourceFile.addFunction({
    name: "getRawFeatureDataObject",
    isExported: false,
    parameters: [{ name: "path", type: "BCDPath" }],
    returnType: "BcdFeatureData | CompatStatement | undefined",
    statements: [
      `const parts = path.split('${BCDPathSeparator}');`,
      `let currentData: any = BCD_DATA;`,
      `for (const part of parts) {`,
      `  if (!currentData || typeof currentData !== 'object' || currentData === null) return undefined;`,
      `  if (part in currentData) {`,
      `    currentData = currentData[part];`,
      `  } else {`,
      `    return undefined;`,
      `  }`,
      `}`,
      `return currentData as BcdFeatureData | CompatStatement | undefined;`,
    ],
  });

  const getCompatStatementObjectLogic = [
    `const rawDataObject = getRawFeatureDataObject(path);`,
    `if (rawDataObject && typeof rawDataObject === 'object') {`,
    `    if ('__compat' in rawDataObject && rawDataObject.__compat && typeof rawDataObject.__compat === 'object') {`,
    `        return rawDataObject.__compat as CompatStatement;`,
    `    } else if ('support' in rawDataObject && 'status' in rawDataObject) {`,
    `        return rawDataObject as CompatStatement;`,
    `    }`,
    `}`,
    `return undefined;`,
  ];

  sourceFile.addFunction({
    name: "getCompatStatementObject",
    isExported: false,
    parameters: [{ name: "path", type: "BCDPath" }],
    returnType: "CompatStatement | undefined",
    statements: getCompatStatementObjectLogic,
  });

  const utils = [
    {
      name: "getFeatureSupport",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "FeatureSupport[]",
      statements: [
        `const compatStatement = getCompatStatementObject(path);`,
        `if (!compatStatement?.support) return [];`,
        `const supportMap: SupportBlock = compatStatement.support;`,
        `const result: FeatureSupport[] = [];`,
        `for (const browserKey in supportMap) {`,
        `    const browserNameTyped = browserKey as BrowserName;`,
        `    const supportStatementEntry = supportMap[browserNameTyped];`,
        `    if (!supportStatementEntry) {`,
        `       result.push({ browser: browserNameTyped, supported: false, notes: "Support information not available" });`,
        `       continue;`,
        `    }`,
        `    if (supportStatementEntry === "mirror") {`,
        `       result.push({ browser: browserNameTyped, supported: false, notes: "Mirrored support not resolved" });`,
        `       continue;`,
        `    }`,
        `    const entries: ReadonlyArray<SimpleSupportStatement> = (
                    Array.isArray(supportStatementEntry) ? supportStatementEntry : [supportStatementEntry]
                ) as ReadonlyArray<SimpleSupportStatement>;`,
        `    let earliestSupport: SimpleSupportStatement | null = null;`,
        `    let isCurrentlySupported = false;`,
        `    for (const entry of entries) {`,
        `        if (entry.version_added === false) continue;`,
        `        if (entry.version_added !== undefined && entry.version_added !== null) {`,
        `            if (!earliestSupport || earliestSupport.version_added === null ||
                        (entry.version_added === true && earliestSupport.version_added !== true) ||
                        (typeof earliestSupport.version_added === 'string' && typeof entry.version_added === 'string' &&
                        compareVersions(String(entry.version_added).replace('≤',''), String(earliestSupport.version_added).replace('≤','')) < 0)
                    ) {`,
        `                 earliestSupport = entry;`,
        `            }`,
        `            if (!entry.version_removed) { isCurrentlySupported = true; }`,
        `        }`,
        `    }`,
        `    if (earliestSupport) {`,
        `        let notesValue: string | readonly string[] | undefined = undefined;`,
        `        if (typeof earliestSupport.notes === 'string') {`,
        `            notesValue = earliestSupport.notes;`,
        `        } else if (Array.isArray(earliestSupport.notes)) {`,
        `            if (earliestSupport.notes.every(n => typeof n === 'string')) {`,
        `                notesValue = earliestSupport.notes as readonly string[];`,
        `            } else {`,
        `                notesValue = JSON.stringify(earliestSupport.notes);`,
        `            }`,
        `        } else if (earliestSupport.notes) {`,
        `            notesValue = JSON.stringify(earliestSupport.notes);`,
        `        }`,
        `        result.push({`,
        `            browser: browserNameTyped,`,
        `            supported: isCurrentlySupported || (earliestSupport.version_added === true && !earliestSupport.version_removed) || (typeof earliestSupport.version_added === 'string' && !earliestSupport.version_removed),`,
        `            version_added: earliestSupport.version_added === null ? undefined : earliestSupport.version_added,`,
        `            version_removed: earliestSupport.version_removed,`,
        `            prefix: earliestSupport.prefix,`,
        `            alternative_name: earliestSupport.alternative_name,`,
        `            partial_implementation: earliestSupport.partial_implementation === true,`,
        `            notes: notesValue,`,
        `            flags: earliestSupport.flags as ReadonlyArray<FlagStatement> | undefined`,
        `        });`,
        `    } else if (entries.some(e => e.version_added === false)) {`,
        `        result.push({ browser: browserNameTyped, supported: false });`,
        `    } else {`,
        `        result.push({ browser: browserNameTyped, supported: false, notes: "Support information unknown or unclear" });`,
        `    }`,
        `}`,
        `return result.sort((a,b) => a.browser.localeCompare(b.browser));`,
      ],
    },
    {
      name: "getBrowsersWithSupport",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "BrowserName[]",
      statements: [
        "const support = getFeatureSupport(path);",
        "return support.filter(s => s.supported).map(s => s.browser);",
      ],
    },
    {
      name: "getMinimumSupportedVersion",
      parameters: [
        { name: "path", type: "BCDPath" },
        { name: "browser", type: "BrowserName" },
      ],
      returnType: "VersionValue | undefined",
      statements: [
        `const compatStatement = getCompatStatementObject(path);`,
        `if (!compatStatement?.support || !compatStatement.support[browser]) return undefined;`,
        `const supportStatementEntry = compatStatement.support[browser];`,
        `if (!supportStatementEntry || supportStatementEntry === "mirror") return undefined;`,
        `const entries: ReadonlyArray<SimpleSupportStatement> = (
                    Array.isArray(supportStatementEntry) ? supportStatementEntry : [supportStatementEntry]
                ) as ReadonlyArray<SimpleSupportStatement>;`,
        `let minVersion: VersionValue | undefined = undefined;`,
        `for (const entry of entries) {`,
        `  if (entry.version_added === false) continue;`,
        `  if (entry.version_added !== undefined ) {`,
        `    if (entry.version_added === true) { minVersion = true; break; }`,
        `    if (entry.version_added === null) { if (minVersion === undefined) minVersion = null; continue;} `,
        `    if (typeof entry.version_added === 'string') {`,
        `      if (minVersion === undefined || minVersion === null) { minVersion = entry.version_added; }`,
        `      else if (typeof minVersion === 'string' && compareVersions(String(entry.version_added).replace('≤',''), String(minVersion).replace('≤','')) < 0) { minVersion = entry.version_added; }`,
        `    }`,
        `  }`,
        `}`,
        `return minVersion;`,
      ],
    },
    {
      name: "getFeatureStatus",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "StatusBlock | undefined",
      statements: [
        `const compat = getCompatStatementObject(path);`,
        `return compat?.status;`,
      ],
    },
    {
      name: "isFeatureDeprecated",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "boolean",
      statements: [
        "const status = getFeatureStatus(path); return status?.deprecated ?? false;",
      ],
    },
    {
      name: "isFeatureExperimental",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "boolean",
      statements: [
        "const status = getFeatureStatus(path); return status?.experimental ?? false;",
      ],
    },
    {
      name: "getFeatureDescription",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "string | undefined",
      statements: [
        `const compat = getCompatStatementObject(path);`,
        `return compat?.description;`,
      ],
    },
    {
      name: "getFeatureMDNUrl",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "string | undefined",
      statements: [
        `const compat = getCompatStatementObject(path);`,
        `return compat?.mdn_url;`,
      ],
    },
    {
      name: "getFeatureSpecUrl",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "string | ReadonlyArray<string> | undefined",
      statements: [
        `const compat = getCompatStatementObject(path);`,
        `return compat?.spec_url;`,
      ],
    },
    {
      name: "getCompatibilityTable",
      parameters: [{ name: "path", type: "BCDPath" }],
      returnType: "Record<BrowserName, string>",
      statements: [
        "const support = getFeatureSupport(path);",
        "const table: Partial<Record<BrowserName, string>> = {};",
        "support.forEach(s => {",
        "  if (s.notes === 'Mirrored support not resolved' || s.notes === 'Support information unknown or unclear' || s.notes === 'Support information not available') { table[s.browser] = s.notes; return; }",
        "  if (s.supported) {",
        "    if (s.version_added === true) table[s.browser] = 'Yes';",
        "    else if (s.version_added === undefined || s.version_added === null) table[s.browser] = 'Yes (Unknown Version)';",
        "    else table[s.browser] = `Yes (≥ ${String(s.version_added).replace('≤','')})`;",
        "  } else {",
        "    if (s.version_added === false) { table[s.browser] = 'No'; }",
        "    else if (s.version_added === undefined || s.version_added === null) { table[s.browser] = 'No (Support unclear)'; }",
        "    else {",
        "        const added = s.version_added === true ? 'initially' : String(s.version_added).replace('≤','');",
        "        const removed = s.version_removed === true ? 'unknown version' : (s.version_removed === undefined ? '' : `, Removed in ${String(s.version_removed).replace('≤','')}`);",
        "        table[s.browser] = `No (Added ${added}${removed})`;",
        "    }",
        "  }",
        "});",
        "return table as Record<BrowserName, string>;",
      ],
    },
    {
      name: "findFeaturesByPattern",
      parameters: [
        { name: "pattern", type: "RegExp" },
        { name: "categories", type: "BCDCategory[]", isOptional: true },
      ],
      returnType: "BCDPath[]",
      statements: [
        "const matchingPaths: BCDPath[] = [];",
        "const rootData = BCD_DATA as unknown as RootBCDData;",
        "const catsToScan = categories || Object.keys(rootData).filter(k => k !== '__meta' && k !== 'browsers') as BCDCategory[];",
        "const dataToScan: Partial<Pick<RootBCDData, BCDCategory>> = {};",
        "for (const cat of catsToScan) { if (Object.prototype.hasOwnProperty.call(rootData, cat) && (rootData as any)[cat]) { (dataToScan as any)[cat] = (rootData as any)[cat]; } }",
        `function scan(currentObject: any, currentPathParts: string[]) {`,
        `  if (typeof currentObject !== 'object' || currentObject === null) return;`,
        `  const currentFullPath = currentPathParts.join('${BCDPathSeparator}');`,
        `  if (typeof currentObject.__compat === 'object' && currentObject.__compat !== null && pattern.test(currentFullPath)) {`,
        `    matchingPaths.push(currentFullPath as BCDPath);`,
        `  }`,
        `  for (const key in currentObject) {`,
        `    if (key === '__compat') continue;`,
        `    if (Object.prototype.hasOwnProperty.call(currentObject, key)) {`,
        `       scan(currentObject[key], [...currentPathParts, key]);`,
        `    }`,
        `  }`,
        `}`,
        "for (const topLevelKey in dataToScan) {",
        "  if (Object.prototype.hasOwnProperty.call(dataToScan, topLevelKey)) {",
        "    scan((dataToScan as any)[topLevelKey as BCDCategory], [topLevelKey]);",
        "  }",
        "}",
        "return matchingPaths;",
      ],
    },
    {
      name: "getPathsInCategory",
      parameters: [{ name: "category", type: "BCDCategory" }],
      returnType: "BCDPath[]",
      statements: [
        `const escapedCategory = category.replace(/[.*+?^${"$"}{}()|[\\]\\\\]/g, '\\\\$&');`,
        `const escapedSeparator = '${BCDPathSeparator}'.replace(/[.*+?^${"$"}{}()|[\\]\\\\]/g, '\\\\$&');`,
        `return findFeaturesByPattern(new RegExp(\`^\${escapedCategory}(?:\${escapedSeparator}|$)\`), [category]);`,
      ],
    },
  ];

  utils.forEach((util) =>
    sourceFile.addFunction({ ...util, isExported: true }),
  );

  sourceFile.formatText();
  log("Finished generation of bcd-utils.ts.");
  return sourceFile;
}
