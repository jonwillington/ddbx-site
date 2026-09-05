/** What "£3.8m became £6.1m" looks like: the price since the buy, rebased so
 *  the disclosure close is 100, with the index over the same days as a
 *  faint second line. The buy is the black dot, the latest close the
 *  coloured one. A short run of sessions before the buy gives the entry
 *  some context without turning the row into a chart.
 */
import type { Bars } from "./board-prices";
import type { BoardRow } from "./board-model";

import { useMemo } from "react";

const W = 200;
const H = 44;
const PAD = 4;
const LEAD = 22;

export function BuySparkline({
  row,
  bars,
  bench,
}: {
  row: BoardRow;
  bars: Bars | undefined;
  bench: Bars | undefined;
}) {
  const drawn = useMemo(() => {
    if (!bars || bars.length < 3) return null;
    const d0 = row.disclosedDate || row.tradeDate;
    const i0 = bars.findIndex((b) => b.date >= d0);

    if (i0 < 0 || bars[i0].close <= 0) return null;
    const start = Math.max(0, i0 - LEAD);
    const base = bars[i0].close;
    const px = bars
      .slice(start)
      .map((b) => ({ date: b.date, v: (b.close / base) * 100 }));
    const bmap = new Map((bench ?? []).map((b) => [b.date, b.close] as const));
    let b0: number | null = null;

    for (let k = (bench?.length ?? 0) - 1; k >= 0; k--) {
      const b = bench![k];

      if (b.date <= d0) {
        b0 = b.close;
        break;
      }
    }
    const bx = b0
      ? px.map((p) => ({
          date: p.date,
          v: bmap.has(p.date) ? (bmap.get(p.date)! / b0!) * 100 : null,
        }))
      : [];
    const vals = px
      .map((p) => p.v)
      .concat(
        bx.map((p) => p.v).filter((v): v is number => v != null),
        [100],
      );
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const rng = Math.max(hi - lo, 4);
    const X = (i: number) =>
      PAD + (i / Math.max(1, px.length - 1)) * (W - PAD * 2);
    const Y = (v: number) => PAD + ((hi - v) / rng) * (H - PAD * 2);
    const path = (arr: Array<{ v: number | null }>) => {
      let s = "";
      let pen = false;

      arr.forEach((p, i) => {
        if (p.v == null) {
          pen = false;

          return;
        }
        s += `${pen ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`;
        pen = true;
      });

      return s;
    };
    const last = px[px.length - 1].v;

    return {
      price: path(px),
      bench: bx.length ? path(bx) : null,
      buyX: X(i0 - start),
      zeroY: Y(100),
      endX: X(px.length - 1),
      endY: Y(last),
      tone: last > 100.05 ? "pos" : last < 99.95 ? "neg" : "flat",
    };
  }, [bars, bench, row.disclosedDate, row.tradeDate]);

  if (!drawn) {
    return (
      <div
        aria-hidden
        className="h-[44px] w-full rounded-md bg-black/[0.03] dark:bg-white/[0.04]"
      />
    );
  }

  const stroke =
    drawn.tone === "pos"
      ? "stroke-positive"
      : drawn.tone === "neg"
        ? "stroke-negative"
        : "stroke-foreground";
  const fill =
    drawn.tone === "pos"
      ? "fill-positive"
      : drawn.tone === "neg"
        ? "fill-negative"
        : "fill-foreground";

  return (
    <svg
      aria-hidden
      className="block h-[44px] w-full overflow-visible"
      preserveAspectRatio="none"
      viewBox={`0 0 ${W} ${H}`}
    >
      <line
        className="stroke-foreground/10"
        x1={PAD}
        x2={W - PAD}
        y1={drawn.zeroY}
        y2={drawn.zeroY}
      />
      {drawn.bench ? (
        <path
          className="stroke-foreground/25"
          d={drawn.bench}
          fill="none"
          strokeLinejoin="round"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <path
        className={`board-spark ${stroke}`}
        d={drawn.price}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="fill-foreground stroke-background"
        cx={drawn.buyX}
        cy={drawn.zeroY}
        r={3.5}
        strokeWidth={2}
      />
      <circle
        className={`${fill} stroke-background`}
        cx={drawn.endX}
        cy={drawn.endY}
        r={3.5}
        strokeWidth={2}
      />
    </svg>
  );
}
