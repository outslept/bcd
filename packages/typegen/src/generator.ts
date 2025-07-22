import type { Project } from 'ts-morph'

import { createConstFile, getOutputPath, isIdentifier } from './shared.js'
import { cleanData } from './transform.js'
import type { Config, RootBCDData } from './types.js'

export function generateFiles(
  project: Project,
  bcdData: RootBCDData,
  config: Config,
): void {
  generateBrowsers(project, bcdData.browsers, config)

  for (const [category, data] of Object.entries(bcdData)) {
    if (category === 'browsers' || category === '__meta') continue
    if (isIdentifier(data)) {
      walkAndGenerate(project, data, [category], config)
    }
  }
}

function generateBrowsers(
  project: Project,
  browsers: RootBCDData['browsers'],
  config: Config,
): void {
  for (const [browserName, browserData] of Object.entries(browsers)) {
    const fileName = `${browserName}.ts`
    const constName = browserName.replaceAll('-', '_')
    const filePath = getOutputPath(fileName, config, 'browsers')

    createConstFile(project, constName, browserData, filePath)
  }
}

function walkAndGenerate(
  project: Project,
  node: unknown,
  path: string[],
  config: Config,
): void {
  if (!isIdentifier(node)) return

  if (node.__compat) {
    const featureName = path.at(-1)
    if (!featureName) return

    const fileName = `${featureName}.ts`
    const constName = featureName.replaceAll('-', '_')

    const subcategoryPath = path.slice(1, -1)
    const filePath = getOutputPath(fileName, config, path[0], subcategoryPath)

    const cleanedData = cleanData(node)

    if (cleanedData && Object.keys(cleanedData).length > 0) {
      createConstFile(project, constName, cleanedData, filePath)
    }
  }

  const childKeys = Object.keys(node).filter((key) => key !== '__compat')

  if (childKeys.length > 0) {
    const currentNodeName = path.at(-1)
    if (!currentNodeName) return

    for (const [key, child] of Object.entries(node)) {
      if (key !== '__compat') {
        const newPath = node.__compat
          ? [...path, currentNodeName, key]
          : [...path, key]

        walkAndGenerate(project, child, newPath, config)
      }
    }
  }
}
