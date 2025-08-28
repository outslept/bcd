import type {
  BrowserStatement,
  SimpleSupportStatement,
  SupportStatement,
  VersionValue,
} from '@mdn/browser-compat-data'

export type SupportClassName =
  | 'no'
  | 'yes'
  | 'partial'
  | 'preview'
  | 'removed-partial'
  | 'unknown'

/**
 * Is this version considered a preview/beta/nightly?
 * - literal 'preview' counts as preview
 * - otherwise we look up the release status safely
 */
export function versionIsPreview(
  version: string | VersionValue | undefined,
  browser: BrowserStatement,
) {
  if (version === 'preview') return true
  if (typeof version === 'string') {
    const release = browser.releases?.[version]
    if (!release) return false
    return ['beta', 'nightly', 'planned'].includes(release.status)
  }
  return false
}

/**
 * Does this support entry have noteworthy notes or impl links,
 * and is it not removed/partial?
 */
export function hasNoteworthyNotes(support: SimpleSupportStatement) {
  const hasNotes = Boolean(support.notes)
  const hasImpl = Boolean(support.impl_url)
  return (hasNotes || hasImpl) && !support.version_removed && !support.partial_implementation
}

/**
 * Has any limitation (notes, impl_url, flags, prefix, partial, removed)?
 */
export function hasLimitation(support: SimpleSupportStatement) {
  return (
    hasMajorLimitation(support) ||
    Boolean(support.notes) ||
    Boolean(support.impl_url)
  )
}

/**
 * Major limitation = partial implementation, alternative name, flags, prefix, removed.
 */
export function hasMajorLimitation(support: SimpleSupportStatement) {
  return Boolean(
    support.partial_implementation ||
      support.alternative_name ||
      (support.flags && support.flags.length > 0) ||
      support.prefix ||
      support.version_removed,
  )
}

/** Fully supported and no limitations */
export function isFullySupportedWithoutLimitation(
  support: SimpleSupportStatement,
) {
  return Boolean(support.version_added) && !hasLimitation(support)
}

/** No support at all and no extra notes */
export function isNotSupportedAtAll(support: SimpleSupportStatement) {
  return support.version_added === false && !hasLimitation(support)
}

/** Fully supported and no major limitations */
export function isFullySupportedWithoutMajorLimitation(
  support: SimpleSupportStatement,
) {
  return Boolean(support.version_added) && !hasMajorLimitation(support)
}

/**
 * Small priority system so we can pick the "best" support entry
 * from an array of support items.
 */
function calculateSupportPriority(item: SimpleSupportStatement) {
  if (isFullySupportedWithoutLimitation(item)) return 6
  if (isFullySupportedWithoutMajorLimitation(item)) return 5
  if (!item.version_removed && (item.prefix || item.alternative_name)) return 4
  if (!item.version_removed && item.partial_implementation) return 3
  if (!item.version_removed && item.flags) return 2
  if (item.version_removed) return 1
  return 0
}

/**
 * Given SupportStatement (one item or array), return the single item
 * that best represents current support.
 */
export function getCurrentSupport(support: SupportStatement | undefined) {
  if (!support) return undefined
  const items = Array.isArray(support) ? support : [support]
  let best = items[0]
  let bestPriority = calculateSupportPriority(best)

  for (let i = 1; i < items.length; i++) {
    const p = calculateSupportPriority(items[i])
    if (p > bestPriority) {
      best = items[i]
      bestPriority = p
    }
  }

  return best
}

/**
 * Convert a support entry to a short class name we can use in the UI.
 */
export function getSupportClassName(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
): SupportClassName {
  if (!support) return 'unknown'

  const current = getCurrentSupport(support)
  if (!current) return 'unknown'

  const hasFlags = Boolean(current.flags && current.flags.length > 0)
  const hasAddedVersion = Boolean(current.version_added)
  const hasRemovedVersion = Boolean(current.version_removed)
  const isPartial = Boolean(current.partial_implementation)
  const isPreview = versionIsPreview(current.version_added, browser)

  if (isPreview) return 'preview'
  if (isPartial) return hasRemovedVersion ? 'removed-partial' : 'partial'
  if (!hasAddedVersion) return 'no'

  // If a version was added but there is a recent removal or flags,
  // treat it as 'no' so caller can show details.
  if (hasAddedVersion && (hasRemovedVersion || hasFlags)) return 'no'

  return 'yes'
}
