import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type LegendKey =
  | "yes"
  | "partial"
  | "preview"
  | "no"
  | "unknown"
  | "experimental"
  | "nonstandard"
  | "deprecated"
  | "footnote"
  | "disabled"
  | "altname"
  | "prefix"
  | "more";

interface StatusIcon {
  title: string;
  text: string;
  iconClassName: string;
}

interface CompatTableProps {
  query: string;
  data: Identifier;
  browserInfo: Browsers;
  locale?: string;
  className?: string;
}

const HIDDEN_BROWSERS: BrowserName[] = ["ie"];

const LEGEND_LABELS: Record<LegendKey, string> = {
  yes: "Full support",
  partial: "Partial support",
  preview: "In development. Supported in a pre-release version.",
  no: "No support",
  unknown: "Compatibility unknown",
  experimental: "Experimental. Expect behavior to change in the future.",
  nonstandard: "Non-standard. Check cross-browser support before using.",
  deprecated: "Deprecated. Not for use in new websites.",
  footnote: "See implementation notes.",
  disabled: "User must explicitly enable this feature.",
  altname: "Uses a non-standard name.",
  prefix: "Requires a vendor prefix or different name for use.",
  more: "Has more compatibility info.",
};

const DEFAULT_LOCALE = "en-US";

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
): string | undefined {
  if (!support) return undefined;
  return getCurrentSupport(support)?.release_date;
}

function browserToIconName(browser: BrowserName): string {
  if (browser.startsWith("firefox")) return "simple-firefox";
  if (browser === "webview_android") return "webview";
  if (browser === "webview_ios") return "safari";
  return browser.split("_")[0] ?? "";
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

function getActiveLegendItems(
  compat: Identifier,
  name: string,
  browserInfo: Browsers,
  browsers: BrowserName[],
): Array<[LegendKey, string]> {
  const legendItems = new Set<LegendKey>();

  for (const feature of listFeatures(compat, "", name)) {
    const { status } = feature.compat;

    if (status) {
      if (status.experimental) legendItems.add("experimental");
      if (status.deprecated) legendItems.add("deprecated");
      if (!status.standard_track) legendItems.add("nonstandard");
    }

    for (const browser of browsers) {
      const browserSupport = feature.compat.support[browser] ?? {
        version_added: null,
      };

      if (HIDDEN_BROWSERS.includes(browser)) continue;

      const firstSupportItem = getFirst(browserSupport);
      if (firstSupportItem && hasNoteworthyNotes(firstSupportItem)) {
        legendItems.add("footnote");
      }

      for (const versionSupport of asList(browserSupport)) {
        if (versionSupport.version_added) {
          if (versionSupport.flags && versionSupport.flags.length) {
            legendItems.add("no");
          } else if (
            versionIsPreview(versionSupport.version_added, browserInfo[browser])
          ) {
            legendItems.add("preview");
          } else {
            legendItems.add("yes");
          }
        } else if (versionSupport.version_added == null) {
          legendItems.add("unknown");
        } else {
          legendItems.add("no");
        }

        if (versionSupport.partial_implementation) legendItems.add("partial");
        if (versionSupport.prefix) legendItems.add("prefix");
        if (versionSupport.alternative_name) legendItems.add("altname");
        if (versionSupport.flags) legendItems.add("disabled");
      }

      if (hasMore(browserSupport)) legendItems.add("more");
    }
  }

  const keys = Object.keys(LEGEND_LABELS) as LegendKey[];
  return keys
    .filter((key) => legendItems.has(key))
    .map((key) => [key, LEGEND_LABELS[key]]);
}

const Icon: React.FC<{ name: string; title?: string; className?: string }> = ({
  name,
  title,
  className = "",
}) => (
  <abbr className={`${styles.onlyIcon} ${className}`} title={title}>
    <span>{name}</span>
    <i className={`${styles.icon} ${styles[`icon-${name}`]}`}></i>
  </abbr>
);

const StatusIcons: React.FC<{ status: StatusBlock }> = ({ status }) => {
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
      {icons.map((icon, index) => (
        <abbr
          key={index}
          className={`${styles.onlyIcon} ${styles.icon} ${styles[icon.iconClassName]}`}
          title={icon.title}
        >
          <span>{icon.text}</span>
        </abbr>
      ))}
    </div>
  );
};

