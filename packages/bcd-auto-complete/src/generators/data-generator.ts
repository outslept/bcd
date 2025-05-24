import path from "node:path";
import {
  VariableDeclarationKind,
  type CodeBlockWriter,
  type Project,
  type SourceFile,
} from "ts-morph";
import { transformBcdData } from "../data-transformer";
import { ensureDir, getOutputPath, log } from "../utils";
import type { Config } from "../../generate-bcd-types";
import type { BrowsersData, RootBCDData } from "../types";
import type { Identifier } from "@mdn/browser-compat-data";

function stripUndefinedValues(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedValues).filter((v) => v !== undefined);
  }

  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([k, v]) => [k, stripUndefinedValues(v)])
        .filter(([, v]) => v !== undefined),
    );
  }

  return obj;
}

function writeValue(
  writer: CodeBlockWriter,
  value: unknown,
  indentLevel: number,
): void {
  if (value === undefined) throw new Error("Unsupported value type: undefined");

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
        writer.withIndentationLevel(indentLevel + 1, () => {
          writeValue(writer, item, indentLevel + 1);
        });
        if (index < value.length - 1) writer.write(",");
        writer.newLine();
      });
      writer.withIndentationLevel(indentLevel, () => writer.write("]"));
    } else {
      writer.write("]");
    }
  } else if (typeof value === "object" && value !== null) {
    writeObject(writer, value as Record<string, unknown>, indentLevel);
  } else {
    throw new Error(`Unsupported value type: ${typeof value}`);
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

function objectToWriterFunction(
  obj: unknown,
): (writer: CodeBlockWriter) => void {
  const cleanedData = stripUndefinedValues(obj);
  return (writer) =>
    writeObject(writer, cleanedData as Record<string, unknown>, 0);
}

export function generateBcdCategoryDataFile(
  project: Project,
  categoryName: string,
  categoryData: Identifier,
  browsersData: BrowsersData,
  config: Config,
): SourceFile | undefined {
  log(`Starting generation of data file for category: ${categoryName}`);

  const transformedData = transformBcdData(categoryData, browsersData);
  if (!transformedData) {
    log(`No data to generate for category: ${categoryName}. Skipping.`);
    return undefined;
  }

  const dataSubDir = path.join(
    getOutputPath("", { outputDir: config.outputDir }),
    "data-parts",
  );
  ensureDir(dataSubDir);

  const fileName = `${categoryName.toLowerCase()}-data.ts`;
  const filePath = path.join(dataSubDir, fileName);

  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });
  const constName = `${categoryName.toUpperCase()}_DATA`;

  try {
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: constName,
          initializer: objectToWriterFunction(transformedData),
        },
      ],
      isExported: true,
    });
  } catch (error) {
    log(
      `Error generating ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }

  log(`Finished generation for ${fileName}`);
  return sourceFile;
}

export function generateAggregatedDataFile(
  project: Project,
  featureCategories: string[],
  allData: RootBCDData,
  config: Config,
): SourceFile {
  log("Starting generation of aggregated bcd-data.ts file");
  const filePath = getOutputPath("bcd-data.ts", {
    outputDir: config.outputDir,
  });

  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  try {
    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: "BROWSERS_DATA",
          initializer: objectToWriterFunction(allData.browsers),
        },
      ],
    });

    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
      declarations: [
        {
          name: "META_DATA",
          initializer: objectToWriterFunction(allData.__meta),
        },
      ],
    });

    const properties: string[] = [];

    for (const categoryName of featureCategories) {
      const modulePath = `./data-parts/${categoryName.toLowerCase()}-data`;
      const constName = `${categoryName.toUpperCase()}_DATA`;
      const propertyName = categoryName;

      sourceFile.addImportDeclaration({
        namedImports: [constName],
        moduleSpecifier: modulePath,
      });
      properties.push(`${propertyName}: ${constName}`);
    }

    sourceFile.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "FEATURES_DATA",
          initializer: (writer) => {
            writer.writeLine("{");
            properties.forEach((prop) => {
              writer.withIndentationLevel(1, () =>
                writer.writeLine(`${prop},`),
              );
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
  } catch (error) {
    log(
      `Error generating aggregated data file: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new Error("Failed to generate aggregated data file");
  }

  log("Finished generation of aggregated bcd-data.ts");
  return sourceFile;
}
