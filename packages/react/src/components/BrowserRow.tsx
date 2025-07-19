import { useCompatTable } from "../lib/store";
import styles from "./CompatTable.module.css";
import { iconMap } from "./Icon";

interface CompatTableBrowserRowProps {
  children?: React.ReactNode;
}

function browserToIconName(browser: string): string {
  if (iconMap[browser]) {
    return browser;
  }
  const baseName = browser.split("_")[0];
  if (iconMap[baseName]) {
    return baseName;
  }
  return browser;
}

const CompatTableBrowserRow = ({
  ref,
  children,
  ...props
}: CompatTableBrowserRowProps & {
  ref?: React.RefObject<HTMLTableRowElement | null>;
}) => {
  const { browsers, browserInfo } = useCompatTable();

  if (children) {
    return (
      <tr
        ref={ref}
        className={styles.bcBrowsers}
        data-compat-table-browser-row=""
        {...props}
      >
        {children}
      </tr>
    );
  }

  return (
    <tr
      ref={ref}
      className={styles.bcBrowsers}
      data-compat-table-browser-row=""
      {...props}
    >
      <td></td>
      {browsers.map((browser) => (
        <th
          key={browser}
          className={`${styles.bcBrowser} ${styles[`bcBrowser-${browser}`]}`}
        >
          <div
            className={`${styles.bcHeadTxtLabel} ${styles[`bcHeadIcon-${browser}`]}`}
          >
            {browserInfo[browser]?.name}
          </div>
          <div className={styles.bcHeadIconSymbol}>
            <img
              src={iconMap[browserToIconName(browser)]}
              alt=""
              aria-hidden="true"
            />
          </div>
        </th>
      ))}
    </tr>
  );
};

export { CompatTableBrowserRow };
