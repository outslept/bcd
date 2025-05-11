type VersionValue = string | boolean | null;

type BrowserType = "desktop" | "mobile" | "xr" | "server";

type BrowserEngine =
  | "Blink"
  | "EdgeHTML"
  | "Gecko"
  | "Presto"
  | "Trident"
  | "WebKit"
  | "V8";

type BrowserStatus =
  | "retired"
  | "current"
  | "exclusive"
  | "beta"
  | "nightly"
  | "esr"
  | "planned";

export type BrowserName =
  | "chrome"
  | "chrome_android"
  | "deno"
  | "edge"
  | "firefox"
  | "firefox_android"
  | "ie"
  | "nodejs"
  | "oculus"
  | "opera"
  | "opera_android"
  | "safari"
  | "safari_ios"
  | "samsunginternet_android"
  | "webview_android"
  | "webview_ios";

interface FlagStatement {
  type: "preference" | "runtime_flag";
  name: string;
  value_to_set?: string;
}

export interface SimpleSupportStatement {
  version_added: VersionValue;
  version_removed?: VersionValue;
  version_last?: string;
  prefix?: string;
  alternative_name?: string;
  flags?: readonly [FlagStatement, ...FlagStatement[]];
  impl_url?: string | readonly [string, string, ...string[]];
  partial_implementation?: true;
  notes?: string | readonly [string, string, ...string[]];
}

type SupportStatement =
  | SimpleSupportStatement
  | readonly [SimpleSupportStatement, SimpleSupportStatement, ...SimpleSupportStatement[]];

export type SupportBlock = Partial<Readonly<Record<BrowserName, SupportStatement>>>;

export interface StatusBlock {
  experimental: boolean;
  standard_track: boolean;
  deprecated: boolean;
}

export interface CompatStatement {
  description?: string;
  mdn_url?: string;
  spec_url?: string | readonly [string, string, ...string[]];
  tags?: readonly [string, ...string[]];
  source_file?: string;
  support: SupportBlock;
  status: StatusBlock;
}

export interface BcdFeatureData {
  __compat?: CompatStatement;
  [identifier: string]: BcdFeatureData | CompatStatement | undefined;
}

interface ReleaseStatement {
  release_date?: string;
  release_notes?: string;
  status: BrowserStatus;
  engine?: BrowserEngine;
  engine_version?: string;
}

interface BrowserStatement {
  name: string;
  type: BrowserType;
  upstream?: BrowserName;
  preview_name?: string;
  pref_url?: string;
  accepts_flags: boolean;
  accepts_webextensions: boolean;
  releases: Readonly<Record<string, ReleaseStatement>>;
}

type BrowsersData = Readonly<Record<BrowserName, BrowserStatement>>;

interface MetaData {
  version: string;
  timestamp: string;
}

export interface RootBCDData {
  __meta: MetaData;
  browsers: BrowsersData;
  api?: BcdFeatureData;
  css?: BcdFeatureData;
  html?: BcdFeatureData;
  http?: BcdFeatureData;
  javascript?: BcdFeatureData;
  manifests?: BcdFeatureData;
  mathml?: BcdFeatureData;
  svg?: BcdFeatureData;
  webassembly?: BcdFeatureData;
  webdriver?: BcdFeatureData;
  webextensions?: BcdFeatureData;
}

export interface PathInfo {
  path: string;
  fullPath: string;
  hasCompat: boolean;
  childrenKeys: Set<string>;
  depth: number;
}
