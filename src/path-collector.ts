import type { PathInfo } from './types';
import bcd from '@mdn/browser-compat-data';
import type { Config } from '../generate-bcd-types';
import { getAllCategories, log } from './utils';

interface CollectionResult {
  pathsMap: Map<string, PathInfo>;
  categories: string[];
}

export function collectPaths(config: Config): CollectionResult {
  const pathsMap = new Map<string, PathInfo>();
  const rootCategories = getAllCategories();

  log(`Identified root categories from @mdn/bcd: ${rootCategories.join(', ')}`);

  let maxDepthFound = 0;
  let nodesVisited = 0;
  let pathsAdded = 0;

  function addPath(pathKey: string, info: PathInfo): void {
    pathsMap.set(pathKey, info);
    pathsAdded++;
    maxDepthFound = Math.max(maxDepthFound, info.depth);
  }

  function traverse(obj: any, currentPath: string, depth: number): void {
    nodesVisited++;
    if (
      (config.maxDepth !== Infinity && depth > config.maxDepth) ||
      config.excludePaths.includes(currentPath)
    ) {
      return;
    }

    const hasCompat = obj && typeof obj === 'object' && '__compat' in obj;
    const currentChildrenKeys: string[] = [];
    let pathInfo = pathsMap.get(currentPath);

    if (obj && typeof obj === 'object') {
        if (!pathInfo) {
            pathInfo = {
                path: currentPath,
                fullPath: currentPath,
                hasCompat,
                children: [],
                depth,
            };
            addPath(currentPath, pathInfo);
        } else {
            if(hasCompat && !pathInfo.hasCompat) pathInfo.hasCompat = true;
        }
    } else if (hasCompat) {
        if (!pathInfo) {
             pathInfo = {
                path: currentPath,
                fullPath: currentPath,
                hasCompat,
                children: [],
                depth,
            };
            addPath(currentPath, pathInfo);
        } else {
             if(hasCompat && !pathInfo.hasCompat) pathInfo.hasCompat = true;
        }
    } else {
        return;
    }

    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        const childPath = `${currentPath}${config.pathSeparator}${key}`;
        if (key === '__compat') {
          if (obj.__compat && typeof obj.__compat === 'object') {
            const __compatChildren = Object.keys(obj.__compat).filter(k => obj.__compat[k] !== null && typeof obj.__compat[k] === 'object');
            if(!pathsMap.has(childPath)) {
                 addPath(childPath, {
                    path: childPath,
                    fullPath: childPath,
                    hasCompat: false,
                    children: __compatChildren,
                    depth: depth + 1,
                });
            }
            traverse(obj.__compat, childPath, depth + 1);
          }
          continue;
        }

        currentChildrenKeys.push(key);

        if (obj[key] && typeof obj[key] === 'object') {
          traverse(obj[key], childPath, depth + 1);
        }
      }
    }

    if (pathInfo && currentChildrenKeys.length > 0) {
        pathInfo.children = [...new Set([...pathInfo.children, ...currentChildrenKeys])];
    }
  }

  log('Collecting paths from @mdn/browser-compat-data...');
  const collectionStartTime = Date.now();

  for (const category of rootCategories) {
    if (category in bcd) {
      const categoryData = bcd[category as keyof typeof bcd];
      if (categoryData && typeof categoryData === 'object') {
        traverse(categoryData, category, 0);
      }
    }
  }
  if (bcd.__meta && typeof bcd.__meta === 'object') {
    traverse(bcd.__meta, '__meta', 0);
  }
  if (bcd.browsers && typeof bcd.browsers === 'object') {
    traverse(bcd.browsers, 'browsers', 0);
  }

  log(`Path collection: Visited ${nodesVisited} nodes, added ${pathsAdded} paths to map.`);
  log(`Collected ${pathsMap.size} unique paths in total. Max depth: ${maxDepthFound}.`);
  log(`Internal path collection logic took ${Date.now() - collectionStartTime}ms`);

  return { pathsMap, categories: rootCategories };
}
