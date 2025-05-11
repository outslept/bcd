import type { Project, SourceFile, CodeBlockWriter } from 'ts-morph';
import { VariableDeclarationKind } from 'ts-morph';
import { log, getOutputPath, ensureDir } from '../utils';
import type { BcdFeatureData } from '../types';
import { transformBcdData } from '../data-transformer';
import path from 'node:path';

function writeValue(writer: CodeBlockWriter, value: any, indentLevel: number): void {
  if (typeof value === 'string') {
    writer.quote(value.replace(/'/g, "\\'").replace(/\r\n|\r|\n/g, '\\n'));
  } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    writer.write(String(value));
  } else if (Array.isArray(value)) {
    writer.write('[');
    if (value.length > 0) {
      writer.newLine();
      value.forEach((item, index) => {
        writer.withIndentationLevel(indentLevel + 1, () => {
            writeValue(writer, item, indentLevel + 1);
        });
        if (index < value.length - 1) {
          writer.write(',');
        }
        writer.newLine();
      });
      writer.withIndentationLevel(indentLevel, () => {
        writer.write(']');
      });
    } else {
      writer.write(']');
    }
  } else if (typeof value === 'object' && value !== null) {
    writeObject(writer, value, indentLevel);
  } else {
    writer.write('undefined');
  }
}

function writeObject(writer: CodeBlockWriter, obj: Record<string, any>, indentLevel: number): void {
  writer.write('{');
  const entries = Object.entries(obj);
  if (entries.length > 0) {
    writer.newLine();
    entries.forEach(([key, val], index) => {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && isNaN(Number(key)) ? key : `'${key.replace(/'/g, "\\'")}'`;
      writer.withIndentationLevel(indentLevel + 1, () => {
          writer.write(`${safeKey}: `);
          writeValue(writer, val, indentLevel + 1);
      });
      if (index < entries.length - 1) {
        writer.write(',');
      }
      writer.newLine();
    });
    writer.withIndentationLevel(indentLevel, () => {
        writer.write('}');
    });
  } else {
    writer.write('}');
  }
}

function objectToWriterFunction(obj: any): (writer: CodeBlockWriter) => void {
  return writer => writeObject(writer, obj, 0);
}

export function generateBcdCategoryDataFile(
  project: Project,
  categoryName: string,
  categoryData: BcdFeatureData
): SourceFile | undefined {
  log(`Starting generation of data file for category: ${categoryName}...`);

  const transformedData = transformBcdData(categoryData);
  if (!transformedData) {
    log(`No data to generate for category: ${categoryName}. Skipping.`);
    return undefined;
  }

  const dataSubDir = path.join(getOutputPath(''), 'bcd');
  ensureDir(dataSubDir);

  const fileName = `${categoryName.toLowerCase()}-bcd.ts`;
  const filePath = path.join(dataSubDir, fileName);

  const sourceFile = project.createSourceFile(filePath, '', { overwrite: true });

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
    featureCategories: string[]
): SourceFile {
    log('Starting generation of aggregated bcd-data.ts file...');
    const filePath = getOutputPath('bcd-data.ts');
    const sourceFile = project.createSourceFile(filePath, '', { overwrite: true });

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
        declarations: [{
            name: 'BCD_DATA',
            initializer: writer => {
                writer.writeLine('{');
                properties.forEach(prop => {
                    writer.withIndentationLevel(1, () => {
                        writer.writeLine(`${prop},`);
                    });
                });
                writer.write('}');
            },
        }],
        isExported: true,
    });

    sourceFile.addStatements('export type BCDDataType = typeof BCD_DATA;');

    log('Finished generation of aggregated bcd-data.ts.');
    return sourceFile;
}
