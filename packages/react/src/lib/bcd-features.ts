import type {
  BrowserName,
  Browsers,
  CompatStatement,
  Identifier,
} from '@mdn/browser-compat-data'

interface Feature {
  name: string
  compat: CompatStatement
  depth: number
}

function findFirstCompatDepth(identifier: Identifier) {
  const queue: [Identifier, number][] = [[identifier, 1]]
  let index = 0

  while (index < queue.length) {
    const [value, depth] = queue[index++]

    if (value.__compat) {
      return depth
    }

    for (const subvalue of Object.values(value)) {
      if (typeof subvalue === 'object' && '__compat' in subvalue) {
        queue.push([subvalue, depth + 1])
      }
    }
  }

  return 0
}

export function listFeatures(
  identifier: Identifier,
  parentName = '',
  rootName = '',
  depth = 0,
  firstCompatDepth = 0,
): Feature[] {
  const features: Feature[] = []

  if (rootName && identifier.__compat) {
    features.push({
      name: rootName,
      compat: identifier.__compat,
      depth,
    })
  }

  if (rootName) {
    firstCompatDepth = findFirstCompatDepth(identifier)
  }

  for (const [subName, subIdentifier] of Object.entries(identifier)) {
    if (subName === '__compat') continue

    if ('__compat' in subIdentifier && subIdentifier.__compat) {
      features.push({
        name: parentName ? `${parentName}.${subName}` : subName,
        compat: subIdentifier.__compat,
        depth: depth + 1,
      })
    }

    if ('__compat' in subIdentifier) {
      features.push(
        ...listFeatures(
          subIdentifier,
          subName,
          '',
          depth + 1,
          firstCompatDepth,
        ),
      )
    }
  }

  return features
}

export function gatherPlatformsAndBrowsers(
  category: string,
  data: Identifier,
  browserInfo: Browsers,
) {
  const hiddenBrowsers: BrowserName[] = ['ie']

  const hasNodeJSData = data.__compat && 'nodejs' in data.__compat.support
  const hasDenoData = data.__compat && 'deno' in data.__compat.support

  const platforms = ['desktop', 'mobile']
  if (category === 'javascript' || hasNodeJSData || hasDenoData) {
    platforms.push('server')
  }

  let browsers: BrowserName[] = []

  for (const platform of platforms) {
    const platformBrowsers = Object.keys(browserInfo) as BrowserName[]
    browsers.push(
      ...platformBrowsers.filter(
        (browser) =>
          browser in browserInfo && browserInfo[browser].type === platform,
      ),
    )
  }

  if (category === 'webextensions') {
    browsers = browsers.filter(
      (browser) => browserInfo[browser].accepts_webextensions,
    )
  }

  if (category !== 'javascript' && !hasNodeJSData) {
    browsers = browsers.filter((browser) => browser !== 'nodejs')
  }

  browsers = browsers.filter((browser) => !hiddenBrowsers.includes(browser))

  return [platforms, browsers] as const
}

export function filterFeatures(features: Feature[]) {
  const maxFeatures = 100

  if (features.length <= maxFeatures) return features

  const filtered: Feature[] = []

  for (const feature of features) {
    if (feature.depth >= 2) continue
    if (!feature.compat.status?.standard_track) continue
    if (feature.compat.status.deprecated) continue
    if (feature.compat.status.experimental) continue

    filtered.push(feature)

    if (filtered.length >= maxFeatures) break
  }

  return filtered.length > maxFeatures
    ? filtered.slice(0, maxFeatures)
    : filtered
}
