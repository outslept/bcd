import styles from "./CompatTable.module.css";
import { useFeatureRow } from "./FeatureRow";
import { StatusIcons } from "./Icon";

interface CompatTableFeatureCellProps {
  children?: React.ReactNode;
}

const CompatTableFeatureCell = ({
  ref,
  children,
  ...props
}: CompatTableFeatureCellProps & {
  ref?: React.RefObject<HTMLTableHeaderCellElement | null>;
}) => {
  const { feature } = useFeatureRow();
  const { name, compat, depth } = feature;

  if (children) {
    return (
      <th
        ref={ref}
        className={`${styles.bcFeature} ${styles[`bcFeatureDepth-${depth}`]}`}
        scope="row"
        data-compat-table-feature-cell=""
        {...props}
      >
        {children}
      </th>
    );
  }

  const title = compat.description ? (
    // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
    <span dangerouslySetInnerHTML={{ __html: compat.description }} />
  ) : (
    <code>{name}</code>
  );

  const titleContent = (
    <>
      {title}
      {compat.status && <StatusIcons status={compat.status} />}
    </>
  );

  const titleNode =
    compat.mdn_url && depth > 0 ? (
      <a href={compat.mdn_url} className={styles.bcTableRowHeader}>
        {titleContent}
      </a>
    ) : (
      <div className={styles.bcTableRowHeader}>{titleContent}</div>
    );

  return (
    <th
      ref={ref}
      className={`${styles.bcFeature} ${styles[`bcFeatureDepth-${depth}`]}`}
      scope="row"
      data-compat-table-feature-cell=""
      {...props}
    >
      {titleNode}
    </th>
  );
};

export { CompatTableFeatureCell };
