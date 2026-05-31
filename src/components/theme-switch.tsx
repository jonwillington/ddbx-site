import { FC, useState, useEffect, useCallback } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export interface ThemeSwitchProps {
  className?: string;
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
