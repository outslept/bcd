import React, { useCallback, useRef, useState, type ReactNode } from "react";
import androidIcon from "../assets/android.svg";
import checkIcon from "../assets/check.svg";
import chromeIcon from "../assets/chrome.svg";
import denoIcon from "../assets/deno.svg";
import desktopIcon from "../assets/desktop.svg";
import edgeIcon from "../assets/edge.svg";
import ellipsisIcon from "../assets/ellipsis.svg";
import firefoxIcon from "../assets/firefox.svg";
import flagIcon from "../assets/flag.svg";
import infoIcon from "../assets/info.svg";
import nodeIcon from "../assets/node.svg";
import operaIcon from "../assets/opera.svg";
import previewIcon from "../assets/preview.svg";
import safariIcon from "../assets/safari.svg";
import samsungInternetIcon from "../assets/samsung-internet.svg";
import serverIcon from "../assets/server.svg";
import smartphoneIcon from "../assets/smartphone.svg";
import tagIcon from "../assets/tag.svg";
import testTubeIcon from "../assets/test-tube-diagonal.svg";
import trashIcon from "../assets/trash.svg";
import triangleAlertIcon from "../assets/triangle-alert.svg";
import wrenchIcon from "../assets/wrench.svg";
import xIcon from "../assets/x.svg";
import zapIcon from "../assets/zap.svg";
import styles from "./CompatTable.module.css";
import type {
  BrowserName,
  Browsers,
  BrowserStatement,
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
  StatusBlock,
  SupportStatement,
  VersionValue,
} from "@mdn/browser-compat-data";

interface Feature {
  name: string;
  compat: CompatStatement;
  depth: number;
}

type SupportClassName =
  | "no"
  | "yes"
  | "partial"
  | "preview"
  | "removed-partial"
  | "unknown";

interface StatusIcon {
  title: string;
  text: string;
  iconClassName: string;
}

interface CompatTableProps {
  query: string;
  data: Identifier;
  browserInfo: Browsers;
  className?: string;
}

const HIDDEN_BROWSERS: BrowserName[] = ["ie"];

const iconMap: Record<string, string> = {
  chrome: chromeIcon,
  chrome_android: chromeIcon,
  firefox: firefoxIcon,
  firefox_android: firefoxIcon,
  safari: safariIcon,
  safari_ios: safariIcon,
  edge: edgeIcon,
  opera: operaIcon,
  opera_android: operaIcon,
  webview_android: androidIcon,
  webview_ios: safariIcon,
  samsunginternet_android: samsungInternetIcon,
  nodejs: nodeIcon,
  deno: denoIcon,
  ie: edgeIcon,
  oculus: androidIcon,
  "simple-firefox": firefoxIcon,
  webview: androidIcon,
  samsung: samsungInternetIcon,
  android: androidIcon,
  desktop: desktopIcon,
  mobile: smartphoneIcon,
  server: serverIcon,
  yes: checkIcon,
  partial: triangleAlertIcon,
  no: xIcon,
  unknown: infoIcon,
  preview: previewIcon,
  experimental: testTubeIcon,
  deprecated: trashIcon,
  nonstandard: zapIcon,
  footnote: infoIcon,
  disabled: wrenchIcon,
  altname: tagIcon,
  prefix: flagIcon,
  more: ellipsisIcon,
};

function getFirst<T>(a: T | T[]): T | undefined {
  return Array.isArray(a) ? a[0] : a;
}

function asList<T>(a: T | T[]): T[] {
  return Array.isArray(a) ? a : [a];
}

function hasMore(support: SupportStatement | undefined): boolean {
  return Array.isArray(support) && support.length > 1;
}

function versionIsPreview(
  version: string | VersionValue | undefined,
  browser: BrowserStatement,
): boolean {
  if (version === "preview") return true;

  if (browser && typeof version === "string" && browser.releases[version]) {
    return ["beta", "nightly", "planned"].includes(
      browser.releases[version].status,
    );
  }

  return false;
}

