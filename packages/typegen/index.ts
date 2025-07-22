import { existsSync, mkdirSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import bcdRaw from '@mdn/browser-compat-data/forLegacyNode'
import {
  IndentationText,
  ModuleKind,
  NewLineKind,
  Project,
  QuoteKind,
  ScriptTarget,
} from 'ts-morph'

import { generateFiles } from './src/generator.js'
import type { Config, RootBCDData } from './src/types.js'

const CONFIG: Config = {
  outputDir: 'generated',
  pathSeparator: '.',
} as const

function setupProject(): Project {
  return new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      newLineKind: NewLineKind.LineFeed,
      quoteKind: QuoteKind.Single,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
    },
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      declaration: true,
      sourceMap: true,
      skipLibCheck: true,
      strict: true,
      removeComments: true,
      esModuleInterop: true,
    },
  })
}

export async function generateAllFiles(bcdData: RootBCDData): Promise<void> {
  const project = setupProject()

  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true })
  }

  generateFiles(project, bcdData, CONFIG)
  await project.save()
}

function main(): void {
  void generateAllFiles(bcdRaw as RootBCDData)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
