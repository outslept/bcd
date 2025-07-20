import { useCallback, useState } from "react";
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
  browser: BrowserName;
  children?: React.ReactNode;
  ref?: React.RefObject<HTMLTableCellElement | null>;
}) {
  const { browserInfo } = useCompatTable();
  const { feature } = useFeatureRow();
  const [isExpanded, setIsExpanded] = useState(false);

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
    <td
      ref={ref}
      className={cellClasses}
      data-browser={browser}
      data-support={supportClassName}
      {...props}
    >
      <button
        type="button"
        title={hasNotes ? "Toggle history" : undefined}
        onClick={handleClick}
        className={styles["support-button"]}
        aria-expanded={hasNotes ? isExpanded : undefined}
        aria-label={`${browserStatement.name} support details`}
      >
        <CellText support={support} browser={browserStatement} />
      </button>
      {hasNotes && isExpanded && (
        <div
          className={styles.timeline}
          tabIndex={0}
          role="region"
          aria-label="Support history"
        >
          <div className={styles["notes-list"]}>{notes}</div>
        </div>
      )}
    </td>
  );
}

export { CompatTableSupportCell };
