import { FC, useState, useEffect, useCallback } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export interface ThemeSwitchProps {
  className?: string;
}

/** The real page background per theme, as plain hex. These mirror what the page
 *  actually paints: dark is `--background` (oklch(17% .022 55) → #170d06); light
 *  is the cream the layout paints (#f5f0e8), NOT HeroUI's white `--background`.
 *  Kept in sync with the first-paint seed in index.html. */
const THEME_COLOR = { light: "#f5f0e8", dark: "#170d06" } as const;

/** Repaint Safari's status bar + bottom toolbar to match the active theme.
 *
 *  Two gotchas this works around:
 *  1. Hand Safari a hardcoded hex, never a computed value. The palette is oklch
 *     and `getComputedStyle` can return an `oklch()`/`color()` string that
 *     Safari's theme-color parser rejects outright — when that happens Safari
 *     keeps the previous bar colour, so the bars appear "stuck" on theme flip.
 *     A literal hex is always valid and always applied.
 *  2. Safari only repaints when the theme-color meta node is (re)inserted, not
 *     when an existing node's `content` mutates — so replace the node wholesale
 *     on every theme flip. */
function syncThemeColorMeta(theme: "light" | "dark") {
  document.querySelector('meta[name="theme-color"]')?.remove();
  const meta = document.createElement("meta");

  meta.name = "theme-color";
  meta.content = THEME_COLOR[theme];
  document.head.appendChild(meta);
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const url = new URL(window.location.href);
    const urlTheme = url.searchParams.get("theme");

    if (urlTheme === "light" || urlTheme === "dark") {
      localStorage.setItem("theme", urlTheme);
      // Consume the transfer param once so internal links stay clean.
      url.searchParams.delete("theme");
      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }

    // No saved choice → follow the OS. Once the user toggles, the saved
    // value wins and OS changes are ignored (see the guard in onChange).
    const resolve = () => {
      const saved = localStorage.getItem("theme") as "light" | "dark" | null;
      const next = saved ?? (mq.matches ? "dark" : "light");

      setTheme(next);
      root.classList.toggle("dark", next === "dark");
      syncThemeColorMeta(next);
    };

    resolve();
    setIsMounted(true);

    const onChange = () => {
      if (!localStorage.getItem("theme")) resolve();
    };

    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    syncThemeColorMeta(newTheme);
  }, [theme]);

  if (!isMounted) return <div className="w-6 h-6" />;

  return (
    <button
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      className={`px-px transition-opacity hover:opacity-80 cursor-pointer bg-transparent border-none ${className || ""}`}
      onClick={toggleTheme}
    >
      {theme === "light" ? (
        <MoonIcon className="w-[22px] h-[22px]" />
      ) : (
        <SunIcon className="w-[22px] h-[22px]" />
      )}
    </button>
  );
};
