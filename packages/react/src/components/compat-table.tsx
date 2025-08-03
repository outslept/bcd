import type {
  BrowserName,
  BrowserStatement,
  Browsers,
  CompatStatement,
  Identifier,
  StatusBlock,
  SupportStatement,
} from '@mdn/browser-compat-data'
import {
  createContext,
  use,
  useMemo,
  useState,
  type Ref,
  type ReactNode,
  type RefObject
} from 'react'

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

interface CompatTableState {
  query: string
  data: Identifier
  browserInfo: Browsers
  platforms: string[]
  browsers: BrowserName[]
  features: Feature[]
}

const iconConfig: Record<string, { icon: keyof typeof Icons; label: string }> = {
  chrome: { icon: 'chrome', label: 'Chrome' },
  chrome_android: { icon: 'chrome', label: 'Chrome' },
  firefox: { icon: 'firefox', label: 'Firefox' },
  firefox_android: { icon: 'firefox', label: 'Firefox' },
  safari: { icon: 'safari', label: 'Safari' },
  safari_ios: { icon: 'safari', label: 'Safari' },
  edge: { icon: 'edge', label: 'Edge' },
  opera: { icon: 'opera', label: 'Opera' },
  opera_android: { icon: 'opera', label: 'Opera' },
  webview_android: { icon: 'android', label: 'Android' },
  webview_ios: { icon: 'safari', label: 'Safari' },
  samsunginternet_android: { icon: 'samsung_internet', label: 'Samsung Internet' },
  nodejs: { icon: 'node', label: 'Node.js' },
  deno: { icon: 'deno', label: 'Deno' },
  ie: { icon: 'edge', label: 'Internet Explorer' },
  oculus: { icon: 'android', label: 'Oculus' },
  'simple-firefox': { icon: 'firefox', label: 'Firefox' },
  webview: { icon: 'android', label: 'Android WebView' },
  samsung: { icon: 'samsung_internet', label: 'Samsung Internet' },
  android: { icon: 'android', label: 'Android' },
  desktop: { icon: 'desktop', label: 'Desktop' },
  mobile: { icon: 'smartphone', label: 'Mobile' },
  server: { icon: 'server', label: 'Server' },
  yes: { icon: 'check', label: 'Supported' },
  partial: { icon: 'triangle_alert', label: 'Partially supported' },
  no: { icon: 'x', label: 'Not supported' },
  unknown: { icon: 'info', label: 'Unknown support' },
  preview: { icon: 'preview', label: 'Preview support' },
  experimental: { icon: 'test_tube', label: 'Experimental' },
  deprecated: { icon: 'trash', label: 'Deprecated' },
  nonstandard: { icon: 'zap', label: 'Non-standard' },
  footnote: { icon: 'info', label: 'Additional information' },
  disabled: { icon: 'wrench', label: 'Behind flag' },
  altname: { icon: 'tag', label: 'Alternative name' },
  prefix: { icon: 'flag', label: 'Vendor prefix required' },
  more: { icon: 'ellipsis', label: 'More information' },
}

const CompatTableContext = createContext<CompatTableState | null>(null)
const FeatureRowContext = createContext<{ feature: Feature } | undefined>(undefined)

function useCompatTable() {
  const context = use(CompatTableContext)
  if (!context) {
    throw new Error(
      'CompatTable components must be used within CompatTable.Root',
    )
  }
  return context
}

function useFeatureRow() {
  const context = use(FeatureRowContext)
  if (!context) {
    throw new Error(
      'FeatureRow components must be used within CompatTable.FeatureRow',
    )
  }
  return context
}

function Icon({
  name,
  title,
  className = '',
}: {
  name: string
  title?: string
  className?: string
}) {
  const { icon, label } = iconConfig[name]
  const IconComponent = Icons[icon]

  return (
    <IconComponent
      className={`${styles['bcd-icon']} ${className}`}
      aria-label={title ?? label}
      title={title ?? label}
    />
  )
}

function CellIcons({ support }: { support: SupportStatement }) {
  const supportItem = getCurrentSupport(support)
  if (!supportItem) return null

  return (
    <div className={styles['bcd-icon-list']}>
      {supportItem.prefix && <Icon key="prefix" name="prefix" />}
      {hasNoteworthyNotes(supportItem) && <Icon key="footnote" name="footnote" />}
      {supportItem.alternative_name && <Icon key="altname" name="altname" />}
      {supportItem.flags && <Icon key="disabled" name="disabled" />}
      {Array.isArray(support) && support.length > 1 && <Icon key="more" name="more" />}
    </div>
  )
}

