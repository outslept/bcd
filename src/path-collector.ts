import type { PathInfo } from './types';
import bcd from '@mdn/browser-compat-data';
import { CONFIG } from '../generate-bcd-types';
import { getAllCategories, log } from './utils';

// Traverses the entire BCD data structure to collect all valid paths
// Builds a map with additional metadata for type generation
export function collectPaths(): Map<string, PathInfo> {
  const pathsMap = new Map<string, PathInfo>();
  const categories = getAllCategories();

  let maxDepthFound = 0; // Tracks deepest path for logging

  // Adds a path to the map with its metadata
  function addPath(path: string, info: PathInfo): void {
    pathsMap.set(path, info);
    maxDepthFound = Math.max(maxDepthFound, info.depth);
  }

  // Recursively explores the BCD object structure
  // Respects maxDepth and exlucdePaths from configuration
  function traverseObject(obj: any, currentPath: string, depth: number): void {
    // Skip if we've reached max depth or path is excluded
    if (
      (CONFIG.maxDepth !== Infinity && depth > CONFIG.maxDepth) ||
      CONFIG.excludePaths.includes(currentPath)
    ) {
      return;
    }

    // Special handling for __compat properties which contain browser support data
    const hasCompat = obj && typeof obj === 'object' && '__compat' in obj;
    const children: string[] = [];

    // Add current path and then recursively proces children
    addPath(currentPath, {
      path: currentPath,
      fullPath: currentPath,
      hasCompat,
      children,
      depth,
    });

    if (hasCompat) {
      const compatPath = `${currentPath}.__compat`;
      addPath(compatPath, {
        path: compatPath,
        fullPath: compatPath,
        hasCompat: false,
        children: [],
        depth: depth + 1,
      });
    }

    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key === '__compat') continue;

        if (obj[key] && typeof obj[key] === 'object') {
          const childPath = `${currentPath}${CONFIG.pathSeparator}${key}`;
          children.push(key);
          traverseObject(obj[key], childPath, depth + 1);
        }
      }
    }

    if (children.length > 0) {
      const pathInfo = pathsMap.get(currentPath);
      if (pathInfo) {
        pathInfo.children = children;
        pathsMap.set(currentPath, pathInfo);
      }
    }
  }

  log('Collecting paths from BCD data...');

  // Start tarversal from each top-level category
  for (const category of categories) {
    if (category in bcd) {
      const categoryData = bcd[category as keyof typeof bcd];
      traverseObject(categoryData, category, 0);
    }
  }

  log(`Collected ${pathsMap.size} paths in total`);
  log(`Maximum depth found: ${maxDepthFound}`);
  return pathsMap;
}
