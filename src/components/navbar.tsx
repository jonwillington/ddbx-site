import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { StoreGlyph } from "@/components/store-glyph";
import { RESEARCH_PATHS, researchNavLinks } from "@/lib/site-nav";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { MarketSwitcher } from "@/components/market-switcher";
import { appHrefForMarket } from "@/lib/app-store";
import { useAppHandoff } from "@/components/app-handoff-modal";
import { useDevicePlatform } from "@/lib/use-device-platform";
import {
  marketDashboardPath,
  marketForPath,
  marketHref,
} from "@/lib/markets/registry";

/** A masthead entry. Four of the five are a plain anchor; one is the Research
 *  disclosure, which carries no href of its own — its `match` is what decides
 *  whether the trigger reads as active. */
type NavItem =
  | {
      kind: "link";
      label: string;
      href: string;
      match: (p: string) => boolean;
    }
  | { kind: "research"; match: (p: string) => boolean };

/** The masthead item's two states, shared by the plain links and by the
 *  Research disclosure trigger so a <button> in the row can't drift away from
 *  the <a>s beside it. */
const navItemClass = (active: boolean) =>
  clsx("text-sm transition-colors", {
    "text-[#5a4128] dark:text-[#d8c4af] font-medium": active,
    "text-foreground hover:text-[#5a4128]": !active,
  });

/** Research dropdown — the site's content axis, folded into one masthead item.
 *
 *  Modelled on the market picker's DesktopDropdown (components/market-switcher)
 *  and sharing its panel recipe so the two menus read as one material, with
 *  three deliberate differences:
 *
 *  - The trigger is a nav item, not the picker's bordered TRIGGER_CLASS pill.
 *    Reusing that pill would make two unrelated controls read as a pair.
 *  - Click to toggle, never hover: this list only exists from md (768px) up,
 *    a band where touch is entirely likely and a hover menu is unusable.
 *  - It is a disclosure, not a listbox — a <button aria-expanded> over a plain
 *    <ul> of anchors. The picker's aria-haspopup="listbox" / role="listbox" is
 *    a bug we are not copying: anchors are not `option`s, and a listbox whose
 *    children are links strands a screen reader in a widget it can't operate.
 *
 *  The panel stays mounted and is hidden rather than unmounted. Folding
 *  /companies in here costs it its site-wide top-level link; keeping the seven
 *  anchors in the DOM on every page is what replaces it, and the hub-and-spoke
 *  the pre-render Functions exist to build depends on them being there. */
