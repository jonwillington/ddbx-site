import type { HTMLAttributes, ReactNode } from "react";

import { formatSigned, signedDirection } from "@/lib/performance/format";

/** A return or a delta, as text. Jon, 2026-09-19: returns and deltas are plain
 *  coloured `tabular-nums` text — no filled pill, tinted wash or border behind
 *  them. Chips are for labels, not numbers (CLAUDE.md, "UI conventions").
 *
 *  `value` is in display units by default (12.4 → "+12.4%"); pass
 *  `ratio` when the figure is a ratio (0.124). Formatting is the shared
 *  `formatSigned` — real minus glyph, "+" on a rise, and no sign and neutral
 *  ink on a figure that rounds to zero, so the colour never claims a move the
 *  number doesn't show.
 *
 *  Null / non-finite renders `fallback` (default: nothing). Static-page rule
 *  2 — never state a number you do not have — so there is no em-dash default;
 *  a caller that needs a placeholder passes words ("No data yet"). */

const SIZE = {
  caption: "text-caption",
  small: "text-small",
  body: "text-body",
  /** Table figures: 13 / 600. The row default. */
  num: "text-num",
  lede: "text-lede",
  title: "text-title",
} as const;

export type DeltaSize = keyof typeof SIZE;

export interface DeltaProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number | null | undefined;
  /** Treat `value` as a ratio (0.12 = 12%). */
  ratio?: boolean;
  decimals?: number;
  /** "%" by default; "pp" for alpha against a benchmark. */
  suffix?: string;
  /** Show the "+" / "−". Off, the ink alone carries direction. */
  showSign?: boolean;
  /** A ramp step; omitted, the type is inherited from the parent. */
  size?: DeltaSize;
  /** Ink for a flat figure. Neutral foreground by default. */
  flatClassName?: string;
  /** Rendered when there is no figure. Nothing by default. */
  fallback?: ReactNode;
}

export function Delta({
  value,
  ratio = false,
  decimals = 1,
  suffix = "%",
  showSign = true,
  size,
  flatClassName = "text-foreground/60",
  fallback = null,
  className,
  ...rest
}: DeltaProps) {
  if (value == null || !Number.isFinite(value)) return <>{fallback}</>;

  const v = ratio ? value * 100 : value;
  const dir = signedDirection(v, decimals);
  const ink =
    dir > 0 ? "text-positive" : dir < 0 ? "text-negative" : flatClassName;

  return (
    <span
      className={[
        "tabular-nums whitespace-nowrap",
        size ? SIZE[size] : "",
        ink,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {formatSigned(v, { decimals, suffix, showSign })}
    </span>
  );
}
