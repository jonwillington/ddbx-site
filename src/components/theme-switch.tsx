import { FC, useState, useEffect, useCallback } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export interface ThemeSwitchProps {
  className?: string;
}

/** Page background per theme — mirrors `--background` in globals.css. Light is
 *  the warm beige; dark is the near-black warm brown (≈ oklch(13.5% .022 55)).
 *  Kept as hex so Safari's older theme-color parser accepts it. */
const THEME_BG = { light: "#f5f0e8", dark: "#15110d" } as const;

/** Repaint Safari's address bar / bottom toolbar to match the active theme.
 *  Safari reads `<meta name="theme-color">` on load but not on class changes,
 *  so we rewrite it ourselves whenever the theme flips. */
function syncThemeColorMeta(theme: "light" | "dark") {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );

  if (meta) meta.content = THEME_BG[theme];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

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
