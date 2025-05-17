import type { BrowsersData } from "./types";
import type {
  BrowserName,
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
  SupportBlock,
  SupportStatement,
} from "@mdn/browser-compat-data";

function cleanSimpleSupportStatement(
  statement: SimpleSupportStatement,
): SimpleSupportStatement {
  const cleanedStatement: SimpleSupportStatement = {
    version_added: statement.version_added,
  };

  if (statement.version_removed !== undefined) {
    cleanedStatement.version_removed = statement.version_removed;
  }

  if (statement.version_last !== undefined) {
    cleanedStatement.version_last = statement.version_last;
  }

  if (statement.prefix !== undefined) {
    cleanedStatement.prefix = statement.prefix;
  }

  if (statement.alternative_name !== undefined) {
    cleanedStatement.alternative_name = statement.alternative_name;
  }

  if (statement.flags !== undefined) {
    cleanedStatement.flags = [...statement.flags];
  }

  if (statement.partial_implementation !== undefined) {
    cleanedStatement.partial_implementation = statement.partial_implementation;
  }

  if (statement.notes !== undefined) {
    cleanedStatement.notes = Array.isArray(statement.notes)
      ? [...statement.notes]
      : statement.notes;
  }

  return cleanedStatement;
}

// function resolveMirror(
//   browserName: BrowserName,
//   browsersData: BrowsersData,
//   featureSupport: SupportBlock,
//   visited: Set<BrowserName> = new Set(),
// ): SupportStatement | undefined {
//   if (visited.has(browserName)) {
//     return undefined;
//   }
//   visited.add(browserName);

//   const browserInfo = browsersData[browserName];
//   const upstreamBrowserName = browserInfo?.upstream;

//   if (!upstreamBrowserName) {
//     return undefined;
//   }

//   const upstreamSupportStatement = featureSupport[upstreamBrowserName];

//   if (!upstreamSupportStatement) {
//     return undefined;
//   }

// if (upstreamSupportStatement === "mirror") {
//   return resolveMirror(
//     upstreamBrowserName,
//     browsersData,
//     featureSupport,
//     visited,
//   );
// }

//   return upstreamSupportStatement;
// }

function resolveAndCleanSupportBlock(
  support: SupportBlock,
  // browsersData: BrowsersData | undefined,
  // featureSupportContext: SupportBlock,
): SupportBlock {
  const cleanedSupport: SupportBlock = {};

  for (const [browserName, statement] of Object.entries(support) as [
    BrowserName,
    SupportStatement | undefined,
  ][]) {
    if (!statement) {
      continue;
    }

    // if (statement === "mirror" && browsersData) {
    //   const resolvedStatement = resolveMirror(
    //     browserName,
    //     browsersData,
    //     featureSupportContext,
    //   );
    //   if (resolvedStatement) {
    //     cleanedSupport[browserName] = "mirror";
    //   }
    //   continue;
    // }

    if (Array.isArray(statement)) {
      const cleanedStatements = statement
        .map((s) => (s ? cleanSimpleSupportStatement(s) : null))
        .filter((s): s is SimpleSupportStatement => s !== null);

      if (cleanedStatements.length === 1) {
        cleanedSupport[browserName] = cleanedStatements[0];
      } else if (cleanedStatements.length > 1) {
        cleanedSupport[browserName] = cleanedStatements as [
          SimpleSupportStatement,
          SimpleSupportStatement,
          ...SimpleSupportStatement[],
        ];
      }
    } else {
      cleanedSupport[browserName] = cleanSimpleSupportStatement(
        statement as SimpleSupportStatement,
      );
    }
  }

  return cleanedSupport;
}

export function transformBcdData(
  node: Identifier,
  browsersData?: BrowsersData,
): Identifier | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const transformedNode: Identifier = {};
  let hasProperties = false;

  if (node.__compat) {
    const originalCompat = node.__compat;
    const originalSupport = originalCompat.support;
    const cleanedSupport = resolveAndCleanSupportBlock(
      originalSupport,
      // browsersData,
      // originalSupport,
    );

    const compatStatement: CompatStatement = {
      ...originalCompat,
      support: cleanedSupport,
    };

    if (originalCompat.status) {
      compatStatement.status = { ...originalCompat.status };
    }

    transformedNode.__compat = compatStatement;
    hasProperties = true;
  }

  for (const [key, value] of Object.entries(node)) {
    if (
      key === "__compat" ||
      !Object.prototype.hasOwnProperty.call(node, key)
    ) {
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      !("support" in value) &&
      !("status" in value)
    ) {
      const transformedChild = transformBcdData(
        value as Identifier,
        browsersData,
      );
      if (transformedChild !== null) {
        transformedNode[key] = transformedChild;
        hasProperties = true;
      }
    }
  }

  return hasProperties ? transformedNode : null;
}
