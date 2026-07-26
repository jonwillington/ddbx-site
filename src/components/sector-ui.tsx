/** Shared furniture for the sector hub pages.
 *
 *  The figures row appears on both the index and the detail page and must read
 *  identically in each — a sector showing one median on the list and another on
 *  its own page would undermine both.
 */
import type { SectorRollupRow } from "../../shared/sectors";

import { useMemo } from "react";

import { CONCENTRATION_THRESHOLD } from "../../shared/sectors.js";

import { marketForPath } from "@/lib/markets/registry";

export const R = {
  rule: "border-[#e8e0d5] dark:border-separator",
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

export function money(value: number, symbol: string): string {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}bn`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${symbol}${m >= 10 ? Math.round(m) : m.toFixed(1)}m`;
  }

  return `${symbol}${Math.round(n / 1000)}k`;
}

/** Ratio → "+1.2%". Null renders as "n/a", which is a real state: a sector
 *  whose buys are all too recent to have a mark has no median, and showing 0%
 *  would assert a flat return we haven't observed. */
export function signedPct(ratio: number | null): string {
  if (ratio == null) return "n/a";

  return `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`;
}

export function alphaClass(ratio: number | null): string {
  if (ratio == null) return "text-foreground/40";

  return ratio > 0
    ? "text-emerald-700 dark:text-emerald-400"
    : ratio < 0
      ? "text-rose-700 dark:text-rose-400"
      : "text-foreground/60";
}

/** The one-line figures row: volume, value, breadth, median alpha — plus the
 *  concentration note when a single issuer dominates the value. */
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

  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-foreground/60">
        <span className="tabular-nums">{row.buys} buys</span>
        <span className="tabular-nums">{money(row.value, market.symbol)}</span>
        <span className="tabular-nums">{row.companies} companies</span>
        <span className="tabular-nums">
          median alpha{" "}
          <span className={`font-medium ${alphaClass(row.medianAlpha)}`}>
            {signedPct(row.medianAlpha)}
          </span>
        </span>
      </p>
      {concentrated && row.topCompany && (
        // A sector total can be one company wearing a sector's name — US
        // technology over the year to 2026-07-26 was 99% a single issuer.
        // Saying so is the difference between a figure that informs and one
        // that's accurate and misleading at the same time.
        <p className={`mt-1 ${R.label} leading-[1.5]`}>
          {Math.round(row.topCompanyShare! * 100)}% of that value is{" "}
          {row.topCompany.replace(/\.L$/i, "")} alone.
        </p>
      )}
    </div>
  );
}
