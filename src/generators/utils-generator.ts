import type { Project, SourceFile } from 'ts-morph';
import { log } from '../utils';
import type { Config } from '../../generate-bcd-types';

export function generateUtilsFile(
    project: Project,
    config: Config
): SourceFile {
    log('Starting generation of bcd-utils.ts...');
    const sourceFile = project.createSourceFile('bcd-utils.ts', '', { overwrite: true });

    sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

    sourceFile.addImportDeclaration({
        namedImports: ['BCD', 'PATHS'],
        moduleSpecifier: './index',
    });

    sourceFile.addImportDeclaration({
        namedImports: ['BCDPath', 'FeatureSupport', 'CompatStatement', 'StatusBlock', 'BrowserName', 'SimpleSupportStatement', 'BCDCategory'],
        moduleSpecifier: './bcd-types',
        isTypeOnly: true,
    });

    sourceFile.addImportDeclaration({
        namedImports: ['compareVersions'],
        moduleSpecifier: 'compare-versions',
    });

    const utils = [
        {
            name: 'getFeatureSupport',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'FeatureSupport[]',
            statements: [
                "const supportMap = BCD.getSupportMap(path);",
                "if (!supportMap) return [];",
                "const result: FeatureSupport[] = [];",
                "for (const browser in supportMap) {",
                "    const browserNameTyped = browser as BrowserName;",
                "    const supportStatement = supportMap[browserNameTyped];",
                "    if (!supportStatement) continue;",
                "    const entries: ReadonlyArray<SimpleSupportStatement> = Array.isArray(supportStatement) ? supportStatement : [supportStatement];",
                "    let earliestSupport: SimpleSupportStatement | null = null;",
                "    let isCurrentlySupported = false;",
                "    for (const entry of entries) {",
                "        if (entry.version_added && entry.version_added !== false) {",
                "            if (!earliestSupport || (earliestSupport.version_added !== true && entry.version_added === true) || (earliestSupport.version_added !== true && entry.version_added !== true && compareVersions(String(entry.version_added).replace('≤',''), String(earliestSupport.version_added).replace('≤','')) < 0) ) {",
                "                 earliestSupport = entry;",
                "            }",
                "            if (!entry.version_removed) { isCurrentlySupported = true; }",
                "        }",
                "    }",
                "    if (earliestSupport) {",
                "        result.push({",
                "            browser: browserNameTyped,",
                "            supported: isCurrentlySupported || (earliestSupport.version_added === true && !earliestSupport.version_removed) || (typeof earliestSupport.version_added === 'string' && !earliestSupport.version_removed),",
                "            version_added: earliestSupport.version_added,",
                "            version_removed: earliestSupport.version_removed,",
                "            prefix: earliestSupport.prefix,",
                "            alternative_name: earliestSupport.alternative_name,",
                "            partial_implementation: earliestSupport.partial_implementation,",
                "            notes: earliestSupport.notes as string | string[] | undefined, ",
                "            flags: earliestSupport.flags",
                "        });",
                "    } else if (entries.some(e => e.version_added === false)) {",
                "        result.push({ browser: browserNameTyped, supported: false });",
                "    }",
                "}",
                "return result.sort((a,b) => a.browser.localeCompare(b.browser));",
            ]
        },
        {
            name: 'getBrowsersWithSupport',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'BrowserName[]',
            statements: [
                "const support = getFeatureSupport(path);",
                "return support.filter(s => s.supported).map(s => s.browser);",
            ]
        },
        {
            name: 'getMinimumSupportedVersion',
            parameters: [{ name: 'path', type: 'BCDPath' }, { name: 'browser', type: 'BrowserName' }],
            returnType: 'string | true | undefined',
            statements: [
                "const supportMap = BCD.getSupportMap(path);",
                "if (!supportMap || !supportMap[browser]) return undefined;",
                "const supportStatement = supportMap[browser];",
                "const entries: ReadonlyArray<SimpleSupportStatement> = Array.isArray(supportStatement) ? supportStatement : [supportStatement];",
                "let minVersion: string | true | undefined = undefined;",
                "for (const entry of entries) {",
                "  if (entry.version_added && entry.version_added !== false) {",
                "    if (entry.version_added === true) return true;",
                "    if (minVersion === undefined || minVersion === true || compareVersions(String(entry.version_added).replace('≤',''), String(minVersion).replace('≤','')) < 0) {",
                "      minVersion = entry.version_added as string;",
                "    }",
                "  }",
                "}",
                "return minVersion;",
            ]
        },
        {
            name: 'getFeatureStatus',
            parameters: [{name: 'path', type: 'BCDPath'}],
            returnType: 'StatusBlock | undefined',
            statements: [
                "const featurePath = path.endsWith('.__compat') ? path : (`${path}${config.pathSeparator}__compat` as BCDPath);",
                "const compat = BCD.get(featurePath) as CompatStatement | undefined;",
                "return compat?.status;"
            ]
        },
        {
            name: 'isFeatureDeprecated',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'boolean',
            statements: ["const status = getFeatureStatus(path); return status?.deprecated ?? false;"]
        },
        {
            name: 'isFeatureExperimental',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'boolean',
            statements: ["const status = getFeatureStatus(path); return status?.experimental ?? false;"]
        },
        {
            name: 'getFeatureDescription',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'string | undefined',
            statements: [
                "const featurePath = path.endsWith('.__compat') ? path : (`${path}${config.pathSeparator}__compat` as BCDPath);",
                "const compat = BCD.get(featurePath) as CompatStatement | undefined;",
                "return compat?.description;"
            ]
        },
        {
            name: 'getFeatureMDNUrl',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'string | undefined',
            statements: [
                "const featurePath = path.endsWith('.__compat') ? path : (`${path}${config.pathSeparator}__compat` as BCDPath);",
                "const compat = BCD.get(featurePath) as CompatStatement | undefined;",
                "return compat?.mdn_url;"
            ]
        },
        {
            name: 'getFeatureSpecUrl',
            parameters: [{ name: 'path', type: 'BCDPath' }],
            returnType: 'string | ReadonlyArray<string> | undefined',
            statements: [
                "const featurePath = path.endsWith('.__compat') ? path : (`${path}${config.pathSeparator}__compat` as BCDPath);",
                "const compat = BCD.get(featurePath) as CompatStatement | undefined;",
                "return compat?.spec_url;"
            ]
        },
        {
            name: 'getCompatibilityTable',
            parameters: [{name: 'path', type: 'BCDPath'}],
            returnType: 'Record<BrowserName, string>',
            statements: [
                "const support = getFeatureSupport(path);",
                "const table: Record<BrowserName, string> = {} as Record<BrowserName, string>;",
                "support.forEach(s => {",
                "  if (s.supported) {",
                "    table[s.browser] = s.version_added === true ? 'Yes' : `Yes (≥ ${String(s.version_added).replace('≤','')})`;",
                "  } else if (s.version_added) {",
                "    table[s.browser] = `No (Added ${s.version_added === true ? 'initially' : s.version_added}, Removed in ${s.version_removed === true ? 'unknown' : s.version_removed})`;",
                "  } else {",
                "    table[s.browser] = 'No';",
                "  }",
                "});",
                "return table;"
            ]
        },
        {
            name: 'findFeaturesByPattern',
            parameters: [{name: 'pattern', type: 'RegExp'}],
            returnType: 'BCDPath[]',
            statements: [
                "const matchingPaths: BCDPath[] = [];",
                "for (const pathValue of Object.values(PATHS)) {",
                "  if (pattern.test(pathValue)) {",
                "    matchingPaths.push(pathValue);",
                "  }",
                "}",
                "return matchingPaths;"
            ]
        },
        {
            name: 'getPathsInCategory',
            parameters: [{name: 'category', type: 'BCDCategory'}],
            returnType: 'BCDPath[]',
            statements: [
                "const categoryPaths: BCDPath[] = [];",
                "const prefix = category + config.pathSeparator;",
                "for (const pathValue of Object.values(PATHS)) {",
                "  if (pathValue.startsWith(prefix)) {",
                "    categoryPaths.push(pathValue);",
                "  }",
                "}",
                "return categoryPaths;"
            ]
        }
    ];

    utils.forEach(util => sourceFile.addFunction({ ...util, isExported: true }));

    sourceFile.formatText();
    log('Finished generation of bcd-utils.ts.');
    return sourceFile;
}
