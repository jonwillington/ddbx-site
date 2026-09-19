import type { ResearchLink } from "@/lib/site-nav";
import type { DevicePlatform } from "@/lib/use-device-platform";

import clsx from "clsx";
import { useState, type ComponentType, type SVGProps } from "react";
import { useLocation } from "react-router-dom";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  CpuChipIcon,
  NewspaperIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

import { useNavModel, type NavItem } from "@/components/navbar";
import { useDownloadCopy } from "@/lib/download/copy";
import { MarketSwitcher } from "@/components/market-switcher";
import { ThemeSwitch } from "@/components/theme-switch";
import { StoreCta } from "@/components/store-cta";
import { chip } from "@/components/chip";
import { Delta } from "@/components/ui/delta";
import { siteConfig } from "@/config/site";
import { SearchLauncher } from "@/components/search/search-palette";
import { ConnectBadges } from "@/components/mcp/connect-badges";

/** EXPERIMENT — the masthead as a left rail on the frame, from xl (1280px) up. Behind
 *  `?nav=sidebar` (lib/nav-mode); production still ships the top bar.
 *
 *  App-shell shape: the rail sits bare on a darker frame and the page is one
 *  rounded sheet beside it (layouts/default). Same items as the top bar
 *  (useNavModel), so the comparison is about the shape. What it changes:
 *
 *  - The disclosures open in place rather than as dropdowns, and the one the
 *    reader is inside starts open. A rail has the height a bar does not.
 *  - The download CTA is standing rather than scroll-revealed: nothing sits
 *    above the fold for it to compete with. */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<string, Icon> = {
  Deals: ChartBarIcon,
  Learn: AcademicCapIcon,
  // Not the magnifier: that is the search field's glyph, directly above.
  Research: Squares2X2Icon,
  Stories: NewspaperIcon,
  Brokers: BuildingLibraryIcon,
  API: CodeBracketIcon,
  MCP: CpuChipIcon,
};

const rowClass = (active: boolean) =>
  clsx(
    "flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-body transition-colors",
    active
      ? "bg-page font-medium text-brand-brown shadow-xs dark:bg-white/6 dark:text-[#d8c4af]"
      : "text-foreground hover:bg-black/4 dark:hover:bg-white/5",
  );

function SubLink({ link, current }: { link: ResearchLink; current: boolean }) {
  return (
    <li
      className={clsx(link.divider && "mt-1 border-t border-separator/60 pt-1")}
    >
      <NavLink
        className={clsx(
          "flex w-full rounded-control px-2.5 transition-colors hover:bg-black/4 dark:hover:bg-white/5",
          link.row ? "flex-col gap-0.5 py-2" : "py-1.25 text-small",
          current
            ? "font-medium text-brand-brown dark:text-[#d8c4af]"
            : "text-foreground/75",
        )}
        href={link.href}
      >
        {link.row ? (
          <>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-caption font-semibold tabular-nums text-foreground/70">
                {link.row.ticker}
              </span>
              <Delta
                className="font-mono text-caption font-semibold"
                value={link.row.deltaPct}
              />
              <span className="ml-auto font-mono text-caption tabular-nums text-foreground/40">
                {link.row.date}
              </span>
            </span>
            <span className="line-clamp-2 text-small">{link.label}</span>
          </>
        ) : (
          link.label
        )}
      </NavLink>
    </li>
  );
}

