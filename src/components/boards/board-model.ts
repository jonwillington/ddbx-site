/** One shape for every drawing of the biggest-buys board.
 *
 *  The stage, the timeline, the sparkline rows and the tooltip all describe
 *  the same 25 purchases, and each used to reach into the raw dealing for its
 *  own copy of "value", "alpha", "worth now". Derive once, here, so a figure
 *  in the hero can't disagree with the same figure on the row it links to.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import {
  buyAlpha,
  buyPerson,
  buyReturn,
  buyValue,
} from "../../../shared/leaderboard.js";

import { cleanCompanyName, cleanInsiderName } from "@/lib/company";

export type Direction = "pos" | "neg" | "flat";

export interface BoardRow {
  id: string;
  rank: number;
  /** 1 for a company's first entry on the board, 2 for its second, … */
  entry: number;
  ticker: string;
  company: string;
  person: string | null;
  role: string | null;
  tradeDate: string;
  disclosedDate: string;
  value: number;
  /** Ratio, or null when the purchase has no mark yet. */
  alpha: number | null;
  ret: number | null;
  /** The stake at the latest close, if never sold. Null with no mark. */
  worthNow: number | null;
  dir: Direction;
  clusterCount: number | null;
  raw: Dealing | UsDealing;
}

export function direction(alpha: number | null): Direction {
  if (alpha == null) return "flat";
  if (alpha > 0.0005) return "pos";
  if (alpha < -0.0005) return "neg";

  return "flat";
}

export function toBoardRows(ranked: Array<Dealing | UsDealing>): BoardRow[] {
  return ranked.map((d, i) => {
    const value = buyValue(d);
    const alpha = buyAlpha(d);
    const ret = buyReturn(d);
    const ticker = d.ticker ?? "";
    const person = buyPerson(d);
    const role =
      (d as Dealing).director?.role ??
      (d as UsDealing).reporter?.roles?.join(", ") ??
      null;

    return {
      id: d.id ?? `${ticker}-${d.trade_date}-${i}`,
      rank: i + 1,
      entry: ranked.slice(0, i).filter((x) => x.ticker === d.ticker).length + 1,
      ticker,
      company: cleanCompanyName(d.company ?? "") || ticker,
      person: person ? cleanInsiderName(person) : null,
      role: role || null,
      tradeDate: d.trade_date ?? "",
      disclosedDate: d.disclosed_date ?? d.trade_date ?? "",
      value,
      alpha,
      ret,
      worthNow: ret == null ? null : value * (1 + ret),
      dir: direction(alpha),
      clusterCount: d.cluster?.count ?? null,
      raw: d,
    };
  });
}

/** The figures a board states about itself, computed from the rows it shows. */
export function summarise(rows: BoardRow[]) {
  const alphas = rows
    .map((r) => r.alpha)
    .filter((a): a is number => a != null)
    .sort((a, b) => a - b);
  const mid = Math.floor(alphas.length / 2);
  const byAlpha = rows
    .filter((r) => r.alpha != null)
    .sort((a, b) => (b.alpha ?? 0) - (a.alpha ?? 0));

  return {
    total: rows.reduce((s, r) => s + r.value, 0),
    companies: new Set(rows.map((r) => r.ticker)).size,
    ahead: rows.filter((r) => r.dir === "pos").length,
    behind: rows.filter((r) => r.dir === "neg").length,
    alphaCount: alphas.length,
    medianAlpha:
      alphas.length === 0
        ? null
        : alphas.length % 2 === 1
          ? alphas[mid]
          : (alphas[mid - 1] + alphas[mid]) / 2,
    best: byAlpha[0] ?? null,
    worst: byAlpha[byAlpha.length - 1] ?? null,
  };
}

/** Shared hover/focus linking: the stage, the timeline and the rows all
 *  highlight the same purchase. */
export interface Linking {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}

export function signedPp(ratio: number | null): string {
  if (ratio == null) return "n/a";

  return `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}pp`;
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** Small counts read as words in prose and as digits in a figure slot. "six
 *  directors over 11 days" is a sentence; "6 directors" is a caption. Shared
 *  by the cluster and activity stages so the two never spell a count apart. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const unit = n % 10;

  return unit === 0
    ? TENS[Math.floor(n / 10)]
    : `${TENS[Math.floor(n / 10)]}-${ONES[unit]}`;
}

/** "12 Jun", with the year added only when it isn't the current one. */
export function dateLabel(iso: string, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;
  const label = d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  const year = iso.slice(0, 4);

  return year !== String(new Date().getFullYear()) ? `${label} ${year}` : label;
}

/** Container width, measured. Every chart here draws to real pixels rather
 *  than a stretched viewBox, because logos and round markers turn into
 *  ellipses under a non-uniform scale. */
export { useMeasuredWidth } from "./use-measured-width";
