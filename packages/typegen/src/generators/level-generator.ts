import {
  VariableDeclarationKind,
  type CodeBlockWriter,
  type Project,
  type SourceFile,
} from "ts-morph";
import { transformBcdData } from "../data-transformer";
import {
  analyzeFeatureStructure,
  extractDataByPath,
  getOutputPath,
  groupByLevel,
} from "../utils";
import type { Config } from "..";
import type { GenerationOptions } from "../types";
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

function generateDataFile(
  project: Project,
  fileName: string,
  constName: string,
  data: Record<string, unknown>,
  config: Config,
  category: string,
): SourceFile {
  const filePath = getOutputPath(fileName, config, category);
  const existingSourceFile = project.getSourceFile(filePath);
  if (existingSourceFile) project.removeSourceFile(existingSourceFile);

  const sourceFile = project.createSourceFile(filePath, "", {
    overwrite: true,
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: constName,
        initializer: (writer) => writeObject(writer, data, 0),
      },
    ],
    isExported: true,
  });

  return sourceFile;
}

export function generateFilesByLevel(
  project: Project,
  categoryName: string,
  categoryData: Identifier,
  options: GenerationOptions,
  config: Config,
): SourceFile[] {
  const generatedFiles: SourceFile[] = [];
  const structure = analyzeFeatureStructure(categoryData, categoryName);
  const grouped = groupByLevel(structure);

  if (options.bySubcategory) {
    Object.keys(grouped.subcategories).forEach((subcategory) => {
      const fileName = `${subcategory}.ts`;
      const constName = subcategory.replaceAll("-", "_");

      const subcategoryData = extractDataByPath(categoryData, [subcategory]);
      if (subcategoryData) {
        const transformedData = transformBcdData(subcategoryData);
        if (transformedData) {
          const file = generateDataFile(
            project,
            fileName,
            constName,
            transformedData,
            config,
            categoryName,
          );
          generatedFiles.push(file);
        }
      }
    });
  }

  if (options.byFeature) {
    Object.keys(grouped.features).forEach((featurePath) => {
      const pathParts = featurePath.split("/");
      const fileName = `${pathParts.join("-")}.ts`;
      const constName = pathParts.join("_").replaceAll("-", "_");

      const featureData = extractDataByPath(categoryData, pathParts);
      if (featureData) {
        const transformedData = transformBcdData(featureData);
        if (transformedData) {
          const file = generateDataFile(
            project,
            fileName,
            constName,
            transformedData,
            config,
            categoryName,
          );
          generatedFiles.push(file);
        }
      }
    });
  }

  if (options.bySubfeature) {
    Object.keys(grouped.subfeatures).forEach((subfeaturePath) => {
      const pathParts = subfeaturePath.split("/");
      const fileName = `${pathParts.join("-")}.ts`;
      const constName = pathParts.join("_").replaceAll("-", "_");

      const subfeatureData = extractDataByPath(categoryData, pathParts);
      if (subfeatureData) {
        const transformedData = transformBcdData(subfeatureData);
        if (transformedData) {
          const file = generateDataFile(
            project,
            fileName,
            constName,
            transformedData,
            config,
            categoryName,
          );
          generatedFiles.push(file);
        }
      }
    });
  }

  return generatedFiles;
}
