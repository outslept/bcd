import { defineConfig } from "tsdown";

export default defineConfig({
  publint: true,
  platform: "neutral",
  dts: true,
  removeNodeProtocol: false,
  external: [
    "node:fs",
    "node:path",
    "node:process",
    "node:url",
    "@mdn/browser-compat-data",
    "ts-morph",
  ],
  shims: true,
});
