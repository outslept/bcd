#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import c from 'ansis'
import { cac } from 'cac'
import { version } from '../package.json'
import { CONFIG } from './generate-bcd-types'
import { collectPaths } from './lib/path-collector'
import { ensureDir } from './lib/utils'

function displayBanner() {
  p.intro(`${c.cyan('bcd-typegen')} ${c.gray(`v${version}`)} - ${c.gray('Browser Compatibility Data Type Generator')}`)
}

function handleGlobalError(error: unknown): never {
  const errorMessage = error instanceof Error ? error.message : String(error)
  p.log.error(`Command failed: ${errorMessage}`)

  if (errorMessage.includes('browser-compat-data')) {
    p.log.info(c.gray(`Make sure @mdn/browser-compat-data is installed correctly.`))
  }
  else if (errorMessage.includes('file system')) {
    p.log.info(c.gray(`There seems to be an issue with file access. Check your permissions.`))
  }

  p.outro('Operation failed')
  process.exit(1)
}

async function generateFiles(options: {
  outputDir: string
  maxDepth?: number
  excludePaths?: string[]
  verbose?: boolean
}) {
  const { outputDir, maxDepth, excludePaths, verbose } = options

  CONFIG.outputDir = path.resolve(process.cwd(), outputDir)

  if (maxDepth !== undefined) {
    CONFIG.maxDepth = maxDepth
  }

  if (excludePaths && excludePaths.length > 0) {
    CONFIG.excludePaths = excludePaths
  }

  const spinner = p.spinner()

  try {
    p.log.step('Starting BCD types generation...')

    if (verbose) {
      p.log.info(`Output directory: ${c.cyan(CONFIG.outputDir)}`)
      p.log.info(`Max depth: ${c.cyan(CONFIG.maxDepth === Infinity ? 'Unlimited' : CONFIG.maxDepth.toString())}`)
      p.log.info(`Excluded paths: ${CONFIG.excludePaths.length ? c.cyan(CONFIG.excludePaths.join(', ')) : c.gray('None')}`)
    }

    ensureDir(CONFIG.outputDir)

    spinner.start('Collecting BCD paths...')
    const pathsMap = collectPaths()
    spinner.stop(`Collected ${c.green(pathsMap.size.toString())} paths`)

    spinner.start('Generating type files...')

    const { generateTypesFile } = await import('./generators/types-generator')
    const { generateProxyFile } = await import('./generators/proxy-generator')
    const { generatePathsFile } = await import('./generators/paths-generator')
    const { generateUtilsFile } = await import('./generators/utils-generator')
    const { generateIndexFile } = await import('./generators/index-generator')

    const { Project } = await import('ts-morph')
    const project = new Project({
      manipulationSettings: {
        newLineKind: 1,
      },
    })

    const typesSource = generateTypesFile(project, pathsMap)
    const proxySource = generateProxyFile(project)
    const pathsSource = generatePathsFile(project, pathsMap)
    const utilsSource = generateUtilsFile(project)
    const indexSource = generateIndexFile(project)

    const typesFile = path.join(CONFIG.outputDir, 'bcd-types.ts')
    const proxyFile = path.join(CONFIG.outputDir, 'bcd-proxy.ts')
    const constantsFile = path.join(CONFIG.outputDir, 'bcd-paths.ts')
    const utilsFile = path.join(CONFIG.outputDir, 'bcd-utils.ts')
    const indexFile = path.join(CONFIG.outputDir, 'index.ts')

    fs.writeFileSync(typesFile, typesSource.getFullText())
    fs.writeFileSync(proxyFile, proxySource.getFullText())
    fs.writeFileSync(constantsFile, pathsSource.getFullText())
    fs.writeFileSync(utilsFile, utilsSource.getFullText())
    fs.writeFileSync(indexFile, indexSource.getFullText())

    spinner.stop('Files generated successfully')

    if (verbose) {
      p.log.info(`Generated files:`)
      p.log.info(`  - ${c.green('bcd-types.ts')} - Type definitions`)
      p.log.info(`  - ${c.green('bcd-proxy.ts')} - Runtime proxy for BCD data`)
      p.log.info(`  - ${c.green('bcd-paths.ts')} - Path constants`)
      p.log.info(`  - ${c.green('bcd-utils.ts')} - Utility functions`)
      p.log.info(`  - ${c.green('index.ts')} - Main barrel file`)
    }

    p.outro(`${c.green('✓')} Types generated in ${c.cyan(CONFIG.outputDir)}`)

    return {
      typesFile,
      proxyFile,
      constantsFile,
      utilsFile,
      indexFile,
    }
  }
  catch (error) {
    spinner.stop('Generation failed')
    throw error
  }
}

