import {
  VariableDeclarationKind,
  type Project,
  type SourceFile,
} from "ts-morph";
import { writeObject } from "./internal";
import { getOutputPath } from "./utils";
import type { RootBCDData } from "./types";
import type { Config } from "./index";

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
