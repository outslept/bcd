import type {
  BrowserStatement,
  SimpleSupportStatement,
  SupportStatement,
  VersionValue,
} from '@mdn/browser-compat-data'

export function asList<T>(a: T | T[]): T[] {
  return Array.isArray(a) ? a : [a]
}

export function hasMore(support: SupportStatement | undefined): boolean {
  return Array.isArray(support) && support.length > 1
}

export function versionIsPreview(
  version: string | VersionValue | undefined,
  browser: BrowserStatement,
): boolean {
  if (version === 'preview') return true

  if (browser && typeof version == 'string' && browser.releases[version]) {
    return ['beta', 'nightly', 'planned'].includes(
      browser.releases[version].status,
    )
  }

  return false
}

export function hasNoteworthyNotes(support: SimpleSupportStatement): boolean {
  return (
    Boolean(
      (support.notes && support.notes.length) ||
        (support.impl_url && support.impl_url.length),
    ) &&
    !support.version_removed &&
    !support.partial_implementation
  )
}

export function hasLimitation(support: SimpleSupportStatement): boolean {
  return (
    hasMajorLimitation(support) ||
    Boolean(support.notes) ||
    Boolean(support.impl_url)
  )
}

export function hasMajorLimitation(support: SimpleSupportStatement): boolean {
  return (
    support.partial_implementation ||
    Boolean(support.alternative_name) ||
    Boolean(support.flags) ||
    Boolean(support.prefix) ||
    Boolean(support.version_removed)
  )
}

export function isFullySupportedWithoutLimitation(
  support: SimpleSupportStatement,
): boolean {
  return Boolean(support.version_added) && !hasLimitation(support)
}

export function isNotSupportedAtAll(support: SimpleSupportStatement): boolean {
  return support.version_added === false && !hasLimitation(support)
}

export function isFullySupportedWithoutMajorLimitation(
  support: SimpleSupportStatement,
): boolean {
  return Boolean(support.version_added) && !hasMajorLimitation(support)
}

function calculateSupportPriority(item: SimpleSupportStatement): number {
  // higher prio = better support
  if (isFullySupportedWithoutLimitation(item)) return 6
  if (isFullySupportedWithoutMajorLimitation(item)) return 5
  if (!item.version_removed && (item.prefix || item.alternative_name)) return 4
  if (!item.version_removed && item.partial_implementation) return 3
  if (!item.version_removed && item.flags) return 2
  if (item.version_removed) return 1
  return 0
}

export function getCurrentSupport(
  support: SupportStatement | undefined,
): SimpleSupportStatement | undefined {
  if (!support) return undefined

  const items = asList(support)

  let bestItem = items[0]
  let bestPriority = calculateSupportPriority(bestItem)

  for (let i = 1; i < items.length; i++) {
    const priority = calculateSupportPriority(items[i])
    if (priority > bestPriority) {
      bestItem = items[i]
      bestPriority = priority
    }
  }

  return bestItem
}

export type SupportClassName =
  | 'no'
  | 'yes'
  | 'partial'
  | 'preview'
  | 'removed-partial'
  | 'unknown'

export function getSupportClassName(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
): SupportClassName {
  if (!support) return 'unknown'

  const currentSupport = getCurrentSupport(support)
  if (!currentSupport) return 'unknown'

  const { flags, version_added, version_removed, partial_implementation } =
    currentSupport

  let className: SupportClassName
  if (version_added == null) {
    className = 'unknown'
  } else if (versionIsPreview(version_added, browser)) {
    className = 'preview'
  } else if (version_added) {
    className = 'yes'
    if (version_removed || (flags && flags.length)) {
      className = 'no'
    }
  } else {
    className = 'no'
  }

  if (partial_implementation) {
    className = version_removed ? 'removed-partial' : 'partial'
  }

  return className
}
