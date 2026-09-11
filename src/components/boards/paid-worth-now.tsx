/** The two trailing cells a purchase row states its outcome in: what was paid
 *  and what it is worth now, then the alpha badge.
 *
 *  Lifted out of /biggest-buys on 2026-09-11, when the company and director
 *  pages started listing purchases in the same row. Three copies of a money
 *  pair is three places for "worth now" to be formatted differently, and the
 *  pair is the claim the row makes — it has to read the same everywhere.
 */
import type { BoardRow } from "./board-model";

import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { moneyDelta, moneyPair } from "../../../shared/leaderboard.js";

import { money } from "@/components/sector-ui";
import { DeltaBadge } from "@/components/market/market-row";

export function toneClass(dir: BoardRow["dir"]): string {
  return dir === "pos"
    ? "text-positive"
    : dir === "neg"
      ? "text-negative"
      : "text-foreground/60";
}

/** Paid, then worth now: the pair is the claim, and neither half means
 *  anything alone. Set at the subject's scale rather than above it (rule 5). */
export function PaidWorthNow({
  row: r,
  symbol,
}: {
  row: Pick<BoardRow, "value" | "worthNow" | "dir">;
  symbol: string;
}) {
  const pair =
    r.worthNow != null ? moneyPair(r.value, r.worthNow, symbol) : null;
  const delta = moneyDelta(r.value, r.worthNow, symbol);
  const tone = toneClass(r.dir);

  return (
    <>
      <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
        <span className="text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground xl:text-[19px]">
          <span className="sr-only">Value bought: </span>
          {pair ? pair[0] : money(r.value, symbol)}
        </span>
        {pair ? (
          <>
            <ArrowRightIcon
              aria-hidden
              className={`h-3.5 w-3.5 shrink-0 rotate-90 sm:rotate-0 ${
                r.dir === "neg" ? "text-negative/60" : "text-positive/60"
              }`}
            />
            <span
              className={`text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] xl:text-[19px] ${tone}`}
            >
              <span className="sr-only">Worth now, if still held: </span>
              {pair[1]}
            </span>
          </>
        ) : null}
      </span>
      {delta ? (
        <span
          className={`mt-1.5 block whitespace-nowrap text-[12.5px] font-medium tabular-nums ${tone}`}
        >
          {delta}
        </span>
      ) : null}
    </>
  );
}

/** Alpha since disclosure, or a plain statement that there is no mark yet. */
export function AlphaCell({ alpha }: { alpha: number | null }) {
  return (
    <>
      <span className="sr-only">Alpha since disclosure: </span>
      {alpha == null ? (
        <span className="text-[13px] tabular-nums text-foreground/40">
          no mark yet
        </span>
      ) : (
        <DeltaBadge suffix="pp" value={alpha * 100} />
      )}
    </>
  );
}
