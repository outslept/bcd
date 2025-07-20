import { useCompatTable } from "../lib/store";
import styles from "./BrowserRow.module.css";
import { iconMap } from "./Icon";

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

function CompatTableBrowserRow({
  ref,
  children,
  ...props
}: {
  children?: React.ReactNode;
  ref?: React.RefObject<HTMLTableRowElement | null>;
}) {
  const { browsers, browserInfo } = useCompatTable();

  if (children) {
    return (
      <tr ref={ref} className={styles["browser-row"]} {...props}>
        {children}
      </tr>
    );
  }

  return (
    <tr ref={ref} className={styles["browser-row"]} {...props}>
      <td></td>
      {browsers.map((browser) => (
        <th
          key={browser}
          className={styles["browser-cell"]}
          data-browser={browser}
        >
          <div className={styles["browser-label"]}>
            {browserInfo[browser]?.name}
          </div>
          <div className={styles["browser-icon"]}>
            <img
              src={iconMap[browserToIconName(browser)]}
              alt={`${browserInfo[browser]?.name} browser icon`}
              className={styles.icon}
            />
          </div>
        </th>
      ))}
    </tr>
  );
}

export { CompatTableBrowserRow };
