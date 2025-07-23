import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface UsePopupProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface UsePopupReturn {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenToggle: () => void
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  popupStyle: React.CSSProperties
}

interface Position {
  left: number
  top: number
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

export function usePopup({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
}: UsePopupProps = {}): UsePopupReturn {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [position, setPosition] = useState<Position>({ left: 0, top: 0 })
  const triggerRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLElement>(null)

  const open = openProp ?? internalOpen

  const closePopup = useCallback(() => {
    if (openProp === undefined) setInternalOpen(false)
    onOpenChange?.(false)
  }, [openProp, onOpenChange])

  const calculatePosition = useCallback((): Position => {
    if (!triggerRef.current || !contentRef.current) {
      return { left: 0, top: 0 }
    }

    const trigger = triggerRef.current.getBoundingClientRect()
    const content = contentRef.current.getBoundingClientRect()

    let left = trigger.left
    let top = trigger.bottom + 8

    if (left + content.width > window.innerWidth - 16) {
      left = window.innerWidth - content.width - 16
    }
    if (left < 16) left = 16

    if (top + content.height > window.innerHeight - 16) {
      top = trigger.top - content.height - 8
    }

    return { left, top }
  }, [])

  const updatePosition = useCallback(() => {
    setPosition(calculatePosition())
  }, [calculatePosition])

  const debouncedUpdatePosition = useCallback(
    debounce(updatePosition, 16),
    [updatePosition]
  )

  useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return

    updatePosition()
    contentRef.current.focus()

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const content = contentRef.current
      const trigger = triggerRef.current

      if (content && !content.contains(target) &&
          trigger && !trigger.contains(target)) {
        closePopup()
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopup()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', debouncedUpdatePosition)
    window.addEventListener('scroll', debouncedUpdatePosition)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', debouncedUpdatePosition)
      window.removeEventListener('scroll', debouncedUpdatePosition)
    }
  }, [open, closePopup, updatePosition, debouncedUpdatePosition])

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.left,
    top: position.top,
    zIndex: 1000,
  }

  return {
    open,
    onOpenChange: (newOpen: boolean) => {
      if (openProp === undefined) setInternalOpen(newOpen)
      onOpenChange?.(newOpen)
    },
    onOpenToggle: () => {
      const newOpen = !open
      if (openProp === undefined) setInternalOpen(newOpen)
      onOpenChange?.(newOpen)
    },
    triggerRef,
    contentRef,
    popupStyle,
  }
}
