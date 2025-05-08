import type { Project, SourceFile } from 'ts-morph'
import type { PathInfo } from '../lib/types'
import { VariableDeclarationKind } from 'ts-morph'
import { createPathKey } from '../lib/utils'

/**
 * Generates the paths constants file for type-safe path access
 */
export function generatePathsFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
): SourceFile {
  const sourceFile = project.createSourceFile('bcd-paths.ts', '', {
    overwrite: true,
  })
  const allPaths = Array.from(pathsMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  )
  const uniqueKeys = new Map<string, string>()

  // Add generation date
  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`)

  // Imports
  sourceFile.addImportDeclaration({
    namedImports: ['BCDPath', 'BCDPathConstant'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  })

  // createPathKey function
  sourceFile.addFunction({
    name: 'createPathKey',
    parameters: [
      {
        name: 'path',
        type: 'string',
      },
    ],
    returnType: 'string',
    statements: [
      'return path.replace(/\\./g, \'_\').replace(/-/g, \'_\').replace(/@@/g, \'at_at_\');',
    ],
    isExported: true,
    docs: [
      'Utility function to create a valid JavaScript key from a BCD path.',
      'Replaces invalid characters with underscores and handles special prefixes.',
      '@param path The BCD path string.',
      '@returns A valid JavaScript key derived from the path.',
    ],
  })

  // PATHS constant
  const pathConstants: { key: string, path: string }[] = []
  for (const path of allPaths) {
    let safeKey = createPathKey(path)
    if (uniqueKeys.has(safeKey)) {
      let counter = 1
      while (uniqueKeys.has(`${safeKey}_${counter}`)) {
        counter++
      }
      safeKey = `${safeKey}_${counter}`
    }
    uniqueKeys.set(safeKey, path)
    pathConstants.push({ key: safeKey, path })
  }

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'PATHS',
        type: 'BCDPathConstant',
        initializer: (writer) => {
          writer.block(() => {
            pathConstants.forEach(({ key, path }) => {
              writer.writeLine(`${key}: '${path}' as BCDPath,`)
            })
          })
        },
      },
    ],
    isExported: true,
    docs: [
      'Object containing constants for all valid BCD paths.',
      'Use these constants instead of string literals for type-safe path access.',
    ],
  })

  // getPathByKey function
  sourceFile.addFunction({
    name: 'getPathByKey',
    parameters: [
      {
        name: 'key',
        type: 'string',
      },
    ],
    returnType: 'BCDPath | undefined',
    statements: ['return PATHS[key];'],
    isExported: true,
    docs: [
      'Utility function to get a BCD path by its constant key from the PATHS object.',
      '@param key The constant key (e.g., \'api_Element_querySelector\').',
      '@returns The corresponding BCD path, or undefined if key is not found.',
    ],
  })

  // getKeyByPath function
  sourceFile.addFunction({
    name: 'getKeyByPath',
    parameters: [
      {
        name: 'path',
        type: 'BCDPath',
      },
    ],
    returnType: 'string | undefined',
    statements: [
      'for (const [key, value] of Object.entries(PATHS)) {',
      '  if (value === path) return key;',
      '}',
      'return undefined;',
    ],
    isExported: true,
    docs: [
      'Utility function to get a constant key by its BCD path from the PATHS object.',
      'Provides reverse lookup functionality for path constants.',
      '@param path The BCD path string.',
      '@returns The corresponding constant key, or undefined if path is not found.',
    ],
  })

  return sourceFile
}