function hasNoteworthyNotes(support: SimpleSupportStatement): boolean {
  return (
    !!(
      (support.notes && support.notes.length) ||
      (support.impl_url && support.impl_url.length)
    ) &&
    !support.version_removed &&
    !support.partial_implementation
  );
}

function bugURLToString(url: string): string {
  const match = url.match(
    /^https:\/\/(?:crbug\.com|webkit\.org\/b|bugzil\.la)\/(\d+)/i,
  );
  const bugNumber = match ? match[1] : null;
  return bugNumber ? `bug ${bugNumber}` : url;
}

function hasLimitation(support: SimpleSupportStatement): boolean {
  return hasMajorLimitation(support) || !!support.notes || !!support.impl_url;
}

function hasMajorLimitation(support: SimpleSupportStatement): boolean {
  return (
    support.partial_implementation ||
    !!support.alternative_name ||
    !!support.flags ||
    !!support.prefix ||
    !!support.version_removed
  );
}

function isFullySupportedWithoutLimitation(
  support: SimpleSupportStatement,
): boolean {
  return !!support.version_added && !hasLimitation(support);
}

function isNotSupportedAtAll(support: SimpleSupportStatement): boolean {
  return support.version_added === false && !hasLimitation(support);
}

function isFullySupportedWithoutMajorLimitation(
  support: SimpleSupportStatement,
): boolean {
  return !!support.version_added && !hasMajorLimitation(support);
}

function getCurrentSupport(
  support: SupportStatement | undefined,
): SimpleSupportStatement | undefined {
  if (!support) return undefined;

  const noLimitationSupportItem = asList(support).find((item) =>
    isFullySupportedWithoutLimitation(item),
  );
  if (noLimitationSupportItem) return noLimitationSupportItem;

  const minorLimitationSupportItem = asList(support).find((item) =>
    isFullySupportedWithoutMajorLimitation(item),
  );
  if (minorLimitationSupportItem) return minorLimitationSupportItem;

  const altnamePrefixSupportItem = asList(support).find(
    (item) => !item.version_removed && (item.prefix || item.alternative_name),
  );
  if (altnamePrefixSupportItem) return altnamePrefixSupportItem;

  const partialSupportItem = asList(support).find(
    (item) => !item.version_removed && item.partial_implementation,
  );
  if (partialSupportItem) return partialSupportItem;

  const flagSupportItem = asList(support).find(
    (item) => !item.version_removed && item.flags,
  );
  if (flagSupportItem) return flagSupportItem;

  const noSupportItem = asList(support).find((item) => item.version_removed);
  if (noSupportItem) return noSupportItem;

  return getFirst(support);
}

function getSupportClassName(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
): SupportClassName {
  if (!support) return "unknown";

  const currentSupport = getCurrentSupport(support);
  if (!currentSupport) return "unknown";

  const { flags, version_added, version_removed, partial_implementation } =
    currentSupport;

  let className: SupportClassName;
  if (version_added === null) {
    className = "unknown";
  } else if (versionIsPreview(version_added, browser)) {
    className = "preview";
  } else if (version_added) {
    className = "yes";
    if (version_removed || (flags && flags.length)) {
      className = "no";
    }
  } else {
    className = "no";
  }

  if (partial_implementation) {
    className = version_removed ? "removed-partial" : "partial";
  }

  return className;
}

function labelFromString(
  version: string | boolean | null | undefined,
  browser: BrowserStatement,
): string {
  if (typeof version !== "string") return "?";
  if (version === "preview") return browser.preview_name ?? "Preview";

  let processedVersion = version;
  if (processedVersion.startsWith("≤")) {
    processedVersion = processedVersion.slice(1);
  }
  processedVersion = processedVersion.replaceAll(/(\.0)+$/g, "");

  return processedVersion;
}

