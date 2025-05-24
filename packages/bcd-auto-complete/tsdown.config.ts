import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./index.ts"],
  target: "node20",
  clean: true,
  dts: true,
  publint: true,
  platform: "neutral",
});
