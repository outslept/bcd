import type { BrowserStatement, SupportStatement } from "@mdn/browser-compat-data";
import { getCurrentSupport } from "./support-analysis";

export function bugURLToString(url: string): string {
  const match = url.match(
    /^https:\/\/(?:crbug\.com|webkit\.org\/b|bugzil\.la)\/(\d+)/i,
  );
  const bugNumber = match ? match[1] : null;
  return bugNumber ? `bug ${bugNumber}` : url;
}

export function labelFromString(
  version: string | boolean | null | undefined,
  browser: BrowserStatement,
): string {
  if (typeof version != "string") return "?";
  if (version == "preview") return browser.preview_name ?? "Preview";

  let processedVersion = version;
  if (processedVersion.startsWith("≤")) {
    processedVersion = processedVersion.slice(1);
  }
  processedVersion = processedVersion.replaceAll(/(\.0)+$/g, "");

  return processedVersion;
}

export function versionLabelFromSupport(
  added: string | boolean | null | undefined,
  removed: string | boolean | null | undefined,
  browser: BrowserStatement,
): string {
  if (typeof removed != "string") {
    return labelFromString(added, browser);
  }
  return `${labelFromString(added, browser)}–${labelFromString(removed, browser)}`;
}

export function getSupportBrowserReleaseDate(
  support: SupportStatement | undefined,
  browser: BrowserStatement,
): string | undefined {
  if (!support) return undefined;

  const currentSupport = getCurrentSupport(support);
  if (
    !currentSupport?.version_added ||
    typeof currentSupport.version_added != "string"
  ) {
    return undefined;
  }

  const version = currentSupport.version_added;
  return browser.releases[version]?.release_date;
}
