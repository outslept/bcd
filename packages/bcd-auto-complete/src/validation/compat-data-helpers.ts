import type {
  SimpleSupportStatement,
  SupportStatement,
} from "@mdn/browser-compat-data";

export function fixSupportStatement(
  statement: SupportStatement,
): SupportStatement {
  const fixSimpleStatement = (
    simple: SimpleSupportStatement,
  ): SimpleSupportStatement => {
    const fixed = { ...simple };

    if (fixed.version_added === undefined) {
      fixed.version_added = false;
    }

    if (fixed.prefix && typeof fixed.prefix !== "string") {
      delete fixed.prefix;
    }
    if (fixed.alternative_name && typeof fixed.alternative_name !== "string") {
      delete fixed.alternative_name;
    }
    if (fixed.partial_implementation && !fixed.notes) {
      delete fixed.partial_implementation;
    }

    return fixed;
  };

  if (Array.isArray(statement)) {
    const fixed = statement.map(fixSimpleStatement);
    if (fixed.length < 2) {
      return fixed[0];
    }
    return [fixed[0], fixed[1], ...fixed.slice(2)] as [
      SimpleSupportStatement,
      SimpleSupportStatement,
      ...SimpleSupportStatement[],
    ];
  }

  return fixSimpleStatement(statement as SimpleSupportStatement);
}

export function processCompatNode(node: Record<string, unknown>): void {
  if (node.__compat) {
    const compat = node.__compat as Record<string, unknown>;

    if (compat.support) {
      const support = compat.support as Record<string, unknown>;
      Object.entries(support).forEach(([browser, statement]) => {
        if (statement) {
          support[browser] = fixSupportStatement(statement as SupportStatement);
        }
      });
    }

    if (compat.status) {
      const status = compat.status as Record<string, unknown>;
      if (typeof status.experimental !== "boolean") {
        status.experimental = true;
      }
      if (typeof status.standard_track !== "boolean") {
        status.standard_track = true;
      }
      if (typeof status.deprecated !== "boolean") {
        status.deprecated = false;
      }
    }
  }

  Object.entries(node).forEach(([key, value]) => {
    if (
      key !== "__compat" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      processCompatNode(value as Record<string, unknown>);
    }
  });
}
