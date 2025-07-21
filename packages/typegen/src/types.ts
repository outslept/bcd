import type {
  BrowserName,
  BrowserStatement,
  Identifier,
} from "@mdn/browser-compat-data";

export type BrowsersData = Readonly<Record<BrowserName, BrowserStatement>>;

interface MetaData extends Record<string, unknown> {
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

export interface Config {
  outputDir: string;
  pathSeparator: string;
}
