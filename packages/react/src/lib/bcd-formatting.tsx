import type {
  BrowserStatement,
  SimpleSupportStatement,
  SupportStatement,
} from '@mdn/browser-compat-data'
import type { ReactNode } from 'react'
import {
  versionIsPreview,
  isFullySupportedWithoutLimitation,
  isNotSupportedAtAll,
} from './bcd-support'

/** Convert a raw version value into a short human label. */
export function formatVersion(version: unknown, browser: BrowserStatement) {
  if (typeof version !== 'string') return '?'
  if (version === 'preview') return browser.preview_name ?? 'Preview'
  return version.replace(/(\.0)+$/g, '')
}

/** If URL looks like a bug tracker, show "bug 12345" instead of full url. */
export function formatBugUrl(url: string) {
  const match =
    /^https:\/\/(?:crbug\.com|webkit\.org\/b|bugzil\.la)\/(\d+)/i.exec(url)
  const bugNumber = match?.[1]
  return bugNumber ? `bug ${bugNumber}` : url
}

/** Build a human-readable description for flags/prefs. */
function generateFlagDescription(
  item: SimpleSupportStatement,
  browser: BrowserStatement,
) {
  if (!item.flags) return ''

  const hasAdded = typeof item.version_added === 'string'
  const hasRemoved = typeof item.version_removed === 'string'

  const versionPart = [
    hasAdded && `From version ${String(item.version_added)}`,
    hasRemoved &&
      `${hasAdded ? ' until' : 'Until'} ${String(item.version_removed)} (exclusive)`,
  ]
    .filter(Boolean)
    .join('')

  const prefix = hasAdded || hasRemoved ? ': this' : 'This'

  const flagsPart = item.flags
    .map((flag, idx) => {
      const valuePart = flag.value_to_set ? ` (needs to be set to ${flag.value_to_set})` : ''
      const typePart = flag.type === 'preference' ? ` preference${valuePart}` : ` runtime flag${valuePart}`
      const connector = idx < (item.flags?.length ?? 0) - 1 ? ' and the ' : ''
      return `${flag.name}${typePart}${connector}`
    })
    .join('')

  const urlPart =
    browser.pref_url && item.flags.some((f) => f.type === 'preference')
      ? ` To change preferences in ${browser.name}, visit ${browser.pref_url}.`
      : ''

  return `${versionPart}${prefix} feature is behind the ${flagsPart}.${urlPart}`
}

/**
 * Build a list of small note objects that the UI can render.
 * Each note has: { iconName, label, key? }
 */
export function generateSupportNotes(
  item: SimpleSupportStatement,
  browser: BrowserStatement,
  support: SupportStatement,
) {
  const notes: Array<{ iconName: string; label: string | ReactNode; key?: string }> = []

  // If feature was removed and not re-introduced at that same removed version:
  if (
    item.version_removed &&
    !(Array.isArray(support) ? support : [support]).some(
      (other) => other.version_added === item.version_removed,
    )
  ) {
    notes.push({
      iconName: 'footnote',
      label: `Removed in ${formatVersion(item.version_removed, browser)} and later`,
    })
  }

  // Partial implementation is only added when explicitly signaled.
  if (item.partial_implementation) {
    notes.push({ iconName: 'footnote', label: 'Partial support' })
  }

  if (item.prefix) {
    notes.push({
      iconName: 'prefix',
      label: `Implemented with the vendor prefix: ${item.prefix}`,
    })
  }

  if (item.alternative_name) {
    notes.push({
      iconName: 'altname',
      label: `Alternate name: ${item.alternative_name}`,
    })
  }

  if (item.flags) {
    notes.push({
      iconName: 'disabled',
      label: generateFlagDescription(item, browser),
    })
  }

  if (item.notes) {
    const arr = Array.isArray(item.notes) ? item.notes : [item.notes]
    arr.forEach((n, idx) =>
      notes.push({ iconName: 'footnote', label: n, key: `note-${idx}` }),
    )
  }

  if (item.impl_url) {
    const urls = Array.isArray(item.impl_url) ? item.impl_url : [item.impl_url]
    urls.forEach((u, idx) =>
      notes.push({
        iconName: 'footnote',
        label: (
          <>
            See <a href={u}>{formatBugUrl(u)}</a>.
          </>
        ),
        key: `impl-${idx}`,
      }),
    )
  }

  if (versionIsPreview(item.version_added, browser)) {
    notes.push({ iconName: 'footnote', label: 'Preview browser support' })
  }

  if (isFullySupportedWithoutLimitation(item) && !versionIsPreview(item.version_added, browser)) {
    notes.push({ iconName: 'footnote', label: 'Full support' })
  } else if (isNotSupportedAtAll(item)) {
    notes.push({ iconName: 'footnote', label: 'No support' })
  }

  return notes.length > 0 ? notes : [{ iconName: 'unknown', label: 'Support unknown' }]
}
