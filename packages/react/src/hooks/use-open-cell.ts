import { useState, useEffect, useCallback } from 'react'

import type { ProcessedCompat } from './use-compat-processed'

export function useOpenCell(processed: ProcessedCompat) {
  const [openCell, setOpenCell] = useState<string | null>(null)

  useEffect(() => {
    setOpenCell(null)
  }, [processed])

  const toggleCell = useCallback((cellId: string) => {
    setOpenCell((prev) => (prev === cellId ? null : cellId))
  }, [])

  return { openCell, toggleCell, setOpenCell }
}
