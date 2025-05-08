import type { BCDPath, BCDCategory, FeatureSupport, Root } from './bcd-types';
import { BCD } from './bcd-proxy';
import type { BrowserName, CompatStatement, SimpleSupportStatement, StatusBlock, SupportStatement, VersionValue, FlagStatement } from '@mdn/browser-compat-data/types';

// Generated on 2025-05-08T16:15:13.985Z
export function getFeatureSupport(path: BCDPath): FeatureSupport[] {
  const supportMap = BCD.getSupportMap(path);
  if (!supportMap) return [];
  const result: FeatureSupport[] = [];
  for (const browser of Object.keys(supportMap)) {
    const browserSupportItems = supportMap[browser as BrowserName] as SupportStatement | ReadonlyArray<SupportStatement> | undefined;
    if (!browserSupportItems) continue;
    const itemsArray: ReadonlyArray<SimpleSupportStatement> = Array.isArray(browserSupportItems) ? browserSupportItems : [browserSupportItems];
    for (const item of itemsArray) {
      if (!item) continue;
      let supported = false;
      if (typeof item.version_added === 'string' && item.version_added.length > 0) supported = true;
      else if (item.version_added === true || item.version_added === null) supported = true;
      if (item.version_removed === true || (typeof item.version_removed === 'string' && item.version_removed.length > 0)) {
        if (item.version_removed === true) supported = false;
      }

      result.push({
        browser,
        supported,
        version_added: item.version_added === undefined ? undefined : item.version_added,
        version_removed: item.version_removed === undefined ? undefined : item.version_removed,
        prefix: item.prefix,
        alternative_name: item.alternative_name,
        partial_implementation: item.partial_implementation,
        notes: item.notes,
        flags: item.flags,
      });
    }

  }

  return result;
}

export function getBrowsersWithSupport(path: BCDPath): string[] {
  return [...new Set(getFeatureSupport(path).filter(s => s.supported).map(s => s.browser))];
}

export function getMinimumSupportedVersion(path: BCDPath, browser: string): string | undefined {
  const supportEntries = getFeatureSupport(path).filter(s => s.browser === browser && s.supported);
  if (supportEntries.length === 0) return undefined;
  let minVersion: VersionValue | undefined = undefined;
  let foundTrueSupport = false;
  for (const entry of supportEntries) {
    if (entry.version_added === true || entry.version_added === null) {
      foundTrueSupport = true;
      continue;
    }

    if (typeof entry.version_added === 'string') {
      if (minVersion === undefined || BCD.compareVersions(entry.version_added, minVersion as string | boolean | null) < 0) {
        minVersion = entry.version_added;
      }

    }

  }

  if (typeof minVersion === 'string') return minVersion;
  if (foundTrueSupport) return 'true';
  return undefined;
}

export function isFeatureDeprecated(path: BCDPath): boolean {
  const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
  const compat = BCD.get(compatPath) as CompatStatement | undefined;
  return compat?.status?.deprecated === true;
}

export function isFeatureExperimental(path: BCDPath): boolean {
  const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
  const compat = BCD.get(compatPath) as CompatStatement | undefined;
  return compat?.status?.experimental === true;
}

export function getFeatureDescription(path: BCDPath): string | undefined {
  const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
  const compat = BCD.get(compatPath) as CompatStatement | undefined;
  return compat?.description;
}

export function getFeatureUrl(path: BCDPath): string | undefined {
  const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
  const compat = BCD.get(compatPath) as CompatStatement | undefined;
  return compat?.mdn_url;
}

export function getFeatureSpecUrl(path: BCDPath): string | ReadonlyArray<string> | undefined {
  const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
  const compat = BCD.get(compatPath) as CompatStatement | undefined;
  return compat?.spec_url;
}

export function getCompatibilityTable(path: BCDPath): Record<string, string | undefined> {
  const browsers = BCD.getAllBrowsers();
  const result: Record<string, string | undefined> = {};
  for (const browser of browsers) {
    result[browser] = getMinimumSupportedVersion(path, browser);
  }

  return result;
}

export function findFeaturesByPattern(pattern: string | RegExp): BCDPath[] {
  const results: BCDPath[] = [];
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  try {
    const { PATHS } = require("./bcd-paths");
    for (const key in PATHS) {
      if (regex.test(PATHS[key as keyof typeof PATHS])) {
        results.push(PATHS[key as keyof typeof PATHS]);
      }

    }

  } catch (e) {
    console.warn("[BCD-Generator] Could not load PATHS for findFeaturesByPattern.");
  }

  return results;
}

export function getPathsInCategory(category: BCDCategory): BCDPath[] {
  const results: BCDPath[] = [];
  const prefix = `${category}.`;
  try {
    const { PATHS } = require("./bcd-paths");
    for (const key in PATHS) {
      const currentPath = PATHS[key as keyof typeof PATHS];
      if (currentPath.startsWith(prefix) || currentPath === category) {
        results.push(currentPath);
      }

    }

  } catch (e) {
    console.warn("[BCD-Generator] Could not load PATHS for getPathsInCategory.");
  }

  return results;
}

export function getFeatureStatus(path: BCDPath): StatusBlock | undefined {
  const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
  const compat = BCD.get(compatPath) as CompatStatement | undefined;
  return compat?.status;
}
