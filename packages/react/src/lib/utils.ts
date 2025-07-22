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

const HIDDEN_BROWSERS: BrowserName[] = ['ie']

function findFirstCompatDepth(identifier: Identifier): number {
  const queue: Array<[Identifier, number]> = [[identifier, 1]]
  let index = 0

  while (index < queue.length) {
    const [value, depth] = queue[index++]

    if (value.__compat) {
      return depth
    }

    for (const subvalue of Object.values(value)) {
      if (
        typeof subvalue === 'object' &&
        subvalue !== null &&
        '__compat' in subvalue
      ) {
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
): [string[], BrowserName[]] {
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

  browsers = browsers.filter((browser) => !HIDDEN_BROWSERS.includes(browser))

  return [platforms, browsers]
}