function ResearchMenu({ active }: { active: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const links = researchNavLinks(location.pathname);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Escape from inside the panel would otherwise drop focus on a node that
      // just went display:none, sending the next Tab back to the top of the
      // document. (The market picker doesn't do this; it should.)
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      // Tabbing off the last link closes the panel behind you — mousedown and
      // Escape between them never see a keyboard user leave.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        aria-controls="nav-research"
        aria-expanded={open}
        className={clsx(navItemClass(active), "flex items-center gap-1")}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        Research
        <ChevronDownIcon
          className={clsx("w-3 h-3 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Both the attribute and the utility class: the attribute is what
          assistive tech and the `hidden` semantics read, the class is what
          actually paints, since a UA-stylesheet [hidden] rule loses to any
          author `display` this panel might grow later. */}
      <div
        className={clsx(
          "absolute left-0 mt-2 w-56 rounded-xl border border-separator bg-[#f5f0e8] dark:bg-background shadow-lg overflow-hidden z-50 py-1",
          !open && "hidden",
        )}
        hidden={!open}
        id="nav-research"
      >
        <ul>
          {links.map((link) => {
            const current = location.pathname === link.path;

            return (
              // The divider rides on the row rather than being its own node:
              // a bare <div> between <li>s is invalid inside a <ul>, and the
              // rule means "everything below here is the archive" anyway.
              <li
                key={link.path}
                className={clsx(
                  link.divider && "mt-1 border-t border-separator/60 pt-1",
                )}
              >
                <a
                  className={clsx(
                    "flex items-center w-full px-2.5 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
                    current
                      ? "text-[#5a4128] dark:text-[#d8c4af] font-medium"
                      : "text-foreground",
                  )}
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export const Navbar = () => {
  const location = useLocation();
  const market = marketForPath(location.pathname);
  const platform = useDevicePlatform();
  // Dashboard stays in-app; secondary nav action now points to the market's
  // store listing for the visitor's device (App Store on iOS/desktop, Play on
  // Android), with the UK app as the fallback where a market-specific listing
  // isn't live.
  const dashboardHref = marketHref(market, marketDashboardPath(market));
  const downloadHref = appHrefForMarket(market.id, platform);
  // Desktop clicks get the handoff modal (pitch + QR + store choice) instead
  // of landing cold on a store page they can't install from; mobile taps keep
  // the direct store link.
  const handoff = useAppHandoff(market.id, downloadHref, `Nav ${market.id}`);

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

  const navItems: NavItem[] = [
    {
      kind: "link",
      label: "Deals",
      href: dashboardHref,
      match: (p: string) => p === dashboardHref || p === "/",
    },
    // "Companies" used to sit here as its own item; it is now the first row of
    // the Research menu. The masthead stays at five items rather than growing
    // to six at exactly the 768px breakpoint where the list first appears, and
    // the whole content axis gains an entry point instead of one page having
    // one. Same market gate as before — the dropdown appears wherever the
    // companies index did.
    ...(showCompanies
      ? [
          {
            kind: "research" as const,
            match: (p: string) =>
              RESEARCH_PATHS.some((x) => p === x || p.startsWith(`${x}/`)) ||
              p.startsWith("/company/"),
          },
        ]
      : []),
    ...(showBrokers
      ? [
          {
            kind: "link" as const,
            label: "Brokers",
            href: "/brokers",
            match: (p: string) =>
              p.startsWith("/brokers") || p.startsWith("/compare"),
          },
        ]
      : []),
    // Gated to the two markets that publish it: /how-it-works describes six
    // checks, four ratings and a written analysis, and SE/NL run no analysis
    // layer for it to describe — on ddbx.eu the route 301s to ddbx.uk (see
    // isForeignResearchPath in shared/seo.js), so linking it there would put a
    // cross-domain redirect in the primary nav. Congress and Trump Media ride
    // the US domain but score on their own model, so they're out too.
    ...(market.id === "uk" || market.id === "us"
      ? [
          {
            kind: "link" as const,
            label: "Method",
            href: "/how-it-works",
            match: (p: string) => p === "/how-it-works",
          },
        ]
      : []),
    // The developer API is one cross-market product, so this is the only nav
    // item with no market gate. Note it also gives SE/NL a nav bar for the
    // first time: `showNav` needs more than one item, and those markets
    // previously had only "Deals".
    {
      kind: "link",
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
    /* Floating glass bar — a detached rounded capsule over the page rather
       than a full-width band ruled off from it (the layout gives it inset on
       every side; content scrolls beneath through the gutters). Translucent
       fill + heavy blur with a saturation boost so what passes underneath
       reads as material, not mud; hairline border and a soft warm shadow do
       the separating the old border-b did. */
    <nav className="mx-auto max-w-[1280px] rounded-2xl border border-black/[0.07] bg-[#f5f0e8]/60 shadow-[0_12px_32px_-20px_rgba(90,65,40,0.45)] backdrop-blur-2xl backdrop-saturate-[2.5] dark:border-white/[0.09] dark:bg-background/60 dark:shadow-[0_12px_32px_-20px_rgba(0,0,0,0.7)]">
      <header className="flex h-14 items-center justify-between gap-3 px-4 md:gap-4 md:px-5">
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
                const active = item.match(location.pathname);

                return (
                  <li key={item.kind === "research" ? "research" : item.href}>
                    {item.kind === "research" ? (
                      <ResearchMenu active={active} />
                    ) : (
                      <a className={navItemClass(active)} href={item.href}>
                        {item.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <a
            className={clsx(
              `hidden items-center gap-1.5 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-4 py-1.5 text-sm font-medium transition-[transform,opacity,background-color] duration-300 md:inline-flex`,
              scrolled
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0",
            )}
            data-ga-event="cta_nav_download_app"
            data-ga-label={`Nav ${market.id}`}
            rel="noopener noreferrer"
            target="_blank"
            {...handoff.anchorProps}
          >
            <StoreGlyph className="h-3.5 w-3.5 shrink-0" />
            Download app
          </a>
          {handoff.modal}
          {/* /api pins itself dark (see lib/use-pinned-theme.ts), so the
              toggle would be a control that visibly does nothing. */}
          {!isPinnedTheme && <ThemeSwitch />}
        </div>
      </header>
    </nav>
  );
};
