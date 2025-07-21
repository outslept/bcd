import {
  asList,
  getSupportClassName,
  isFullySupportedWithoutLimitation,
  isNotSupportedAtAll,
  versionIsPreview,
} from "../lib/support-analysis";
import { CellText } from "./CellText";
import { Icon } from "./Icon";
import styles from "./Notes.module.css";
import type {
  BrowserStatement,
  SupportStatement,
} from "@mdn/browser-compat-data";
import type { ReactNode } from "react";

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
              label: `Removed in ${(() => {
                const version = item.version_removed;
                if (typeof version !== "string") return "?";
                if (version === "preview")
                  return browser.preview_name ?? "Preview";
                return version.replaceAll(/(\.0)+$/g, "");
              })()} and later`,
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
                  See{" "}
                  <a href={impl_url}>
                    {(() => {
                      const match = impl_url.match(
                        /^https:\/\/(?:crbug\.com|webkit\.org\/b|bugzil\.la)\/(\d+)/i,
                      );
                      const bugNumber = match ? match[1] : null;
                      return bugNumber ? `bug ${bugNumber}` : impl_url;
                    })()}
                  </a>
                  .
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
      const supportClassName = getSupportClassName(item, browser);

      return (
        (i === 0 || hasNotes) && (
          <div key={itemKey} className={styles["notes-wrapper"]}>
            <div
              className={`${styles[`support-badge--${supportClassName}`]} ${styles["support-badge"]} ${styles["notes-header"]}`}
            >
              <CellText support={item} browser={browser} timeline={true} />
            </div>
            <div className={styles["notes-content"]}>
              {supportNotes.map(({ iconName, label, key }, noteIndex) => (
                <div
                  key={key || `${itemKey}-note-${noteIndex}`}
                  className={styles["notes-item"]}
                >
                  <Icon name={iconName} />
                  <span className={styles["notes-text"]}>
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

export { Notes };
