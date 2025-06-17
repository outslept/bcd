import {
  VariableDeclarationKind,
  type CodeBlockWriter,
  type Project,
  type SourceFile,
} from "ts-morph";
import { transformBcdData } from "../data-transformer";
import { getOutputPath } from "../utils";
import type { Config } from "..";
import type { BrowsersData } from "../types";
import { isRecord } from "./index-generator";
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
  } else if (isRecord(value)) {
    writeObject(writer, value, indentLevel);
  }
}

function needsQuotes(key: string): boolean {
  if (key.length === 0) return true;
  if (/^\d/.test(key)) return true;
  if (!/^[a-z_$][\w$]*$/i.test(key)) return true;

  return false;
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
      const safeKey = needsQuotes(key)
        ? `'${key.replaceAll("'", String.raw`\'`)}'`
        : key;

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

export function generateBcdCategoryFile(
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

  const filePath = getOutputPath(`${categoryName.toLowerCase()}.ts`, config);
  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: categoryName.toUpperCase(),
        initializer: (writer) => writeObject(writer, transformedData, 0),
      },
    ],
    isExported: true,
  });

  return sourceFile;
}

export function generateBrowsersFile(
  project: Project,
  browsersData: BrowsersData,
  config: Config,
): SourceFile {
  const filePath = getOutputPath("browsers.ts", config);
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
        name: "BROWSERS",
        initializer: (writer) => writeObject(writer, browsersData, 0),
      },
    ],
  });

  return sourceFile;
}
