import clsx from "clsx";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useLocation } from "react-router-dom";
import { Bars3Icon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Drawer } from "vaul";

import { Spinner } from "@/components/spinner";
import { api } from "@/lib/api";
import { StoreGlyph } from "@/components/store-glyph";
import {
  RESEARCH_PATHS,
  learnNavLinks,
  researchNavLinks,
  type ResearchLink,
} from "@/lib/site-nav";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { MarketSwitcher } from "@/components/market-switcher";
import { appHrefForMarket } from "@/lib/app-store";
import {
  useAppHandoff,
  type AppHandoffAnchorProps,
} from "@/components/app-handoff-modal";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  marketDashboardPath,
  marketForPath,
  marketHref,
} from "@/lib/markets/registry";

/** A masthead entry. Most are a plain anchor; Research and Learn are
 *  disclosures, which carry no href of their own — their `match` is what
 *  decides whether the trigger reads as active. */
export type NavItem =
  | {
      kind: "link";
      label: string;
      href: string;
      match: (p: string) => boolean;
    }
  | {
      kind: "menu";
      id: "research" | "learn" | "stories";
      label: string;
      links: ResearchLink[];
      match: (p: string) => boolean;
    };

/** The masthead item's two states, shared by the plain links and by the
 *  disclosure triggers so a <button> in the row can't drift away from the
 *  <a>s beside it. */
export const navItemClass = (active: boolean) =>
  clsx("text-sm transition-colors", {
    "text-[#5a4128] dark:text-[#d8c4af] font-medium": active,
    "text-foreground hover:text-[#5a4128]": !active,
  });

