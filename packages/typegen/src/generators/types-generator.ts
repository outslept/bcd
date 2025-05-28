import path from "node:path";
import { log } from "../utils";
import type { Config } from "..";
import type { PathInfo } from "../types";
import type { Project, SourceFile } from "ts-morph";

function escapeStringForTypeScriptLiteral(str: string): string {
  return str
    .replaceAll(/[\\'"]/g, String.raw`\$&`)
    .replaceAll("\n", String.raw`\n`)
    .replaceAll("\r", String.raw`\r`)
    .replaceAll("\t", String.raw`\t`);
}

export function generateTypesFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
  rootCategories: string[],
  config: Config,
): SourceFile {
  log("Starting generation of bcd-types.ts");

  const outputFilePath = path.join(config.outputDir, "bcd-types.ts");

  const existingSourceFile = project.getSourceFile(outputFilePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(outputFilePath, "", {
    overwrite: true,
  });

  const allPaths = Array.from(pathsMap.keys()).sort();

  log(`Generating BCDPath type alias with ${allPaths.length} paths`);
  const startTimeBCDPath = Date.now();

  const bcdPathTypeStringContent =
    allPaths.length > 0
      ? allPaths
          .map((p) => `'${escapeStringForTypeScriptLiteral(p)}'`)
          .join("\n  | ")
      : "never";

  sourceFile.addStatements([
    `export type BCDPath = \n  ${bcdPathTypeStringContent};`,
  ]);

  log(`BCDPath type alias generation took ${Date.now() - startTimeBCDPath}ms`);

  log("Finished generation of bcd-types.ts");
  return sourceFile;
}