function versionLabelFromSupport(
  added: string | boolean | null | undefined,
  removed: string | boolean | null | undefined,
  browser: BrowserStatement,
): string {
  if (typeof removed !== "string") {
    return labelFromString(added, browser);
  }
  return `${labelFromString(added, browser)}–${labelFromString(removed, browser)}`;
}

function getSupportBrowserReleaseDate(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
): string | undefined {
  if (!support) return undefined;

  const currentSupport = getCurrentSupport(support);
  if (
    !currentSupport?.version_added ||
    typeof currentSupport.version_added !== "string"
  ) {
    return undefined;
  }

  const version = currentSupport.version_added;
  return browser.releases[version]?.release_date;
}

function browserToIconName(browser: BrowserName): string {
  if (iconMap[browser]) {
    return browser;
  }

  const baseName = browser.split("_")[0];
  if (iconMap[baseName]) {
    return baseName;
  }
}

function findFirstCompatDepth(identifier: Identifier): number {
  const entries: Array<[string, Identifier]> = [["", identifier]];

  while (entries.length > 0) {
    const entry = entries.shift();
    if (!entry) break;

    const [path, value] = entry;
    if (value.__compat) {
      return path.split(".").length;
    }

    for (const [key, subvalue] of Object.entries(value)) {
      const subpath = path ? `${path}.${key}` : key;
      if ("__compat" in subvalue) {
        entries.push([subpath, subvalue]);
      }
    }
  }

  return 0;
}

function listFeatures(
  identifier: Identifier,
  parentName = "",
  rootName = "",
  depth = 0,
  firstCompatDepth = 0,
): Feature[] {
  const features: Feature[] = [];

  if (rootName && identifier.__compat) {
    features.push({
      name: rootName,
      compat: identifier.__compat,
      depth,
    });
  }

  if (rootName) {
    firstCompatDepth = findFirstCompatDepth(identifier);
  }

  for (const [subName, subIdentifier] of Object.entries(identifier)) {
    if (subName === "__compat") continue;

    if ("__compat" in subIdentifier && subIdentifier.__compat) {
      features.push({
        name: parentName ? `${parentName}.${subName}` : subName,
        compat: subIdentifier.__compat,
        depth: depth + 1,
      });
    }

    if ("__compat" in subIdentifier) {
      features.push(
        ...listFeatures(
          subIdentifier,
          subName,
          "",
          depth + 1,
          firstCompatDepth,
        ),
      );
    }
  }

  return features;
}

function gatherPlatformsAndBrowsers(
  category: string,
  data: Identifier,
  browserInfo: Browsers,
): [string[], BrowserName[]] {
  const hasNodeJSData = data.__compat && "nodejs" in data.__compat.support;
  const hasDenoData = data.__compat && "deno" in data.__compat.support;

  const platforms = ["desktop", "mobile"];
  if (category === "javascript" || hasNodeJSData || hasDenoData) {
    platforms.push("server");
  }

  let browsers: BrowserName[] = [];

  for (const platform of platforms) {
    const platformBrowsers = Object.keys(browserInfo) as BrowserName[];
    browsers.push(
      ...platformBrowsers.filter(
        (browser) =>
          browser in browserInfo && browserInfo[browser].type === platform,
      ),
    );
  }

  if (category === "webextensions") {
    browsers = browsers.filter(
      (browser) => browserInfo[browser].accepts_webextensions,
    );
  }

  if (category !== "javascript" && !hasNodeJSData) {
    browsers = browsers.filter((browser) => browser !== "nodejs");
  }

  browsers = browsers.filter((browser) => !HIDDEN_BROWSERS.includes(browser));

  return [platforms, browsers];
}

function Icon({
  name,
  title,
  className = "",
}: {
  name: string;
  title?: string;
  className?: string;
}) {
  const iconSrc = iconMap[name];

  if (!iconSrc) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <abbr className={`${styles.onlyIcon} ${className}`} title={title}>
      <span>{name}</span>
      <img
        src={iconSrc}
        alt=""
        className={`${styles.icon} ${styles[`icon-${name}`]}`}
        aria-hidden="true"
      />
    </abbr>
  );
}

