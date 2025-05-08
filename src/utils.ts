import fs from 'node:fs'
import path from 'node:path'
import bcd from '@mdn/browser-compat-data'
import { CONFIG } from '../generate-bcd-types'

export function log(message: string): void {
  console.log(`[BCD] ${message}`)
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function getOutputPath(fileName: string): string {
  return path.resolve(CONFIG.outputDir, fileName)
}

export function getAllCategories(): string[] {
  return Object.keys(bcd).filter(
    key =>
      typeof bcd[key as keyof typeof bcd] === 'object'
      && key !== 'browser'
      && key !== '__meta',
  )
}

export function createPathKey(path: string): string {
  return path.replace(/\./g, '_').replace(/-/g, '_').replace(/@@/g, 'at_at_')
}
