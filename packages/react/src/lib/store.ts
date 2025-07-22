import { createContext, use } from 'react'
import type {
  BrowserName,
  Browsers,
  CompatStatement,
  Identifier,
} from '@mdn/browser-compat-data'

interface CompatTableState {
  query: string
  data: Identifier
  browserInfo: Browsers
  platforms: string[]
  browsers: BrowserName[]
  features: Array<{
    name: string
    compat: CompatStatement
    depth: number
  }>
}

const CompatTableContext = createContext<CompatTableState | null>(null)

export const CompatTableProvider = CompatTableContext.Provider

export function useCompatTable() {
  const context = use(CompatTableContext)
  if (!context) {
    throw new Error(
      'CompatTable components must be used within CompatTable.Root',
    )
  }
  return context
}

export function useCompatTableOptional() {
  return use(CompatTableContext)
}
