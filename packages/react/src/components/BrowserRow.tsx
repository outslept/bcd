import { useCompatTable } from "../lib/store";
import styles from "../styles/components/BrowserRow.module.css";
import { iconMap } from "./Icon";

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
      {browsers.map((browser) => {
        const iconName = iconMap[browser]
          ? browser
          : iconMap[browser.split("_")[0]]
            ? browser.split("_")[0]
            : browser;

        return (
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
                src={iconMap[iconName]}
                alt={`${browserInfo[browser]?.name} browser icon`}
                className={styles.icon}
              />
            </div>
          </th>
        );
      })}
    </tr>
  );
}

export { CompatTableBrowserRow };