function StatusIcons({ status }: { status: StatusBlock }) {
  const icons: StatusIcon[] = [];

  if (status.experimental) {
    icons.push({
      title: "Experimental. Expect behavior to change in the future.",
      text: "Experimental",
      iconClassName: "icon-experimental",
    });
  }

  if (status.deprecated) {
    icons.push({
      title: "Deprecated. Not for use in new websites.",
      text: "Deprecated",
      iconClassName: "icon-deprecated",
    });
  }

  if (!status.standard_track) {
    icons.push({
      title: "Non-standard. Expect poor cross-browser support.",
      text: "Non-standard",
      iconClassName: "icon-nonstandard",
    });
  }

  if (icons.length === 0) return null;

  return (
    <div className={styles.bcIcons}>
      {icons.map((icon) => (
        <abbr
          key={icon.iconClassName}
          className={`${styles.onlyIcon} ${styles.icon} ${styles[icon.iconClassName]}`}
          title={icon.title}
        >
          <span>{icon.text}</span>
          <img
            src={iconMap[icon.iconClassName.replace("icon-", "")]}
            alt=""
            aria-hidden="true"
          />
        </abbr>
      ))}
    </div>
  );
}

function CellIcons({ support }: { support: SupportStatement }) {
  const supportItem = getCurrentSupport(support);
  if (!supportItem) return null;

  const icons = [
    supportItem.prefix && { key: "prefix", name: "prefix" },
    hasNoteworthyNotes(supportItem) && { key: "footnote", name: "footnote" },
    supportItem.alternative_name && { key: "altname", name: "altname" },
    supportItem.flags && { key: "disabled", name: "disabled" },
    hasMore(support) && { key: "more", name: "more" },
  ].filter(Boolean) as Array<{ key: string; name: string }>;

  return icons.length ? (
    <div className={styles.bcIcons}>
      {icons.map(({ key, name }) => (
        <Icon key={key} name={name} />
      ))}
    </div>
  ) : null;
}

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

