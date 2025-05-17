import type {
  BrowserName,
  BrowserStatement,
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
} from "@mdn/browser-compat-data";

export type BrowsersData = Readonly<Record<BrowserName, BrowserStatement>>;

export interface MetaData {
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
  childrenKeys: Set<string>;
  depth: number;
}

export type ValidatableData =
  | {
      [key: string]: unknown;
    }
  | BrowsersData;

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  code?: string;
  suggestion?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fixedData?: ValidatableData;
}

export type DataFixer = (data: ValidatableData) => Promise<ValidatableData>;

export interface TransformedIdentifier extends Omit<Identifier, "__compat"> {
  __compat?: TransformedCompatStatement | any; // fix typing
}

export interface TransformedCompatStatement
  extends Omit<CompatStatement, "support"> {
  support: TransformedSupportBlock;
}

export type TransformedSupportBlock = {
  [K in BrowserName]?: TransformedSupportStatement;
};

export type TransformedSupportStatement =
  | TransformedSimpleSupportStatement
  | readonly [
      TransformedSimpleSupportStatement,
      ...TransformedSimpleSupportStatement[],
    ]
  | "mirror";

export interface TransformedSimpleSupportStatement
  extends SimpleSupportStatement {
  _original?: SimpleSupportStatement;
  _autoFixed?: boolean;
}

export interface GeneratorOptions {
  strict: boolean;
  autoFix: boolean;
  preserveOriginalData?: boolean;
  validateOnly?: boolean;
}

export interface ProcessingContext {
  currentPath: string[];
  options: GeneratorOptions;
  errors: ValidationError[];
  fixes: Map<string, unknown>;
}
