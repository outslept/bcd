import type { BCDPath, BCDPathConstant } from './bcd-types';
import * as pathsPart0 from './paths/bcd-paths-__meta';
import * as pathsPart1 from './paths/bcd-paths-api';
import * as pathsPart2 from './paths/bcd-paths-browsers';
import * as pathsPart3 from './paths/bcd-paths-css';
import * as pathsPart4 from './paths/bcd-paths-html';
import * as pathsPart5 from './paths/bcd-paths-http';
import * as pathsPart6 from './paths/bcd-paths-javascript';
import * as pathsPart7 from './paths/bcd-paths-manifests';
import * as pathsPart8 from './paths/bcd-paths-mathml';
import * as pathsPart9 from './paths/bcd-paths-svg';
import * as pathsPart10 from './paths/bcd-paths-webassembly';
import * as pathsPart11 from './paths/bcd-paths-webdriver';
import * as pathsPart12 from './paths/bcd-paths-webextensions';

// Generated on 2025-05-08T16:15:00.082Z
export const PATHS: BCDPathConstant = {
  ...pathsPart0.PATHS___META,
  ...pathsPart1.PATHS_API,
  ...pathsPart2.PATHS_BROWSERS,
  ...pathsPart3.PATHS_CSS,
  ...pathsPart4.PATHS_HTML,
  ...pathsPart5.PATHS_HTTP,
  ...pathsPart6.PATHS_JAVASCRIPT,
  ...pathsPart7.PATHS_MANIFESTS,
  ...pathsPart8.PATHS_MATHML,
  ...pathsPart9.PATHS_SVG,
  ...pathsPart10.PATHS_WEBASSEMBLY,
  ...pathsPart11.PATHS_WEBDRIVER,
  ...pathsPart12.PATHS_WEBEXTENSIONS,
};

export function createPathKey(path: string): string {
  return path.replace(/\./g, '_').replace(/-/g, '_').replace(/@@/g, 'at_at_');
}

export function getPathByKey(key: string): BCDPath | undefined {
  return PATHS[key as keyof typeof PATHS];
}

export function getKeyByPath(path: BCDPath): string | undefined {
  for (const [key, value] of Object.entries(PATHS)) {
    if (value === path) return key;
  }

  return undefined;
}