function StatusIcons({ status }: { status: StatusBlock }) {
  const icons: { name: string; title: string }[] = []

  if (status.experimental) {
    icons.push({
      name: 'experimental',
      title: 'Experimental. Expect behavior to change in the future.',
    })
  }

  if (status.deprecated) {
    icons.push({
      name: 'deprecated',
      title: 'Deprecated. Not for use in new websites.',
    })
  }

  if (!(status.standard_track)) {
    icons.push({
      name: 'nonstandard',
      title: 'Non-standard. Expect poor cross-browser support.',
    })
  }

  if (icons.length === 0) return null

  return (
    <div className={styles['bcd-icon-list']}>
      {icons.map((icon) => (
        <Icon key={icon.name} name={icon.name} title={icon.title} />
      ))}
    </div>
  )
}

function CompatTablePlatformRow({
  ref,
  children,
  ...props
}: {
  ref?: Ref<HTMLTableRowElement>
  children?: ReactNode
}) {
  const { platforms, browsers, browserInfo } = useCompatTable()

  return (
    <tr ref={ref} className={styles['bcd-platform-row']} {...props}>
      {children ?? (
        <>
          <th scope="col"></th>
          {platforms.map((platform) => {
            const platformBrowserCount = browsers.filter(
              (browser) => browserInfo[browser].type === platform
            ).length

            return (
              <CompatTablePlatformCell
                key={platform}
                platform={platform}
                colSpan={platformBrowserCount}
              />
            )
          })}
        </>
      )}
    </tr>
  )
}

function CompatTablePlatformCell({
  platform,
  children,
  colSpan,
  ref,
  ...props
}: {
  platform: string
  children?: ReactNode
  colSpan?: number
  ref?: RefObject<HTMLTableCellElement | null>
}) {
  if (children) {
    return (
      <th
        ref={ref}
        className={styles['bcd-platform-cell']}
        colSpan={colSpan}
        scope="colgroup"
        data-platform={platform}
        {...props}
      >
        {children}
      </th>
    )
  }

  const { icon } = iconConfig[platform]
  const IconComponent = Icons[icon]

  return (
    <th
      ref={ref}
      className={styles['bcd-platform-cell']}
      colSpan={colSpan}
      scope="colgroup"
      data-platform={platform}
      {...props}
    >
      <IconComponent className={styles['bcd-icon']} />
    </th>
  )
}

function CompatTableBrowserRow({
  ref,
  children,
  ...props
}: {
  children?: ReactNode
  ref?: RefObject<HTMLTableRowElement | null>
}) {
  const { browsers } = useCompatTable()

  return (
    <tr ref={ref} className={styles['bcd-browser-row']} {...props}>
      {children ?? (
        <>
          <th scope="col"></th>
          {browsers.map((browser) => (
            <CompatTableBrowserCell key={browser} browser={browser} />
          ))}
        </>
      )}
    </tr>
  )
}

