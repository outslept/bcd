export type VersionValue = string | boolean | null;

export type BrowserType = "desktop" | "mobile" | "xr" | "server";

export type BrowserEngine =
  | "Blink"
  | "EdgeHTML"
  | "Gecko"
  | "Presto"
  | "Trident"
  | "WebKit"
  | "V8";

export type BrowserStatus =
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

export interface FlagStatement {
  type: "preference" | "runtime_flag";
  name: string;
  value_to_set?: string;
}

export interface SimpleSupportStatementBase {
  version_added: VersionValue;
  version_last?: string;
  prefix?: string;
  alternative_name?: string;
  flags?: readonly [FlagStatement, ...FlagStatement[]];
  impl_url?: string | readonly [string, string, ...string[]];
}

export type SimpleSupportStatement = SimpleSupportStatementBase & {
  version_removed?: string | true;
} & (
    | {
        partial_implementation: true;
        notes: string | readonly [string, string, ...string[]];
      }
    | {
        partial_implementation?: never;
        notes?: string | readonly [string, string, ...string[]];
      }
  );

export type SupportStatement =
  | SimpleSupportStatement
  | readonly [
      SimpleSupportStatement,
      SimpleSupportStatement,
      ...SimpleSupportStatement[],
    ]
  | "mirror";

export type SupportBlock = Partial<
  Readonly<Record<BrowserName, SupportStatement>>
>;

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

export type ReleaseStatement = {
  release_date?: string;
  release_notes?: string;
  status: BrowserStatus;
} & (
  | { engine: BrowserEngine; engine_version: string }
  | { engine?: never; engine_version?: never }
);

export interface BrowserStatement {
  name: string;
  type: BrowserType;
  upstream?: BrowserName;
  preview_name?: string;
  pref_url?: string;
  accepts_flags: boolean;
  accepts_webextensions: boolean;
  releases: Readonly<Record<string, ReleaseStatement>>;
}

export type BrowsersData = Readonly<Record<BrowserName, BrowserStatement>>;

export interface MetaData {
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
