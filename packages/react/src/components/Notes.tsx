import type {
  BrowserStatement,
  SupportStatement,
  SimpleSupportStatement,
} from '@mdn/browser-compat-data'
import type { ReactNode } from 'react'

import {
  asList,
  getSupportClassName,
  isFullySupportedWithoutLimitation,
  isNotSupportedAtAll,
  versionIsPreview,
} from '../lib/support-analysis'
import styles from '../styles/components/Notes.module.css'

import { CellText } from './CellText'
import { Icon } from './Icon'

interface NoteItem {
  iconName: string
  label: string | ReactNode
  key?: string
}

function formatVersion(version: unknown, browser: BrowserStatement): string {
  if (typeof version !== 'string') return '?'
  if (version === 'preview') return browser.preview_name ?? 'Preview'
  return version.replace(/(\.0)+$/g, '')
}

function formatBugUrl(url: string): string | ReactNode {
  const match =
    /^https:\/\/(?:crbug\.com|webkit\.org\/b|bugzil\.la)\/(\d+)/i.exec(url)
  const bugNumber = match?.[1]
  return bugNumber ? `bug ${bugNumber}` : url
}

function generateFlagDescription(
  item: SimpleSupportStatement,
  browser: BrowserStatement,
): string {
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

function generateSupportNotes(
  item: SimpleSupportStatement,
  browser: BrowserStatement,
  support: SupportStatement,
): NoteItem[] {
  const notes: NoteItem[] = []

  // Version removed note
  if (
    item.version_removed &&
    !asList(support).some(
      (otherItem) => otherItem.version_added === item.version_removed,
    )
  ) {
    notes.push({
      iconName: 'footnote',
      label: `Removed in ${formatVersion(item.version_removed, browser)} and later`,
    })
  }

  // Always add partial support note
  notes.push({ iconName: 'footnote', label: 'Partial support' })

  // Prefix note
  if (item.prefix) {
    notes.push({
      iconName: 'prefix',
      label: `Implemented with the vendor prefix: ${item.prefix}`,
    })
  }

  // Alternative name note
  if (item.alternative_name) {
    notes.push({
      iconName: 'altname',
      label: `Alternate name: ${item.alternative_name}`,
    })
  }

  // Flags note
  if (item.flags) {
    notes.push({
      iconName: 'disabled',
      label: generateFlagDescription(item, browser),
    })
  }

  // Regular notes
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

  // Implementation URLs
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

  // Preview support note
  if (versionIsPreview(item.version_added, browser)) {
    notes.push({ iconName: 'footnote', label: 'Preview browser support' })
  }

  // Support status notes
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

function Notes({
  browser,
  support,
}: {
  browser: BrowserStatement
  support: SupportStatement
}) {
  const supportItems = asList(support)

  const notes = supportItems
    .slice()
    .reverse()
    .map((item, i) => {
      const supportNotes = generateSupportNotes(item, browser, support)
      const hasNotes = supportNotes.length > 0
      const itemKey = `item-${String(i)}-${String(item.version_added)}-${String(item.version_removed)}`
      const supportClassName = getSupportClassName(item, browser)

      if (i !== 0 && !hasNotes) return null

      return (
        <div key={itemKey} className={styles['notes-wrapper']}>
          <div
            className={`${styles[`support-badge--${supportClassName}`]} ${styles['support-badge']} ${styles['notes-header']}`}
          >
            <CellText support={item} browser={browser} timeline={true} />
          </div>
          <div className={styles['notes-content']}>
            {supportNotes.map(({ iconName, label, key }, noteIndex) => (
              <div
                key={key ?? `${itemKey}-note-${String(noteIndex)}`}
                className={styles['notes-item']}
              >
                <Icon name={iconName} />
                <span className={styles['notes-text']}>
                  {typeof label === 'string' ? (
                    <span dangerouslySetInnerHTML={{ __html: label }} />
                  ) : (
                    label
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    })
    .filter(Boolean)

  return notes.length > 0 ? <>{notes}</> : null
}

export { Notes }
