import type {
  BrowserStatement,
  SimpleSupportStatement,
  SupportStatement,
  VersionValue,
} from "@mdn/browser-compat-data";

export function asList<T>(a: T | T[]): T[] {
  return Array.isArray(a) ? a : [a];
}

export function hasMore(support: SupportStatement | undefined): boolean {
  return Array.isArray(support) && support.length > 1;
}

export function versionIsPreview(
  version: string | VersionValue | undefined,
  browser: BrowserStatement,
): boolean {
  if (version === "preview") return true;

  if (browser && typeof version == "string" && browser.releases[version]) {
    return ["beta", "nightly", "planned"].includes(
      browser.releases[version].status,
    );
  }

  return false;
}

export function hasNoteworthyNotes(support: SimpleSupportStatement): boolean {
  return (
    Boolean(
      (support.notes && support.notes.length) ||
        (support.impl_url && support.impl_url.length),
    ) &&
    !support.version_removed &&
    !support.partial_implementation
  );
}

export function hasLimitation(support: SimpleSupportStatement): boolean {
  return (
    hasMajorLimitation(support) ||
    Boolean(support.notes) ||
    Boolean(support.impl_url)
  );
}

export function hasMajorLimitation(support: SimpleSupportStatement): boolean {
  return (
    support.partial_implementation ||
    Boolean(support.alternative_name) ||
    Boolean(support.flags) ||
    Boolean(support.prefix) ||
    Boolean(support.version_removed)
  );
}

export function isFullySupportedWithoutLimitation(
  support: SimpleSupportStatement,
): boolean {
  return Boolean(support.version_added) && !hasLimitation(support);
}

export function isNotSupportedAtAll(support: SimpleSupportStatement): boolean {
  return support.version_added === false && !hasLimitation(support);
}

export function isFullySupportedWithoutMajorLimitation(
  support: SimpleSupportStatement,
): boolean {
  return Boolean(support.version_added) && !hasMajorLimitation(support);
}

export function getCurrentSupport(
  support: SupportStatement | undefined,
): SimpleSupportStatement | undefined {
  if (!support) return undefined;

  const noLimitationSupportItem = asList(support).find((item) =>
    isFullySupportedWithoutLimitation(item),
  );
  if (noLimitationSupportItem) return noLimitationSupportItem;

  const minorLimitationSupportItem = asList(support).find((item) =>
    isFullySupportedWithoutMajorLimitation(item),
  );
  if (minorLimitationSupportItem) return minorLimitationSupportItem;

  const altnamePrefixSupportItem = asList(support).find(
    (item) => !item.version_removed && (item.prefix || item.alternative_name),
  );
  if (altnamePrefixSupportItem) return altnamePrefixSupportItem;

  const partialSupportItem = asList(support).find(
    (item) => !item.version_removed && item.partial_implementation,
  );
  if (partialSupportItem) return partialSupportItem;

  const flagSupportItem = asList(support).find(
    (item) => !item.version_removed && item.flags,
  );
  if (flagSupportItem) return flagSupportItem;

  const noSupportItem = asList(support).find((item) => item.version_removed);
  if (noSupportItem) return noSupportItem;

  return Array.isArray(support) ? support[0] : support;
}

export type SupportClassName =
  | "no"
  | "yes"
  | "partial"
  | "preview"
  | "removed-partial"
  | "unknown";

export function getSupportClassName(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
): SupportClassName {
  if (!support) return "unknown";

  const currentSupport = getCurrentSupport(support);
  if (!currentSupport) return "unknown";

  const { flags, version_added, version_removed, partial_implementation } =
    currentSupport;

  let className: SupportClassName;
  if (version_added == null) {
    className = "unknown";
  } else if (versionIsPreview(version_added, browser)) {
    className = "preview";
  } else if (version_added) {
    className = "yes";
    if (version_removed || (flags && flags.length)) {
      className = "no";
    }
  } else {
    className = "no";
  }

  if (partial_implementation) {
    className = version_removed ? "removed-partial" : "partial";
  }

  return className;
}
