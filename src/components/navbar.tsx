import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { MarketSwitcher } from "@/components/market-switcher";
import { APP_STORE_URLS, appStoreUrlForMarketId } from "@/lib/app-store";
import {
  marketDashboardPath,
  marketForPath,
  marketHref,
} from "@/lib/markets/registry";

export const Navbar = () => {
  const location = useLocation();
  const market = marketForPath(location.pathname);
  // Dashboard stays in-app; secondary nav action now points to the market's
  // app listing (with UK fallback where a market-specific listing isn't live).
  const dashboardHref = marketHref(market, marketDashboardPath(market));
  const downloadHref = appStoreUrlForMarketId(market.id) ?? APP_STORE_URLS.uk;

  // Scroll-revealed download CTA: fades in once the user scrolls past the hero,
  // fades back out at the top.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    {
      label: "Deals",
      href: dashboardHref,
      match: (p: string) =>
        p === dashboardHref || (market.id === "uk" && p === "/"),
    },
    {
      label: "Brokers",
      href: "/brokers",
      match: (p: string) => p.startsWith("/brokers") || p.startsWith("/compare"),
    },
  ];

  return (
    <nav className="w-full border-b border-separator bg-[#f5f0e8]/90 dark:bg-background/70 backdrop-blur-lg">
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 md:gap-4 md:px-6">
        <div className="flex items-center gap-6">
          <a className="shrink-0" href={dashboardHref}>
            <img
              alt={siteConfig.name}
              className="h-7 max-w-[56px] dark:invert"
              src="/logo.svg"
            />
          </a>
          <MarketSwitcher />
          <ul className="hidden gap-4 md:flex">
            {navItems.map((item) => {
              const active = item.match?.(location.pathname) ?? false;

              return (
                <li key={item.href}>
                  <a
                    className={clsx("text-sm transition-colors", {
                      "text-[#5a4128] dark:text-[#d8c4af] font-medium": active,
                      "text-foreground hover:text-[#5a4128]": !active,
                    })}
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <a
            className={clsx(
              "hidden items-center gap-1.5 rounded-full bg-[#5a4128] px-4 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#4a351f] dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90 md:inline-flex",
              scrolled
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0",
            )}
            data-ga-event="cta_nav_download_app"
            data-ga-label={`Nav ${market.id}`}
            href={downloadHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Download app
          </a>
          <ThemeSwitch />
        </div>
      </header>
    </nav>
  );
};
