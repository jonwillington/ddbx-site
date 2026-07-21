import type { BuyStyle } from "@/types/ddbx";

import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/solid";
import clsx from "clsx";

import { chip } from "@/components/chip";
import { Tooltip } from "@/components/tooltip";

/** Buy-style signal chip — what kind of price action the director bought into,
 *  computed server-side (see BuyStyle). Only `contrarian` (bought into weakness)
 *  and `momentum` (bought into strength) render; `neutral` is the unremarkable
 *  majority and gets no chip, so the signal stays overt rather than wallpaper.
 *  Returns null otherwise, so callers can drop it in unconditionally. */

const BASE = chip();

const STYLES = {
  contrarian: {
    label: "Contrarian",
    tint: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    Icon: ArrowTrendingDownIcon,
  },
  momentum: {
    label: "Momentum",
    tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    Icon: ArrowTrendingUpIcon,
  },
} as const;

const pct = (x: number) => `${Math.abs(Math.round(x * 100))}%`;

export function BuyStyleChip({
  buyStyle,
  className,
}: {
  buyStyle?: BuyStyle | null;
  className?: string;
}) {
  if (!buyStyle || buyStyle.kind === "neutral") return null;

  const style = STYLES[buyStyle.kind];
  const tooltip =
    buyStyle.kind === "contrarian"
      ? `Bought into weakness — ${pct(buyStyle.drawdown_from_high_pct)} below the recent ${buyStyle.window_days}-day high.`
      : `Bought into strength — near a rising high, up ${pct(buyStyle.trailing_return_pct)} over ${buyStyle.window_days} days.`;

  return (
    <Tooltip className={clsx("inline-flex", className)} content={tooltip}>
      <span className={clsx(BASE, style.tint)}>
        <style.Icon className="h-3 w-3 shrink-0" />
        {style.label}
      </span>
    </Tooltip>
  );
}
