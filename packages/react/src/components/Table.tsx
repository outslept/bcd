import styles from "./Table.module.css";
import type { ReactNode, RefObject } from "react";

function CompatTable({
  ref,
  children,
  ...props
}: {
  children: ReactNode;
  ref?: RefObject<HTMLTableElement | null>;
}) {
  return (
    <div className={styles["table-container"]}>
      <div className={styles["table-viewport"]}>
        <table ref={ref} className={styles.table} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export { CompatTable };