const cli = cac('bcd-typegen')

cli
  .command('generate', 'Generate BCD type definitions')
  .alias('gen')
  .option('-o, --output <dir>', 'Output directory for generated files', { default: '__generated__' })
  .option('-d, --max-depth <depth>', 'Maximum depth to traverse in BCD tree')
  .option('-e, --exclude <paths>', 'Comma-separated list of paths to exclude')
  .option('-v, --verbose', 'Show detailed output')
  .option('--dry-run', 'Show what would be generated without writing files')
  .example('bcd-typegen generate')
  .example('bcd-typegen gen -o ./types')
  .example('bcd-typegen gen -d 5')
  .example('bcd-typegen gen -e api.AbortController,css.properties.color')
  .action(async (options) => {
    try {
      displayBanner()

      const maxDepth = options.maxDepth ? Number.parseInt(options.maxDepth) : undefined
      const excludePaths = options.exclude ? options.exclude.split(',').map((p: string) => p.trim()) : []

      if (options.dryRun) {
        p.log.info(c.yellow('Dry run mode - no files will be written'))
        p.log.info(`Would generate files in: ${c.cyan(path.resolve(process.cwd(), options.output))}`)
        if (maxDepth) {
          p.log.info(`Max depth would be: ${c.cyan(maxDepth.toString())}`)
        }
        if (excludePaths.length > 0) {
          p.log.info(`Would exclude paths: ${c.cyan(excludePaths.join(', '))}`)
        }
        p.outro('Dry run completed')
        return
      }

      await generateFiles({
        outputDir: options.output,
        maxDepth,
        excludePaths,
        verbose: options.verbose,
      })
    }
    catch (error) {
      handleGlobalError(error)
    }
  })

cli
  .command('info', 'Display information about BCD data')
  .option('-c, --categories', 'List all BCD categories')
  .option('-s, --stats', 'Show statistics about BCD data')
  .option('-j, --json', 'Output in JSON format')
  .example('bcd-typegen info')
  .example('bcd-typegen info --categories')
  .example('bcd-typegen info --stats')
  .action(async (options) => {
    try {
      displayBanner()

      const spinner = p.spinner()
      spinner.start('Loading BCD data...')

      const bcd = await import('@mdn/browser-compat-data')
      const { getAllCategories } = await import('./lib/utils')

      spinner.stop('BCD data loaded')

      const categories = getAllCategories()
      const browsers = Object.keys(bcd.default.browsers || {})

      if (options.json) {
        const result = {
          categories,
          browsers,
          version: bcd.default.__meta?.version || 'unknown',
        }

        if (options.stats) {
          spinner.start('Calculating statistics...')
          const pathsMap = collectPaths()
          spinner.stop('Statistics calculated')

          Object.assign(result, {
            totalPaths: pathsMap.size,
            pathsByCategory: categories.reduce((acc, category) => {
              acc[category] = Array.from(pathsMap.keys()).filter(p => p.startsWith(category)).length
              return acc
            }, {} as Record<string, number>),
          })
        }

        console.log(JSON.stringify(result, null, 2))
        return
      }

      p.log.info(`${c.cyan('BCD Version:')} ${c.bold(bcd.default.__meta?.version || 'unknown')}`)

      if (options.categories || !options.stats) {
        p.log.info(`\n${c.cyan('Categories:')}`)
        categories.forEach((category) => {
          p.log.info(`  - ${c.bold(category)}`)
        })
      }

      p.log.info(`\n${c.cyan('Supported Browsers:')}`)
      const browserGroups: Record<string, string[]> = {
        Desktop: browsers.filter(b => ['chrome', 'edge', 'firefox', 'ie', 'opera', 'safari'].includes(b)),
        Mobile: browsers.filter(b => ['chrome_android', 'firefox_android', 'opera_android', 'safari_ios', 'samsunginternet_android', 'webview_android'].includes(b)),
        Other: browsers.filter(b => !['chrome', 'edge', 'firefox', 'ie', 'opera', 'safari', 'chrome_android', 'firefox_android', 'opera_android', 'safari_ios', 'samsunginternet_android', 'webview_android'].includes(b)),
      }

      Object.entries(browserGroups).forEach(([group, list]) => {
        if (list.length > 0) {
          p.log.info(`  ${c.bold(group)}: ${list.join(', ')}`)
        }
      })

      if (options.stats) {
        spinner.start('Calculating statistics...')
        const pathsMap = collectPaths()
        spinner.stop('Statistics calculated')

        p.log.info(`\n${c.cyan('Statistics:')}`)
        p.log.info(`  Total paths: ${c.bold(pathsMap.size.toString())}`)

        const pathsByCategory = categories.map(category => ({
          category,
          count: Array.from(pathsMap.keys()).filter(p => p.startsWith(category)).length,
        })).sort((a, b) => b.count - a.count)

        p.log.info(`\n${c.cyan('Paths by Category:')}`)
        pathsByCategory.forEach(({ category, count }) => {
          const percentage = ((count / pathsMap.size) * 100).toFixed(1)
          p.log.info(`  ${c.bold(category.padEnd(12))}: ${count.toString().padStart(6)} (${percentage}%)`)
        })
      }

      p.outro('BCD information displayed')
    }
    catch (error) {
      handleGlobalError(error)
    }
  })

