import React from "react";
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
import {
  getCurrentSupport,
  hasMore,
  hasNoteworthyNotes,
} from "../lib/support-analysis";
import styles from "./Icon.module.css";
import type { StatusBlock, SupportStatement } from "@mdn/browser-compat-data";

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

const iconLabels: Record<string, string> = {
  chrome: "Chrome",
  firefox: "Firefox",
  safari: "Safari",
  edge: "Edge",
  opera: "Opera",
  yes: "Supported",
  partial: "Partially supported",
  no: "Not supported",
  unknown: "Unknown support",
  preview: "Preview support",
  experimental: "Experimental",
  deprecated: "Deprecated",
  nonstandard: "Non-standard",
  footnote: "Additional information",
  disabled: "Behind flag",
  altname: "Alternative name",
  prefix: "Vendor prefix required",
  more: "More information",
  desktop: "Desktop",
  mobile: "Mobile",
  server: "Server",
  android: "Android",
  nodejs: "Node.js",
  deno: "Deno",
};

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

  const iconLabel = iconLabels[name] || name;
  const iconTitle = title || iconLabel;

  return (
    <abbr
      className={`${styles["icon-wrapper"]} ${className}`}
      title={iconTitle}
    >
      <span>{iconLabel}</span>
      <img
        src={iconSrc}
        alt={iconLabel}
        className={styles.icon}
        aria-hidden="true"
      />
    </abbr>
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
    <div className={styles["icon-list"]}>
      {icons.map(({ key, name }) => (
        <Icon key={key} name={name} />
      ))}
    </div>
  ) : null;
}

function StatusIcons({ status }: { status: StatusBlock }) {
  const icons: Array<{
    name: string;
    title: string;
    text: string;
  }> = [];

  if (status.experimental) {
    icons.push({
      name: "experimental",
      title: "Experimental. Expect behavior to change in the future.",
      text: "Experimental",
    });
  }

  if (status.deprecated) {
    icons.push({
      name: "deprecated",
      title: "Deprecated. Not for use in new websites.",
      text: "Deprecated",
    });
  }

  if (!status.standard_track) {
    icons.push({
      name: "nonstandard",
      title: "Non-standard. Expect poor cross-browser support.",
      text: "Non-standard",
    });
  }

  if (icons.length === 0) return null;

  return (
    <div className={styles["icon-list"]}>
      {icons.map((icon) => (
        <Icon key={icon.name} name={icon.name} title={icon.title} />
      ))}
    </div>
  );
}

export { CellIcons, Icon, iconMap, StatusIcons };
