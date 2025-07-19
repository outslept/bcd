import { useCallback, useState } from "react";
import { useCompatTable } from "../lib/store";
import { getSupportClassName } from "../lib/support-analysis";
import { CellText } from "./CellText";
import styles from "./CompatTable.module.css";
import { useFeatureRow } from "./FeatureRow";
import { Notes } from "./Notes";
import type { BrowserName } from "@mdn/browser-compat-data";

interface CompatTableSupportCellProps {
  browser: BrowserName;
  children?: React.ReactNode;
}

const CompatTableSupportCell = ({
  ref,
  browser,
  children,
  ...props
}: CompatTableSupportCellProps & {
  ref?: React.RefObject<HTMLTableDataCellElement | null>;
}) => {
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

  if (children) {
    return (
      <td
        ref={ref}
        className={`
            ${styles.bcSupport}
            ${styles[`bcBrowser-${browser}`]}
            ${styles[`bcSupports-${supportClassName}`]}
            ${hasNotes ? styles.bcHasHistory : ""}
          `}
        data-compat-table-support-cell=""
        {...props}
      >
        {children}
      </td>
    );
  }

  return (
    <td
      ref={ref}
      className={`
          ${styles.bcSupport}
          ${styles[`bcBrowser-${browser}`]}
          ${styles[`bcSupports-${supportClassName}`]}
          ${hasNotes ? styles.bcHasHistory : ""}
        `}
      data-compat-table-support-cell=""
      {...props}
    >
      <button
        type="button"
        title={hasNotes ? "Toggle history" : undefined}
        onClick={handleClick}
        className={styles.compatCellButton}
      >
        <CellText support={support} browser={browserStatement} />
      </button>
      {hasNotes && isExpanded && (
        <div className={styles.timeline} tabIndex={0}>
          <div className={styles.bcNotesList}>{notes}</div>
        </div>
      )}
    </td>
  );
};

export { CompatTableSupportCell };
