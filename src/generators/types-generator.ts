import type { CodeBlockWriter, Project, SourceFile } from 'ts-morph'
import type { PathInfo } from '../types'
import { getAllCategories } from '../utils'

export function generateTypesFile(
  project: Project,
  pathsMap: Map<string, PathInfo>,
): SourceFile {
  const sourceFile = project.createSourceFile('bcd-types.ts', '', {
    overwrite: true,
  })
  const allPaths = Array.from(pathsMap.keys()).sort((a, b) =>
    a.localeCompare(b),
  )
  const categories = getAllCategories()

  sourceFile.addStatements(`// Generated on ${new Date().toISOString()}\n`)

  sourceFile.addImportDeclaration({
    namedImports: [
      'BrowserName',
      'CompatStatement',
      'SupportStatement',
      'SimpleSupportStatement',
      'FlagStatement',
      'StatusBlock',
      'VersionValue',
    ],
    moduleSpecifier: '@mdn/browser-compat-data/types',
    isTypeOnly: true,
  })

  sourceFile.addTypeAlias({
    name: 'BCDPath',
    type: (writer) => {
      writer.newLine()
      allPaths.forEach((path) => {
        writer.write(`  | '${path}'`).newLine()
      })
    },
    isExported: true,
  })

  sourceFile.addTypeAlias({
    name: 'BCDCategory',
    type: (writer) => {
      writer.newLine()
      categories.forEach((category) => {
        writer.write(`  | '${category}'`).newLine()
      })
    },
    isExported: true,
  })

  sourceFile.addTypeAlias({
    name: 'BCDDataType',
    typeParameters: [
      {
        name: 'P',
        constraint: 'BCDPath',
      },
    ],
    type: (writer) => {
      writer.newLine()
      writer.writeLine(`  P extends \`\${string}.__compat\` ? CompatStatement :`)
      categories.forEach((category) => {
        writer.writeLine(`  P extends \`${category}\` ? any :`)
        writer.writeLine(`  P extends \`${category}.\${string}\` ? any :`)
      })
      writer.writeLine('  any;')
    },
    isExported: true,
  })

  function generateTypedBCDInterface() {
    const interfaceDeclaration = sourceFile.addInterface({
      name: 'TypedBCD',
      isExported: true,
    })

    function generateTypeForPath(
      pathInfo: PathInfo,
      interfaceDecl: {
        addProperty: (prop: {
          name: string
          type: string | ((writer: CodeBlockWriter) => void)
          hasQuestionToken?: boolean
        }) => void
      },
    ): void {
      if (pathInfo.hasCompat) {
        interfaceDecl.addProperty({
          name: '__compat',
          type: 'CompatStatement',
        })
      }

      for (const child of pathInfo.children) {
        const childPath = `${pathInfo.path}.${child}`
        const childInfo = pathsMap.get(childPath)
        if (!childInfo) continue

        let propName = child
        if (
          /^\d/.test(child) ||
          child.startsWith('@@') ||
          /[-.+*/&:\s]/.test(child)
        ) {
          propName = `'${child}'`
        }

        if (childInfo.children.length > 0 || childInfo.hasCompat) {
          interfaceDecl.addProperty({
            name: propName,
            type: (writer: CodeBlockWriter) => {
              writer.block(() => {
                if (childInfo.hasCompat) {
                  writer.writeLine('__compat: CompatStatement;')
                }

                for (const nestedChild of childInfo.children) {
                  const nestedChildPath = `${childInfo.path}.${nestedChild}`
                  const nestedChildInfo = pathsMap.get(nestedChildPath)
                  if (nestedChildInfo) {
                    let nestedPropName = nestedChild
                    if (
                      /^\d/.test(nestedChild) ||
                      nestedChild.startsWith('@@') ||
                      /[-.+*/&:\s]/.test(nestedChild)
                    ) {
                      nestedPropName = `'${nestedChild}'`
                    }

                    if (
                      nestedChildInfo.children.length > 0 ||
                      nestedChildInfo.hasCompat
                    ) {
                      writer.write(`${nestedPropName}?: `)
                      writer.block(() => {
                        const nestedInterfaceDecl = {
                          addProperty: (prop: {
                            name: string
                            type: string | ((w: CodeBlockWriter) => void)
                            hasQuestionToken?: boolean
                          }) => {
                            const questionToken = prop.hasQuestionToken ? '?' : ''
                            if (typeof prop.type === 'function') {
                              writer.write(`${prop.name}${questionToken}: `)
                              prop.type(writer)
                              writer.writeLine(';')
                            } else {
                              writer.writeLine(`${prop.name}${questionToken}: ${prop.type};`)
                            }
                          },
                        }
                        generateTypeForPath(
                          nestedChildInfo,
                          nestedInterfaceDecl,
                        )
                      })
                      writer.writeLine(';')
                    } else {
                      writer.writeLine(`${nestedPropName}?: any;`)
                    }
                  }
                }
              })
            },
            hasQuestionToken: true,
          })
        } else {
          interfaceDecl.addProperty({
            name: propName,
            type: 'any',
            hasQuestionToken: true,
          })
        }
      }
    }

    for (const category of categories) {
      const categoryInfo = pathsMap.get(category)
      if (categoryInfo) {
        interfaceDeclaration.addProperty({
          name: category,
          type: (writer: CodeBlockWriter) => {
            writer.block(() => {
              for (const child of categoryInfo.children) {
                const childPath = `${category}.${child}`
                const childInfo = pathsMap.get(childPath)
                if (childInfo) {
                  let propName = child
                  if (
                    /^\d/.test(child) ||
                    child.startsWith('@@') ||
                    /[-.+*/&:\s]/.test(child)
                  ) {
                    propName = `'${child}'`
                  }

                  if (childInfo.children.length === 0 && !childInfo.hasCompat) {
                    writer.writeLine(`${propName}?: any;`)
                  } else {
                    writer.write(`${propName}?: `)
                    writer.block(() => {
                      const nestedInterfaceDecl = {
                        addProperty: (prop: {
                          name: string
                          type: string | ((w: CodeBlockWriter) => void)
                          hasQuestionToken?: boolean
                        }) => {
                          const questionToken = prop.hasQuestionToken ? '?' : ''
                          if (typeof prop.type === 'function') {
                            writer.write(`${prop.name}${questionToken}: `)
                            prop.type(writer)
                            writer.writeLine(';')
                          } else {
                            writer.writeLine(`${prop.name}${questionToken}: ${prop.type};`)
                          }
                        },
                      }
                      generateTypeForPath(childInfo, nestedInterfaceDecl)
                    })
                    writer.writeLine(';')
                  }
                }
              }
            })
          },
        })
      }
    }
  }

  generateTypedBCDInterface()

  sourceFile.addInterface({
    name: 'BCDGetter',
    isExported: true,
    properties: [
      {
        name: 'get',
        type: '<P extends BCDPath>(path: P) => BCDDataType<P>',
      },
      {
        name: 'isSupported',
        type: '(path: BCDPath, browser: BrowserName | string, version: string) => boolean',
      },
      {
        name: 'getSupportMap',
        type: '(path: BCDPath) => Record<string, SupportStatement> | undefined',
      },
      {
        name: 'getAllBrowsers',
        type: '() => string[]',
      },
      {
        name: 'getCategories',
        type: '() => string[]',
      },
      {
        name: 'raw',
        type: 'any', // Ideally: import { CompatData } from '@mdn/browser-compat-data/types'; raw: CompatData;
      },
    ],
  })

  sourceFile.addInterface({
    name: 'FeatureSupport',
    isExported: true,
    properties: [
      {
        name: 'browser',
        type: 'string',
      },
      {
        name: 'supported',
        type: 'boolean',
      },
      {
        name: 'version_added',
        type: 'VersionValue | undefined',
      },
      {
        name: 'version_removed',
        type: 'VersionValue | undefined',
        hasQuestionToken: true,
      },
      {
        name: 'prefix',
        type: 'string',
        hasQuestionToken: true,
      },
      {
        name: 'alternative_name',
        type: 'string',
        hasQuestionToken: true,
      },
      {
        name: 'partial_implementation',
        type: 'boolean',
        hasQuestionToken: true,
      },
      {
        name: 'notes',
        type: 'string | string[]',
        hasQuestionToken: true,
      },
      {
        name: 'flags',
        type: 'FlagStatement[]',
        hasQuestionToken: true,
      },
    ],
  })

  sourceFile.addInterface({
    name: 'BCDPathConstant',
    isExported: true,
    properties: [
      {
        name: '[key: string]',
        type: 'BCDPath',
      },
    ],
  })

  return sourceFile
}
