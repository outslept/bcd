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

export function formatVersion(version: unknown, browser: BrowserStatement) {
  if (typeof version !== 'string') return '?'
  if (version === 'preview') return browser.preview_name ?? 'Preview'
  return version.replace(/(\.0)+$/g, '')
}

export function formatBugUrl(url: string) {
  const match =
    /^https:\/\/(?:crbug\.com|webkit\.org\/b|bugzil\.la)\/(\d+)/i.exec(url)
  const bugNumber = match?.[1]
  return bugNumber ? `bug ${bugNumber}` : url
}

function generateFlagDescription(
  item: SimpleSupportStatement,
  browser: BrowserStatement,
) {
  if (!item.flags) return ''

  const hasAddedVersion = typeof item.version_added === 'string'
  const hasRemovedVersion = typeof item.version_removed === 'string'

  const versionPart = [
    hasAddedVersion && `From version ${String(item.version_added)}`,
    hasRemovedVersion &&
      `${hasAddedVersion ? ' until' : 'Until'} ${String(item.version_removed)} (exclusive)`,
  ]
    .filter(Boolean)
    .join('')

  const prefix = hasAddedVersion || hasRemovedVersion ? ': this' : 'This'

  const flagsPart = item.flags
    .map((flag, flagIndex) => {
      const valueToSet = flag.value_to_set
        ? ` (needs to be set to ${flag.value_to_set})`
        : ''
      const flagType =
        flag.type === 'preference'
          ? ` preference${valueToSet}`
          : ` runtime flag${valueToSet}`
      const connector =
        flagIndex < (item.flags?.length ?? 0) - 1 ? ' and the ' : ''
      return `${flag.name}${flagType}${connector}`
    })
    .join('')

  const urlPart =
    browser.pref_url && item.flags.some((flag) => flag.type === 'preference')
      ? ` To change preferences in ${browser.name}, visit ${browser.pref_url}.`
      : ''

  return `${versionPart}${prefix} feature is behind the ${flagsPart}.${urlPart}`
}

export function generateSupportNotes(
  item: SimpleSupportStatement,
  browser: BrowserStatement,
  support: SupportStatement,
) {
  const notes: Array<{
    iconName: string
    label: string | ReactNode
    key?: string
  }> = []

  if (
    item.version_removed &&
    !(Array.isArray(support) ? support : [support]).some(
      (otherItem) => otherItem.version_added === item.version_removed,
    )
  ) {
    notes.push({
      iconName: 'footnote',
      label: `Removed in ${formatVersion(item.version_removed, browser)} and later`,
    })
  }

  notes.push({ iconName: 'footnote', label: 'Partial support' })

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
    const notesList = Array.isArray(item.notes) ? item.notes : [item.notes]
    notesList.forEach((note, noteIndex) => {
      notes.push({
        iconName: 'footnote',
        label: note,
        key: `note-${String(noteIndex)}`,
      })
    })
  }

  if (item.impl_url) {
    const urlsList = Array.isArray(item.impl_url)
      ? item.impl_url
      : [item.impl_url]
    urlsList.forEach((url, urlIndex) => {
      notes.push({
        iconName: 'footnote',
        label: (
          <>
            See <a href={url}>{formatBugUrl(url)}</a>.
          </>
        ),
        key: `impl-${String(urlIndex)}`,
      })
    })
  }

  if (versionIsPreview(item.version_added, browser)) {
    notes.push({ iconName: 'footnote', label: 'Preview browser support' })
  }

  if (
    isFullySupportedWithoutLimitation(item) &&
    !versionIsPreview(item.version_added, browser)
  ) {
    notes.push({ iconName: 'footnote', label: 'Full support' })
  } else if (isNotSupportedAtAll(item)) {
    notes.push({ iconName: 'footnote', label: 'No support' })
  }

  return notes.length > 0
    ? notes
    : [{ iconName: 'unknown', label: 'Support unknown' }]
}
