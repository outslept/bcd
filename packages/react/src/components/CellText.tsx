import {
  getCurrentSupport,
  getSupportClassName,
} from "../lib/support-analysis";
import {
  getSupportBrowserReleaseDate,
  versionLabelFromSupport,
} from "../lib/version-formatting";
import styles from "./CompatTable.module.css";
import { CellIcons, iconMap } from "./Icon";
import type {
  BrowserStatement,
  SupportStatement,
} from "@mdn/browser-compat-data";

function CellText({
  support,
  browser,
  timeline = false,
}: {
  support: SupportStatement | undefined;
  browser: BrowserStatement;
  timeline?: boolean;
}) {
  const currentSupport = getCurrentSupport(support);
  const added = currentSupport?.version_added ?? null;
  const lastVersion = currentSupport?.version_last ?? null;
  const browserReleaseDate = getSupportBrowserReleaseDate(support, browser);
  const supportClassName = getSupportClassName(support, browser);

  let status: { isSupported: string; label?: string };
  switch (added) {
    case null:
      status = { isSupported: "unknown" };
      break;
    case true:
      status = { isSupported: lastVersion ? "no" : "yes" };
      break;
    case false:
      status = { isSupported: "no" };
      break;
    case "preview":
      status = { isSupported: "preview" };
      break;
    default:
      status = {
        isSupported: supportClassName,
        label: versionLabelFromSupport(added, lastVersion, browser),
      };
      break;
  }

  let label: string;
  let title = "";

  switch (status.isSupported) {
    case "yes":
      title = "Full support";
      label = status.label || "Yes";
      break;
    case "partial":
      title = "Partial support";
      label = status.label || "Partial";
      break;
    case "removed-partial":
      if (timeline) {
        title = "Partial support";
        label = status.label || "Partial";
      } else {
        title = "No support";
        label = status.label || "No";
      }
      break;
    case "no":
      title = "No support";
      label = status.label || "No";
      break;
    case "preview":
      title = "Preview support";
      label = status.label || browser.preview_name || "Preview";
      break;
    case "unknown":
      title = "Support unknown";
      label = "?";
      break;
    default:
      title = "Support unknown";
      label = "?";
  }

  title = `${browser.name} – ${title}`;

  return (
    <div
      className={
        timeline ? styles.bcdTimelineCellTextWrapper : styles.bcdCellTextWrapper
      }
    >
      <div className={styles.bcdCellIcons}>
        <span className={styles.iconWrap}>
          <abbr
            className={`${styles[`bcLevel-${supportClassName}`]} ${styles.icon} ${styles[`icon-${supportClassName}`]}`}
            title={title}
          >
            <span className={styles.bcSupportLevel}>{title}</span>
            <img src={iconMap[supportClassName]} alt="" aria-hidden="true" />
          </abbr>
        </span>
      </div>
      <div className={styles.bcdCellTextCopy}>
        <span className={styles.bcBrowserName}>{browser.name}</span>
        <span
          className={styles.bcVersionLabel}
          title={
            browserReleaseDate && !timeline
              ? `${browser.name} ${added} – Released ${browserReleaseDate}`
              : ""
          }
        >
          {!timeline || added ? label : null}
          {browserReleaseDate && timeline
            ? ` (Released ${browserReleaseDate})`
            : ""}
        </span>
      </div>
      {support && <CellIcons support={support} />}
    </div>
  );
}

export { CellText };
