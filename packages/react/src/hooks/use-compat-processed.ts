import type { Identifier, Browsers } from '@mdn/browser-compat-data'
import { useEffect, useRef, useState, startTransition } from 'react'

import { asyncListFeatures, asyncFilterFeatures } from '../lib/async-bcd'
import type { Feature } from '../lib/bcd-features'
import { gatherPlatformsAndBrowsers } from '../lib/bcd-features'

export type ProcessedCompat = {
  platforms: string[]
  browsers: (keyof Browsers)[]
  features: Feature[]
} | null

declare global {
  interface Window {
    __COMPAT_WORKER_INSTANCE?: Worker | null
  }
}

export function getCompatWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null

  if (window.__COMPAT_WORKER_INSTANCE === undefined) {
     window.__COMPAT_WORKER_INSTANCE = new Worker(new URL('../workers/compat-worker.ts', import.meta.url), { type: 'module' })
  }
  return window.__COMPAT_WORKER_INSTANCE ?? null
}

function isResultMessage(v: unknown): v is {
  type: 'result'
  id: number
  query: string
  processed: { platforms: string[]; browsers: string[]; features: Feature[] } | null
} {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return o.type === 'result' && typeof o.id === 'number' && typeof o.query === 'string'
}

export function useCompatProcessed(
  query: string,
  data?: Identifier | null,
  browserInfo?: Browsers | null,
): ProcessedCompat {
  const [processed, setProcessed] = useState<ProcessedCompat>(null)

  const lastIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!data || !browserInfo) {
      setProcessed(null)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    const id = ++lastIdRef.current
    const worker = getCompatWorker()

    const computeOnMainThread = async (requestId: number, signal?: AbortSignal) => {
      const parts = query ? query.split('.') : []
      const category = parts[0] ?? ''
      const name = parts.at(-1) ?? ''

      const [platforms, browsers] = gatherPlatformsAndBrowsers(category, data, browserInfo)

      try {
        const all = await asyncListFeatures(data, name, signal as any) // TODO: drop cast
        const features = await asyncFilterFeatures(all, signal)

        if (requestId === lastIdRef.current && !(signal?.aborted)) {
          startTransition(() => {
            setProcessed({ platforms, browsers: browsers, features })
          })
        }
      } catch {
        /** ignore */
      } finally {
        if (abortControllerRef.current && abortControllerRef.current.signal === signal) {
          abortControllerRef.current = null
        }
      }
    }

    if (worker) {
      const onMessage = (ev: MessageEvent<unknown>) => {
        const raw = ev.data
        if (!isResultMessage(raw)) return
        if (raw.id !== id || raw.query !== query) return

        const value = raw.processed === null
          ? null
          : {
              platforms: raw.processed.platforms,
              browsers: raw.processed.browsers as (keyof Browsers)[],
              features: raw.processed.features,
            }

        startTransition(() => {
          setProcessed(value)
        })
      }

      worker.addEventListener('message', onMessage)

      let posted = true
      try {
        worker.postMessage({ type: 'process', id, query, identifier: data, browserInfo })
      } catch {
        posted = false
      }

      if (!posted) {
        const ac = new AbortController()
        abortControllerRef.current = ac
        void computeOnMainThread(id, ac.signal)
      }

      return () => {
        worker.removeEventListener('message', onMessage)
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }
      }
    }

    const ac = new AbortController()
    abortControllerRef.current = ac
    void computeOnMainThread(id, ac.signal)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [query, data, browserInfo])

  return processed
}
