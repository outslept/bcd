import type {
  BcdFeatureData,
  CompatStatement,
  SupportBlock,
  StatusBlock,
  SimpleSupportStatement,
  BrowserName,
  SupportStatement
} from './types';

export interface TransformedFeature {
  description?: string;
  mdn_url?: string;
  spec_url?: string | readonly string[];
  status?: StatusBlock;
  support?: SupportBlock;
  [identifier: string]: TransformedFeature | any;
}

function cleanSimpleSupportStatement(statement: SimpleSupportStatement): SimpleSupportStatement {
  const { version_added, version_removed, prefix, alternative_name, flags, partial_implementation, notes } = statement;
  const cleaned: SimpleSupportStatement = { version_added };
  if (version_removed !== undefined) cleaned.version_removed = version_removed;
  if (prefix !== undefined) cleaned.prefix = prefix;
  if (alternative_name !== undefined) cleaned.alternative_name = alternative_name;
  if (flags !== undefined) cleaned.flags = flags;
  if (partial_implementation !== undefined) cleaned.partial_implementation = partial_implementation;
  if (notes !== undefined) cleaned.notes = notes;
  return cleaned;
}

function cleanSupportBlock(support: SupportBlock): SupportBlock {
  const newSupport: SupportBlock = {};
  for (const browserKey in support) {
    const browserName = browserKey as BrowserName;
    const statementOrArray = support[browserName];

    if (statementOrArray) {
      if (Array.isArray(statementOrArray)) {
        const cleanedArray = statementOrArray.map(cleanSimpleSupportStatement);
        newSupport[browserName as any] = cleanedArray;
      } else {
        newSupport[browserName as any] = cleanSimpleSupportStatement(statementOrArray as SimpleSupportStatement);
      }
    }
  }
  return newSupport;
}

function extractRelevantCompatData(compat: CompatStatement): Partial<TransformedFeature> {
  const output: Partial<TransformedFeature> = {};
  if (compat.description !== undefined) output.description = compat.description;
  if (compat.mdn_url !== undefined) output.mdn_url = compat.mdn_url;
  if (compat.spec_url !== undefined) output.spec_url = compat.spec_url;
  if (compat.status !== undefined) output.status = { ...compat.status };
  if (compat.support !== undefined) output.support = cleanSupportBlock({ ...compat.support });
  return output;
}

export function transformBcdData(node: BcdFeatureData): TransformedFeature | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const transformedNode: TransformedFeature = {};
  let hasProperties = false;

  if (node.__compat) {
    const compatData = extractRelevantCompatData(node.__compat);
    Object.assign(transformedNode, compatData);
    if (Object.keys(compatData).length > 0) {
      hasProperties = true;
    }
  }

  for (const key in node) {
    if (key === '__compat' || !Object.hasOwn(node, key)) {
      continue;
    }

    const childData = node[key] as BcdFeatureData;
    const transformedChild = transformBcdData(childData);

    if (transformedChild !== null) {
      transformedNode[key] = transformedChild;
      hasProperties = true;
    }
  }

  return hasProperties ? transformedNode : null;
}
