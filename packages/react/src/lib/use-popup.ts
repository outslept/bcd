import { useEffect, useRef, useState, type RefObject } from "react";

export interface UsePopupProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface UsePopupReturn {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenToggle: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
}

export function usePopup({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
}: UsePopupProps = {}): UsePopupReturn {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  const open = openProp ?? internalOpen;

  useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const content = contentRef.current;

    let left = trigger.left;
    let top = trigger.bottom + 8;

    content.style.position = "fixed";
    content.style.left = `${left}px`;
    content.style.top = `${top}px`;

    const rect = content.getBoundingClientRect();
    if (rect.right > window.innerWidth - 16) {
      left = window.innerWidth - rect.width - 16;
    }
    if (left < 16) left = 16;
    if (rect.bottom > window.innerHeight - 16) {
      top = trigger.top - rect.height - 8;
    }

    content.style.left = `${left}px`;
    content.style.top = `${top}px`;
    content.focus();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!content.contains(target) && !triggerRef.current?.contains(target)) {
        if (openProp === undefined) setInternalOpen(false);
        onOpenChange?.(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openProp === undefined) setInternalOpen(false);
        onOpenChange?.(false);
      }
    };

    const handleResize = () => {
      const newRect = triggerRef.current?.getBoundingClientRect();
      if (newRect) {
        content.style.left = `${newRect.left}px`;
        content.style.top = `${newRect.bottom + 8}px`;
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [open, onOpenChange, openProp]);

  return {
    open,
    onOpenChange: (newOpen: boolean) => {
      if (openProp === undefined) setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    onOpenToggle: () => {
      const newOpen = !open;
      if (openProp === undefined) setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    triggerRef,
    contentRef,
  };
}
