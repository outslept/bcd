import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCompatTable } from "../lib/store";
import { getSupportClassName } from "../lib/support-analysis";
import { CellText } from "./CellText";
import { useFeatureRow } from "./FeatureRow";
import { Notes } from "./Notes";
import styles from "./SupportCell.module.css";
import type { BrowserName } from "@mdn/browser-compat-data";

function CompatTableSupportCell({
  ref,
  browser,
  children,
  ...props
}: {
  browser: BrowserName | string;
  children?: React.ReactNode;
  ref?: React.RefObject<HTMLTableCellElement | null>;
}) {
  const { browserInfo } = useCompatTable();
  const { feature } = useFeatureRow();
  const [isExpanded, setIsExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const browserStatement = browserInfo[browser];
  const support = feature.compat.support[browser] ?? { version_added: null };
  const supportClassName = getSupportClassName(support, browserStatement);
  const notes = <Notes browser={browserStatement} support={support} />;
  const hasNotes = !!notes;

  const handleClick = useCallback(() => {
    if (hasNotes) {
      setIsExpanded((prev) => !prev);
    }
  }, [hasNotes]);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const cellClasses = [
    styles["support-cell"],
    styles[`support-cell--${supportClassName}`],
    hasNotes && styles["support-cell--has-history"],
  ]
    .filter(Boolean)
    .join(" ");

  if (children) {
    return (
      <td
        ref={ref}
        className={cellClasses}
        data-browser={browser}
        data-support={supportClassName}
        {...props}
      >
        {children}
      </td>
    );
  }

  return (
    <>
      <td
        ref={ref}
        className={cellClasses}
        data-browser={browser}
        data-support={supportClassName}
        {...props}
      >
        <button
          ref={buttonRef}
          type="button"
          title={hasNotes ? "Show support details" : undefined}
          onClick={handleClick}
          className={styles["support-button"]}
          aria-expanded={hasNotes ? isExpanded : undefined}
          aria-label={`${browserStatement.name} support details`}
        >
          <CellText support={support} browser={browserStatement} />
        </button>
      </td>

      {hasNotes && (
        <SupportPopup
          isOpen={isExpanded}
          onClose={handleClose}
          triggerRef={buttonRef}
        >
          {notes}
        </SupportPopup>
      )}
    </>
  );
}

function SupportPopup({
  isOpen,
  onClose,
  triggerRef,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popupRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const popup = popupRef.current;
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    popup.style.position = "fixed";
    popup.style.left = `${trigger.left}px`;
    popup.style.top = `${trigger.bottom + 8}px`;

    const popupRect = popup.getBoundingClientRect();
    let finalLeft = trigger.left;
    let finalTop = trigger.bottom + 8;

    if (popupRect.right > viewport.width - 16) {
      finalLeft = viewport.width - popupRect.width - 16;
    }
    if (finalLeft < 16) {
      finalLeft = 16;
    }

    if (popupRect.bottom > viewport.height - 16) {
      finalTop = trigger.top - popupRect.height - 8;
      popup.dataset.placement = "top";
    } else {
      popup.dataset.placement = "bottom";
    }

    popup.style.left = `${finalLeft}px`;
    popup.style.top = `${finalTop}px`;
  }, [triggerRef]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (!popupRef.current || !triggerRef.current) return;
      const target = event.target as Node;
      if (
        !popupRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    },
    [onClose, triggerRef],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const timeoutId = setTimeout(updatePosition, 10);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";

      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, handleClickOutside, handleKeyDown, updatePosition]);

  useEffect(() => {
    if (isOpen && popupRef.current) {
      popupRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={styles.popup}
      tabIndex={-1}
      role="dialog"
      aria-label="Support history"
    >
      <div className={styles["popup-content"]}>{children}</div>
    </div>,
    document.body,
  );
}

export { CompatTableSupportCell };
