import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { VariableDeclarationKind, type Project } from "ts-morph";
import { writeValue } from "./writer";
import type { Config } from "./types";
import type { Identifier } from "@mdn/browser-compat-data";

export function isIdentifier(value: unknown): value is Identifier {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !("support" in value) &&
    (!("name" in value) || !("releases" in value)) &&
    (!("version" in value) || !("timestamp" in value))
  );
}

export function getOutputPath(
  fileName: string,
  config: Config,
  category: string,
  subcategoryPath: string[] = [],
): string {
  let targetDir = resolve(config.outputDir, category);

  for (const subcat of subcategoryPath) {
    targetDir = resolve(targetDir, subcat);
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  return resolve(targetDir, fileName);
}

export function createConstFile(
  project: Project,
  name: string,
  data: unknown,
  filePath: string,
): void {
  const existingFile = project.getSourceFile(filePath);
  if (existingFile) project.removeSourceFile(existingFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name,
        initializer: (writer) => writeValue(writer, data, 0),
      },
    ],
  });
}
