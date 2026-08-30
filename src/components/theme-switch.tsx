import { FC, useState, useEffect, useCallback } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

import { applyTheme } from "@/lib/theme";

export interface ThemeSwitchProps {
  className?: string;
}

/** The palette primitives live in `@/lib/theme` — `/api` pins itself dark and
 *  has to paint Safari's chrome the same way, and a second copy of those hex
 *  values would drift. See that module for the Safari gotchas.
 *
 *  This component flips the theme through `applyTheme` and does none of the
 *  work itself. It used to toggle the `.dark` class inline and then call
 *  `syncThemeColorMeta` — i.e. two of applyTheme's three steps, open-coded.
 *  When a third step was added (painting the explicit hex on html/body, which
 *  is what iOS 26 actually samples for the bottom toolbar) the pinned routes
 *  got it and the site-wide switch silently did not. One entry point now. */

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
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
      applyTheme(next);
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
    applyTheme(newTheme);
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
