import {
  VariableDeclarationKind,
  type Project,
  type SourceFile,
} from "ts-morph";
import { transformBcdData } from "./data-transformer";
import { writeObject } from "./internal";
import { getOutputPath, isIdentifier } from "./utils";
import type { FeatureLevel, GenerationOptions } from "./types";
import type { Config } from "./index";
import type { Identifier } from "@mdn/browser-compat-data";

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

  const analyzeFeatureStructure = (
    data: Identifier,
    category: string,
    path: string[] = [],
  ): FeatureLevel[] => {
    const levels: FeatureLevel[] = [];
    const hasCompat = "__compat" in data;

    if (hasCompat || path.length > 0) {
      const currentLevel: FeatureLevel = {
        category,
        subcategory: path[0],
        feature: path[1] || path[0] || "",
        subfeature: path[2],
        path: [...path],
        hasCompat,
      };
      levels.push(currentLevel);
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key !== "__compat" && isIdentifier(value)) {
        const childLevels = analyzeFeatureStructure(
          value as Identifier,
          category,
          [...path, key],
        );
        levels.push(...childLevels);
      }
    });

    return levels;
  };

  const structure = analyzeFeatureStructure(categoryData, categoryName);

  const subcategories: Record<string, any> = {};
  const features: Record<string, any> = {};
  const subfeatures: Record<string, any> = {};

  structure.forEach((level) => {
    if (level.subcategory && level.path.length === 1) {
      if (!subcategories[level.subcategory]) {
        subcategories[level.subcategory] = [];
      }
      subcategories[level.subcategory].push(level);
    }

    if (level.path.length === 2) {
      const featurePath = level.path.join("/");
      if (!features[featurePath]) {
        features[featurePath] = [];
      }
      features[featurePath].push(level);
    }

    if (level.path.length === 3) {
      const subfeaturePath = level.path.join("/");
      if (!subfeatures[subfeaturePath]) {
        subfeatures[subfeaturePath] = [];
      }
      subfeatures[subfeaturePath].push(level);
    }
  });

  const extractDataByPath = (
    data: Identifier,
    path: string[],
  ): Identifier | null => {
    let current = data;

    for (const segment of path) {
      if (current && typeof current === "object" && segment in current) {
        current = current[segment];
      } else {
        return null;
      }
    }

    return isIdentifier(current) ? current : null;
  };

  if (options.bySubcategory) {
    Object.keys(subcategories).forEach((subcategory) => {
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
    Object.keys(features).forEach((featurePath) => {
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
    Object.keys(subfeatures).forEach((subfeaturePath) => {
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
