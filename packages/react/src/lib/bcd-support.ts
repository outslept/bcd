import type {
  BrowserStatement,
  SimpleSupportStatement,
  SupportStatement,
  VersionValue,
} from '@mdn/browser-compat-data'

export function versionIsPreview(
  version: string | VersionValue | undefined,
  browser: BrowserStatement,
) {
  if (version === 'preview') return true

  if (typeof version === 'string') {
    return ['beta', 'nightly', 'planned'].includes(
      browser.releases[version].status,
    )
  }

  return false
}

export function hasNoteworthyNotes(support: SimpleSupportStatement) {
  return (
    Boolean(
      (support.notes?.length) ??
        (support.impl_url?.length),
    ) &&
    !support.version_removed &&
    !support.partial_implementation
  )
}

export function hasLimitation(support: SimpleSupportStatement) {
  return (
    hasMajorLimitation(support) ||
    Boolean(support.notes) ||
    Boolean(support.impl_url)
  )
}

export function hasMajorLimitation(support: SimpleSupportStatement) {
  return (
    support.partial_implementation ||
    Boolean(support.alternative_name) ||
    Boolean(support.flags) ||
    Boolean(support.prefix) ||
    Boolean(support.version_removed)
  )
}

export function isFullySupportedWithoutLimitation(support: SimpleSupportStatement) {
  return Boolean(support.version_added) && !hasLimitation(support)
}

export function isNotSupportedAtAll(support: SimpleSupportStatement) {
  return support.version_added === false && !hasLimitation(support)
}

export function isFullySupportedWithoutMajorLimitation(support: SimpleSupportStatement) {
  return Boolean(support.version_added) && !hasMajorLimitation(support)
}

function calculateSupportPriority(item: SimpleSupportStatement) {
  if (isFullySupportedWithoutLimitation(item)) return 6
  if (isFullySupportedWithoutMajorLimitation(item)) return 5
  if (!item.version_removed && (item.prefix || item.alternative_name)) return 4
  if (!item.version_removed && item.partial_implementation) return 3
  if (!item.version_removed && item.flags) return 2
  if (item.version_removed) return 1
  return 0
}

export function getCurrentSupport(support: SupportStatement | undefined) {
  if (!support) return undefined

  const items = Array.isArray(support) ? support : [support]
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

export function getSupportClassName(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
) {
  if (!support) return 'unknown'

  const currentSupport = getCurrentSupport(support)
  if (!currentSupport) return 'unknown'

  const { flags, version_added, version_removed, partial_implementation } = currentSupport

  let className: 'no' | 'yes' | 'partial' | 'preview' | 'removed-partial' | 'unknown'

  if (version_added == null) {
    className = 'unknown'
  } else if (versionIsPreview(version_added, browser)) {
    className = 'preview'
  } else if (version_added) {
    className = 'yes'
    if (version_removed || (flags?.length)) {
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
