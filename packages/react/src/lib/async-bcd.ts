import { yieldOrContinue } from 'main-thread-scheduling'
import type { Identifier } from '@mdn/browser-compat-data'
import type { Feature } from './bcd-features'

type NodeRecord = Record<string, unknown>

export async function asyncListFeatures(
  identifier: Identifier,
  prefix = '',
  depth = 0,
  signal?: AbortSignal,
): Promise<Feature[]> {
  const result: Feature[] = []
  const stack: Array<{ node: NodeRecord; prefix: string; depth: number }> = [{ node: identifier as NodeRecord, prefix, depth }]
  let ops = 0
  const YIELD_EVERY = 500

  while (stack.length) {
    if (signal?.aborted) return result
    const entry = stack.pop()!
    const node = entry.node
    const pfx = entry.prefix
    const d = entry.depth

    if (!node || typeof node !== 'object') continue

    if ('__compat' in node && pfx) {
      result.push({ name: pfx, compat: (node as any).__compat, depth: d })
    }

    for (const [key, val] of Object.entries(node)) {
      if (key === '__compat') continue
      if (val && typeof val === 'object') {
        const childPrefix = pfx ? `${pfx}.${key}` : key
        stack.push({ node: val as NodeRecord, prefix: childPrefix, depth: d + 1 })
      }
    }

    ops++
    if (ops % YIELD_EVERY === 0) {
      await yieldOrContinue('interactive', signal)
    }
  }

  return result
}

export async function asyncFilterFeatures(features: Feature[], signal?: AbortSignal): Promise<Feature[]> {
  const maxFeatures = 100
  const filtered: Feature[] = []
  let ops = 0
  const YIELD_EVERY = 500

  for (const feature of features) {
    if (signal?.aborted) return filtered
    const status = feature.compat.status
    if (feature.depth < 2 && status?.standard_track && !status.deprecated && !status.experimental) {
      filtered.push(feature)
      if (filtered.length >= maxFeatures) break
    }
    ops++
    if (ops % YIELD_EVERY === 0) {
      await yieldOrContinue('interactive', signal)
    }
  }

  return filtered
}