function CompatTableBrowserCell({
  browser,
  children,
  ref,
  ...props
}: {
  browser: BrowserName
  children?: ReactNode
  ref?: RefObject<HTMLTableCellElement | null>
}) {
  const { browserInfo } = useCompatTable()

  if (children) {
    return (
      <th
        ref={ref}
        className={styles['bcd-browser-cell']}
        data-browser={browser}
        scope="col"
        {...props}
      >
        {children}
      </th>
    )
  }

  const icon = (iconConfig[browser] ?? iconConfig[browser.split('_')[0]]).icon
  const IconComponent = Icons[icon]
  const { name } = browserInfo[browser]

  return (
    <th
      ref={ref}
      className={styles['bcd-browser-cell']}
      data-browser={browser}
      scope="col"
      {...props}
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
}

function CellText({
  support,
  browser,
  timeline = false,
}: {
  support: SupportStatement | undefined
  browser: BrowserStatement
  timeline?: boolean
}) {
  const currentSupport = getCurrentSupport(support)
  const added = currentSupport?.version_added
  const lastVersion = currentSupport?.version_last
  const supportClassName = getSupportClassName(support, browser)

  const browserReleaseDate =
    currentSupport?.version_added &&
    typeof currentSupport.version_added === 'string'
      ? (browser.releases[currentSupport.version_added].release_date ?? null)
      : null

  const versionLabel = (() => {
    if (typeof lastVersion === 'string') {
      const addedLabel =
        typeof added === 'string'
          ? added === 'preview'
            ? (browser.preview_name ?? 'Preview')
            : added.replace(/(\.0)+$/g, '')
          : '?'
      const removedLabel = lastVersion.replace(/(\.0)+$/g, '')
      return `${addedLabel}–${removedLabel}`
    }

    if (typeof added === 'string') {
      return added === 'preview'
        ? (browser.preview_name ?? 'Preview')
        : added.replace(/(\.0)+$/g, '')
    }

    return '?'
  })()

  const supportConfig: Record<string, { title: string; defaultLabel: string }> = {
    yes: { title: 'Full support', defaultLabel: 'Yes' },
    partial: { title: 'Partial support', defaultLabel: 'Partial' },
    no: { title: 'No support', defaultLabel: 'No' },
    preview: { title: 'Preview support', defaultLabel: browser.preview_name ?? 'Preview' },
    unknown: { title: 'Support unknown', defaultLabel: '?' },
  }

  const getSupportInfo = (supportType: string) => {
    if (supportType === 'removed-partial') {
      return timeline
        ? { title: 'Partial support', defaultLabel: 'Partial' }
        : { title: 'No support', defaultLabel: 'No' }
    }

    return supportConfig[supportType] ?? { title: 'Support unknown', defaultLabel: '?' }
  }

  const getSupportType = () => {
    switch (added) {
      case null:
      case undefined:
        return 'unknown'
      case true:
        return lastVersion ? 'no' : 'yes'
      case false:
        return 'no'
      case 'preview':
        return 'preview'
      default:
        return supportClassName
    }
  }

  const supportType = getSupportType()
  const { title: supportTitle, defaultLabel } = getSupportInfo(supportType)

  const label = typeof added === 'string' && added !== 'preview'
    ? versionLabel
    : defaultLabel

  const title = `${browser.name} – ${supportTitle}`

  return (
    <div
      className={
        timeline
          ? styles['bcd-cell-text-wrapper--timeline']
          : styles['bcd-cell-text-wrapper']
      }
    >
      {timeline && (
        <span className={styles['bcd-browser-name']}>{browser.name}</span>
      )}
      <span
        className={styles['bcd-version-label']}
        title={
          browserReleaseDate && !timeline
            ? `${browser.name} ${String(added)} – Released ${browserReleaseDate}`
            : title
        }
      >
        {!timeline || added ? label : null}
        {browserReleaseDate && timeline
          ? ` (Released ${browserReleaseDate})`
          : ''}
      </span>
      {support && <CellIcons support={support} />}
    </div>
  )
}

function Notes({
  browser,
  support,
}: {
  browser: BrowserStatement
  support: SupportStatement
}) {
  const supportItems = Array.isArray(support) ? support : [support]

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
        <div key={itemKey} className={styles['bcd-notes-wrapper']}>
          <div className={`${styles['bcd-notes-header']} ${styles[`bcd-support-badge--${supportClassName}`]}`}>
            <CellText support={item} browser={browser} timeline={true} />
          </div>
          {supportNotes.map(({ iconName, label, key }, noteIndex) => (
            <div
              key={key ?? `${itemKey}-note-${String(noteIndex)}`}
              className={styles['bcd-notes-item']}
            >
              <Icon name={iconName} />
              <span className={styles['bcd-notes-text']}>
                {typeof label === 'string' ? (
                  <span dangerouslySetInnerHTML={{ __html: label }} />
                ) : (
                  label
                )}
              </span>
            </div>
          ))}
        </div>
      )
    })
    .filter(Boolean)

  return notes.length > 0 ? <>{notes}</> : null
}

function CompatTableFeatureRow({
  ref,
  feature,
  children,
  ...props
}: {
  feature: Feature
  children: ReactNode
  ref?: RefObject<HTMLTableRowElement | null>
}) {
  return (
    <FeatureRowContext value={{ feature }}>
      <tr ref={ref} data-compat-table-feature-row="" {...props}>
        {children}
      </tr>
    </FeatureRowContext>
  )
}

