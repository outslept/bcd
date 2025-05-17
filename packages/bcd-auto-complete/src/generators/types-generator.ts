import path from "node:path";
import { log } from "../utils";
import type { Config } from "../../generate-bcd-types";
import type { PathInfo } from "../types";
import type { Project, SourceFile } from "ts-morph";

function escapeStringForTypeScriptLiteral(str: string): string {
  return str
    .replaceAll(/[\\'"]/g, String.raw`\$&`)
    .replaceAll("\n", String.raw`\n`)
    .replaceAll("\r", String.raw`\r`)
    .replaceAll("\t", String.raw`\t`);
}

function escapeForTemplateLiteral(str: string): string {
  return str.replaceAll(/[${}`\\]/g, String.raw`\$&`);
}

export function generateTypesFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
  rootCategories: string[],
  config: Config,
): SourceFile {
  log("Starting generation of bcd-types.ts");

  const sourceFileName = "bcd-types.ts";
  const outputFilePath = path.join(config.outputDir, sourceFileName);

  const existingSourceFile = project.getSourceFile(outputFilePath);
  if (existingSourceFile) {
    project.removeSourceFile(existingSourceFile);
  }

  const sourceFile = project.createSourceFile(outputFilePath, "", {
    overwrite: true,
  });

  log("Adding base BCD type imports and re-exports");

  // TODO
  // I can't figure out how to do the proper importing
  
  const allPaths = Array.from(pathsMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

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

  log("Generating BCDCategory type alias");
  sourceFile.addTypeAlias({
    name: "BCDCategory",
    type:
      rootCategories.length > 0
        ? rootCategories
            .map((c) => `'${escapeStringForTypeScriptLiteral(c)}'`)
            .join(" | ")
        : "never",
    isExported: true,
  });

  sourceFile.addTypeAlias({
    name: "TypedBCD",
    type: "RootBCDData",
    isExported: true,
  });

  const escapedPathSeparatorForTemplate = escapeForTemplateLiteral(
    config.pathSeparator,
  );

  log("Generating BCDDataType type alias");
  const startTimeBCDDataType = Date.now();

  const internalHelperName = "_BCDDataTypeRecursive";
  sourceFile.addTypeAlias({
    name: internalHelperName,
    typeParameters: [
      { name: "PathPart", constraint: "string" },
      { name: "CurrentContext", constraint: "any" },
    ],
    type: `PathPart extends keyof CurrentContext
      ? CurrentContext[PathPart]
      : PathPart extends \`\${infer K1}${escapedPathSeparatorForTemplate}\${infer Rest}\`
        ? K1 extends keyof CurrentContext
          ? ${internalHelperName}<Rest, NonNullable<CurrentContext[K1]>>
          : never
        : never`,
  });

  sourceFile.addTypeAlias({
    name: "BCDDataType",
    typeParameters: [
      { name: "P", constraint: "BCDPath" },
      { name: "T", constraint: "any", default: "RootBCDData" },
    ],
    type: `P extends \`\${string}${escapedPathSeparatorForTemplate}__compat\`
      ? CompatStatement
      : ${internalHelperName}<P, T>`,
    isExported: true,
  });

  log(`BCDDataType generation took ${Date.now() - startTimeBCDDataType}ms`);

  log("Adding BCDGetter interface");
  sourceFile.addInterface({
    name: "BCDGetter",
    isExported: true,
    properties: [
      {
        name: "get",
        type: "<P extends BCDPath>(path: P) => BCDDataType<P>",
      },
      {
        name: "isSupported",
        type: "(path: BCDPath, browser: BrowserName, version: string) => boolean",
      },
      {
        name: "getSupportMap",
        type: "(path: BCDPath) => Readonly<Record<BrowserName, SupportStatement>> | undefined",
      },
      {
        name: "getAllBrowsers",
        type: "() => readonly BrowserName[]",
      },
      {
        name: "getCategories",
        type: "() => readonly BCDCategory[]",
      },
    ],
    methods: [
      {
        name: "raw",
        returnType: "Readonly<RootBCDData>",
      },
    ],
  });

  log("Adding FeatureSupport interface");
  sourceFile.addInterface({
    name: "FeatureSupport",
    isExported: true,
    properties: [
      { name: "browser", type: "BrowserName" },
      { name: "supported", type: "boolean" },
      {
        name: "version_added",
        type: "VersionValue | undefined",
        hasQuestionToken: true,
      },
      {
        name: "version_removed",
        type: "VersionValue | undefined",
        hasQuestionToken: true,
      },
      { name: "prefix", type: "string", hasQuestionToken: true },
      {
        name: "alternative_name",
        type: "string",
        hasQuestionToken: true,
      },
      {
        name: "partial_implementation",
        type: "boolean",
        hasQuestionToken: true,
      },
      {
        name: "notes",
        type: "string | readonly string[] | undefined",
        hasQuestionToken: true,
      },
      {
        name: "flags",
        type: "readonly FlagStatement[] | undefined",
        hasQuestionToken: true,
      },
    ],
  });

  log("Adding BCDPathConstant interface");
  sourceFile.addInterface({
    name: "BCDPathConstant",
    isExported: true,
    properties: [{ name: "[key: string]", type: "BCDPath" }],
  });

  log("Finished generation of bcd-types.ts");
  return sourceFile;
}
