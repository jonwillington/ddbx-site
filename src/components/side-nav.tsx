import type { ResearchLink } from "@/lib/site-nav";

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
  MagnifyingGlassIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";

import { useNavModel, type NavItem } from "@/components/navbar";
import { MarketSwitcher } from "@/components/market-switcher";
import { ThemeSwitch } from "@/components/theme-switch";
import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { siteConfig } from "@/config/site";

/** EXPERIMENT — the masthead as a left rail, from xl (1280px) up. Behind
 *  `?nav=sidebar` (lib/nav-mode); production still ships the top bar.
 *
 *  Same items as the top bar (useNavModel), same active colour, same glass
 *  recipe, so the comparison is about the shape and nothing else. What the
 *  shape changes:
 *
 *  - The disclosures open in place rather than as dropdowns, and the one the
 *    reader is inside starts open. A rail has the height a bar does not.
 *  - The download CTA is standing rather than scroll-revealed: nothing sits
 *    above the fold for it to compete with. */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<string, Icon> = {
  Deals: ChartBarIcon,
  Learn: AcademicCapIcon,
  Research: MagnifyingGlassIcon,
  Stories: NewspaperIcon,
  Brokers: BuildingLibraryIcon,
  API: CodeBracketIcon,
  MCP: CpuChipIcon,
};

const rowClass = (active: boolean) =>
  clsx(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
    active
      ? "bg-black/[0.05] font-medium text-[#5a4128] dark:bg-white/[0.07] dark:text-[#d8c4af]"
      : "text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
  );

function SubLink({ link, current }: { link: ResearchLink; current: boolean }) {
  return (
    <li
      className={clsx(link.divider && "mt-1 border-t border-separator/60 pt-1")}
    >
      <a
        className={clsx(
          "flex w-full rounded-md px-2.5 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
          link.row ? "flex-col gap-0.5 py-2" : "py-1.5 text-[13px]",
          current
            ? "font-medium text-[#5a4128] dark:text-[#d8c4af]"
            : "text-foreground/75",
        )}
        href={link.href}
      >
        {link.row ? (
          <>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/70">
                {link.row.ticker}
              </span>
              {link.row.deltaPct != null && (
                <span
                  className={clsx(
                    "font-mono text-[11px] font-semibold tabular-nums",
                    link.row.deltaPct >= 0
                      ? "text-[#1e6b18] dark:text-[#5cd84a]"
                      : "text-[#8b2020] dark:text-[#e84d4d]",
                  )}
                >
                  {link.row.deltaPct >= 0 ? "+" : ""}
                  {link.row.deltaPct.toFixed(1)}%
                </span>
              )}
              <span className="ml-auto font-mono text-[10.5px] tabular-nums text-foreground/40">
                {link.row.date}
              </span>
            </span>
            <span className="line-clamp-2 text-[12.5px] leading-[1.4]">
              {link.label}
            </span>
          </>
        ) : (
          link.label
        )}
      </a>
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
        {Glyph && <Glyph className="h-[18px] w-[18px] shrink-0 opacity-70" />}
        <span
          className={clsx(
            active && "font-medium text-[#5a4128] dark:text-[#d8c4af]",
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
          "ml-[21px] mt-0.5 mb-1 border-l border-separator/60 pl-2",
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

export function SideNav() {
  const location = useLocation();
  const { market, dashboardHref, handoff, isPinnedTheme, navItems } =
    useNavModel();

  return (
    <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-[248px] flex-col rounded-2xl border border-black/[0.07] bg-[#f5f0e8]/60 shadow-[0_12px_32px_-20px_rgba(90,65,40,0.45)] backdrop-blur-2xl backdrop-saturate-[2.5] dark:border-white/[0.09] dark:bg-background/60 dark:shadow-[0_12px_32px_-20px_rgba(0,0,0,0.7)] xl:flex">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <a href={dashboardHref}>
          <img
            alt={siteConfig.name}
            className="h-7 max-w-[56px] dark:invert"
            src="/logo.svg"
          />
        </a>
        {!isPinnedTheme && <ThemeSwitch />}
      </div>

      {/* Outside the scroll area: the picker's dropdown hangs below its
          trigger and would be clipped by an overflow container. */}
      <div className="shrink-0 px-3 pb-3">
        <MarketSwitcher />
      </div>

      <nav
        aria-label="Primary"
        className="min-h-0 flex-1 overflow-y-auto border-t border-separator/60 px-2 py-3"
      >
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = item.match(location.pathname);

            if (item.kind === "menu") {
              return <Group key={item.id} active={active} item={item} />;
            }
            const Glyph = ICONS[item.label];

            return (
              <li key={item.href}>
                <a className={rowClass(active)} href={item.href}>
                  {Glyph && (
                    <Glyph className="h-[18px] w-[18px] shrink-0 opacity-70" />
                  )}
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-separator/60 p-3">
        <a
          className={`flex w-full items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-4 py-2.5 text-sm font-medium transition-colors`}
          data-ga-event="cta_nav_download_app"
          data-ga-label={`Sidebar ${market.id}`}
          rel="noopener noreferrer"
          target="_blank"
          {...handoff.anchorProps}
        >
          <StoreGlyph className="h-3.5 w-3.5 shrink-0" />
          Download app
        </a>
        {handoff.modal}
      </div>
    </aside>
  );
}