cli
  .command('validate', 'Validate the BCD data')
  .option('-p, --paths', 'Validate all paths are accessible')
  .option('-t, --types', 'Validate generated types')
  .option('-v, --verbose', 'Show detailed output')
  .example('bcd-typegen validate')
  .example('bcd-typegen validate --paths')
  .action(async (options) => {
    try {
      displayBanner()

      const spinner = p.spinner()

      if (options.paths || !options.types) {
        spinner.start('Validating BCD paths...')
        const pathsMap = collectPaths()
        spinner.stop(`Validated ${c.green(pathsMap.size.toString())} paths`)

        if (options.verbose) {
          const { default: bcd } = await import('@mdn/browser-compat-data')

          spinner.start('Checking path accessibility...')

          let validPaths = 0
          let invalidPaths = 0
          const errors: string[] = []

          for (const path of pathsMap.keys()) {
            if (path.endsWith('.__compat'))
              continue

            try {
              const parts = path.split('.')
              let current: any = bcd

              for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                  current = current[part]
                }
                else {
                  throw new Error(`Path part '${part}' not found`)
                }
              }

              validPaths++
            }
            catch (error) {
              invalidPaths++
              errors.push(`${c.red('✗')} ${path}: ${error instanceof Error ? error.message : String(error)}`)
            }
          }

          spinner.stop(`Checked ${c.green(validPaths.toString())} paths, ${invalidPaths > 0 ? c.red(invalidPaths.toString()) : c.green('0')} invalid`)

          if (invalidPaths > 0 && errors.length > 0) {
            p.log.info(`\n${c.yellow('Invalid Paths:')}`)
            errors.slice(0, 10).forEach((error) => {
              p.log.info(`  ${error}`)
            })

            if (errors.length > 10) {
              p.log.info(`  ${c.gray(`... and ${errors.length - 10} more`)}`)
            }
          }
        }
      }

      if (options.types) {
        spinner.start('Validating type generation...')

        try {
          const tempDir = path.join(process.cwd(), '.temp-validate')
          ensureDir(tempDir)

          CONFIG.outputDir = tempDir
          const pathsMap = collectPaths()

          const { Project } = await import('ts-morph')
          const { generateTypesFile } = await import('./generators/types-generator')
          const { generateProxyFile } = await import('./generators/proxy-generator')
          const { generatePathsFile } = await import('./generators/paths-generator')
          const { generateUtilsFile } = await import('./generators/utils-generator')
          const { generateIndexFile } = await import('./generators/index-generator')

          const project = new Project({
            manipulationSettings: {
              newLineKind: 1,
            },
          })

          generateTypesFile(project, pathsMap)
          generateProxyFile(project)
          generatePathsFile(project, pathsMap)
          generateUtilsFile(project)
          generateIndexFile(project)

          const diagnostics = project.getPreEmitDiagnostics()

          fs.rmSync(tempDir, { recursive: true, force: true })

          if (diagnostics.length > 0) {
            spinner.stop(`${c.red('✗')} Type validation failed with ${diagnostics.length} errors`)

            if (options.verbose) {
              p.log.info(`\n${c.yellow('Type Errors:')}`)
              diagnostics.slice(0, 10).forEach((diagnostic) => {
                p.log.info(`  ${c.red('✗')} ${diagnostic.getMessageText()}`)
              })

              if (diagnostics.length > 10) {
                p.log.info(`  ${c.gray(`... and ${diagnostics.length - 10} more`)}`)
              }
            }
          }
          else {
            spinner.stop(`${c.green('✓')} Type validation passed`)
          }
        }
        catch (error) {
          spinner.stop(`${c.red('✗')} Type validation failed`)
          throw error
        }
      }

      p.outro('Validation completed')
    }
    catch (error) {
      handleGlobalError(error)
    }
  })

