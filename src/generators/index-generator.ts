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
      'CompatStatement',
      'SupportStatement',
      'SimpleSupportStatement',
      'FlagStatement',
      'StatusBlock',
      'VersionValue',
      'BrowserName',
      'MetaData',
      'BrowsersData',
      'BrowserStatement',
      'ReleaseStatement',
      'BcdFeatureData'
    ],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  });

  sourceFile.addExportDeclaration({
    namedExports: ['BCD'],
    moduleSpecifier: './bcd-proxy',
  });

  sourceFile.addExportDeclaration({
    namedExports: ['PATHS', 'getPathByKey', 'getKeyByPath'],
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
      'getFeatureMDNUrl',
      'getFeatureSpecUrl',
      'getCompatibilityTable',
      'findFeaturesByPattern',
      'getPathsInCategory',
      'getFeatureStatus',
    ],
    moduleSpecifier: './bcd-utils',
  });

  sourceFile.addExportDeclaration({
    moduleSpecifier: './bcd-base-types',
    isTypeOnly: true
  });


  sourceFile.formatText();
  return sourceFile;
}
