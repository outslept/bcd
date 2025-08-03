import type {
  BrowserName,
  BrowserStatement,
  Browsers,
  CompatStatement,
  Identifier,
  SupportStatement,
} from '@mdn/browser-compat-data'
import { useState, useEffect, type Ref } from 'react'

import { gatherPlatformsAndBrowsers, listFeatures, filterFeatures } from '../lib/bcd-features'
import { generateSupportNotes } from '../lib/bcd-formatting'
import {
  getCurrentSupport,
  getSupportClassName,
  hasNoteworthyNotes,
} from '../lib/bcd-support'

import styles from './compat-table.module.css'
import { Icons } from './icons'

interface Feature {
  name: string
  compat: CompatStatement
  depth: number
}

const iconConfig: Record<string, keyof typeof Icons> = {
  chrome: 'chrome',
  chrome_android: 'chrome',
  firefox: 'firefox',
  firefox_android: 'firefox',
  safari: 'safari',
  safari_ios: 'safari',
  edge: 'edge',
  opera: 'opera',
  opera_android: 'opera',
  webview_android: 'android',
  webview_ios: 'safari',
  samsunginternet_android: 'samsung_internet',
  nodejs: 'node',
  deno: 'deno',
  ie: 'edge',
  webview: 'android',
  samsung: 'samsung_internet',
  android: 'android',
  desktop: 'desktop',
  mobile: 'smartphone',
  server: 'server',
  experimental: 'test_tube',
  deprecated: 'trash',
  nonstandard: 'zap',
  prefix: 'flag',
  footnote: 'info',
  altname: 'tag',
  disabled: 'wrench',
  more: 'ellipsis',
}

