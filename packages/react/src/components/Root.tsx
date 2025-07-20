import { useMemo } from "react";
import { CompatTableProvider } from "../lib/store";
import { gatherPlatformsAndBrowsers, listFeatures } from "../lib/utils";
import styles from "./Root.module.css";
import type { Browsers, Identifier } from "@mdn/browser-compat-data";

interface CompatTableRootProps {
  ref?: React.Ref<HTMLDivElement>;
  query: string;
  data: Identifier;
  browserInfo: Browsers;
  className?: string;
  children: React.ReactNode;
}

const CompatTableRoot = ({
  ref,
  query,
  data,
  browserInfo,
  className,
  children,
  ...props
}: CompatTableRootProps) => {
  const state = useMemo(() => {
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
      features = features.filter(
        ({ compat: { status } }) => !status?.deprecated,
      );
    }
    if (features.length > MAX_FEATURES) {
      features = features.filter(
        ({ compat: { status } }) => !status?.experimental,
      );
    }
    if (features.length > MAX_FEATURES) {
      features = features.slice(0, MAX_FEATURES);
    }

    return {
      query,
      data,
      browserInfo,
      platforms,
      browsers,
      features,
    };
  }, [query, data, browserInfo]);

  return (
    <CompatTableProvider value={state}>
      <div
        ref={ref}
        className={`${styles.compatTable} ${className || ""}`}
        data-compat-table=""
        {...props}
      >
        {children}
      </div>
    </CompatTableProvider>
  );
};

export { CompatTableRoot };
