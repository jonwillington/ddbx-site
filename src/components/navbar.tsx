import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { MarketSwitcher } from "@/components/market-switcher";
import { APP_STORE_URLS, storeUrlForMarketId } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";
import {
  marketDashboardPath,
  marketForPath,
  marketHref,
} from "@/lib/markets/registry";

export const Navbar = () => {
  const location = useLocation();
  const market = marketForPath(location.pathname);
  const platform = useDevicePlatform();
  // Dashboard stays in-app; secondary nav action now points to the market's
  // store listing for the visitor's device (App Store on iOS/desktop, Play on
  // Android), with the UK app as the fallback where a market-specific listing
  // isn't live.
  const dashboardHref = marketHref(market, marketDashboardPath(market));
  const downloadHref =
    storeUrlForMarketId(market.id, platform) ?? APP_STORE_URLS.uk;

  // Scroll-revealed download CTA: fades in once the user scrolls past the hero,
  // fades back out at the top.
  const [scrolled, setScrolled] = useState(false);

  // Routes that pin their own theme — the switch is hidden on these.
  const isPinnedTheme =
    location.pathname === "/developers" || location.pathname === "/api";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Broker comparison is UK-only content — don't surface it while browsing
  // other markets (the dashboard promos are likewise config.id === "uk").
  //
  // The companies index is NOT UK-only: `/companies` picks its market from the
  // hostname (see CompaniesPage), so it serves UK names on ddbx.uk and US ones
  // on ddbx.us. Congress and Trump Media ride the US domain, so they get it
  // too. SE/NL have no companies index yet.
  const showBrokers = market.id === "uk";
  const showCompanies = ["uk", "us", "usg", "djt"].includes(market.id);

  const navItems = [
    {
      label: "Deals",
      href: dashboardHref,
      match: (p: string) => p === dashboardHref || p === "/",
    },
    ...(showCompanies
      ? [
          {
            label: "Companies",
            href: "/companies",
            match: (p: string) =>
              p === "/companies" || p.startsWith("/company/"),
          },
        ]
      : []),
    ...(showBrokers
      ? [
          {
            label: "Brokers",
            href: "/brokers",
            match: (p: string) =>
              p.startsWith("/brokers") || p.startsWith("/compare"),
          },
        ]
      : []),
    // The developer API is one cross-market product, so this is the only nav
    // item with no market gate. Note it also gives SE/NL a nav bar for the
    // first time: `showNav` needs more than one item, and those markets
    // previously had only "Deals".
    {
      label: "API",
      href: "/developers",
      match: (p: string) => p === "/developers" || p === "/api",
    },
  ];

  // A market left with just "Deals" gets no nav at all — the logo already goes
  // there, so a lone link is pure chrome. (Preserves the previous behaviour for
  // SE/NL, which used to render an empty list.)
  const showNav = navItems.length > 1;

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
          {showNav && (
            <ul className="hidden gap-4 md:flex">
              {navItems.map((item) => {
                const active = item.match?.(location.pathname) ?? false;

                return (
                  <li key={item.href}>
                    <a
                      className={clsx("text-sm transition-colors", {
                        "text-[#5a4128] dark:text-[#d8c4af] font-medium":
                          active,
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
          )}
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <a
            className={clsx(
              `hidden items-center gap-1.5 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-4 py-1.5 text-sm font-medium transition-all duration-300 md:inline-flex`,
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
            <StoreGlyph className="h-3.5 w-3.5 shrink-0" />
            Download app
          </a>
          {/* /api pins itself dark (see lib/use-pinned-theme.ts), so the
              toggle would be a control that visibly does nothing. */}
          {!isPinnedTheme && <ThemeSwitch />}
        </div>
      </header>
    </nav>
  );
};
