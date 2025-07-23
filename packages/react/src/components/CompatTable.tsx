import type { Browsers, Identifier } from '@mdn/browser-compat-data'
import { useMemo, type ReactNode } from 'react'

import { CompatTableProvider, useCompatTable } from '../lib/store'
import { gatherPlatformsAndBrowsers, listFeatures } from '../lib/utils'
import styles from '../styles/components/CompatTable.module.css'

import type { Feature } from './FeatureRow'

function CompatTable({
  ref,
  query,
  data,
  browserInfo,
  className,
  children,
  ...props
}: {
  ref?: React.Ref<HTMLTableElement>
  query: string
  data: Identifier
  browserInfo: Browsers
  className?: string
  children: React.ReactNode
}) {
  const state = useMemo(() => {
    const breadcrumbs = query.split('.')
    const category = breadcrumbs[0] ?? ''
    const name = breadcrumbs.at(-1)

    const [platforms, browsers] = gatherPlatformsAndBrowsers(
      category,
      data,
      browserInfo,
    )
    let features = listFeatures(data, '', name)

    const MAX_FEATURES = 100
    if (features.length > MAX_FEATURES) {
      features = features.filter(({ depth }) => depth < 2)
    }
    if (features.length > MAX_FEATURES) {
      features = features.filter(
        ({ compat: { status } }) => status?.standard_track,
      )
    }
    if (features.length > MAX_FEATURES) {
      features = features.filter(
        ({ compat: { status } }) => !status?.deprecated,
      )
    }
    if (features.length > MAX_FEATURES) {
      features = features.filter(
        ({ compat: { status } }) => !status?.experimental,
      )
    }
    if (features.length > MAX_FEATURES) {
      features = features.slice(0, MAX_FEATURES)
    }

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
    <CompatTableProvider value={state}>
      <div className={`${styles['compat-table']} ${className ?? ''}`}>
        <div className={styles['table-container']}>
          <div className={styles['table-viewport']}>
            <table ref={ref} className={styles.table} {...props}>
              {children}
            </table>
          </div>
        </div>
      </div>
    </CompatTableProvider>
  )
}

function CompatTableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

function CompatTableBody({
  children,
}: {
  children: (context: { features: Feature[]; browsers: string[] }) => ReactNode
}) {
  const { features, browsers } = useCompatTable()

  return <tbody>{children({ features, browsers })}</tbody>
}

CompatTable.Header = CompatTableHeader
CompatTable.Body = CompatTableBody

export { CompatTable }
