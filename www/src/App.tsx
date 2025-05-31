import React, { useEffect, useState } from "react";
import { CompatTable } from "../../packages/react/src/CompatTable";
import styles from "./App.module.css";
import type { Browsers, Identifier } from "@mdn/browser-compat-data";

interface BCDData {
  browsers: Browsers;
  api?: Identifier;
  css?: Identifier;
  html?: Identifier;
  http?: Identifier;
  javascript?: Identifier;
  manifests?: Identifier;
  mathml?: Identifier;
  svg?: Identifier;
  webassembly?: Identifier;
  webdriver?: Identifier;
  webextensions?: Identifier;
}

const EXAMPLE_QUERIES = [
  { query: "api.fetch", label: "Fetch API" },
  { query: "css.properties.display", label: "CSS Display Property" },
  { query: "html.elements.canvas", label: "HTML Canvas Element" },
  { query: "javascript.builtins.Promise", label: "JavaScript Promise" },
  { query: "api.WebGL2RenderingContext", label: "WebGL 2.0" },
  { query: "css.properties.grid", label: "CSS Grid" },
  { query: "api.IntersectionObserver", label: "Intersection Observer" },
  { query: "css.properties.backdrop-filter", label: "CSS Backdrop Filter" },
];

function App() {
  const [bcdData, setBcdData] = useState<BCDData | null>(null);
  const [selectedQuery, setSelectedQuery] = useState(EXAMPLE_QUERIES[0].query);
  const [customQuery, setCustomQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBCDData = async () => {
      try {
        setLoading(true);
        const bcd = await import("@mdn/browser-compat-data");
        setBcdData(bcd.default as BCDData);
      } catch (error_) {
        setError(
          error_ instanceof Error ? error_.message : "Failed to load BCD data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadBCDData();
  }, []);

  const getDataForQuery = (query: string): Identifier | null => {
    if (!bcdData) return null;

    const parts = query.split(".");
    let current: any = bcdData;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current && typeof current === "object" ? current : null;
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      setSelectedQuery(customQuery.trim());
    }
  };

  const currentQuery = customQuery.trim() || selectedQuery;
  const queryData = getDataForQuery(currentQuery);

  if (loading) {
    return (
      <div className={styles.app}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading Browser Compatibility Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.app}>
        <div className={styles.error}>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!bcdData) {
    return (
      <div className={styles.app}>
        <div className={styles.error}>
          <h2>No Data Available</h2>
          <p>Browser compatibility data could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <section className={styles.controls}>
          <div className={styles.querySelector}>
            <h2>Select a Feature</h2>
            <div className={styles.exampleQueries}>
              {EXAMPLE_QUERIES.map(({ query, label }) => (
                <button
                  type="button"
                  key={query}
                  className={`${styles.queryButton} ${
                    selectedQuery === query ? styles.active : ""
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
          </div>

          <div className={styles.customQuery}>
            <h3>Or Enter Custom Query</h3>
            <form onSubmit={handleQuerySubmit} className={styles.queryForm}>
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="e.g., api.fetch, css.properties.flexbox, html.elements.video"
                className={styles.queryInput}
              />
              <button type="submit" className={styles.submitButton}>
                Load
              </button>
            </form>
            <p className={styles.queryHelp}>
              Use dot notation to navigate the BCD structure. Examples:
              <code>api.fetch</code>, <code>css.properties.grid</code>,{" "}
              <code>html.elements.canvas</code>
            </p>
          </div>
        </section>

        <section className={styles.results}>
          <div className={styles.queryInfo}>
            <h2>
              Compatibility for: <code>{currentQuery}</code>
            </h2>
            {queryData?.__compat?.description && (
              <p
                className={styles.description}
                // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
                dangerouslySetInnerHTML={{
                  __html: queryData.__compat.description,
                }}
              />
            )}
            {queryData?.__compat?.mdn_url && (
              <p className={styles.mdnLink}>
                <a
                  href={queryData.__compat.mdn_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  View on MDN ↗
                </a>
              </p>
            )}
          </div>

          {queryData ? (
            <CompatTable
              query={currentQuery}
              data={queryData}
              browserInfo={bcdData.browsers}
              locale="en-US"
              className={styles.compatTable}
            />
          ) : (
            <div className={styles.noData}>
              <h3>No Data Found</h3>
              <p>
                The query <code>{currentQuery}</code> did not match any data in
                the BCD. Please check your query and try again.
              </p>
              <details className={styles.helpDetails}>
                <summary>Query Help</summary>
                <div className={styles.helpContent}>
                  <h4>Available top-level categories:</h4>
                  <ul>
                    <li>
                      <code>api</code> - Web APIs
                    </li>
                    <li>
                      <code>css</code> - CSS features
                    </li>
                    <li>
                      <code>html</code> - HTML elements and attributes
                    </li>
                    <li>
                      <code>http</code> - HTTP features
                    </li>
                    <li>
                      <code>javascript</code> - JavaScript language features
                    </li>
                    <li>
                      <code>svg</code> - SVG features
                    </li>
                    <li>
                      <code>webextensions</code> - WebExtension APIs
                    </li>
                  </ul>
                  <h4>Example queries:</h4>
                  <ul>
                    <li>
                      <code>api.fetch</code>
                    </li>
                    <li>
                      <code>css.properties.display</code>
                    </li>
                    <li>
                      <code>html.elements.canvas</code>
                    </li>
                    <li>
                      <code>javascript.builtins.Promise</code>
                    </li>
                  </ul>
                </div>
              </details>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default App;
