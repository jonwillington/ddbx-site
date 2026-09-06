/** Shared furniture for the sector hub pages.
 *
 *  The figures row appears on both the index and the detail page and must read
 *  identically in each — a sector showing one median on the list and another on
 *  its own page would undermine both.
 */
import type { SectorRollupRow } from "../../shared/sectors";

import { useMemo } from "react";

import {
  formatMoney,
  formatSignedPct,
  CONCENTRATION_THRESHOLD,
} from "../../shared/sectors.js";

import { marketForPath } from "@/lib/markets/registry";
import { StatTiles } from "@/components/seo/stat-tiles";
import { DeltaBadge } from "@/components/market/market-row";

export const R = {
  rule: "border-hairline dark:border-separator",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
  tile: "rounded-xl bg-black/[0.035] dark:bg-white/[0.05]",
} as const;

export interface SectorMarket {
  /** Which dealings feed to call. */
  id: "UK" | "US";
  label: string;
  /** "directors" / "insiders" — the plural noun for people on this market. */
  noun: string;
  symbol: string;
}

/** Market for the sector pages, resolved from the domain exactly as the
 *  company and report pages resolve theirs. */
export function useSectorMarket(): SectorMarket {
  return useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;
    const us = id === "us" || id === "usg" || id === "djt";

    return us
      ? { id: "US", label: "US", noun: "insiders", symbol: "$" }
      : { id: "UK", label: "UK", noun: "directors", symbol: "£" };
  }, []);
}

/** Both of these are the shared implementations, re-exported under the names
 *  this module's callers already use. The pre-render Functions format the same
 *  figures from shared/sectors.js, and a second copy of the rounding rules
 *  here is a second way for a crawler's "£37m" and a reader's to disagree. */
export function money(value: number, symbol: string): string {
  return formatMoney(value, symbol);
}

/** Ratio → "+1.2%". Null renders as "n/a", which is a real state: a sector
 *  whose buys are all too recent to have a mark has no median, and showing 0%
 *  would assert a flat return we haven't observed. */
export function signedPct(ratio: number | null): string {
  return formatSignedPct(ratio);
}

export function alphaClass(ratio: number | null): string {
  if (ratio == null) return "text-foreground/40";

  // The site's own return colours (globals.css `--positive` / `--negative`),
  // not Tailwind's emerald/rose. These pages were the only surface picking
  // their own greens and reds, which is why a +0.9% here didn't match a +0.9%
  // in the deals table — and the tokens already carry their dark-mode values,
  // so the explicit `dark:` variants go too.
  return ratio > 0
    ? "text-positive"
    : ratio < 0
      ? "text-negative"
      : "text-foreground/60";
}

/** One sector as a row in a ranked comparison, for the index.
 *
 *  The index previously stacked eleven copies of the tile block below — which
 *  states each sector's numbers clearly but makes them impossible to compare,
 *  because nothing lines up between one sector and the next and the reader has
 *  to hold four figures in their head while scrolling to the following block.
 *  Comparison is the whole reason a "by sector" page exists: the interesting
 *  fact is never "Industrials had 309 buys", it's "Industrials had four times
 *  the value of Technology and still trailed it on alpha".
 *
 *  So the index uses aligned columns and a shared bar scale, sorted by value.
 *  The per-sector page keeps `SectorFigures` — one sector on its own has
 *  nothing to line up against, and tiles state a single set of numbers better.
 */
/** The grid both the header and the rows are set on. Declared once so a column
 *  can't drift out from under its own heading. */
const COMPARISON_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]";

/** Column headings for the ranked list.
 *
 *  A comparison table with no header row makes every row carry its own labels,
 *  which is how the index ended up repeating "Median alpha" eleven times down
 *  a column that could have said it once. Hidden below `sm`, where the row
 *  reflows into a stack and the per-row label earns its place again. */
export function SectorComparisonHeader() {
  return (
    <div
      className={`${COMPARISON_GRID} hidden pb-2 sm:grid ${R.label} uppercase tracking-[0.08em]`}
    >
      <span>Sector</span>
      <span className="text-right">Value bought</span>
      <span className="text-right">Median alpha</span>
    </div>
  );
}

