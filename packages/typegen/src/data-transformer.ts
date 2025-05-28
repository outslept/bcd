import type { BrowsersData } from "./types";
import type {
  BrowserName,
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
  SupportBlock,
} from "@mdn/browser-compat-data";

function cleanSimpleSupportStatement(
  statement: SimpleSupportStatement,
): SimpleSupportStatement {
  const cleaned: SimpleSupportStatement = {
    version_added: statement.version_added,
  };

  if (statement.version_removed !== undefined)
    cleaned.version_removed = statement.version_removed;
  if (statement.version_last !== undefined)
    cleaned.version_last = statement.version_last;
  if (statement.prefix !== undefined) cleaned.prefix = statement.prefix;
  if (statement.alternative_name !== undefined)
    cleaned.alternative_name = statement.alternative_name;
  if (statement.flags !== undefined) cleaned.flags = [...statement.flags];
  if (statement.partial_implementation !== undefined)
    cleaned.partial_implementation = statement.partial_implementation;
  if (statement.notes !== undefined) {
    cleaned.notes = Array.isArray(statement.notes)
      ? [...statement.notes]
      : statement.notes;
  }

  return cleaned;
}

function cleanSupportBlock(support: SupportBlock): SupportBlock {
  const cleaned: SupportBlock = {};

  Object.entries(support).forEach(([browserName, statement]) => {
    if (!statement) return;

    const typedBrowserName = browserName as BrowserName;

    if (Array.isArray(statement)) {
      const cleanedStatements = statement
        .filter(
          (s): s is SimpleSupportStatement => s !== null && s !== undefined,
        )
        .map(cleanSimpleSupportStatement);

      if (cleanedStatements.length === 1) {
        cleaned[typedBrowserName] = cleanedStatements[0];
      } else if (cleanedStatements.length >= 2) {
        cleaned[typedBrowserName] = cleanedStatements as [
          SimpleSupportStatement,
          SimpleSupportStatement,
          ...SimpleSupportStatement[],
        ];
      }
    } else {
      cleaned[typedBrowserName] = cleanSimpleSupportStatement(statement);
    }
  });

  return cleaned;
}

function isIdentifier(value: unknown): value is Identifier {
  return (
    value !== null &&
    typeof value === "object" &&
    !("support" in value) &&
    !("status" in value)
  );
}

export function transformBcdData(
  node: Identifier,
  browsersData?: BrowsersData,
): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;

  const transformed: Record<string, unknown> = {};
  let hasProperties = false;

  if (node.__compat) {
    const cleanedSupport = cleanSupportBlock(node.__compat.support);
    const compatStatement: CompatStatement = {
      ...node.__compat,
      support: cleanedSupport,
    };

    if (node.__compat.status) {
      compatStatement.status = { ...node.__compat.status };
    }

    transformed.__compat = compatStatement;
    hasProperties = true;
  }

  Object.entries(node).forEach(([key, value]) => {
    if (key === "__compat" || !value || !isIdentifier(value)) {
      return;
    }

    const transformedChild = transformBcdData(value, browsersData);
    if (transformedChild !== null) {
      transformed[key] = transformedChild;
      hasProperties = true;
    }
  });

  return hasProperties ? transformed : null;
}
