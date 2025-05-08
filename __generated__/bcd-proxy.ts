import bcdData from '@mdn/browser-compat-data';
import type { BCDDataType, BCDPath, TypedBCD, BCDGetter, Root } from './bcd-types';
import type { BrowserName, CompatStatement, SupportStatement, SimpleSupportStatement, VersionValue } from '@mdn/browser-compat-data';

// Generated on 2025-05-08T16:14:59.270Z
export class BCDProxy implements BCDGetter {
  private readonly data: Readonly<Root>;

  constructor(data: Root) {
    this.data = data;
  }

  private compareVersions(versionA: string | boolean | null | undefined, versionB: string | boolean | null | undefined): number {
    const normalizeVersion = (version: string | boolean | null | undefined): string => {
      if (version === null || version === false || version === undefined) return '-1';
      if (version === true) return '0';
      if (typeof version === 'string' && version.startsWith('≤')) {
        return version.substring(1);
      }

      return version as string;
    };
    const normalizedA = normalizeVersion(versionA);
    const normalizedB = normalizeVersion(versionB);
    const numA = Number.parseFloat(normalizedA);
    const numB = Number.parseFloat(normalizedB);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return numA === numB ? 0 : numA < numB ? -1 : 1;
    }

    const partsA = normalizedA.split('.');
    const partsB = normalizedB.split('.');
    const maxLength = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLength; i++) {
      const partAVal = partsA[i] !== undefined ? Number.parseInt(partsA[i], 10) : 0;
      const partBVal = partsB[i] !== undefined ? Number.parseInt(partsB[i], 10) : 0;
      const partA = Number.isNaN(partAVal) ? 0 : partAVal;
      const partB = Number.isNaN(partBVal) ? 0 : partBVal;
      if (partA === partB) continue;
      return partA < partB ? -1 : 1;
    }

    return 0;
  }

  public get<P extends BCDPath>(path: P): BCDDataType<P> {
    return this.resolvePath(path) as BCDDataType<P>;
  }

  private resolvePath(path: string): any {
    const parts = path.split('.');
    let current: any = this.data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }

    }

    return current;
  }

  public isSupported(path: BCDPath, browser: string, version: string): boolean {
    const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
    const compat = this.get(compatPath) as CompatStatement | undefined;
    if (!compat || !compat.support) return false;
    const browserSupport = compat.support[browser as BrowserName];
    if (!browserSupport) return false;
    const supportEntries: ReadonlyArray<SimpleSupportStatement> = Array.isArray(browserSupport) ? browserSupport : [browserSupport];
    for (const item of supportEntries) {
      if (!item) continue;
      let versionAdded = item.version_added;
      if (versionAdded === null || versionAdded === false || versionAdded === undefined) continue;
      if (versionAdded === true) {
        if (item.version_removed) {
          if (item.version_removed === true) continue;
          if (this.compareVersions(version, item.version_removed) >= 0) continue;
        }

        return true;
      }

      const isAdded = this.compareVersions(version, versionAdded) >= 0;
      if (isAdded) {
        if (item.version_removed) {
          if (item.version_removed === true) continue;
          if (this.compareVersions(version, item.version_removed) < 0) return true;
        } else {
          return true;
        }

      }

    }

    return false;
  }

  public getSupportMap(path: BCDPath): Record<string, SupportStatement | ReadonlyArray<SupportStatement>> | undefined {
    const compatPath = path.endsWith('.__compat') ? path : (`${path}.__compat` as BCDPath);
    const compat = this.get(compatPath) as CompatStatement | undefined;
    if (!compat || !compat.support) return undefined;
    return compat.support as Record<string, SupportStatement | ReadonlyArray<SupportStatement>>;
  }

  public getAllBrowsers(): string[] {
    return Object.keys((this.data as any)?.browsers || {});
  }

  public getCategories(): string[] {
    return ["api", "css", "html", "http", "javascript", "manifests", "mathml", "svg", "webassembly", "webdriver", "webextensions"];
  }

  get raw(): Readonly<Root> {
    return this.data;
  }
}

export const BCD: BCDGetter & TypedBCD = new BCDProxy(bcdData as unknown as Root) as any;