cli
  .command('init', 'Initialize a BCD types project')
  .option('-o, --output <dir>', 'Output directory for generated files', { default: '__generated__' })
  .option('-i, --install', 'Install required dependencies')
  .option('-f, --force', 'Overwrite existing files')
  .example('bcd-typegen init')
  .example('bcd-typegen init -o ./types --install')
  .action(async (options) => {
    try {
      displayBanner()

      const outputDir = path.resolve(process.cwd(), options.output)

      if (fs.existsSync(outputDir) && !options.force) {
        const shouldContinue = await p.confirm({
          message: `Directory ${outputDir} already exists. Continue and potentially overwrite files?`,
          initialValue: false,
        })

        if (!shouldContinue) {
          p.outro('Operation canceled')
          return
        }
      }

      ensureDir(outputDir)

      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
      if (!fs.existsSync(tsconfigPath) || options.force) {
        const tsconfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            strict: true,
            skipLibCheck: true,
            declaration: true,
            outDir: 'dist',
          },
          include: [options.output],
        }

        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
        p.log.success(`Created ${c.green('tsconfig.json')}`)
      }

      await generateFiles({
        outputDir: options.output,
        verbose: true,
      })

      if (options.install) {
        p.log.step('Installing dependencies...')

        const spinner = p.spinner()
        spinner.start('Running npm install...')

        const { execSync } = await import('node:child_process')

        try {
          execSync('npm install --save @mdn/browser-compat-data', { stdio: 'pipe' })
          spinner.stop(`${c.green('✓')} Dependencies installed`)
        }
        catch (error) {
          spinner.stop(`${c.red('✗')} Failed to install dependencies`)
          p.log.error(`Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`)
          p.log.info(c.gray('You can manually install required dependencies:'))
          p.log.info(c.gray('npm install --save @mdn/browser-compat-data'))
        }
      }
      else {
        p.log.info(c.gray('\nMake sure you have the required dependencies:'))
        p.log.info(c.gray('npm install --save @mdn/browser-compat-data'))
      }

      p.log.info(c.gray('\nTo use the generated types:'))
      p.log.info(c.gray(`import { BCD, PATHS } from './${options.output}';`))
      p.log.info(c.gray(`const isSupported = BCD.isSupported(PATHS.api_Element_querySelector, 'chrome', '80');`))

      p.outro('Project initialized successfully!')
    }
    catch (error) {
      handleGlobalError(error)
    }
  })

cli.help()
cli.version(version)

cli.on('command:*', () => {
  p.log.error(`Unknown command: ${cli.args.join(' ')}`)
  p.log.info(c.gray(`Run ${c.bold('bcd-typegen --help')} to see available commands`))
  p.outro('Command not found')
  process.exit(1)
})

if (process.argv.length <= 2) {
  displayBanner()
  cli.outputHelp()
  process.exit(0)
}

try {
  cli.parse()
}
catch (error) {
  handleGlobalError(error)
}
