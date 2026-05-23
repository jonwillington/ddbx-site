import clsx from "clsx";
import { useLocation } from "react-router-dom";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { MarketSwitcher } from "@/components/market-switcher";
import {
  marketDashboardPath,
  marketForPath,
  marketHref,
  marketPerformancePath,
} from "@/lib/markets/registry";

export const Navbar = () => {
  const location = useLocation();
  const market = marketForPath(location.pathname);
  // Dashboard and Performance both route within the active market. The
  // dashboard sits at the market's root (/, /us, /se); performance lives
  // under it (/portfolio for UK historical reasons, /:market/performance
  // otherwise).
  const dashboardHref = marketHref(market, marketDashboardPath(market));
  const performanceHref = marketHref(market, marketPerformancePath(market));

  const navItems = [
    {
      label: "Dashboard",
      href: dashboardHref,
      match: (p: string) =>
        p === dashboardHref || (market.id === "uk" && p === "/"),
    },
    {
      label: "Performance",
      href: performanceHref,
      match: (p: string) =>
        p === performanceHref || (market.id === "uk" && p === "/portfolio"),
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
              const active = item.match(location.pathname);

              return (
                <li key={item.href}>
                  <a
                    className={clsx(
                      "text-sm transition-colors",
                      active
                        ? "text-[#6b5038] font-medium"
                        : "text-foreground hover:text-[#6b5038]",
                    )}
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
          <ThemeSwitch />
        </div>
      </header>
    </nav>
  );
};
