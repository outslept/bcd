import path from "node:path";
import type { Config } from "..";
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

  sourceFile.addExportDeclaration({
    namedExports: ["BCD_DATA", "FEATURES_DATA", "BROWSERS_DATA", "META_DATA"],
    moduleSpecifier: "./bcd-data",
  });

  return sourceFile;
}
