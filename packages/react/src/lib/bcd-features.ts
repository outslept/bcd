import type {
  BrowserName,
  Browsers,
  CompatStatement,
  Identifier,
} from '@mdn/browser-compat-data'

export interface Feature {
  name: string
  compat: CompatStatement
  depth: number
}

export function listFeatures(
  identifier: Identifier,
  prefix = '',
  depth = 0,
): Feature[] {
  const features: Feature[] = []

  // If this node itself has __compat and we have a name for it, include it.
  if (identifier.__compat && prefix) {
    features.push({ name: prefix, compat: identifier.__compat, depth })
  }

  for (const [subName, subIdentifier] of Object.entries(identifier)) {
    if (subName === '__compat') continue
    if (typeof subIdentifier !== 'object' || subIdentifier === null) continue

    const childPrefix = prefix ? `${prefix}.${subName}` : subName
    features.push(...listFeatures(subIdentifier as Identifier, childPrefix, depth + 1))
  }

  return features
}

/** Decide platforms and browsers to show.  */
export function gatherPlatformsAndBrowsers(
  category: string,
  data: Identifier,
  browserInfo: Browsers,
) {
  const hiddenBrowsers: BrowserName[] = ['ie']

  const hasNodeJSData = Boolean(data.__compat && 'nodejs' in data.__compat.support)
  const hasDenoData = Boolean(data.__compat && 'deno' in data.__compat.support)

  const wantServer = category === 'javascript' || hasNodeJSData || hasDenoData

  // Explicit platform order we want to present in the table.
  const platformPriority = ['desktop', 'mobile', 'server'] as const

  // Build list of platforms we actually want to show.
  const initialPlatforms: string[] = ['desktop', 'mobile']
  if (wantServer) initialPlatforms.push('server')

  // Respect the desired order (platformPriority) when returning platforms.
  const platforms = platformPriority.filter((p) =>
    initialPlatforms.includes(p),
  ) as string[]

  // Build browsers grouped by platform, preserving browserInfo key order
  const browserKeys = Object.keys(browserInfo) as BrowserName[]
  let browsers: BrowserName[] = []

  for (const platform of platforms) {
    const platformBrowsers = browserKeys.filter(
      (b) => browserInfo[b].type === platform,
    )
    browsers.push(...platformBrowsers)
  }

  if (category === 'webextensions') {
    browsers = browsers.filter((b) => browserInfo[b].accepts_webextensions)
  }

  if (category !== 'javascript' && !hasNodeJSData) {
    browsers = browsers.filter((b) => b !== 'nodejs')
  }

  browsers = browsers.filter((b) => !hiddenBrowsers.includes(b))

  return [platforms, browsers] as const
}

export function filterFeatures(features: Feature[]) {
  const maxFeatures = 100

  if (features.length <= maxFeatures) return features

  const filtered: Feature[] = []

  for (const feature of features) {
    if (feature.depth >= 2) continue
    const status = feature.compat.status
    if (!status?.standard_track) continue
    if (status.deprecated) continue
    if (status.experimental) continue

    filtered.push(feature)

    if (filtered.length >= maxFeatures) break
  }

  return filtered
}
