import clsx from "clsx";
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

  const navItems = [
    {
      label: "Dashboard",
      href: dashboardHref,
      match: (p: string) =>
        p === dashboardHref || (market.id === "uk" && p === "/"),
    },
    {
      label: "Download app",
      href: downloadHref,
      external: true,
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
                      "text-[#5a4128] dark:text-[#d8c4af] font-medium":
                        active && !item.external,
                      "text-foreground hover:text-[#5a4128]":
                        !active || item.external,
                    })}
                    data-ga-event={
                      item.external ? "cta_nav_download_app" : undefined
                    }
                    data-ga-label={item.external ? `Nav ${market.id}` : undefined}
                    href={item.href}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    target={item.external ? "_blank" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <ThemeSwitch />
        </div>
      </header>
    </nav>
  );
};
