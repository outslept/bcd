import path from "node:path";
import { log } from "../utils";
import type { Config } from "../../generate-bcd-types";
import type { Project, SourceFile } from "ts-morph";

export function generateIndexFile(
  project: Project,
  config: Config,
): SourceFile {
  const outputFilePath = path.join(config.outputDir, "index.ts");

  const existingSourceFile = project.getSourceFile(outputFilePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(outputFilePath, "", {
    overwrite: true,
  });

  log("Generating index file");

  sourceFile.addExportDeclaration({
    namedExports: ["BCD_DATA", "FEATURES_DATA", "BROWSERS_DATA", "META_DATA"],
    moduleSpecifier: "./bcd-data",
  });

  sourceFile.addExportDeclaration({
    namedExports: ["transformBcdData"],
    moduleSpecifier: "../src/data-transformer",
  });

  log("Index file generation completed");
  return sourceFile;
}