const CellIcons: React.FC<{ support: SupportStatement }> = ({ support }) => {
  const supportItem = getCurrentSupport(support);
  if (!supportItem) return null;

  const icons = [
    supportItem.prefix && <Icon key="prefix" name="prefix" />,
    hasNoteworthyNotes(supportItem) && <Icon key="footnote" name="footnote" />,
    supportItem.alternative_name && <Icon key="altname" name="altname" />,
    supportItem.flags && <Icon key="disabled" name="disabled" />,
    hasMore(support) && <Icon key="more" name="more" />,
  ].filter(Boolean);

  return icons.length ? <div className={styles.bcIcons}>{icons}</div> : null;
};

const CellText: React.FC<{
  support: SupportStatement | undefined;
  browser: BrowserStatement;
  timeline?: boolean;
}> = ({ support, browser, timeline = false }) => {
  const currentSupport = getCurrentSupport(support);
  const added = currentSupport?.version_added ?? null;
  const lastVersion = currentSupport?.version_last ?? null;
  const browserReleaseDate = getSupportBrowserReleaseDate(support);
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
};

const Notes: React.FC<{
  browser: BrowserStatement;
  support: SupportStatement;
}> = ({ browser, support }) => {
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
                const flags = item.flags || [];

                const parts = [
                  hasAddedVersion && `From version ${item.version_added}`,
                  hasRemovedVersion &&
                    `${hasAddedVersion ? " until" : "Until"} ${item.version_removed} (exclusive)`,
                  hasAddedVersion || hasRemovedVersion ? ": this" : "This",
                  " feature is behind the",
                  ...flags.map((flag, i) => {
                    const valueToSet = flag.value_to_set
                      ? ` (needs to be set to ${flag.value_to_set})`
                      : "";
                    const flagType =
                      flag.type === "preference"
                        ? ` preference${valueToSet}`
                        : flag.type === "runtime_flag"
                          ? ` runtime flag${valueToSet}`
                          : "";
                    return `${flag.name}${flagType}${i < flags.length - 1 ? " and the " : ""}`;
                  }),
                  ".",
                  browser.pref_url &&
                    flags.some((flag) => flag.type === "preference") &&
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
              (note) => ({
                iconName: "footnote",
                label: note,
              }),
            )
          : null,
        item.impl_url
          ? (Array.isArray(item.impl_url)
              ? item.impl_url
              : [item.impl_url]
            ).map((impl_url) => ({
              iconName: "footnote",
              label: (
                <>
                  See <a href={impl_url}>{bugURLToString(impl_url)}</a>.
                </>
              ),
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
        label: string | React.ReactNode;
      }>;

      if (supportNotes.length === 0) {
        supportNotes.push({ iconName: "unknown", label: "Support unknown" });
      }

      const hasNotes = supportNotes.length > 0;
      return (
        (i === 0 || hasNotes) && (
          <div key={i} className={styles.bcNotesWrapper}>
            <dt
              className={`${styles[`bcSupports-${getSupportClassName(item, browser)}`]} ${styles.bcSupports}`}
            >
              <CellText support={item} browser={browser} timeline={true} />
            </dt>
            {supportNotes.map(({ iconName, label }, noteIndex) => (
              <dd key={noteIndex} className={styles.bcSupportsDD}>
                <Icon name={iconName} />
                <span>
                  {typeof label === "string" ? (
                    <span dangerouslySetInnerHTML={{ __html: label }} />
                  ) : (
                    label
                  )}
                </span>
              </dd>
            ))}
            {!hasNotes && <dd></dd>}
          </div>
        )
      );
    })
    .filter(Boolean);

  return notes.length > 0 ? <>{notes}</> : null;
};

