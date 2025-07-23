import type { Browsers, Identifier } from '@mdn/browser-compat-data'
import { type Ref, useMemo, type ReactNode } from 'react'

import { CompatTableProvider, useCompatTable } from '../lib/store'
import { gatherPlatformsAndBrowsers, listFeatures } from '../lib/utils'
import styles from '../styles/components/CompatTable.module.css'

import type { Feature } from './FeatureRow'

const MAX_FEATURES = 100

function filterFeatures(features: Feature[]): Feature[] {
  if (features.length <= MAX_FEATURES) return features

  const filtered: Feature[] = []

  for (const feature of features) {
    // Skip deep nested features first
    if (feature.depth >= 2) continue
    // Skip non-standard features
    if (!feature.compat.status?.standard_track) continue
    // Skip deprecated features
    if (feature.compat.status.deprecated) continue
    // Skip experimental features
    if (feature.compat.status.experimental) continue

    filtered.push(feature)

    // Early exit when we have enough
    if (filtered.length >= MAX_FEATURES) break
  }

  return filtered.length > MAX_FEATURES
    ? filtered.slice(0, MAX_FEATURES)
    : filtered
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
    const breadcrumbs = query.split('.')
    const category = breadcrumbs[0] ?? ''
    const name = breadcrumbs.at(-1)

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
