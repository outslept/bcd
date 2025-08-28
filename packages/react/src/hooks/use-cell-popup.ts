import { useEffect } from 'react'

export function useCellPopup(
  open: boolean,
  onToggle: () => void,
  {
    cellRef,
    buttonRef,
    popupRef,
  }: {
    cellRef: React.RefObject<HTMLTableCellElement | null>
    buttonRef: React.RefObject<HTMLButtonElement | null>
    popupRef: React.RefObject<HTMLDivElement | null>
  },
) {
  useEffect(() => {
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function handlePointerDown(e: PointerEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      const cell = cellRef.current
      if (!cell) return
      if (!cell.contains(target)) onToggle()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle()
    }

    if (!open) {
      buttonRef.current?.focus()
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      const popup = popupRef.current
      if (!popup) return
      const first = popup.querySelector<HTMLElement>(focusableSelector)
      if (first) first.focus()
      else popup.focus()
    })

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(rafId)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onToggle, cellRef, buttonRef, popupRef])
}