const CompatCell: React.FC<{
  browserName: BrowserName;
  browser: BrowserStatement;
  compat: CompatStatement;
}> = ({ browserName, browser, compat }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const support = compat.support[browserName] ?? { version_added: null };
  const supportClassName = getSupportClassName(support, browser);
  const notes = useMemo(
    () => <Notes browser={browser} support={support} />,
    [browser, support],
  );
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
          <dl className={styles.bcNotesList}>{notes}</dl>
        </div>
      )}
    </td>
  );
};

const FeatureRow: React.FC<{
  feature: Feature;
  browsers: BrowserName[];
  browserInfo: Browsers;
  locale: string;
}> = ({ feature, browsers, browserInfo, locale }) => {
  const { name, compat, depth } = feature;

  const title = compat.description ? (
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

  let titleNode: React.ReactNode;
  if (compat.mdn_url && depth > 0) {
    const href = compat.mdn_url.replace(
      `/${DEFAULT_LOCALE}/docs`,
      `/${locale}/docs`,
    );
    titleNode = (
      <a href={href} className={styles.bcTableRowHeader}>
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
};

const TableLegend: React.FC<{
  data: Identifier;
  name: string;
  browserInfo: Browsers;
  browsers: BrowserName[];
}> = ({ data, name, browserInfo, browsers }) => {
  const activeLegendItems = useMemo(
    () => getActiveLegendItems(data, name, browserInfo, browsers),
    [data, name, browserInfo, browsers],
  );

  return (
    <section className={styles.bcLegend}>
      <h3 className={styles.visuallyHidden} id="Legend">
        Legend
      </h3>
      <p className={styles.bcLegendTip}>
        Tip: you can click/tap on a cell for more information.
      </p>
      <dl className={styles.bcLegendItemsContainer}>
        {activeLegendItems.map(([key, label]) =>
          ["yes", "partial", "no", "unknown", "preview"].includes(key) ? (
            <div key={key} className={styles.bcLegendItem}>
              <dt className={styles.bcLegendItemDt}>
                <span
                  className={`${styles[`bcSupports-${key}`]} ${styles.bcSupports}`}
                >
                  <abbr
                    className={`${styles.bcLevel} ${styles[`bcLevel-${key}`]} ${styles.icon} ${styles[`icon-${key}`]}`}
                    title={label}
                  >
                    <span className={styles.visuallyHidden}>{label}</span>
                  </abbr>
                </span>
              </dt>
              <dd className={styles.bcLegendItemDD}>{label}</dd>
            </div>
          ) : (
            <div key={key} className={styles.bcLegendItem}>
              <dt className={styles.bcLegendItemDt}>
                <abbr
                  className={`${styles.legendIcons} ${styles.icon} ${styles[`icon-${key}`]}`}
                  title={label}
                ></abbr>
              </dt>
              <dd className={styles.bcLegendItemDD}>{label}</dd>
            </div>
          ),
        )}
      </dl>
    </section>
  );
};

const IssueLink: React.FC<{
  query: string;
  pathname: string;
  sourceFile?: string;
}> = ({ query, pathname, sourceFile }) => {
  const issueUrl = useMemo(() => {
    const url = "https://github.com/mdn/browser-compat-data/issues/new";
    const sp = new URLSearchParams();
    const metadata = `
<!-- Do not make changes below this line -->
<details>
<summary>MDN page report details</summary>

* Query: \`${query}\`
* Report started: ${new Date().toISOString()}

</details>
    `.trim();

    sp.set("mdn-url", `https://developer.mozilla.org${pathname}`);
    sp.set("metadata", metadata);
    sp.set("title", `${query} - <SUMMARIZE THE PROBLEM>`);
    sp.set("template", "data-problem.yml");

    return `${url}?${sp.toString()}`;
  }, [query, pathname]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      window.open(issueUrl, "_blank", "noopener,noreferrer");
    },
    [issueUrl],
  );

  return (
    <div className={styles.bcOnGithub}>
      <a
        className={`${styles.bcGithubLink} ${styles.external} ${styles.externalIcon}`}
        href="#"
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        title="Report an issue with this compatibility data"
      >
        Report problems with this compatibility data
      </a>
      {sourceFile && (
        <>
          {" • "}
          <a
            className={`${styles.bcGithubLink} ${styles.external} ${styles.externalIcon}`}
            href={`https://github.com/mdn/browser-compat-data/tree/main/${sourceFile}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`File: ${sourceFile}`}
          >
            View data on GitHub
          </a>
        </>
      )}
    </div>
  );
};

export const CompatTable: React.FC<CompatTableProps> = ({
  query,
  data,
  browserInfo,
  locale = DEFAULT_LOCALE,
  className = "",
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [pathname] = useState(() => window.location.pathname);

  const breadcrumbs = useMemo(() => query.split("."), [query]);
  const category = breadcrumbs[0] ?? "";
  const name = breadcrumbs.at(-1) ?? "";

  const [platforms, browsers] = useMemo(
    () => gatherPlatformsAndBrowsers(category, data, browserInfo),
    [category, data, browserInfo],
  );

  const features = useMemo(() => {
    let featureList = listFeatures(data, "", name);
    const MAX_FEATURES = 100;

    if (featureList.length > MAX_FEATURES) {
      featureList = featureList.filter(({ depth }) => depth < 2);
    }

    if (featureList.length > MAX_FEATURES) {
      featureList = featureList.filter(
        ({ compat: { status } }) => status?.standard_track,
      );
    }

    if (featureList.length > MAX_FEATURES) {
      featureList = featureList.filter(
        ({ compat: { status } }) => !status?.deprecated,
      );
    }

    if (featureList.length > MAX_FEATURES) {
      featureList = featureList.filter(
        ({ compat: { status } }) => !status?.experimental,
      );
    }

    if (featureList.length > MAX_FEATURES) {
      featureList = featureList.slice(0, MAX_FEATURES);
    }

    return featureList;
  }, [data, name]);

  const platformsWithBrowsers = useMemo(
    () =>
      platforms.map((platform) => ({
        platform,
        browsers: browsers.filter(
          (browser) => browserInfo[browser].type === platform,
        ),
      })),
    [platforms, browsers, browserInfo],
  );

  const grid = useMemo(
    () => platformsWithBrowsers.map(({ browsers }) => browsers.length),
    [platformsWithBrowsers],
  );

  useEffect(() => {
    const element = tableRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log(`Table viewed: ${query}`);
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [query]);

  return (
    <div className={`${styles.compatTable} ${className}`}>
      <figure className={styles.tableContainer}>
        <figure className={styles.tableContainerInner}>
          <IssueLink
            query={query}
            pathname={pathname}
            sourceFile={data.__compat?.source_file}
          />
          <table
            ref={tableRef}
            className={`${styles.bcTable} ${styles.bcTableWeb}`}
            style={
              { "--browser-count": browsers.length } as React.CSSProperties
            }
          >
            <thead>
              {/* Platform Headers */}
              <tr className={styles.bcPlatforms}>
                <td></td>
                {platformsWithBrowsers.map(
                  ({ platform, browsers: platformBrowsers }, index) => {
                    const browserCount = platformBrowsers.length;
                    const cellClass = `${styles.bcPlatform} ${styles[`bcPlatform-${platform}`]}`;
                    const iconClass = `${styles.icon} ${styles[`icon-${platform}`]}`;

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
                        <span className={iconClass}></span>
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
                    <div
                      className={`${styles.bcHeadIconSymbol} ${styles.icon} ${styles[`icon-${browserToIconName(browser)}`]}`}
                    ></div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {features.map((feature, index) => (
                <FeatureRow
                  key={`${feature.name}-${index}`}
                  feature={feature}
                  browsers={browsers}
                  browserInfo={browserInfo}
                  locale={locale}
                />
              ))}
            </tbody>
          </table>
        </figure>
      </figure>

      <TableLegend
        data={data}
        name={name}
        browserInfo={browserInfo}
        browsers={browsers}
      />
    </div>
  );
};

export default CompatTable;
