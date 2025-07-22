import bcd, { type BrowserName, type Identifier } from "@mdn/browser-compat-data";
import { ThemeProvider , useTheme } from "next-themes";
import { useState, type FormEvent } from "react";

import {
  BrowserRow,
  CompatTable,
  FeatureCell,
  FeatureRow,
  PlatformRow,
  SupportCell,
} from "../../packages/react/src/components";

import styles from "./App.module.css";

const EXAMPLE_QUERIES = [
  { query: "api.fetch", label: "Fetch API" },
  { query: "css.properties.display", label: "CSS Display" },
  { query: "html.elements.canvas", label: "Canvas" },
  { query: "javascript.builtins.Promise", label: "Promise" },
];

const SunIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

function AppContent() {
  const { theme, setTheme } = useTheme();
  const [selectedQuery, setSelectedQuery] = useState(EXAMPLE_QUERIES[0].query);
  const [customQuery, setCustomQuery] = useState("");

  const cycleTheme = () => {
    const themes = ["light", "dark", "system"] as const;
    const currentIndex = themes.indexOf(theme as "light" | "dark" | "system");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <SunIcon />;
      case "dark":
        return <MoonIcon />;
      case "system":
        return <SystemIcon />;
      default:
        return <SystemIcon />;
    }
  };

  const getDataForQuery = (query: string): Identifier | null => {
    const parts = query.split(".");
    let current: unknown = bcd;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return current && typeof current === "object" ? current as Identifier : null;
  };

  const handleQuerySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      setSelectedQuery(customQuery.trim());
    }
  };

  const currentQuery = customQuery.trim() || selectedQuery;
  const queryData = getDataForQuery(currentQuery);

  return (
    <div className={styles["demo-app"]}>
      <button
        type="button"
        className={styles["demo-theme_toggle"]}
        onClick={cycleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : theme === "dark" ? "system" : "light"} theme`}
      >
        {getThemeIcon()}
      </button>

      <main className={styles["demo-main"]}>
        <div className={styles["demo-container"]}>
          <div className={styles["demo-controls"]}>
            <div className={styles["demo-query_tabs"]}>
              {EXAMPLE_QUERIES.map(({ query, label }) => (
                <button
                  type="button"
                  key={query}
                  className={`${styles["demo-tab"]} ${selectedQuery === query ? styles["demo-tab_active"] : ""
                    }`}
                  onClick={() => {
                    setSelectedQuery(query);
                    setCustomQuery("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleQuerySubmit}
              className={styles["demo-search_form"]}
            >
              <input
                type="text"
                value={customQuery}
                onChange={(e) => { setCustomQuery(e.target.value); }}
                placeholder="Enter custom query (e.g., api.fetch)"
                className={styles["demo-search_input"]}
              />
              <button type="submit" className={styles["demo-search_button"]}>
                Search
              </button>
            </form>
          </div>

          <div className={styles["demo-results"]}>
            <div className={styles["demo-result_header"]}>
              <code className={styles["demo-current_query"]}>
                {currentQuery}
              </code>
              {queryData?.__compat?.description && (
                <p
                  className={styles["demo-description"]}
                  dangerouslySetInnerHTML={{
                    __html: queryData.__compat.description,
                  }}
                />
              )}
            </div>

            {queryData ? (
              <CompatTable
                query={currentQuery}
                data={queryData}
                browserInfo={bcd.browsers}
              >
                <CompatTable.Header>
                  <PlatformRow />
                  <BrowserRow />
                </CompatTable.Header>
                <CompatTable.Body>
                  {({ features, browsers }) =>
                    features.map((feature) => {
                      const typedFeature = feature as { name: string; depth: number; compat: any };
                      return (
                        <FeatureRow
                          key={`${typedFeature.name}-${String(typedFeature.depth)}`}
                          feature={typedFeature}
                        >
                          <FeatureCell />
                          {browsers.map((browser) => (
                            <SupportCell key={browser} browser={browser as BrowserName} />
                          ))}
                        </FeatureRow>
                      );
                    })
                  }
                </CompatTable.Body>
              </CompatTable>
            ) : (
              <div className={styles["demo-no_results"]}>
                <p>
                  No data found for <code>{currentQuery}</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
