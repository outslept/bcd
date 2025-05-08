import type { Project, SourceFile } from 'ts-morph'
import type { PathInfo } from '../types'
import { VariableDeclarationKind } from 'ts-morph'
import { createPathKey } from '../utils'

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

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`)

  sourceFile.addImportDeclaration({
    namedImports: ['BCDPath', 'BCDPathConstant'],
    moduleSpecifier: './bcd-types',
    isTypeOnly: true,
  })

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
  })

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
  })

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
  })

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
  })

  return sourceFile
}
