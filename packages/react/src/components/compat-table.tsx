import type {
  BrowserName,
  BrowserStatement,
  Browsers,
  Identifier,
  SupportStatement,
} from '@mdn/browser-compat-data'
import React, { useRef, useCallback, useMemo } from 'react'

import { useCellPopup } from '../hooks/use-cell-popup'
import { useCompatProcessed } from '../hooks/use-compat-processed'
import { useOpenCell } from '../hooks/use-open-cell'
import type { Feature } from '../lib/bcd-features'
import { generateSupportNotes } from '../lib/bcd-formatting'
import {
  getCurrentSupport,
  getSupportClassName,
  hasNoteworthyNotes,
} from '../lib/bcd-support'
import type { SupportClassName } from '../lib/bcd-support'

import styles from './compat-table.module.css'
import { Icons } from './icons'

const iconConfig: Partial<Record<string, keyof typeof Icons>> = {
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
  unknown: 'triangle_alert',
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

function getIconComponent(key: string): IconComponent | null {
  const iconKey = iconConfig[key] ?? 'triangle_alert'
  const map = Icons as Record<string, IconComponent | undefined>
  const Icon = map[iconKey]
  return Icon ?? null
}

function Notes(params: { browser: BrowserStatement; support?: SupportStatement }) {
  if (!params.support) return null

  const list = Array.isArray(params.support) ? params.support : [params.support]
  const rev = [...list].reverse()

  const blocks = rev.flatMap((item, idx) => {
    const notes = generateSupportNotes(item, params.browser, params.support)
    if (idx !== 0 && notes.length === 0) return []

    const key = `support-${String(idx)}-${String(item.version_added)}-${String(item.version_removed)}`

    const items = notes.map((n, i) => {
      const Icon = getIconComponent(n.iconName)
      const k = n.key ?? `${key}-note-${String(i)}`
      return (
        <div key={k} className={styles['bcd-notes-item']}>
          {Icon ? <Icon className={styles['bcd-icon']} /> : null}
          <span className={styles['bcd-notes-text']}>
            {typeof n.label === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: n.label }} />
            ) : (
              n.label
            )}
          </span>
        </div>
      )
    })

    return (
      <div key={key} className={styles['bcd-notes-wrapper']}>
        {items}
      </div>
    )
  })

  return blocks.length > 0 ? blocks : null
}

function getSupportForBrowser(maybeCompat: unknown, browser: BrowserName): SupportStatement | undefined {
  if (maybeCompat == null || typeof maybeCompat !== 'object') return undefined
  const compat = maybeCompat as Record<string, unknown>
  const raw = compat.support
  if (raw == null || typeof raw !== 'object') return undefined
  const rec = raw as Record<string, SupportStatement | undefined>
  return rec[browser]
}

interface PrecomputedSupport {
  browserMeta: BrowserStatement
  supportValue?: SupportStatement
  supportClass: SupportClassName
  hasNotes: boolean
  label: string
  icons: React.ReactElement[]
}

