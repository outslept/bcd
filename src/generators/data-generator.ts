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
import type { BcdFeatureData, BrowsersData, RootBCDData } from "../types";

function writeValue(
  writer: CodeBlockWriter,
  value: any,
  indentLevel: number,
): void {
  if (typeof value === "string") {
    if (value === "mirror") {
      writer.quote(value);
    } else {
      writer.quote(
        value
          .replaceAll("'", String.raw`\'`)
          .replaceAll(/\r\n|\r|\n/g, String.raw`\n`),
      );
    }
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
        if (index < value.length - 1) {
          writer.write(",");
        }
        writer.newLine();
      });
      writer.withIndentationLevel(indentLevel, () => {
        writer.write("]");
      });
    } else {
      writer.write("]");
    }
  } else if (typeof value === "object" && value !== null) {
    writeObject(writer, value, indentLevel);
  } else {
    writer.write("undefined");
  }
}

function writeObject(
  writer: CodeBlockWriter,
  obj: Record<string, any>,
  indentLevel: number,
): void {
  writer.write("{");
  const entries = Object.entries(obj);
  if (entries.length > 0) {
    writer.newLine();
    entries.forEach(([key, val], index) => {
      const safeKey =
        /^[a-z_$][\w$]*$/i.test(key) && Number.isNaN(Number(key))
          ? key
          : `'${key.replaceAll("'", String.raw`\'`)}'`;
      writer.withIndentationLevel(indentLevel + 1, () => {
        writer.write(`${safeKey}: `);
        writeValue(writer, val, indentLevel + 1);
      });
      if (index < entries.length - 1) {
        writer.write(",");
      }
      writer.newLine();
    });
    writer.withIndentationLevel(indentLevel, () => {
      writer.write("}");
    });
  } else {
    writer.write("}");
  }
}

function objectToWriterFunction(obj: any): (writer: CodeBlockWriter) => void {
  return (writer) => writeObject(writer, obj, 0);
}

export function generateBcdCategoryDataFile(
  project: Project,
  categoryName: string,
  categoryData: BcdFeatureData,
  browsersData: BrowsersData,
  config: Config,
): SourceFile | undefined {
  log(`Starting generation of data file for category: ${categoryName}...`);

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
  if (existingSourceFile) {
    project.removeSourceFile(existingSourceFile);
  }
  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  const constName = `${categoryName.toUpperCase()}_DATA`;

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

  log(`Finished generation for ${fileName}.`);
  return sourceFile;
}

export function generateAggregatedDataFile(
  project: Project,
  featureCategories: string[],
  allData: RootBCDData,
  config: Config,
): SourceFile {
  log("Starting generation of aggregated bcd-data.ts file...");
  const filePath = getOutputPath("bcd-data.ts", {
    outputDir: config.outputDir,
  });

  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) {
    project.removeSourceFile(existingSourceFile);
  }
  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  const properties: string[] = [];

  sourceFile.addImportDeclaration({
    moduleSpecifier: config.typesPath,
    namedImports: ["BrowsersData", "MetaData", "RootBCDData"],
    isTypeOnly: true,
  });

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
            writer.withIndentationLevel(1, () => {
              writer.writeLine(`${prop},`);
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

  log("Finished generation of aggregated bcd-data.ts.");
  return sourceFile;
}
