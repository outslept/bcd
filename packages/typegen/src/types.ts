import type {
  BrowserName,
  BrowserStatement,
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
} from "@mdn/browser-compat-data";

export type BrowsersData = Readonly<Record<BrowserName, BrowserStatement>>;

export interface MetaData extends Record<string, unknown> {
  version: string;
  timestamp: string;
}

export interface RootBCDData {
  __meta: MetaData;
  browsers: BrowsersData;
  api?: Identifier;
  css?: Identifier;
  html?: Identifier;
  http?: Identifier;
  javascript?: Identifier;
  manifests?: Identifier;
  mathml?: Identifier;
  svg?: Identifier;
  webassembly?: Identifier;
  webdriver?: Identifier;
  webextensions?: Identifier;
}

export interface PathInfo {
  path: string;
  fullPath: string;
  hasCompat: boolean;
  depth: number;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fixedData?: Record<string, unknown> | BrowsersData;
}

export interface TransformedCompatStatement
  extends Omit<CompatStatement, "support"> {
  support: Record<
    BrowserName,
    SimpleSupportStatement | SimpleSupportStatement[]
  >;
}

export interface ProcessingContext {
  currentPath: string[];
  errors: ValidationError[];
}
