import fs from 'node:fs';
import path from 'node:path';

export interface OutputConfig {
  outputDir: string;
}

export function log(message: string): void {
  console.log(`[BCD-Generator] ${message}`);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputPath(fileName: string, config: OutputConfig): string {
  return path.resolve(config.outputDir, fileName);
}

export function getFeatureCategories(allTopLevelKeys: string[]): string[] {
  return allTopLevelKeys.filter(
    key => key !== '__meta' && key !== 'browsers'
  );
}
