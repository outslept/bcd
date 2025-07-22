import type {
  BrowserName,
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
  SupportBlock,
} from '@mdn/browser-compat-data'

import { isIdentifier } from './shared.js'

function cleanSupport(support: SupportBlock): SupportBlock {
  const cleaned: SupportBlock = {}

  for (const [browserName, statement] of Object.entries(support)) {
    if (!statement) continue

    const typedBrowserName = browserName as BrowserName

    if (Array.isArray(statement)) {
      const filtered = statement.filter(
        (s): s is SimpleSupportStatement => s != null,
      )

      if (filtered.length === 1) {
        cleaned[typedBrowserName] = filtered[0]
      } else if (filtered.length > 1) {
        cleaned[typedBrowserName] = filtered as [
          SimpleSupportStatement,
          SimpleSupportStatement,
          ...SimpleSupportStatement[],
        ]
      }
    } else {
      cleaned[typedBrowserName] = statement
    }
  }

  return cleaned
}

export function cleanData(node: Identifier): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (node.__compat) {
    const compatStatement: CompatStatement = {
      ...node.__compat,
      support: cleanSupport(node.__compat.support),
    }

    if (node.__compat.status) {
      compatStatement.status = { ...node.__compat.status }
    }

    result.__compat = compatStatement
  }

  for (const [key, value] of Object.entries(node)) {
    if (key !== '__compat' && isIdentifier(value)) {
      const childData = cleanData(value)
      if (Object.keys(childData).length > 0) {
        result[key] = childData
      }
    }
  }

  return result
}
