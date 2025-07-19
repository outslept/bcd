import { useCompatTable } from "../lib/store";
import styles from "./CompatTable.module.css";
import { iconMap } from "./Icon";

interface CompatTablePlatformRowProps {
  ref?: React.Ref<HTMLTableRowElement>;
  children?: React.ReactNode;
}

const CompatTablePlatformRow = ({
  ref,
  children,
  ...props
}: CompatTablePlatformRowProps) => {
  const { platforms, browsers, browserInfo } = useCompatTable();

  const platformsWithBrowsers = platforms.map((platform) => ({
    platform,
    browsers: browsers.filter(
      (browser) => browserInfo[browser].type === platform,
    ),
  }));

  if (children) {
    return (
      <tr
        ref={ref}
        className={styles.bcPlatforms}
        data-compat-table-platform-row=""
        {...props}
      >
        {children}
      </tr>
    );
  }

  return (
    <tr
      ref={ref}
      className={styles.bcPlatforms}
      data-compat-table-platform-row=""
      {...props}
    >
      <td></td>
      {platformsWithBrowsers.map(({ platform, browsers: platformBrowsers }) => (
        <th
          key={platform}
          className={`${styles.bcPlatform} ${styles[`bcPlatform-${platform}`]}`}
          colSpan={platformBrowsers.length}
          title={platform}
        >
          <img
            src={iconMap[platform]}
            alt=""
            aria-hidden="true"
            className={styles.icon}
          />
          <span className={styles.visuallyHidden}>{platform}</span>
        </th>
      ))}
    </tr>
  );
};

export { CompatTablePlatformRow };
