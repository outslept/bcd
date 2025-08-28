import type { Identifier, Browsers } from '@mdn/browser-compat-data'

import type { Feature } from '../lib/bcd-features'
import { gatherPlatformsAndBrowsers, listFeatures, filterFeatures } from '../lib/bcd-features'

interface ProcessMsg {
  type: 'process'
  id: number
  query: string
  identifier: Identifier
  browserInfo: Browsers
}

interface ResultMsg {
  type: 'result'
  id: number
  query: string
  processed: {
    platforms: string[]
    browsers: string[]
    features: Feature[]
  } | null
}

interface ErrorMsg {
  type: 'error'
  id: number
  query?: string
  message: string
}

function isProcessMsg(v: unknown): v is ProcessMsg {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return o.type === 'process' &&
    typeof o.id === 'number' &&
    typeof o.query === 'string' &&
    typeof o.identifier === 'object' &&
    o.identifier !== null &&
    typeof o.browserInfo === 'object' &&
    o.browserInfo !== null
}

addEventListener('message', (ev: MessageEvent) => {
  const raw = ev.data
  if (!isProcessMsg(raw)) return

  const msg = raw

  try {
    const parts = msg.query ? msg.query.split('.') : []
    const category = parts[0] ?? ''
    const name = parts.at(-1) ?? ''

    const [platforms, browsers] = gatherPlatformsAndBrowsers(category, msg.identifier, msg.browserInfo)

    const allFeatures = listFeatures(msg.identifier, name)
    const features = filterFeatures(allFeatures)

    const result: ResultMsg = {
      type: 'result',
      id: msg.id,
      query: msg.query,
      processed: {
        platforms,
        browsers,
        features,
      },
    }

    postMessage(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const em: ErrorMsg = { type: 'error', id: msg.id, query: msg.query, message }
    try { postMessage(em) } catch {
      // ignore
    }
  }
})
