import path from "node:path";
import type { Config } from "../../generate-bcd-types";
import type { Project, SourceFile } from "ts-morph";

export function generateIndexFile(
  project: Project,
  config: Config,
): SourceFile {
  const outputFilePath = path.join(config.outputDir, "index.ts");

  const existingSourceFile = project.getSourceFile(outputFilePath);
  if (existingSourceFile) {
    project.removeSourceFile(existingSourceFile);
  }
  const sourceFile = project.createSourceFile(outputFilePath, "", {
    overwrite: true,
  });

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  sourceFile.addExportDeclaration({
    namedExports: [
      "BCDPath",
      "BCDCategory",
      "BCDDataType",
      "TypedBCD",
      "Root",
      "BCDGetter",
      "FeatureSupport",
      "BCDPathConstant",
    ],
    moduleSpecifier: "./bcd-types",
    isTypeOnly: true,
  });

  sourceFile.addExportDeclaration({
    namedExports: ["BCD_DATA", "FEATURES_DATA", "BROWSERS_DATA", "META_DATA"],
    moduleSpecifier: "./bcd-data",
  });

  sourceFile.addExportDeclaration({
    namedExports: [
      "getFeatureSupport",
      "getBrowsersWithSupport",
      "getMinimumSupportedVersion",
      "isFeatureDeprecated",
      "isFeatureExperimental",
      "getFeatureDescription",
      "getFeatureMDNUrl",
      "getFeatureSpecUrl",
      "getCompatibilityTable",
      "findFeaturesByPattern",
      "getPathsInCategory",
      "getFeatureStatus",
    ],
    moduleSpecifier: "./bcd-utils",
  });

  return sourceFile;
}