function Group({
  item,
  active,
}: {
  item: Extract<NavItem, { kind: "menu" }>;
  active: boolean;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(active);
  const Glyph = ICONS[item.label];

  return (
    <li>
      <button
        aria-controls={`side-${item.id}`}
        aria-expanded={open}
        className={rowClass(active && !open)}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {Glyph && <Glyph className="h-4 w-4 shrink-0 opacity-70" />}
        <span
          className={clsx(
            active && "font-medium text-brand-brown dark:text-[#d8c4af]",
          )}
        >
          {item.label}
        </span>
        <ChevronDownIcon
          className={clsx(
            "ml-auto h-3.5 w-3.5 opacity-50 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {/* Hidden, not unmounted — the anchors stay in the DOM for the crawl
          graph, same reason the top bar's NavMenu keeps its panel mounted. */}
      <ul
        className={clsx(
          "ml-4 mt-px mb-1 border-l border-separator/60 pl-2",
          !open && "hidden",
        )}
        hidden={!open}
        id={`side-${item.id}`}
      >
        {item.links.map((link) => (
          <SubLink
            key={link.path}
            current={location.pathname === link.path}
            link={link}
          />
        ))}
      </ul>
    </li>
  );
}

/** Same-host hrefs route client-side; anything absolute (a cross-market
 *  link marketHref() made host-absolute) stays a real navigation. */
function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return href.startsWith("/") ? (
    <Link className={className} to={href}>
      {children}
    </Link>
  ) : (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

export function SideNav() {
  const location = useLocation();
  const t = useDownloadCopy();
  // /download/ios and /download/android name their store; everywhere else the
  // device decides, as in the top bar.
  const routePlatform = /\/download\/(ios|android)\/?$/.exec(
    location.pathname,
  )?.[1] as DevicePlatform | undefined;
  const { market, dashboardHref, handoff, isPinnedTheme, navItems } =
    useNavModel(routePlatform);

  return (
    <aside className="fixed bottom-3 left-3 top-3 z-40 hidden w-[216px] flex-col rounded-card border border-[var(--shell-panel-edge)] bg-[var(--shell-panel)] xl:flex">
      {/* One line: wordmark, market, theme, ruled off from the nav under it
          the way the right rail's header is, at the same 64px height so the
          two rules line up across the sheet. The picker stays outside the
          scroll area — its dropdown hangs below the trigger and an overflow
          container would clip it. */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-rule px-3.5">
        <NavLink className="shrink-0" href={dashboardHref}>
          <img
            alt={siteConfig.name}
            className="h-[22px] max-w-[48px] dark:invert"
            src="/logo.svg"
          />
        </NavLink>
        <MarketSwitcher />
        {!isPinnedTheme && <ThemeSwitch className="ml-auto" />}
      </div>

      {/* The market's beta/advisory notice (MarketConfig.topNotice). On the
          shell it lives here, at the top of the rail, rather than over the
          hero: it is a fact about the market, and it stays in view on every
          page of it. Below xl there is no rail and the hero carries it. */}
      {market.config.topNotice && (
        <div className="shrink-0 px-2 pt-2.5">
          <p className="flex items-start gap-2 rounded-control border border-amber-300/50 bg-amber-100/70 px-2.5 py-2 text-small text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
            <span
              className={`${chip("sm")} mt-px shrink-0 bg-amber-500/25 text-amber-900 dark:text-amber-200`}
            >
              BETA
            </span>
            <span>{market.config.topNotice}</span>
          </p>
        </div>
      )}

      {/* Search heads the nav rather than the header row: it is how a reader
          gets anywhere, so it sits at the top of the list of places. Outside
          the scroll area so it never scrolls away. */}
      <div className="shrink-0 px-2 pt-2.5">
        <SearchLauncher />
      </div>

      <nav
        aria-label="Primary"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1.5"
      >
        <ul className="space-y-px">
          {navItems.map((item) => {
            const active = item.match(location.pathname);

            // Stories lists article records in the top bar's dropdown. In a
            // rail that list sits open on every story page and repeats
            // /stories itself, so here it is a plain link.
            if (item.kind === "menu" && item.id !== "stories") {
              return <Group key={item.id} active={active} item={item} />;
            }
            const href = item.kind === "menu" ? "/stories" : item.href;
            const Glyph = ICONS[item.label];

            return (
              <li key={href}>
                <NavLink className={rowClass(active)} href={href}>
                  {Glyph && <Glyph className="h-4 w-4 shrink-0 opacity-70" />}
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-rule p-2.5">
        <ConnectBadges className="mb-3 px-1 pt-1" />
        <StoreCta
          block
          data-ga-event="cta_nav_download_app"
          data-ga-label={`Sidebar ${market.id}`}
          size="sm"
          {...handoff.anchorProps}
        >
          {t.locale === "en" ? "Download app" : t.startTrial}
        </StoreCta>
        {handoff.modal}
      </div>
    </aside>
  );
}