export function SectorComparisonRow({
  row,
  market,
}: {
  row: SectorRollupRow;
  market: SectorMarket;
}) {
  const concentrated =
    row.topCompanyShare != null &&
    row.topCompanyShare > CONCENTRATION_THRESHOLD;

  return (
    <div className={`${COMPARISON_GRID} items-baseline`}>
      <div className="min-w-0">
        <span className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
          {row.sector.label}
        </span>
        <span className={`mt-0.5 block ${R.label}`}>
          {row.buys} buys · {row.companies} companies
        </span>
      </div>

      {/* The figure alone. The bar that used to sit under it scaled every
          sector against the largest one, which is the comparison the stage
          above the list now draws at log scale — and drew better, because
          eleven sectors spanning three orders of magnitude leave nine bars
          reading as empty. */}
      <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
        <span className="block text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-foreground sm:text-right">
          {money(row.value, market.symbol)}
        </span>
      </div>

      <div className="text-right">
        <span className={`block sm:hidden ${R.label}`}>Median alpha</span>
        {row.medianAlpha == null ? (
          // No badge for a sector with nothing to measure: a grey "n/a" is the
          // honest shape, and a chip would give an absence the same weight as
          // a result.
          <span
            className={`mt-0.5 block text-[15px] font-semibold tabular-nums ${alphaClass(null)}`}
          >
            {signedPct(null)}
          </span>
        ) : (
          <span className="mt-0.5 inline-flex sm:mt-0">
            {/* DeltaBadge reads PERCENT; medianAlpha is a ratio. */}
            <DeltaBadge value={row.medianAlpha * 100} />
          </span>
        )}
      </div>

      {concentrated && row.topCompany && (
        <p className="order-4 col-span-2 mt-1 flex items-start gap-1.5 text-[12px] leading-[1.5] text-foreground/45 sm:col-span-3">
          {/* The caveat is the reason not to read the number beside it at face
              value, so it gets the site's key-risk amber rather than dissolving
              into the same grey as the row's own small print. */}
          <span
            aria-hidden
            className="mt-[0.42em] h-1.5 w-1.5 shrink-0 rounded-full bg-risk"
          />
          <span>
            {Math.round(row.topCompanyShare! * 100)}% of that value is{" "}
            {row.topCompany.replace(/\.L$/i, "")} alone.
          </span>
        </p>
      )}
    </div>
  );
}

/** The figures block on a sector's own page: volume, value, breadth, the
 *  people behind it and the median alpha, as labelled tiles.
 *
 *  It is the tile group itself, not a card containing one — `StatTiles` draws
 *  the house tint well per figure, and wrapping the group in a second well
 *  (which is what this page did) reads as a panel someone forgot to fill. */
export function SectorFigures({
  row,
  market,
  className,
}: {
  row: SectorRollupRow;
  market: SectorMarket;
  className?: string;
}) {
  const concentrated =
    row.topCompanyShare != null &&
    row.topCompanyShare > CONCENTRATION_THRESHOLD;

  const notes = [
    // A sector total can be one company wearing a sector's name — US technology
    // over the year to 2026-07-26 was 99% a single issuer. Saying so is the
    // difference between a figure that informs and one that's accurate and
    // misleading at the same time.
    concentrated && row.topCompany
      ? `${Math.round(row.topCompanyShare! * 100)}% of that value is ${row.topCompany.replace(/\.L$/i, "")} alone.`
      : null,
    // The median's sample size. A buy disclosed last week has no mark yet, so
    // the median is drawn from the older part of the window — and how much
    // older is the difference between a figure worth reading and a rounding
    // error with a plus sign in front of it.
    row.buys > 0
      ? `${row.alphaCount} of ${row.buys} buys have a performance mark; the median is taken from those.`
      : null,
  ].filter(Boolean);

  return (
    <StatTiles
      className={className}
      cols={5}
      note={notes.length > 0 ? notes.join(" ") : undefined}
      stats={[
        { label: "Buys", value: row.buys },
        {
          label: "Value",
          value: money(row.value, market.symbol),
          primary: true,
        },
        { label: "Companies", value: row.companies },
        {
          label: market.id === "US" ? "Insiders" : "Directors",
          value: row.people,
        },
        {
          label: "Median alpha",
          value: signedPct(row.medianAlpha),
          tone:
            row.medianAlpha == null
              ? undefined
              : row.medianAlpha > 0
                ? "positive"
                : row.medianAlpha < 0
                  ? "negative"
                  : undefined,
        },
      ]}
    />
  );
}