function Notes({ browser, support }: { browser: BrowserStatement; support: SupportStatement }) {
  const supportItems = Array.isArray(support) ? support : [support]

  const notes = supportItems
    .slice()
    .reverse()
    .map((item, i) => {
      const supportNotes = generateSupportNotes(item, browser, support)
      if (i !== 0 && supportNotes.length === 0) return null

      const itemKey = `item-${String(i)}-${String(item.version_added)}-${String(item.version_removed)}`
      const supportClassName = getSupportClassName(item, browser)
      const currentSupport = getCurrentSupport(item)
      const added = currentSupport?.version_added
      const lastVersion = currentSupport?.version_last

      const browserReleaseDate = added && typeof added === 'string'
        ? browser.releases[added].release_date
        : null

      let label = '?'
      if (typeof lastVersion === 'string') {
        const addedLabel = typeof added === 'string'
          ? added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')
          : '?'
        const removedLabel = lastVersion.replace(/(\.0)+$/g, '')
        label = `${addedLabel}–${removedLabel}`
      } else if (typeof added === 'string') {
        label = added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')
      }

      return (
        <div key={itemKey} className={styles['bcd-notes-wrapper']}>
          <div className={`${styles['bcd-notes-header']} ${styles[`bcd-support-badge--${supportClassName}`]}`}>
            <div className={styles['bcd-cell-text-wrapper--timeline']}>
              <span className={styles['bcd-browser-name']}>{browser.name}</span>
              <span className={styles['bcd-version-label']}>
                {added ? label : null}
                {browserReleaseDate ? ` (Released ${browserReleaseDate})` : ''}
              </span>
            </div>
          </div>
          {supportNotes.map(({ iconName, label, key }, noteIndex) => {
            const IconComponent = Icons[iconConfig[iconName]]
            return (
              <div
                key={key ?? `${itemKey}-note-${String(noteIndex)}`}
                className={styles['bcd-notes-item']}
              >
                <IconComponent className={styles['bcd-icon']} />
                <span className={styles['bcd-notes-text']}>
                  {typeof label === 'string' ? (
                    <span dangerouslySetInnerHTML={{ __html: label }} />
                  ) : (
                    label
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )
    })
    .filter(Boolean)

  return notes.length > 0 ? <>{notes}</> : null
}

function SupportCell({ feature, browser, browserInfo }: {
  feature: Feature
  browser: BrowserName
  browserInfo: Browsers
}) {
  const [showNotes, setShowNotes] = useState(false)

  const browserStatement = browserInfo[browser]
  const support = feature.compat.support[browser] ?? { version_added: null }
  const currentSupport = getCurrentSupport(support)
  const supportClassName = getSupportClassName(support, browserStatement)

  const hasNotes = Boolean(
    (Array.isArray(support) && support.length > 1) ||
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    (currentSupport && hasNoteworthyNotes(currentSupport)) ||
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    currentSupport?.flags ||
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    currentSupport?.prefix ||
    currentSupport?.alternative_name
  )

  const added = currentSupport?.version_added
  const lastVersion = currentSupport?.version_last

  let label = '?'
  if (typeof lastVersion === 'string') {
    const addedLabel = typeof added === 'string'
      ? added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')
      : '?'
    const removedLabel = lastVersion.replace(/(\.0)+$/g, '')
    label = `${addedLabel}–${removedLabel}`
  } else if (typeof added === 'string') {
    label = added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')
  } else if (added === true) {
    label = 'Yes'
  } else if (added === false) {
    label = 'No'
  }

  const icons: string[] = []
  if (currentSupport) {
    if (currentSupport.prefix) icons.push('prefix')
    if (hasNoteworthyNotes(currentSupport)) icons.push('footnote')
    if (currentSupport.alternative_name) icons.push('altname')
    if (currentSupport.flags) icons.push('disabled')
    if (Array.isArray(support) && support.length > 1) icons.push('more')
  }

  const cellContent = (
    <div className={styles['bcd-cell-text-wrapper']}>
      <span className={styles['bcd-version-label']} title={`${browserStatement.name} – ${label}`}>
        {label}
      </span>
      {icons.length > 0 && (
        <div className={styles['bcd-icon-list']}>
          {icons.map((iconName, index) => {
            const IconComponent = Icons[iconConfig[iconName]]
            return <IconComponent key={index} className={styles['bcd-icon']} />
          })}
        </div>
      )}
    </div>
  )

  return (
    <td
      className={styles['bcd-support-cell']}
      data-browser={browser}
      data-support={supportClassName}
      style={hasNotes ? { position: 'relative' } : undefined}
    >
      {hasNotes ? (
        <>
          <button
            type="button"
            className={styles['bcd-support-button']}
            title="Show support details"
            aria-haspopup="dialog"
            aria-expanded={showNotes}
            aria-label={`${browserStatement.name} support details`}
            onClick={() => { setShowNotes(!showNotes); }}
          >
            {cellContent}
          </button>
          {showNotes && (
            <div className={styles['bcd-popup']}>
              <Notes browser={browserStatement} support={support} />
            </div>
          )}
        </>
      ) : (
        <div className={styles['bcd-support-button']}>
          {cellContent}
        </div>
      )}
    </td>
  )
}

export function CompatTable({
  ref,
  query,
  data,
  browserInfo,
  className,
  ...props
}: {
  ref?: Ref<HTMLTableElement>
  query: string
  data: Identifier
  browserInfo: Browsers
  className?: string
}) {
  const [processedData, setProcessedData] = useState<{
    platforms: string[]
    browsers: BrowserName[]
    features: Feature[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const processData = () => {
      try {
        setIsLoading(true)

        const queryParts = query.split('.')
        const category = queryParts[0] ?? ''
        const name = queryParts.at(-1)

        const [platforms, browsers] = gatherPlatformsAndBrowsers(category, data, browserInfo)
        const allFeatures = listFeatures(data, '', name)
        const features = filterFeatures(allFeatures)

        if (!cancelled) {
          setProcessedData({ platforms, browsers, features })
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to process BCD data:', error)
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    processData()

    return () => {
      cancelled = true
    }
  }, [query, data, browserInfo])

  if (isLoading) {
    return (
      <div className={`${styles['bcd-compat-table']} ${className ?? ''}`}>
        <div className={styles['bcd-table-container']}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            Loading compatibility data...
          </div>
        </div>
      </div>
    )
  }

  if (!processedData) {
    return (
      <div className={`${styles['bcd-compat-table']} ${className ?? ''}`}>
        <div className={styles['bcd-table-container']}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            Failed to load compatibility data
          </div>
        </div>
      </div>
    )
  }

  const { platforms, browsers, features } = processedData

  return (
    <div className={`${styles['bcd-compat-table']} ${className ?? ''}`}>
      <div className={styles['bcd-table-container']}>
        <table ref={ref} className={styles['bcd-table']} {...props}>
          <thead>
            <tr className={styles['bcd-platform-row']}>
              <th scope="col"></th>
              {platforms.map((platform) => {
                const platformBrowserCount = browsers.filter(
                  (browser) => browserInfo[browser].type === platform
                ).length
                const IconComponent = Icons[iconConfig[platform]]

                return (
                  <th
                    key={platform}
                    className={styles['bcd-platform-cell']}
                    colSpan={platformBrowserCount}
                    scope="colgroup"
                    data-platform={platform}
                  >
                    <IconComponent className={styles['bcd-icon']} />
                  </th>
                )
              })}
            </tr>

            <tr className={styles['bcd-browser-row']}>
              <th scope="col"></th>
              {browsers.map((browser) => {
                const IconComponent = Icons[iconConfig[browser]]
                const { name } = browserInfo[browser]

                return (
                  <th
                    key={browser}
                    className={styles['bcd-browser-cell']}
                    data-browser={browser}
                    scope="col"
                  >
                    <div className={styles['bcd-browser-label']}>
                      {name}
                    </div>
                    <IconComponent
                      className={styles['bcd-icon']}
                      aria-label={`${name} browser icon`}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {features.map((feature) => {
              const { name, compat, depth } = feature

              const title = compat.description ? (
                <span dangerouslySetInnerHTML={{ __html: compat.description }} />
              ) : (
                <code>{name}</code>
              )

              const statusIcons: string[] = []
              if (compat.status) {
                if (compat.status.experimental) statusIcons.push('experimental')
                if (compat.status.deprecated) statusIcons.push('deprecated')
                if (!compat.status.standard_track) statusIcons.push('nonstandard')
              }

              const content = (
                <>
                  {title}
                  {statusIcons.length > 0 && (
                    <div className={styles['bcd-icon-list']}>
                      {statusIcons.map((iconName) => {
                        const IconComponent = Icons[iconConfig[iconName]]
                        return <IconComponent key={iconName} className={styles['bcd-icon']} />
                      })}
                    </div>
                  )}
                </>
              )

              return (
                <tr key={`${name}-${String(depth)}`}>
                  <th
                    className={styles['bcd-feature-cell']}
                    scope="row"
                    data-depth={depth}
                  >
                    {compat.mdn_url && depth > 0 ? (
                      <a href={compat.mdn_url} className={styles['bcd-feature-header']}>
                        {content}
                      </a>
                    ) : (
                      <div className={styles['bcd-feature-header']}>{content}</div>
                    )}
                  </th>

                  {browsers.map((browser) => (
                    <SupportCell
                      key={browser}
                      feature={feature}
                      browser={browser}
                      browserInfo={browserInfo}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
