import fs from 'node:fs';
import path from 'node:path';
import bcd from '@mdn/browser-compat-data';
import { CONFIG } from '../generate-bcd-types';

export function log(message: string): void {
  console.log(`[BCD-Generator] ${message}`);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputPath(fileName: string): string {
  return path.resolve(CONFIG.outputDir, fileName);
}

export function getAllCategories(): string[] {
  return Object.keys(bcd).filter(
    key =>
      typeof bcd[key as keyof typeof bcd] === 'object' &&
      bcd[key] !== null &&
      !key.startsWith('__') &&
      key !== 'browsers'
  );
}

export function createPathKey(path: string): string {
  let key = path
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_{2,}/g, '_');

  if (/^\d/.test(key)) {
    key = `_${key}`;
  }
  return key;
}

export function toPascalCase(str: string): string {
  if (!str) return '';
  if (/^\d+$/.test(str)) {
    return `_${str}`;
  }
  return str
    .replace(/__+/g, '_')
    .split(/[-_.]/)
    .map(word => {
        if(!word) return '';
        if (word === word.toUpperCase() && word.length > 1) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}
