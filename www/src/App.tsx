import bcd, { type Identifier } from '@mdn/browser-compat-data'
import { Sun, Moon, Monitor, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'
import { ThemeProvider, useTheme } from 'next-themes'
import { useState, type FormEvent, type ErrorInfo } from 'react'
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary'

import { CompatTable } from '../../packages/react/src/components/compat-table'

import styles from './App.module.css'

const EXAMPLE_QUERIES = [
  { query: 'api.fetch', label: 'Fetch API' },
  { query: 'css.properties.display', label: 'CSS Display' },
  { query: 'html.elements.canvas', label: 'Canvas' },
  { query: 'javascript.builtins.Promise', label: 'Promise' },
];

function ErrorFallback({
  error,
  resetErrorBoundary
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className={styles['demo-error']} role="alert">
      <div className={styles['demo-error_content']}>
        <AlertTriangle size={48} color="#ef4444" />
        <h2>Something went wrong</h2>
        <details className={styles['demo-error_details']}>
          <summary>Error details</summary>
          <pre className={styles['demo-error_message']}>
            {error.message}
          </pre>
        </details>
        <div className={styles['demo-error_actions']}>
          <button
            type="button"
            onClick={resetErrorBoundary}
            className={styles['demo-error_button']}
          >
            <RotateCcw size={16} />
            Try again
          </button>
          <button
            type="button"
            onClick={() => { window.location.reload(); }}
            className={styles['demo-error_button']}
          >
            <RefreshCw size={16} />
            Reload page
          </button>
        </div>
      </div>
    </div>
  )
}

function CompatTableErrorFallback({
  error,
  resetErrorBoundary,
  query
}: {
  error: Error
  resetErrorBoundary: () => void
  query: string
}) {
  return (
    <div className={styles['demo-compat_error']} role="alert">
      <p>Failed to render compatibility table for <code>{query}</code></p>
      <details>
        <summary>Error details</summary>
        <pre style={{ color: 'red', fontSize: '12px' }}>
          {error.message}
        </pre>
      </details>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className={styles['demo-error_button']}
      >
        Retry
      </button>
    </div>
  )
}

function logError(error: Error, info: ErrorInfo) {
  console.error('Error caught by boundary:', error)
  console.error('Component stack:', info.componentStack)
}

function AppContent() {
  const { theme, setTheme } = useTheme()
  const [selectedQuery, setSelectedQuery] = useState(EXAMPLE_QUERIES[0].query)
  const [customQuery, setCustomQuery] = useState('')
  const { showBoundary } = useErrorBoundary()

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const
    const currentIndex = themes.indexOf(theme as 'light' | 'dark' | 'system')
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getNextTheme = () => {
    switch (theme) {
      case 'light': return 'dark'
      case 'dark': return 'system'
      default: return 'light'
    }
  }

  const getDataForQuery = (query: string): Identifier | null => {
    try {
      const parts = query.split('.')
      let current: unknown = bcd

      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = (current as Record<string, unknown>)[part]
        } else {
          return null
        }
      }

      return current && typeof current === 'object' ? (current as Identifier) : null
    } catch (error) {
      showBoundary(error)
      return null
    }
  }

  const handleQuerySubmit = (e: FormEvent) => {
    e.preventDefault()
    if (customQuery.trim()) {
      setSelectedQuery(customQuery.trim())
    }
  }

  const currentQuery = customQuery.trim() || selectedQuery
  const queryData = getDataForQuery(currentQuery)

  return (
    <div className={styles['demo-app']}>
      <button
        type="button"
        className={styles['demo-theme_toggle']}
        onClick={cycleTheme}
        aria-label={`Switch to ${getNextTheme()} theme`}
      >
        {theme === 'light' ? <Sun size={20} /> :
          theme === 'dark' ? <Moon size={20} /> :
            <Monitor size={20} />}
      </button>

      <main className={styles['demo-main']}>
        <div className={styles['demo-container']}>
          <div className={styles['demo-controls']}>
            <div className={styles['demo-query_tabs']}>
              {EXAMPLE_QUERIES.map(({ query, label }) => (
                <button
                  type="button"
                  key={query}
                  className={`${styles['demo-tab']} ${selectedQuery === query ? styles['demo-tab_active'] : ''}`}
                  onClick={() => {
                    setSelectedQuery(query)
                    setCustomQuery('')
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleQuerySubmit} className={styles['demo-search_form']}>
              <input
                type="text"
                value={customQuery}
                onChange={(e) => { setCustomQuery(e.target.value); }}
                placeholder="Enter custom query (e.g., api.fetch)"
                className={styles['demo-search_input']}
              />
              <button type="submit" className={styles['demo-search_button']}>
                Search
              </button>
            </form>
          </div>

          <div className={styles['demo-results']}>
            <div className={styles['demo-result_header']}>
              <code className={styles['demo-current_query']}>
                {currentQuery}
              </code>
              {queryData?.__compat?.description && (
                <p
                  className={styles['demo-description']}
                  dangerouslySetInnerHTML={{ __html: queryData.__compat.description }}
                />
              )}
            </div>

            {queryData ? (
              <ErrorBoundary
                FallbackComponent={(props) =>
                  <CompatTableErrorFallback {...props} query={currentQuery} />
                }
                onError={logError}
                resetKeys={[currentQuery]}
              >
                <CompatTable
                  query={currentQuery}
                  data={queryData}
                  browserInfo={bcd.browsers}
                />
              </ErrorBoundary>
            ) : (
              <div className={styles['demo-no_results']}>
                <p>
                  No data found for <code>{currentQuery}</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={logError}
      >
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
