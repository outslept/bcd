import { memo, useMemo } from "react";
import {
  getCurrentSupport,
  getSupportClassName,
} from "../lib/support-analysis";
import styles from "./CellText.module.css";
import { CellIcons } from "./Icon";
import type {
  BrowserStatement,
  SupportStatement,
} from "@mdn/browser-compat-data";

const releaseDateCache = new Map<string, string | null>();

const CellText = memo(function CellText({
  support,
  browser,
  timeline = false,
}: {
  support: SupportStatement | undefined;
  browser: BrowserStatement;
  timeline?: boolean;
}) {
  const computedData = useMemo(() => {
    const currentSupport = getCurrentSupport(support);
    const added = currentSupport?.version_added ?? null;
    const lastVersion = currentSupport?.version_last ?? null;

    const cacheKey = `${browser.name}-${JSON.stringify(support)}`;
    let browserReleaseDate = releaseDateCache.get(cacheKey);
    if (browserReleaseDate === undefined) {
      if (
        support &&
        currentSupport?.version_added &&
        typeof currentSupport.version_added === "string"
      ) {
        browserReleaseDate =
          browser.releases[currentSupport.version_added]?.release_date ?? null;
      } else {
        browserReleaseDate = null;
      }
      releaseDateCache.set(cacheKey, browserReleaseDate);
    }

    const supportClassName = getSupportClassName(support, browser);

    const versionLabel = (() => {
      if (typeof lastVersion === "string") {
        const addedLabel =
          typeof added === "string"
            ? added === "preview"
              ? (browser.preview_name ?? "Preview")
              : added.replaceAll(/(\.0)+$/g, "")
            : "?";
        const removedLabel = lastVersion.replaceAll(/(\.0)+$/g, "");
        return `${addedLabel}–${removedLabel}`;
      }

      if (typeof added === "string") {
        return added === "preview"
          ? (browser.preview_name ?? "Preview")
          : added.replaceAll(/(\.0)+$/g, "");
      }

      return "?";
    })();

    return {
      currentSupport,
      added,
      lastVersion,
      browserReleaseDate,
      supportClassName,
      versionLabel,
    };
  }, [support, browser]);

  const {
    added,
    lastVersion,
    browserReleaseDate,
    supportClassName,
    versionLabel,
  } = computedData;

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
        label: versionLabel,
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
        timeline
          ? styles["cell-text-wrapper--timeline"]
          : styles["cell-text-wrapper"]
      }
    >
      <div className={styles["cell-content"]}>
        {timeline && (
          <span className={styles["browser-name"]}>{browser.name}</span>
        )}
        <span
          className={styles["version-label"]}
          title={
            browserReleaseDate && !timeline
              ? `${browser.name} ${added} – Released ${browserReleaseDate}`
              : title
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
});

export { CellText };