function CompatTableFeatureCell({
  ref,
  children,
  ...props
}: {
  children?: ReactNode
  ref?: RefObject<HTMLTableCellElement | null>
}) {
  const { feature } = useFeatureRow()
  const { name, compat, depth } = feature

  if (children) {
    return (
      <th
        ref={ref}
        className={styles['bcd-feature-cell']}
        scope="row"
        data-depth={depth}
        {...props}
      >
        {children}
      </th>
    )
  }

  const title = compat.description ? (
    <span dangerouslySetInnerHTML={{ __html: compat.description }} />
  ) : (
    <code>{name}</code>
  )

  const content = (
    <>
      {title}
      {compat.status && <StatusIcons status={compat.status} />}
    </>
  )

  return (
    <th
      ref={ref}
      className={styles['bcd-feature-cell']}
      scope="row"
      data-depth={depth}
      {...props}
    >
      {compat.mdn_url && depth > 0 ? (
        <a href={compat.mdn_url} className={styles['bcd-feature-header']}>
          {content}
        </a>
      ) : (
        <div className={styles['bcd-feature-header']}>{content}</div>
      )}
    </th>
  )
}

function CompatTableSupportCell({
  ref,
  browser,
  children,
  ...props
}: {
  browser: BrowserName
  children?: ReactNode
  ref?: RefObject<HTMLTableCellElement | null>
}) {
  const { browserInfo } = useCompatTable()
  const { feature } = useFeatureRow()

  const browserStatement = browserInfo[browser]
  const support = feature.compat.support[browser] ?? { version_added: null }
  const supportClassName = getSupportClassName(support, browserStatement)
  const currentSupport = getCurrentSupport(support)

  const hasNotes = (Array.isArray(support) && support.length > 1) ||
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    (currentSupport && hasNoteworthyNotes(currentSupport)) ||
    currentSupport?.flags != null ||
    currentSupport?.prefix != null ||
    currentSupport?.alternative_name != null

  const [showNotes, setShowNotes] = useState(false)

  if (children) {
    return (
      <td
        ref={ref}
        className={styles['bcd-support-cell']}
        data-browser={browser}
        data-support={supportClassName}
        {...props}
      >
        {children}
      </td>
    )
  }

  const cellContent = <CellText support={support} browser={browserStatement} />

  return (
    <td
      ref={ref}
      className={styles['bcd-support-cell']}
      data-browser={browser}
      data-support={supportClassName}
      style={hasNotes ? { position: 'relative' } : undefined}
      {...props}
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

function CompatTableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

function CompatTableBody({
  children,
}: {
  children: (context: { features: Feature[]; browsers: BrowserName[]; platforms: string[] }) => ReactNode
}) {
  const { features, browsers, platforms } = useCompatTable()

  return <tbody>{children({ features, browsers, platforms })}</tbody>
}

function CompatTable({
  ref,
  query,
  data,
  browserInfo,
  className,
  children,
  ...props
}: {
  ref?: Ref<HTMLTableElement>
  query: string
  data: Identifier
  browserInfo: Browsers
  className?: string
  children: ReactNode
}) {
  const state = useMemo(() => {
    const queryParts = query.split('.')
    const category = queryParts[0] ?? ''
    const name = queryParts.at(-1)

    const [platforms, browsers] = gatherPlatformsAndBrowsers(
      category,
      data,
      browserInfo,
    )

    const allFeatures = listFeatures(data, '', name)
    const features = filterFeatures(allFeatures)

    return {
      query,
      data,
      browserInfo,
      platforms,
      browsers,
      features,
    }
  }, [query, data, browserInfo])

  return (
    <CompatTableContext value={state}>
      <div className={`${styles['bcd-compat-table']} ${className ?? ''}`}>
        <div className={styles['bcd-table-container']}>
          <table ref={ref} className={styles['bcd-table']} {...props}>
            {children}
          </table>
        </div>
      </div>
    </CompatTableContext>
  )
}

CompatTable.Header = CompatTableHeader
CompatTable.Body = CompatTableBody
CompatTable.PlatformRow = CompatTablePlatformRow
CompatTable.PlatformCell = CompatTablePlatformCell
CompatTable.BrowserRow = CompatTableBrowserRow
CompatTable.BrowserCell = CompatTableBrowserCell
CompatTable.FeatureRow = CompatTableFeatureRow
CompatTable.FeatureCell = CompatTableFeatureCell
CompatTable.SupportCell = CompatTableSupportCell

export { CompatTable }