/** A masthead dropdown. Built for Research — the site's content axis, folded
 *  into one masthead item — and reused for Learn.
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
function NavMenu({
  id,
  label,
  links,
  active,
  wide = false,
}: {
  id: string;
  label: string;
  links: ResearchLink[];
  active: boolean;
  /** Rows that are headlines rather than labels need a panel that can hold a
   *  sentence and let it wrap. Everything else stays at the 224px the
   *  Research and Learn menus were drawn for. */
  wide?: boolean;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        aria-controls={`nav-${id}`}
        aria-expanded={open}
        className={clsx(navItemClass(active), "flex items-center gap-1")}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
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
          "absolute left-0 mt-2 rounded-xl border border-separator bg-[#f5f0e8] dark:bg-background shadow-lg overflow-hidden z-50 py-1",
          wide ? "w-[23rem]" : "w-56",
          !open && "hidden",
        )}
        hidden={!open}
        id={`nav-${id}`}
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
                    "flex w-full px-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
                    link.row
                      ? "flex-col items-start gap-1 py-2.5"
                      : wide
                        ? "items-start py-2 text-[13.5px] leading-[1.45]"
                        : "items-center py-1.5 text-sm",
                    current
                      ? "text-[#5a4128] dark:text-[#d8c4af] font-medium"
                      : "text-foreground",
                  )}
                  href={link.href}
                >
                  {link.row ? (
                    <>
                      {/* The record line: what it is about, whether it went
                          anywhere, and when we published it. */}
                      <span className="flex w-full items-baseline gap-2">
                        <span className="rounded bg-hairline px-1.5 font-mono text-[11px] font-semibold tabular-nums text-foreground/70 dark:bg-surface-secondary">
                          {link.row.ticker}
                        </span>
                        {link.row.deltaPct != null ? (
                          <span
                            className={clsx(
                              "font-mono text-[12px] font-semibold tabular-nums",
                              link.row.deltaPct >= 0
                                ? "text-[#1e6b18] dark:text-[#5cd84a]"
                                : "text-[#8b2020] dark:text-[#e84d4d]",
                            )}
                          >
                            {link.row.deltaPct >= 0 ? "+" : ""}
                            {link.row.deltaPct.toFixed(2)}%
                          </span>
                        ) : null}
                        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-foreground/40">
                          {link.row.date}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-[1.4] text-foreground/75">
                        {link.label}
                      </span>
                    </>
                  ) : (
                    link.label
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** The masthead below md — a hamburger opening a bottom sheet.
 *
 *  Under 768px the <ul> of links is display:none and the bar carries only the
 *  logo, the market pill and the theme switch, so Research, Brokers, Method
 *  and API had no way in from a phone at all. This is the same vaul sheet the
 *  market picker uses on touch (components/market-switcher MobileSheet), same
 *  handle, same ground, same row metrics, so the two menus a phone reader can
 *  open from the bar read as one material.
 *
 *  Two shapes differ from the desktop row:
 *
 *  - Research and Learn are flattened. A disclosure nested inside a sheet is
 *    two taps for one destination, so each menu's links sit under an eyebrow
 *    at the foot of the list, after the plain rows — a heading mid-list would
 *    claim the rows beneath it as its own.
 *  - The download CTA rides along. Desktop reveals it on scroll; here it is a
 *    standing row at the sheet's foot, because a menu is where a reader who
 *    has come looking for something expects to find the app.
 *
 *  Every row is a plain <a> doing a full navigation, like the desktop links,
 *  so the sheet unmounts with the page and needs no close-on-navigate. */
function MobileMenu({
  items,
  downloadAnchorProps,
  marketId,
}: {
  items: NavItem[];
  downloadAnchorProps: AppHandoffAnchorProps;
  marketId: string;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // The row a reader tapped, while the browser fetches the next page. The
  // current page stays painted (sheet and all) until the new one arrives, and
  // on a phone that gap is long enough to read as a missed tap, so the row
  // carries a spinner and the rest stop taking taps — the market picker's
  // pattern.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const menus = items.filter(
    (i): i is Extract<NavItem, { kind: "menu" }> => i.kind === "menu",
  );

  // Back/forward can restore this page from the bfcache with the spinner still
  // running, since no navigation ever unmounted it. Clear it when that happens.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPendingHref(null);
    };

    window.addEventListener("pageshow", onShow);

    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const rowClass = (active: boolean, href: string) =>
    clsx(
      "flex w-full items-center rounded-lg px-2 py-3 text-base transition-[color,background-color,opacity] hover:bg-black/5 dark:hover:bg-white/5",
      active
        ? "text-[#5a4128] dark:text-[#d8c4af] font-medium"
        : "text-foreground",
      pendingHref != null && "pointer-events-none",
      pendingHref != null && pendingHref !== href && "opacity-40",
    );

  /** Props for one navigating row: the spinner state on a plain left-click,
   *  and nothing on a modified click, which opens a tab and leaves this page
   *  where it is. */
  const rowProps = (active: boolean, href: string) => ({
    "aria-disabled": pendingHref != null || undefined,
    className: rowClass(active, href),
    href,
    onClick: (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (pendingHref != null) {
        e.preventDefault();

        return;
      }
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      setPendingHref(href);
    },
  });

  const rowEnd = (href: string) =>
    pendingHref === href && (
      <Spinner className="ml-auto h-4 w-4 shrink-0 text-foreground/60" />
    );

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          aria-label="Open menu"
          className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          type="button"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-hairline bg-[#f5f0e8] outline-none dark:border-separator dark:bg-background">
          <div className="mx-auto mb-1 mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20" />

          {/* The list scrolls; the CTA below it does not. Twelve rows outrun a
              short phone under the 85vh cap, and a download button that has
              to be scrolled to is a download button most readers never see. */}
          <div className="min-h-0 overflow-y-auto px-4 pt-2">
            <Drawer.Title className="px-2 pb-2 text-base font-semibold">
              Menu
            </Drawer.Title>

            <ul>
              {items.map((item) => {
                if (item.kind === "menu") return null;

                return (
                  <li key={item.href}>
                    <a {...rowProps(item.match(location.pathname), item.href)}>
                      {item.label}
                      {rowEnd(item.href)}
                    </a>
                  </li>
                );
              })}
            </ul>

            {menus.map((menu) => (
              <div key={menu.id}>
                <div className="my-1.5 border-t border-separator/60" />
                <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
                  {menu.label}
                </div>
                <ul>
                  {menu.links.map((link) => (
                    // Same rule the desktop dropdown draws above its last row.
                    <li
                      key={link.path}
                      className={clsx(
                        link.divider &&
                          "mt-1.5 border-t border-separator/60 pt-1.5",
                      )}
                    >
                      <a
                        {...rowProps(
                          location.pathname === link.path,
                          link.href,
                        )}
                      >
                        {link.label}
                        {rowEnd(link.href)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-separator/60 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <a
              className={`flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-4 py-3 text-base font-medium transition-colors`}
              data-ga-event="cta_nav_download_app"
              data-ga-label={`Nav menu ${marketId}`}
              data-ga-store-intercepted={
                downloadAnchorProps["data-ga-store-intercepted"]
              }
              href={downloadAnchorProps.href}
              rel="noopener noreferrer"
              target="_blank"
              // A desktop-width window narrowed under md gets the handoff
              // modal; the sheet has to leave before it arrives.
              onClick={(e) => {
                setOpen(false);
                downloadAnchorProps.onClick?.(e);
              }}
            >
              <StoreGlyph className="h-4 w-4 shrink-0" />
              Download app
            </a>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Everything both masthead shapes need: the item list, where the logo goes,
 *  and the download handoff. Shared so the top bar and the experimental
 *  sidebar (components/side-nav, behind lib/nav-mode) can't drift apart on
 *  which items a market gets. */
export function useNavModel() {
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

  // Routes that pin their own theme — the switch is hidden on these.
  const isPinnedTheme =
    location.pathname === "/developers" ||
    location.pathname === "/api" ||
    location.pathname === "/mcp";

  // Broker comparison is UK-only content — don't surface it while browsing
  // other markets (the dashboard promos are likewise config.id === "uk").
  //
  // The companies index is NOT UK-only: `/companies` picks its market from the
  // hostname (see CompaniesPage), so it serves UK names on ddbx.uk and US ones
  // on ddbx.us. Congress and Trump Media ride the US domain, so they get it
  // too. SE/NL have no companies index yet.
  const showBrokers = market.id === "uk";
  // Stories publish for UK and US only. The Congress and DJT markets ride the
  // US host but have no story of their own yet, and surfacing an empty archive
  // as a top-level tab would be worse than not offering it.
  const showStories = ["uk", "us"].includes(market.id);

  // The Stories menu lists the five most recent articles rather than a set of
  // section links, so its rows have to be fetched. One cached request per page
  // (the feed is edge-cached for five minutes and a few hundred bytes), and the
  // item degrades to a plain link when the list is empty or the request fails,
  // which is also what a brand-new market sees.
  const [storyLinks, setStoryLinks] = useState<ResearchLink[]>([]);

  useEffect(() => {
    if (!showStories) return;
    let live = true;

    api
      .stories(market.id === "us" ? "US" : "UK")
      .then((r) => {
        if (!live) return;
        const recent = r.stories.slice(0, 5).map((st) => ({
          href: `/stories/${st.id}`,
          label: st.headline,
          path: `/stories/${st.id}`,
          row: {
            date: st.published_at
              ? new Date(st.published_at.replace(" ", "T")).toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short" },
                )
              : "",
            deltaPct: st.return_pct,
            ticker: (st.subject_ticker ?? "").replace(/\.L$/, ""),
          },
        }));

        // "View all" only earns its row once the menu is actually a sample of
        // something larger. At four articles the menu IS the archive.
        setStoryLinks(
          r.stories.length > 5
            ? [
                ...recent,
                {
                  divider: true,
                  href: "/stories",
                  label: "View all stories",
                  path: "/stories",
                },
              ]
            : recent,
        );
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [showStories, market.id]);
  const showCompanies = ["uk", "us", "usg", "djt"].includes(market.id);

  const navItems: NavItem[] = [
    {
      kind: "link",
      label: "Deals",
      href: dashboardHref,
      match: (p: string) => p === dashboardHref || p === "/",
    },
    // Learn sits second, ahead of Research: it is the item a reader who has
    // never followed director buying needs first, and the four after it
    // (Research, Brokers, API, MCP) all assume they already do. It took the
    // place of a plain "Method" link, which is now its "How it works" row —
    // see learnNavLinks for why the two were folded rather than added.
    //
    // Gated to the two markets that publish /how-it-works and own glossary
    // entries: SE/NL run no analysis layer for it to describe — on ddbx.eu the
    // route 301s to ddbx.uk (see isForeignResearchPath in shared/seo.js), so
    // linking it there would put a cross-domain redirect in the primary nav.
    // Congress and Trump Media ride the US domain but score on their own
    // model, so they're out too.
    ...(market.id === "uk" || market.id === "us"
      ? [
          {
            kind: "menu" as const,
            id: "learn" as const,
            label: "Learn",
            links: learnNavLinks(location.pathname),
            match: (p: string) =>
              p === "/how-it-works" ||
              p === "/learn" ||
              p.startsWith("/learn/"),
          },
        ]
      : []),
    // "Companies" used to sit here as its own item; it is now the first row of
    // the Research menu. The masthead holds its item count rather than growing
    // it at exactly the 768px breakpoint where the list first appears, and
    // the whole content axis gains an entry point instead of one page having
    // one. Same market gate as before — the dropdown appears wherever the
    // companies index did.
    ...(showCompanies
      ? [
          {
            kind: "menu" as const,
            id: "research" as const,
            label: "Research",
            links: researchNavLinks(location.pathname),
            match: (p: string) =>
              RESEARCH_PATHS.some((x) => p === x || p.startsWith(`${x}/`)) ||
              p.startsWith("/company/"),
          },
        ]
      : []),
    // Its own tab rather than a row inside Research. Research is a set of
    // indexes over the feed; a story is a piece of writing about one case, and
    // filing it under a menu of rankings buried the only thing on the site a
    // reader might come back for. That does take the masthead past the count
    // the Learn menu was folded to preserve, so it appears one item later than
    // it reads: after Research, before Brokers.
    ...(showStories
      ? [
          storyLinks.length > 0
            ? {
                kind: "menu" as const,
                id: "stories" as const,
                label: "Stories",
                links: storyLinks,
                match: (p: string) =>
                  p === "/stories" || p.startsWith("/stories/"),
              }
            : {
                kind: "link" as const,
                label: "Stories",
                href: "/stories",
                match: (p: string) =>
                  p === "/stories" || p.startsWith("/stories/"),
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
    // The MCP connector is the API's cross-market sibling (same data, asked
    // through ChatGPT / Claude), so it sits beside it with no market gate.
    {
      kind: "link",
      label: "MCP",
      href: "/mcp",
      match: (p: string) => p === "/mcp",
    },
  ];

  // A market left with just "Deals" gets no nav at all — the logo already goes
  // there, so a lone link is pure chrome. (Preserves the previous behaviour for
  // SE/NL, which used to render an empty list.)
  const showNav = navItems.length > 1;

  return { market, dashboardHref, handoff, isPinnedTheme, navItems, showNav };
}

export const Navbar = () => {
  const location = useLocation();
  const { market, dashboardHref, handoff, isPinnedTheme, navItems, showNav } =
    useNavModel();
  // The same breakpoint that shows the link row (`md:flex` below). Under it the
  // row is display:none and the hamburger is the only way to the sections.
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Scroll-revealed download CTA: fades in once the user scrolls past the hero,
  // fades back out at the top.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            // Baseline, not stretch: the links are inline text sitting in the
            // row's line box while the Research trigger is a flex box pinned
            // to the top of its <li>, and the two put their glyphs a couple of
            // pixels apart. Baselines line up whatever the boxes around them do.
            <ul className="hidden items-baseline gap-4 md:flex">
              {navItems.map((item) => {
                const active = item.match(location.pathname);

                return (
                  <li key={item.kind === "menu" ? item.id : item.href}>
                    {item.kind === "menu" ? (
                      <NavMenu
                        active={active}
                        id={item.id}
                        label={item.label}
                        links={item.links}
                        wide={item.id === "stories"}
                      />
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
          {showNav && !isDesktop && (
            <MobileMenu
              downloadAnchorProps={handoff.anchorProps}
              items={navItems}
              marketId={market.id}
            />
          )}
        </div>
      </header>
    </nav>
  );
};
