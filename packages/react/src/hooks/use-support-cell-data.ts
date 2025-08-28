import type {
  BrowserName,
  Browsers,
  SupportStatement,
} from '@mdn/browser-compat-data'
import { useMemo } from 'react'

import type { Feature } from '../lib/bcd-features'
import {
  getCurrentSupport,
  getSupportClassName,
  hasNoteworthyNotes,
} from '../lib/bcd-support'

function getSupportForBrowser(
  maybeCompat: unknown,
  browser: BrowserName,
): SupportStatement | undefined {
  if (maybeCompat == null || typeof maybeCompat !== 'object') return undefined
  const compat = maybeCompat as Record<string, unknown>

  const rawSupport = compat.support
  if (rawSupport == null || typeof rawSupport !== 'object') return undefined

  const supportRecord = rawSupport as Record<string, SupportStatement | undefined>
  return supportRecord[browser]
}

export function useSupportCellData(
  feature: Feature,
  browser: BrowserName,
  browserInfo: Browsers,
) {
  return useMemo(() => {
    const browserMeta = browserInfo[browser]
    const supportValue = getSupportForBrowser(feature.compat, browser)
    const current = getCurrentSupport(supportValue)
    const supportClass = getSupportClassName(supportValue, browserMeta)

    const supportItemsArray = supportValue ? (Array.isArray(supportValue) ? supportValue : [supportValue]) : []
    const hasMultiple = supportItemsArray.length > 1

    const hasFlags = Array.isArray(current?.flags) && current.flags.length > 0
    const hasPrefix = Boolean(current?.prefix)
    const hasAltName = Boolean(current?.alternative_name)
    const hasNoteworthy = Boolean(current && hasNoteworthyNotes(current))

    const hasNotes = hasMultiple || hasNoteworthy || hasFlags || hasPrefix || hasAltName

    function formatLabel() {
      const added = current?.version_added
      const lastVersion = current?.version_last

      if (typeof lastVersion === 'string') {
        const addedLabel =
          typeof added === 'string'
            ? added === 'preview'
              ? 'Preview'
              : added.replace(/(\.0)+$/g, '')
            : '?'
        const removedLabel = lastVersion.replace(/(\.0)+$/g, '')
        return `${addedLabel}–${removedLabel}`
      } else if (typeof added === 'string') {
        return added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')
      } else if (added === true) {
        return 'Yes'
      } else if (added === false) {
        return 'No'
      }
      return '?'
    }

    const icons: string[] = []
    if (current) {
      if (current.prefix) icons.push('prefix')
      if (hasNoteworthy) icons.push('footnote')
      if (current.alternative_name) icons.push('altname')
      if (current.flags) icons.push('disabled')
      if (hasMultiple) icons.push('more')
    }

    return {
      browserMeta,
      supportValue,
      current,
      supportClass,
      hasNotes,
      formatLabel,
      icons,
    }
  }, [feature, browser, browserInfo])
}
