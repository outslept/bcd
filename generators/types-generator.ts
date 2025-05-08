import type { CodeBlockWriter, Project, SourceFile } from 'ts-morph'
import type { PathInfo } from '../lib/types'
import { getAllCategories } from '../lib/utils'

// Generates the core type definitions that power the type system of this package
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
    ],
    moduleSpecifier: '@mdn/browser-compat-data',
    isTypeOnly: true,
  })

  // BCDPath - Union type of all valid paths in the BCD structure
  // This enables TypeScript to check path validity at compile time
  sourceFile.addTypeAlias({
    name: 'BCDPath',
    type: (writer) => {
      writer.newLine()
      allPaths.forEach((path) => {
        writer.write(`  | '${path}'`).newLine()
      })
    },
    isExported: true,
    leadingTrivia: writer =>
      writer.writeLine(
        '\n/**\n * Union type of all valid Browser Compatibility Data (BCD) paths.\n * Use this type to ensure type safety when accessing BCD data.\n */',
      ),
  })

  // BCDCategory - Union type of all top-level categories in the BCD structure
  // Useful for restricting operations to valid categories
  sourceFile.addTypeAlias({
    name: 'BCDCategory',
    type: (writer) => {
      writer.newLine()
      categories.forEach((category) => {
        writer.write(`  | '${category}'`).newLine()
      })
    },
    isExported: true,
    leadingTrivia: writer =>
      writer.writeLine(
        '\n/**\n * Union type of all top-level BCD categories.\n * Categories represent the main sections of BCD data (e.g., \'api\', \'css\').\n */',
      ),
  })

  // BCDDataType - Conditional type that maps paths to their corresponding data types
  // This is what enables getting the correct return type when accessing data by path
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
        writer.writeLine(`  P extends \`${category}.\${string}\` ? any :`)
      })
      writer.newLine()
      writer.writeLine(`  P extends \`\${string}.__compat\` ? CompatStatement :`)
      categories.forEach((category) => {
        writer.writeLine(`  P extends \`${category}.\${string}\` ? any :`)
      })
      writer.writeLine('  any; // Fallback type for any other path')
    },
    isExported: true,
    leadingTrivia: writer =>
      writer.writeLine(
        '\n/**\n * Conditional type to determine the data type for a given BCDPath.\n * This type ensures that you get the correct TypeScript type when accessing\n * BCD data using a specific path.\n */',
      ),
  })

  // TypedBCD - The most complex type, mirroring the entire BCD structure
  // Generated recursively to match the exact sturcture of the data
  function generateTypedBCDInterface() {
    const interfaceDeclaration = sourceFile.addInterface({
      name: 'TypedBCD',
      isExported: true,
      leadingTrivia: writer =>
        writer.writeLine(
          '\n/**\n * Strongly-typed interface mirroring the structure of Browser Compatibility Data (BCD).\n * Use this interface for direct, type-safe access to BCD data in a structured manner.\n */',
        ),
    })

    // Recursive function that build nested interfaces for the BCD tree
    // Handles special property names and creates appropriate types
    function generateTypeForPath(
      pathInfo: PathInfo,
      interfaceDecl: {
        addProperty: (prop: {
          name: string
          type: string | ((writer: CodeBlockWriter) => void)
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
        if (!childInfo)
          continue

        let propName = child
        if (
          /^\d/.test(child)
          || child.startsWith('@@')
          || /[-.+*/]/.test(child)
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
                      /^\d/.test(nestedChild)
                      || nestedChild.startsWith('@@')
                      || /[-.+*/]/.test(nestedChild)
                    ) {
                      nestedPropName = `'${nestedChild}'`
                    }

                    if (
                      nestedChildInfo.children.length > 0
                      || nestedChildInfo.hasCompat
                    ) {
                      writer.write(`${nestedPropName}: `)
                      writer.block(() => {
                        const nestedInterfaceDecl = {
                          addProperty: (prop: {
                            name: string
                            type: string | ((w: CodeBlockWriter) => void)
                          }) => {
                            if (typeof prop.type === 'function') {
                              writer.write(`${prop.name}: `)
                              prop.type(writer)
                              writer.writeLine(';')
                            }
                            else {
                              writer.writeLine(`${prop.name}: ${prop.type};`)
                            }
                          },
                        }
                        generateTypeForPath(
                          nestedChildInfo,
                          nestedInterfaceDecl,
                        )
                      })
                      writer.writeLine(';')
                    }
                    else {
                      writer.writeLine(`${nestedPropName}: any;`)
                    }
                  }
                }
              })
            },
          })
        }
        else {
          interfaceDecl.addProperty({
            name: propName,
            type: 'any',
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
              if (categoryInfo.hasCompat) {
                writer.writeLine('__compat: CompatStatement;')
              }

              for (const child of categoryInfo.children) {
                const childPath = `${category}.${child}`
                const childInfo = pathsMap.get(childPath)
                if (childInfo) {
                  let propName = child
                  if (
                    /^\d/.test(child)
                    || child.startsWith('@@')
                    || /[-.+*/]/.test(child)
                  ) {
                    propName = `'${child}'`
                  }

                  if (childInfo.children.length === 0 && !childInfo.hasCompat) {
                    writer.writeLine(`${propName}: any;`)
                  }
                  else {
                    writer.write(`${propName}: `)
                    writer.block(() => {
                      const nestedInterfaceDecl = {
                        addProperty: (prop: {
                          name: string
                          type: string | ((w: CodeBlockWriter) => void)
                        }) => {
                          if (typeof prop.type === 'function') {
                            writer.write(`${prop.name}: `)
                            prop.type(writer)
                            writer.writeLine(';')
                          }
                          else {
                            writer.writeLine(`${prop.name}: ${prop.type};`)
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

  // BCDGetter - main interface for accessing BCD data implemented by BCDProxy
  // Provides a consistent API for all BCD data access operations
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
        type: '(path: BCDPath) => Record<string, any> | null',
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
        type: 'any',
      },
    ],
    leadingTrivia: writer =>
      writer.writeLine(
        '\n/**\n * Interface for accessing Browser Compatibility Data (BCD) in a type-safe manner.\n * Provides methods for querying and accessing BCD data.\n */',
      ),
  })

  // FeatureSupport - normalized structure for browser feature support intformation
  sourceFile.addInterface({
    name: 'FeatureSupport',
    isExported: true,
    properties: [
      {
        name: 'browser',
        type: 'string',
        docs: ['Browser identifier (e.g., \'chrome\', \'firefox\')'],
      },
      {
        name: 'supported',
        type: 'boolean',
        docs: ['Whether the feature is supported at all'],
      },
      {
        name: 'version_added',
        type: 'string | boolean | null',
        docs: ['Version when support was added'],
      },
      {
        name: 'version_removed',
        type: 'string | boolean | undefined',
        docs: ['Version when support was removed (if applicable)'],
        hasQuestionToken: true,
      },
      {
        name: 'partial_implementation',
        type: 'boolean',
        docs: ['Indicates partial or incomplete implementation'],
        hasQuestionToken: true,
      },
      {
        name: 'notes',
        type: 'string | string[]',
        docs: ['Additional notes about support'],
        hasQuestionToken: true,
      },
    ],
    leadingTrivia: writer =>
      writer.writeLine(
        '\n/**\n * Interface for standardized feature support information.\n * Provides a consistent structure for compatibility data across browsers.\n */',
      ),
  })

  // BCDPathConstant - interface for the PATHS constant object
  // Maps string keys to typed BCD paths for compile time path validation
  sourceFile.addInterface({
    name: 'BCDPathConstant',
    isExported: true,
    properties: [
      {
        name: '[key: string]',
        type: 'BCDPath',
      },
    ],
    leadingTrivia: writer =>
      writer.writeLine(
        '\n/**\n * Interface for the PATHS constant object.\n * Defines the structure for accessing BCD paths via string constants.\n */',
      ),
  })

  return sourceFile
}
