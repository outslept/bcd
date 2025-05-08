import type { GeneratedFiles, PathInfo } from './lib/types'
import fs from 'node:fs'
import { IndentationText, Project, QuoteKind } from 'ts-morph'
import { generateIndexFile } from './generators/index-generator'
import { generatePathsFile } from './generators/paths-generator'
import { generateProxyFile } from './generators/proxy-generator'
import { generateTypesFile } from './generators/types-generator'
import { generateUtilsFile } from './generators/utils-generator'
import { collectPaths } from './lib/path-collector'
import { ensureDir, getOutputPath, log } from './lib/utils'

export interface Config {
  outputDir: string
  maxDepth: number
  pathSeparator: string
  excludePaths: string[]
}

export const CONFIG: Config = {
  outputDir: '__generated__', // Will be created automatically if doesn't exist
  maxDepth: Infinity, // No depth restriction when traversing the data
  pathSeparator: '.', // Standard path separator for BCD
  excludePaths: [], // No paths exluded by default
}

export function generateFiles(pathsMap: Map<string, PathInfo>): GeneratedFiles {
  ensureDir(CONFIG.outputDir)

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      newLineKind: 1, // LF
      quoteKind: QuoteKind.Single,
    },
  })

  const typesSource = generateTypesFile(project, pathsMap)
  const proxySource = generateProxyFile(project)
  const pathsSource = generatePathsFile(project, pathsMap)
  const utilsSource = generateUtilsFile(project)
  const indexSource = generateIndexFile(project)

  const typesFile = getOutputPath('bcd-types.ts')
  const proxyFile = getOutputPath('bcd-proxy.ts')
  const constantsFile = getOutputPath('bcd-paths.ts')
  const utilsFile = getOutputPath('bcd-utils.ts')
  const indexFile = getOutputPath('index.ts')

  fs.writeFileSync(typesFile, typesSource.getFullText())
  log(`Created: ${typesFile}`)

  fs.writeFileSync(proxyFile, proxySource.getFullText())
  log(`Created: ${proxyFile}`)

  fs.writeFileSync(constantsFile, pathsSource.getFullText())
  log(`Created: ${constantsFile}`)

  fs.writeFileSync(utilsFile, utilsSource.getFullText())
  log(`Created: ${utilsFile}`)

  fs.writeFileSync(indexFile, indexSource.getFullText())
  log(`Created: ${indexFile}`)

  return {
    typesFile,
    proxyFile,
    constantsFile,
    utilsFile,
    indexFile,
  }
}

function main(): void {
  log('Starting BCD types generation...')
  log(`Output directory: ${CONFIG.outputDir}`)
  log(
    `Max depth: ${CONFIG.maxDepth === Infinity ? 'Unlimited' : CONFIG.maxDepth}`,
  )

  ensureDir(CONFIG.outputDir)

  const pathsMap = collectPaths()

  const files = generateFiles(pathsMap)

  log('Generation completed successfully!')
  log(
    `Generated files:\n  - ${files.typesFile}\n  - ${files.proxyFile}\n  - ${files.constantsFile}\n  - ${files.utilsFile}\n  - ${files.indexFile}\n`,
  )
}

if (require.main === module) {
  main()
}