function computeCellData(feature: Feature, browser: BrowserName, browserInfo: Browsers): PrecomputedSupport {
  const bm = browserInfo[browser]
  const sv = getSupportForBrowser(feature.compat, browser)
  const cur = getCurrentSupport(sv)
  const cls = getSupportClassName(sv, bm)

  const arr = sv ? (Array.isArray(sv) ? sv : [sv]) : []
  const multiple = arr.length > 1
  const flags = Array.isArray(cur?.flags) && (cur?.flags.length ?? 0) > 0
  const prefix = Boolean(cur?.prefix)
  const alt = Boolean(cur?.alternative_name)
  const noteworthy = Boolean(cur && hasNoteworthyNotes(cur))
  const notes = multiple || noteworthy || flags || prefix || alt

  const added = cur?.version_added
  const last = cur?.version_last

  function fmt(): string {
    if (typeof last === 'string') {
      const addedLabel =
        typeof added === 'string' ? (added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')) : '?'
      const removedLabel = last.replace(/(\.0)+$/g, '')
      return `${addedLabel}–${removedLabel}`
    }
    if (typeof added === 'string') return added === 'preview' ? 'Preview' : added.replace(/(\.0)+$/g, '')
    if (added === true) return 'Yes'
    if (added === false) return 'No'
    return '?'
  }

  const label = fmt()

  const names: string[] = []
  if (cur) {
    if (cur.prefix) names.push('prefix')
    if (noteworthy) names.push('footnote')
    if (cur.alternative_name) names.push('altname')
    if (cur.flags) names.push('disabled')
    if (multiple) names.push('more')
  }

  const icons = names
    .map((n) => {
      const Icon = getIconComponent(n)
      return Icon ? <Icon key={n} className={styles['bcd-icon']} /> : null
    })
    .filter(Boolean) as React.ReactElement[]

  return { browserMeta: bm, supportValue: sv, supportClass: cls, hasNotes: notes, label, icons }
}

const SupportCell = React.memo(function SupportCell(props: {
  cellId: string
  browser: BrowserName
  data: PrecomputedSupport
  open: boolean
  onToggle: (id: string) => void
}) {
  const cellRef = useRef<HTMLTableCellElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  const id = props.cellId
  const open = props.open
  const onToggle = props.onToggle
  const data = props.data
  const browser = props.browser

  const handleToggle = useCallback(() => {
    onToggle(id)
  }, [onToggle, id])

  useCellPopup(open, handleToggle, { cellRef, buttonRef, popupRef })

  const bm = data.browserMeta
  const sv = data.supportValue
  const sc = data.supportClass
  const hn = data.hasNotes
  const lbl = data.label
  const icons = data.icons

  const cellInner = (
    <div className={styles['bcd-cell-text-wrapper']}>
      <span className={styles['bcd-version-label']} title={`${bm.name} – ${lbl}`}>
        {lbl}
      </span>

      {icons.length > 0 && <div className={styles['bcd-icon-list']}>{icons}</div>}
    </div>
  )

  return (
    <td
      ref={cellRef}
      className={styles['bcd-support-cell']}
      data-browser={browser}
      data-support={sc}
      style={hn ? { position: 'relative' } : undefined}
    >
      {hn ? (
        <>
          <button
            ref={buttonRef}
            type="button"
            className={styles['bcd-support-button']}
            title="Show support details"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={`bcd-popup-${id}`}
            aria-label={`${bm.name} support details`}
            onClick={handleToggle}
          >
            {cellInner}
          </button>

          {open && sv ? (
            <div
              ref={popupRef}
              id={`bcd-popup-${id}`}
              className={styles['bcd-popup']}
              role="dialog"
              aria-label={`${bm.name} support details`}
              tabIndex={-1}
            >
              <Notes browser={bm} support={sv} />
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles['bcd-support-button']}>{cellInner}</div>
      )}
    </td>
  )
})

const FeatureRow = React.memo(
  function FeatureRow(props: {
    feature: Feature
    browsers: BrowserName[]
    supportMap: Map<string, PrecomputedSupport>
    browserInfo: Browsers
    openCell: string | null
    toggleCell: (id: string) => void
  }) {
    const f = props.feature
    const browsers = props.browsers
    const map = props.supportMap
    const bi = props.browserInfo

    const statusIcons: string[] = []
    if (f.compat.status) {
      if (f.compat.status.experimental) statusIcons.push('experimental')
      if (f.compat.status.deprecated) statusIcons.push('deprecated')
      if (!f.compat.status.standard_track) statusIcons.push('nonstandard')
    }

    return (
      <tr>
        <th className={styles['bcd-feature-cell']} scope="row" data-depth={f.depth}>
          {f.compat.mdn_url && f.depth > 0 ? (
            <a href={f.compat.mdn_url} className={styles['bcd-feature-header']}>
              {f.compat.description ? (
                <span dangerouslySetInnerHTML={{ __html: f.compat.description }} />
              ) : (
                <code>{f.name}</code>
              )}

              {statusIcons.length > 0 && (
                <div className={styles['bcd-icon-list']}>
                  {statusIcons.map((iconName) => {
                    const Icon = getIconComponent(iconName)
                    return Icon ? <Icon key={iconName} className={styles['bcd-icon']} /> : null
                  })}
                </div>
              )}
            </a>
          ) : (
            <div className={styles['bcd-feature-header']}>
              {f.compat.description ? (
                <span dangerouslySetInnerHTML={{ __html: f.compat.description }} />
              ) : (
                <code>{f.name}</code>
              )}

              {statusIcons.length > 0 && (
                <div className={styles['bcd-icon-list']}>
                  {statusIcons.map((iconName) => {
                    const Icon = getIconComponent(iconName)
                    return Icon ? <Icon key={iconName} className={styles['bcd-icon']} /> : null
                  })}
                </div>
              )}
            </div>
          )}
        </th>

        {browsers.map((browser) => {
          const cellId = `${f.name}::${browser}`
          const data = map.get(cellId) ?? computeCellData(f, browser, bi)
          return (
            <SupportCell
              key={browser}
              cellId={cellId}
              browser={browser}
              data={data}
              open={props.openCell === cellId}
              onToggle={props.toggleCell}
            />
          )
        })}
      </tr>
    )
  },
  (prev, next) => {
    if (prev.feature.name !== next.feature.name) return false
    if (prev.browsers.length !== next.browsers.length) return false
    if (prev.openCell === next.openCell) return true
    const prefix = prev.feature.name + '::'
    const prevAffected = prev.openCell ? prev.openCell.startsWith(prefix) : false
    const nextAffected = next.openCell ? next.openCell.startsWith(prefix) : false
    return !(prevAffected || nextAffected)
  },
)

const TableHeader = React.memo(function TableHeader(props: {
  platforms: string[]
  browsers: BrowserName[]
  browserInfo: Browsers
  headerIcons: Map<string, React.ReactElement | null>
}) {
  const platforms = props.platforms
  const browsers = props.browsers
  const bi = props.browserInfo
  const headerIcons = props.headerIcons

  return (
    <thead>
      <tr className={styles['bcd-platform-row']}>
        <th scope="col" />
        {platforms.map((platform) => {
          const count = browsers.filter((b) => bi[b].type === platform).length
          const iconEl = headerIcons.get(platform) ?? null
          return (
            <th
              key={platform}
              className={styles['bcd-platform-cell']}
              colSpan={count}
              scope="colgroup"
              data-platform={platform}
            >
              {iconEl}
            </th>
          )
        })}
      </tr>

      <tr className={styles['bcd-browser-row']}>
        <th scope="col" />
        {browsers.map((browser) => {
          const iconEl = headerIcons.get(browser) ?? null
          const name = bi[browser].name
          return (
            <th key={browser} className={styles['bcd-browser-cell']} data-browser={browser} scope="col">
              <div className={styles['bcd-browser-label']}>{name}</div>
              {iconEl}
            </th>
          )
        })}
      </tr>
    </thead>
  )
})

interface CompatTableProps {
  tableRef?: React.Ref<HTMLTableElement>
  query: string
  data: Identifier
  browserInfo: Browsers
  className?: string
}

export function CompatTable(props: CompatTableProps) {
  const processed = useCompatProcessed(props.query, props.data, props.browserInfo)
  const { openCell, toggleCell } = useOpenCell(processed)

  const platforms = useMemo(() => processed?.platforms ?? [], [processed])
  const browsers = useMemo(() => processed?.browsers ?? [], [processed])
  const features = useMemo(() => processed?.features ?? [], [processed])

  const headerIcons = useMemo(() => {
    const m = new Map<string, React.ReactElement | null>()
    for (const p of platforms) {
      const Icon = getIconComponent(p)
      m.set(p, Icon ? <Icon className={styles['bcd-icon']} /> : null)
    }
    for (const b of browsers) {
      const Icon = getIconComponent(b)
      m.set(
        b,
        Icon ? (
          <Icon
            className={styles['bcd-icon']}
            aria-label={`${props.browserInfo[b].name} browser icon`}
          />
        ) : null,
      )
    }
    return m
  }, [platforms, browsers, props.browserInfo])

  const supportMap = useMemo(() => {
    const m = new Map<string, PrecomputedSupport>()
    for (const f of features) {
      for (const b of browsers) {
        const key = `${f.name}::${b}`
        m.set(key, computeCellData(f, b, props.browserInfo))
      }
    }
    return m
  }, [features, browsers, props.browserInfo])

  if (!processed) {
    return (
      <div className={`${styles['bcd-compat-table']} ${props.className ?? ''}`}>
        <div className={styles['bcd-table-container']}>
          <div style={{ padding: '4rem', textAlign: 'center' }}>Loading compatibility data…</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles['bcd-compat-table']} ${props.className ?? ''}`}>
      <div className={styles['bcd-table-container']}>
        <table ref={props.tableRef} className={styles['bcd-table']}>
          <TableHeader platforms={platforms} browsers={browsers} browserInfo={props.browserInfo} headerIcons={headerIcons} />

          <tbody>
            {features.map((f) => (
              <FeatureRow
                key={`${f.name}-${String(f.depth)}`}
                feature={f}
                browsers={browsers}
                supportMap={supportMap}
                browserInfo={props.browserInfo}
                openCell={openCell}
                toggleCell={toggleCell}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
