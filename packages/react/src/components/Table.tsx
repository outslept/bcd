import styles from "./CompatTable.module.css";

interface CompatTableTableProps {
  children: React.ReactNode;
}

const CompatTableTable = ({
  ref,
  children,
  ...props
}: CompatTableTableProps & {
  ref?: React.RefObject<HTMLTableElement | null>;
}) => {
  return (
    <figure className={styles.tableContainer}>
      <figure className={styles.tableContainerInner}>
        <table
          ref={ref}
          className={`${styles.bcTable} ${styles.bcTableWeb}`}
          data-compat-table-table=""
          {...props}
        >
          {children}
        </table>
      </figure>
    </figure>
  );
};

export { CompatTableTable };
