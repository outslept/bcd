import path from "node:path";
import {
  VariableDeclarationKind,
  type CodeBlockWriter,
  type Project,
  type SourceFile,
} from "ts-morph";
import { transformBcdData } from "../data-transformer";
import { ensureDir, getOutputPath } from "../utils";
import type { Config } from "..";
import type { BrowsersData, RootBCDData } from "../types";
import type { Identifier } from "@mdn/browser-compat-data";

function writeValue(
  writer: CodeBlockWriter,
  value: unknown,
  indentLevel: number,
): void {
  if (typeof value === "string") {
    writer.quote(
      value
        .replaceAll("'", String.raw`\'`)
        .replaceAll(/\r?\n/g, String.raw`\n`),
    );
  } else if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    writer.write(String(value));
  } else if (Array.isArray(value)) {
    writer.write("[");
    if (value.length > 0) {
      writer.newLine();
      value.forEach((item, index) => {
        writer.withIndentationLevel(indentLevel + 1, () =>
          writeValue(writer, item, indentLevel + 1),
        );
        if (index < value.length - 1) writer.write(",");
        writer.newLine();
      });
      writer.withIndentationLevel(indentLevel, () => writer.write("]"));
    } else {
      writer.write("]");
    }
  } else if (value && typeof value === "object") {
    writeObject(writer, value as Record<string, unknown>, indentLevel);
  }
}

function writeObject(
  writer: CodeBlockWriter,
  obj: Record<string, unknown>,
  indentLevel: number,
): void {
  writer.write("{");
  const entries = Object.entries(obj);
  if (entries.length > 0) {
    writer.newLine();
    entries.forEach(([key, val], index) => {
      const safeKey =
        /^[a-z_$][\w$]*$/i.test(key) && !Number.isInteger(Number(key))
          ? key
          : `'${key.replaceAll("'", String.raw`\'`)}'`;
      writer.withIndentationLevel(indentLevel + 1, () => {
        writer.write(`${safeKey}: `);
        writeValue(writer, val, indentLevel + 1);
      });
      if (index < entries.length - 1) writer.write(",");
      writer.newLine();
    });
    writer.withIndentationLevel(indentLevel, () => writer.write("}"));
  } else {
    writer.write("}");
  }
}

export function generateBcdCategoryDataFile(
  project: Project,
  categoryName: string,
  categoryData: Identifier,
  browsersData: BrowsersData,
  config: Config,
): SourceFile {
  const transformedData = transformBcdData(categoryData, browsersData);
  if (!transformedData) {
    throw new Error(`Failed to transform data for category: ${categoryName}`);
  }

  const dataSubDir = path.join(getOutputPath("", config), "data-parts");
  ensureDir(dataSubDir);

  const filePath = path.join(
    dataSubDir,
    `${categoryName.toLowerCase()}-data.ts`,
  );
  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `${categoryName.toUpperCase()}_DATA`,
        initializer: (writer) => writeObject(writer, transformedData, 0),
      },
    ],
    isExported: true,
  });

  return sourceFile;
}

export function generateAggregatedDataFile(
  project: Project,
  featureCategories: string[],
  allData: RootBCDData,
  config: Config,
): SourceFile {
  const filePath = getOutputPath("bcd-data.ts", config);
  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "BROWSERS_DATA",
        initializer: (writer) => writeObject(writer, allData.browsers, 0),
      },
    ],
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "META_DATA",
        initializer: (writer) => writeObject(writer, allData.__meta, 0),
      },
    ],
  });

  const properties: string[] = [];
  for (const categoryName of featureCategories) {
    sourceFile.addImportDeclaration({
      namedImports: [`${categoryName.toUpperCase()}_DATA`],
      moduleSpecifier: `./data-parts/${categoryName.toLowerCase()}-data`,
    });
    properties.push(`${categoryName}: ${categoryName.toUpperCase()}_DATA`);
  }

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "FEATURES_DATA",
        initializer: (writer) => {
          writer.writeLine("{");
          properties.forEach((prop) =>
            writer.withIndentationLevel(1, () => writer.writeLine(`${prop},`)),
          );
          writer.write("}");
        },
      },
    ],
    isExported: true,
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "BCD_DATA",
        initializer: (writer) => {
          writer.writeLine("{");
          writer.withIndentationLevel(1, () => {
            writer.writeLine("__meta: META_DATA,");
            writer.writeLine("browsers: BROWSERS_DATA,");
            writer.writeLine("...FEATURES_DATA,");
          });
          writer.write("}");
        },
      },
    ],
  });

  return sourceFile;
}
