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
      'Root',
      'BCDGetter',
      'FeatureSupport',
      'BCDPathConstant',
    ],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  });

  sourceFile.addExportDeclaration({
    namedExports: [
      'BCD_DATA',
      'FEATURES_DATA',
      'BROWSERS_DATA',
      'META_DATA',
    ],
    moduleSpecifier: './bcd-data'
  });

  sourceFile.addExportDeclaration({
    namedExports: [
      'getFeatureSupport',
      'getBrowsersWithSupport',
      'getMinimumSupportedVersion',
      'isFeatureDeprecated',
      'isFeatureExperimental',
      'getFeatureDescription',
      'getFeatureMDNUrl',
      'getFeatureSpecUrl',
      'getCompatibilityTable',
      'findFeaturesByPattern',
      'getPathsInCategory',
      'getFeatureStatus',
    ],
    moduleSpecifier: './bcd-utils',
  });

  return sourceFile;
}
