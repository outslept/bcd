import path from "node:path";
import {
  VariableDeclarationKind,
  type CodeBlockWriter,
  type Project,
  type SourceFile,
} from "ts-morph";
import type { Config } from "..";
import type { RootBCDData } from "../types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

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

export function generateIndexFile(
  project: Project,
  featureCategories: string[],
  allData: RootBCDData,
  config: Config,
): SourceFile {
  const outputFilePath = path.join(config.outputDir, "index.ts");

  const existingSourceFile = project.getSourceFile(outputFilePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(outputFilePath, "", {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    namedImports: ["BROWSERS"],
    moduleSpecifier: "./browsers",
  });

  const categoryImports: string[] = [];
  for (const categoryName of featureCategories) {
    const importName = categoryName.toUpperCase();
    sourceFile.addImportDeclaration({
      namedImports: [importName],
      moduleSpecifier: `./${categoryName.toLowerCase()}`,
    });
    categoryImports.push(importName);
  }

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "META",
        initializer: (writer) => writeObject(writer, allData.__meta, 0),
      },
    ],
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "FEATURES",
        initializer: (writer) => {
          writer.writeLine("{");
          featureCategories.forEach((categoryName, index) => {
            writer.withIndentationLevel(1, () => {
              writer.write(`${categoryName}: ${categoryName.toUpperCase()}`);
              if (index < featureCategories.length - 1) writer.write(",");
              writer.newLine();
            });
          });
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
        name: "BCD",
        initializer: (writer) => {
          writer.writeLine("{");
          writer.withIndentationLevel(1, () => {
            writer.writeLine("__meta: META,");
            writer.writeLine("browsers: BROWSERS,");
            writer.write("...FEATURES");
          });
          writer.newLine();
          writer.write("}");
        },
      },
    ],
  });

  return sourceFile;
}
