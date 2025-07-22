import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "demo-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  delete root.dataset.theme;

  root.classList.add(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const updateResolvedTheme = useCallback((currentTheme: Theme) => {
    const resolved =
      currentTheme === "system" ? getSystemTheme() : currentTheme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    updateResolvedTheme(stored);
  }, [updateResolvedTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      const systemTheme = e.matches ? "dark" : "light";

      if (theme === "system") {
        setResolvedTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    updateResolvedTheme(theme);
  }, [theme, updateResolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
  }, []);

  return (
    <ThemeContext value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
