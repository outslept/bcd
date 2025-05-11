import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../generate-bcd-types';

export function log(message: string): void {
  console.log(`[BCD] ${message}`);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputPath(fileName: string): string {
  return path.resolve(CONFIG.outputDir, fileName);
}

export function getFeatureCategories(allTopLevelKeys: string[]): string[] {
  return allTopLevelKeys.filter(
    key => key !== '__meta' && key !== 'browsers'
  );
}
