import type { Project, SourceFile } from 'ts-morph';

export function generateIndexFile(project: Project): SourceFile {
  const sourceFile = project.createSourceFile('index.ts', '', {
    overwrite: true,
  });

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`);

  sourceFile.addExportDeclaration({
    namedExports: [
      'BCDPath',
      'BCDCategory',
      'BCDDataType',
      'TypedBCD',
      'BCDGetter',
      'FeatureSupport',
      'BCDPathConstant',
    ],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
    leadingTrivia: (writer) => writer.writeLine('// Export types'),
  });

  sourceFile.addExportDeclaration({
    namedExports: ['BCD'],
    moduleSpecifier: './bcd-proxy',
    leadingTrivia: (writer) =>
      writer.writeLine('\n// Export main BCD proxy and constants'),
  });

  sourceFile.addExportDeclaration({
    namedExports: ['PATHS', 'createPathKey', 'getPathByKey', 'getKeyByPath'],
    moduleSpecifier: './bcd-paths',
  });

  sourceFile.addExportDeclaration({
    namedExports: [
      'getFeatureSupport',
      'getBrowsersWithSupport',
      'getMinimumSupportedVersion',
      'isFeatureDeprecated',
      'isFeatureExperimental',
      'getFeatureDescription',
      'getFeatureUrl',
      'getFeatureSpecUrl',
      'getCompatibilityTable',
      'findFeaturesByPattern',
      'getPathsInCategory',
      'getFeatureStatus',
    ],
    moduleSpecifier: './bcd-utils',
    leadingTrivia: (writer) =>
      writer.writeLine('\n// Export utility functions'),
  });

  return sourceFile;
}