function Notes({
  browser,
  support,
}: {
  browser: BrowserStatement;
  support: SupportStatement;
}) {
  const notes = asList(support)
    .slice()
    .reverse()
    .flatMap((item, i) => {
      const supportNotes = [
        item.version_removed &&
        !asList(support).some(
          (otherItem) => otherItem.version_added === item.version_removed,
        )
          ? {
              iconName: "footnote",
              label: `Removed in ${labelFromString(item.version_removed, browser)} and later`,
            }
          : null,
        item.partial_implementation
          ? { iconName: "footnote", label: "Partial support" }
          : null,
        item.prefix
          ? {
              iconName: "prefix",
              label: `Implemented with the vendor prefix: ${item.prefix}`,
            }
          : null,
        item.alternative_name
          ? {
              iconName: "altname",
              label: `Alternate name: ${item.alternative_name}`,
            }
          : null,
        item.flags
          ? {
              iconName: "disabled",
              label: (() => {
                const hasAddedVersion = typeof item.version_added === "string";
                const hasRemovedVersion =
                  typeof item.version_removed === "string";

                const parts = [
                  hasAddedVersion && `From version ${item.version_added}`,
                  hasRemovedVersion &&
                    `${hasAddedVersion ? " until" : "Until"} ${item.version_removed} (exclusive)`,
                  hasAddedVersion || hasRemovedVersion ? ": this" : "This",
                  " feature is behind the",
                  ...item.flags.map((flag, flagIndex) => {
                    const valueToSet = flag.value_to_set
                      ? ` (needs to be set to ${flag.value_to_set})`
                      : "";
                    const flagType =
                      flag.type === "preference"
                        ? ` preference${valueToSet}`
                        : flag.type === "runtime_flag"
                          ? ` runtime flag${valueToSet}`
                          : "";
                    return `${flag.name}${flagType}${flagIndex < item.flags.length - 1 ? " and the " : ""}`;
                  }),
                  ".",
                  browser.pref_url &&
                    item.flags.some((flag) => flag.type === "preference") &&
                    ` To change preferences in ${browser.name}, visit ${browser.pref_url}.`,
                ]
                  .filter(Boolean)
                  .join("");

                return parts;
              })(),
            }
          : null,
        item.notes
          ? (Array.isArray(item.notes) ? item.notes : [item.notes]).map(
              (note, noteIndex) => ({
                iconName: "footnote",
                label: note,
                key: `note-${noteIndex}`,
              }),
            )
          : null,
        item.impl_url
          ? (Array.isArray(item.impl_url)
              ? item.impl_url
              : [item.impl_url]
            ).map((impl_url, urlIndex) => ({
              iconName: "footnote",
              label: (
                <>
                  See <a href={impl_url}>{bugURLToString(impl_url)}</a>.
                </>
              ),
              key: `impl-${urlIndex}`,
            }))
          : null,
        versionIsPreview(item.version_added, browser)
          ? { iconName: "footnote", label: "Preview browser support" }
          : null,
        isFullySupportedWithoutLimitation(item) &&
        !versionIsPreview(item.version_added, browser)
          ? { iconName: "footnote", label: "Full support" }
          : isNotSupportedAtAll(item)
            ? { iconName: "footnote", label: "No support" }
            : null,
      ]
        .flat()
        .filter(Boolean) as Array<{
        iconName: string;
        label: string | ReactNode;
        key?: string;
      }>;

      if (supportNotes.length === 0) {
        supportNotes.push({ iconName: "unknown", label: "Support unknown" });
      }

      const hasNotes = supportNotes.length > 0;
      const itemKey = `item-${i}-${item.version_added}-${item.version_removed}`;

      return (
        (i === 0 || hasNotes) && (
          <div key={itemKey} className={styles.bcNotesWrapper}>
            <div
              className={`${styles[`bcSupports-${getSupportClassName(item, browser)}`]} ${styles.bcSupports} ${styles.bcNotesHeader}`}
            >
              <CellText support={item} browser={browser} timeline={true} />
            </div>
            <div className={styles.bcNotesContent}>
              {supportNotes.map(({ iconName, label, key }, noteIndex) => (
                <div
                  key={key || `${itemKey}-note-${noteIndex}`}
                  className={styles.bcNotesItem}
                >
                  <Icon name={iconName} />
                  <span className={styles.bcNotesText}>
                    {typeof label === "string" ? (
                      // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                      <span dangerouslySetInnerHTML={{ __html: label }} />
                    ) : (
                      label
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      );
    })
    .filter(Boolean);

  return notes.length > 0 ? <>{notes}</> : null;
}

function CompatCell({
  browserName,
  browser,
  compat,
}: {
  browserName: BrowserName;
  browser: BrowserStatement;
  compat: CompatStatement;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const support = compat.support[browserName] ?? { version_added: null };
  const supportClassName = getSupportClassName(support, browser);
  const notes = <Notes browser={browser} support={support} />;
  const hasNotes = !!notes;

  const handleClick = useCallback(() => {
    if (hasNotes) {
      setIsExpanded((prev) => !prev);
    }
  }, [hasNotes]);

  return (
    <td
      className={`
        ${styles.bcSupport}
        ${styles[`bcBrowser-${browserName}`]}
        ${styles[`bcSupports-${supportClassName}`]}
        ${hasNotes ? styles.bcHasHistory : ""}
      `}
    >
      <button
        type="button"
        title={hasNotes ? "Toggle history" : undefined}
        onClick={handleClick}
        className={styles.compatCellButton}
      >
        <CellText support={support} browser={browser} />
      </button>
      {hasNotes && isExpanded && (
        <div className={styles.timeline} tabIndex={0}>
          <div className={styles.bcNotesList}>{notes}</div>
        </div>
      )}
    </td>
  );
}

function FeatureRow({
  feature,
  browsers,
  browserInfo,
}: {
  feature: Feature;
  browsers: BrowserName[];
  browserInfo: Browsers;
}) {
  const { name, compat, depth } = feature;

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

  let titleNode: ReactNode;
  if (compat.mdn_url && depth > 0) {
    titleNode = (
      <a href={compat.mdn_url} className={styles.bcTableRowHeader}>
        {titleContent}
      </a>
    );
  } else {
    titleNode = <div className={styles.bcTableRowHeader}>{titleContent}</div>;
  }

  return (
    <tr>
      <th
        className={`${styles.bcFeature} ${styles[`bcFeatureDepth-${depth}`]}`}
        scope="row"
      >
        {titleNode}
      </th>
      {browsers.map((browserName) => (
        <CompatCell
          key={browserName}
          browserName={browserName}
          browser={browserInfo[browserName]}
          compat={compat}
        />
      ))}
    </tr>
  );
}

export function CompatTable({
  query,
  data,
  browserInfo,
  className = "",
}: CompatTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  const breadcrumbs = query.split(".");
  const category = breadcrumbs[0] ?? "";
  const name = breadcrumbs.at(-1) ?? "";

  const [platforms, browsers] = gatherPlatformsAndBrowsers(
    category,
    data,
    browserInfo,
  );

  let features = listFeatures(data, "", name);
  const MAX_FEATURES = 100;

  if (features.length > MAX_FEATURES) {
    features = features.filter(({ depth }) => depth < 2);
  }

  if (features.length > MAX_FEATURES) {
    features = features.filter(
      ({ compat: { status } }) => status?.standard_track,
    );
  }

  if (features.length > MAX_FEATURES) {
    features = features.filter(({ compat: { status } }) => !status?.deprecated);
  }

  if (features.length > MAX_FEATURES) {
    features = features.filter(
      ({ compat: { status } }) => !status?.experimental,
    );
  }

  if (features.length > MAX_FEATURES) {
    features = features.slice(0, MAX_FEATURES);
  }

  const platformsWithBrowsers = platforms.map((platform) => ({
    platform,
    browsers: browsers.filter(
      (browser) => browserInfo[browser].type === platform,
    ),
  }));

  const grid = platformsWithBrowsers.map(({ browsers }) => browsers.length);

  return (
    <div className={`${styles.compatTable} ${className}`}>
      <figure className={styles.tableContainer}>
        <figure className={styles.tableContainerInner}>
          <table
            ref={tableRef}
            className={`${styles.bcTable} ${styles.bcTableWeb}`}
          >
            <thead>
              {/* Platform Headers */}
              <tr className={styles.bcPlatforms}>
                <td></td>
                {platformsWithBrowsers.map(
                  ({ platform, browsers: platformBrowsers }, index) => {
                    const browserCount = platformBrowsers.length;
                    const cellClass = `${styles.bcPlatform} ${styles[`bcPlatform-${platform}`]}`;

                    const columnStart =
                      2 + grid.slice(0, index).reduce((acc, x) => acc + x, 0);
                    const columnEnd = columnStart + browserCount;

                    return (
                      <th
                        key={platform}
                        className={cellClass}
                        colSpan={browserCount}
                        title={platform}
                        style={{ gridColumn: `${columnStart} / ${columnEnd}` }}
                      >
                        <img
                          src={iconMap[platform]}
                          alt=""
                          aria-hidden="true"
                          className={styles.icon}
                        />
                        <span className={styles.visuallyHidden}>
                          {platform}
                        </span>
                      </th>
                    );
                  },
                )}
              </tr>

              {/* Browser Headers */}
              <tr className={styles.bcBrowsers}>
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
            </thead>

            <tbody>
              {features.map((feature) => (
                <FeatureRow
                  key={`${feature.name}-${feature.depth}`}
                  feature={feature}
                  browsers={browsers}
                  browserInfo={browserInfo}
                />
              ))}
            </tbody>
          </table>
        </figure>
      </figure>
    </div>
  );
}
