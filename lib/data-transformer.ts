import type {
  BcdFeatureData,
  BrowserName,
  BrowsersData,
  CompatStatement,
  SimpleSupportStatement,
  SupportBlock,
  SupportStatement,
} from "./types";

function cleanSimpleSupportStatement(
  statement: SimpleSupportStatement,
): SimpleSupportStatement {
  const {
    version_added,
    version_removed,
    prefix,
    alternative_name,
    flags,
    partial_implementation,
    notes,
    version_last,
  } = statement;
  const cleaned: any = { version_added };
  if (version_removed !== undefined) cleaned.version_removed = version_removed;
  if (version_last !== undefined) cleaned.version_last = version_last;
  if (prefix !== undefined) cleaned.prefix = prefix;
  if (alternative_name !== undefined)
    cleaned.alternative_name = alternative_name;
  if (flags !== undefined) cleaned.flags = flags;
  if (partial_implementation !== undefined)
    cleaned.partial_implementation = partial_implementation;
  if (notes !== undefined) cleaned.notes = notes;
  return cleaned as SimpleSupportStatement;
}

function resolveMirror(
  browserName: BrowserName,
  browsersData: BrowsersData,
  featureSupport: SupportBlock,
  visited: Set<BrowserName> = new Set(),
): SupportStatement | undefined {
  if (visited.has(browserName)) {
    return undefined;
  }
  visited.add(browserName);

  const browserInfo = browsersData[browserName];
  const upstreamBrowserName = browserInfo?.upstream;

  if (!upstreamBrowserName) {
    return undefined;
  }

  const upstreamSupportStatement = featureSupport[upstreamBrowserName];

  if (!upstreamSupportStatement) {
    return undefined;
  }

  if (upstreamSupportStatement === "mirror") {
    return resolveMirror(
      upstreamBrowserName,
      browsersData,
      featureSupport,
      visited,
    );
  }
  return upstreamSupportStatement;
}

function resolveAndCleanSupportBlock(
  support: SupportBlock,
  browsersData: BrowsersData | undefined,
  featureSupportContext: SupportBlock,
): SupportBlock {
  const newSupportWorking: Partial<Record<BrowserName, SupportStatement>> = {};

  for (const browserKey in support) {
    const browserName = browserKey as BrowserName;
    let statementOrArray = support[browserName];

    if (statementOrArray === "mirror" && browsersData) {
      statementOrArray = resolveMirror(
        browserName,
        browsersData,
        featureSupportContext,
      );
    }

    if (statementOrArray) {
      if (statementOrArray === "mirror") {
        newSupportWorking[browserName] = "mirror";
      } else if (Array.isArray(statementOrArray)) {
        const mappedArray = statementOrArray
          .map((s) => (s ? cleanSimpleSupportStatement(s) : null))
          .filter(Boolean) as SimpleSupportStatement[];
        if (mappedArray.length === 1) {
          newSupportWorking[browserName] = mappedArray[0];
        } else if (mappedArray.length > 1) {
          newSupportWorking[browserName] = mappedArray as unknown as readonly [
            SimpleSupportStatement,
            SimpleSupportStatement,
            ...SimpleSupportStatement[],
          ];
        }
      } else {
        newSupportWorking[browserName] = cleanSimpleSupportStatement(
          statementOrArray as SimpleSupportStatement,
        );
      }
    }
  }
  return newSupportWorking as SupportBlock;
}

export function transformBcdData(
  node: BcdFeatureData,
  browsersData?: BrowsersData,
): BcdFeatureData | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const transformedNode: BcdFeatureData = {};
  let hasProperties = false;

  if (node.__compat) {
    const originalCompat = node.__compat;
    const originalSupport = originalCompat.support;
    const newSupportBlock = resolveAndCleanSupportBlock(
      originalSupport,
      browsersData,
      originalSupport,
    );

    transformedNode.__compat = {
      ...originalCompat,
      support: newSupportBlock,
    };
    if (originalCompat.status) {
      transformedNode.__compat.status = { ...originalCompat.status };
    }
    hasProperties = true;
  }

  for (const key in node) {
    if (key === "__compat" || !Object.hasOwn(node, key)) {
      continue;
    }

    const childNodeValue = node[key];

    if (
      childNodeValue &&
      typeof childNodeValue === "object" &&
      !(childNodeValue as CompatStatement).support &&
      !(childNodeValue as CompatStatement).status
    ) {
      const childData = childNodeValue as BcdFeatureData;
      const transformedChild = transformBcdData(childData, browsersData);
      if (transformedChild !== null) {
        transformedNode[key] = transformedChild;
        hasProperties = true;
      }
    } else if (
      childNodeValue &&
      typeof childNodeValue === "object" &&
      (childNodeValue as CompatStatement).support &&
      (childNodeValue as CompatStatement).status
    ) {
      // console.warn(`[data-transformer] Encountered CompatStatement-like object for key '${key}' which is not '__compat'.`);
    }
  }

  return hasProperties ? transformedNode : null;
}
