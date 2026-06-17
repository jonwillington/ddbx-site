import { FC, useState, useEffect, useCallback } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export interface ThemeSwitchProps {
  className?: string;
}

/** rgb(…)/rgba(…) → #rrggbb. Safari's theme-color parser is happiest with hex. */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+(\.\d+)?/g);

  if (!m || m.length < 3) return rgb;
  const hex = m
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("");

  return `#${hex}`;
}

/** Repaint Safari's status bar + bottom toolbar to match the active theme.
 *
 *  Two gotchas this works around:
 *  1. The palette is oklch, which Safari's theme-color parser rejects — so we
 *     read the *resolved* `--background` off the DOM (browser does the maths)
 *     and hand Safari a plain hex. This also guarantees the bar can never
 *     drift from the real page background.
 *  2. Safari only repaints when the theme-color meta node is (re)inserted, not
 *     when an existing node's `content` mutates — so replace the node wholesale
 *     on every theme flip. Run *after* the `.dark` class is toggled. */
function syncThemeColorMeta() {
  const probe = document.createElement("div");

  probe.style.cssText =
    "background-color:var(--background);position:fixed;width:0;height:0;opacity:0;pointer-events:none;";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).backgroundColor;

  probe.remove();

  document.querySelector('meta[name="theme-color"]')?.remove();
  const meta = document.createElement("meta");

  meta.name = "theme-color";
  meta.content = rgbToHex(resolved);
  document.head.appendChild(meta);
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
      syncThemeColorMeta();
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
    syncThemeColorMeta();
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
