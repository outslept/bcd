import {
  VariableDeclarationKind,
  type CodeBlockWriter,
  type Project,
  type SourceFile,
} from "ts-morph";
import { getOutputPath } from "../utils";
import type { Config } from "..";
import type { RootBCDData } from "../types";

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

function needsQuotes(key: string): boolean {
  if (key.length === 0) return true;
  if (/^\d/.test(key)) return true;
  if (!/^[a-z_$][\w$]*$/i.test(key)) return true;
  return false;
}

function writeObject(
  writer: CodeBlockWriter,
  obj: unknown,
  indentLevel: number,
): void {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    writer.write("{}");
    return;
  }

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

export function generateBrowserFiles(
  project: Project,
  allData: RootBCDData,
  config: Config,
): SourceFile[] {
  const generatedFiles: SourceFile[] = [];

  Object.entries(allData.browsers).forEach(([browserName, browserData]) => {
    const fileName = `${browserName}.ts`;
    const constName = browserName.replaceAll("-", "_");

    const filePath = getOutputPath(fileName, config, "browsers");
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
          name: constName,
          initializer: (writer) =>
            writeObject(
              writer,
              browserData as unknown as Record<string, unknown>,
              0,
            ),
        },
      ],
    });

    generatedFiles.push(sourceFile);
  });

  return generatedFiles;
}
