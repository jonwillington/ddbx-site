/** When the board's purchases happened — the one thing a ranked list can't
 *  show. A beeswarm from the first month we hold filings for to today, one
 *  dot per purchase with area for the amount, filled when it has beaten the
 *  index since and hollow when it has trailed (direction is never colour
 *  alone: the site's green and red are near-identical under deutan vision).
 *  The busiest eight weeks are shaded and named in the caption.
 */
import type { BoardRow, Linking } from "./board-model";

import { useMemo } from "react";

import { formatMoney } from "../../../shared/sectors.js";

import { dateLabel, useMeasuredWidth } from "./board-model";

const H = 190;
const PAD_L = 12;
const PAD_R = 12;
const PAD_B = 30;
const DAY = 864e5;

const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function timelineFinding(
  rows: BoardRow[],
  start: string,
  end: string,
  symbol: string,
  locale: string,
): { text: string; windowStart: number; windowDays: number } | null {
  if (rows.length === 0) return null;
  const spanDays = (Date.parse(end) - Date.parse(start)) / DAY;
  const windowDays = spanDays >= 140 ? 56 : 28;
  const stamps = rows.map((r) => Date.parse(r.tradeDate)).sort((a, b) => a - b);
  let best = { n: 0, s: stamps[0] };

  stamps.forEach((s) => {
    const n = stamps.filter((d) => d >= s && d <= s + windowDays * DAY).length;

    if (n > best.n) best = { n, s };
  });
  const inWin = rows.filter((r) => {
    const t = Date.parse(r.tradeDate);

    return t >= best.s && t <= best.s + windowDays * DAY;
  });
  const total = rows.reduce((a, r) => a + r.value, 0);
  const winVal = inWin.reduce((a, r) => a + r.value, 0);
  const from = dateLabel(new Date(best.s).toISOString().slice(0, 10), locale);
  const to = dateLabel(
    new Date(best.s + windowDays * DAY).toISOString().slice(0, 10),
    locale,
  );
  const weeks = windowDays / 7;

  return {
    text: `${best.n} of the ${rows.length} landed in the ${weeks === 8 ? "eight" : "four"} weeks from ${from} to ${to}, ${formatMoney(winVal, symbol)} of the ${formatMoney(total, symbol)}.`,
    windowStart: best.s,
    windowDays,
  };
}

export function BoardTimeline({
  rows,
  start,
  end,
  symbol,
  locale,
  linking,
}: {
  rows: BoardRow[];
  /** ISO dates: axis start (never before the first tracked month) and today. */
  start: string;
  end: string;
  symbol: string;
  locale: string;
  linking: Linking;
}) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const W = Math.max(320, width);
  const t0 = Date.parse(start);
  const t1 = Date.parse(end);
  const X = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * (W - PAD_L - PAD_R);
  const cy = (H - PAD_B) / 2 + 4;

  const finding = useMemo(
    () => timelineFinding(rows, start, end, symbol, locale),
    [rows, start, end, symbol, locale],
  );

  const placed = useMemo(() => {
    const vmax = Math.max(...rows.map((r) => r.value));
    const rad = (v: number) => 4 + 12 * Math.sqrt(v / vmax);
    const out: Array<{ row: BoardRow; x: number; y: number; r: number }> = [];

    [...rows]
      .sort((a, b) => b.value - a.value)
      .forEach((row) => {
        const x = X(Date.parse(row.tradeDate));
        const r = rad(row.value);
        let y = cy;

        outer: for (let k = 0; k < 40; k++) {
          for (const sgn of k === 0 ? [0] : [1, -1]) {
            const cand = cy + sgn * k * 3;

            if (
              out.every((p) => Math.hypot(p.x - x, p.y - cand) >= p.r + r + 2)
            ) {
              y = cand;
              break outer;
            }
          }
        }
        out.push({ row, x, y, r });
      });

    return out;
  }, [rows, W, t0, t1]);

  const months: Array<{ x: number; label: string }> = [];
  const first = new Date(t0);

  for (
    let d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
    d.getTime() <= t1;
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  ) {
    if (d.getTime() < t0) continue;
    months.push({
      x: X(d.getTime()),
      label:
        MONTH[d.getUTCMonth()] +
        (d.getUTCMonth() === 0
          ? ` ’${String(d.getUTCFullYear()).slice(2)}`
          : ""),
    });
  }

  const active = linking.activeId;

  return (
    <div className="board-panel">
      <div ref={ref} className="min-w-0">
        <svg
          aria-label="Each purchase on a timeline, sized by amount"
          className="block"
          height={H}
          role="img"
          width={W}
        >
          {finding ? (
            <rect
              className="fill-brand-brown/[0.08] dark:fill-brand-tan/[0.12]"
              height={H - PAD_B - 10}
              rx={10}
              width={
                ((finding.windowDays * DAY) / (t1 - t0)) * (W - PAD_L - PAD_R)
              }
              x={X(finding.windowStart)}
              y={6}
            />
          ) : null}
          <line
            className="stroke-foreground/15"
            x1={PAD_L}
            x2={W - PAD_R}
            y1={H - PAD_B - 4}
            y2={H - PAD_B - 4}
          />
          {months.map((m) => (
            <g key={m.label + m.x}>
              <line
                className="stroke-foreground/15"
                x1={m.x}
                x2={m.x}
                y1={H - PAD_B - 4}
                y2={H - PAD_B + 2}
              />
              <text
                className="fill-foreground/50 font-mono"
                fontSize={10.5}
                textAnchor="middle"
                x={m.x}
                y={H - PAD_B + 16}
              >
                {m.label}
              </text>
            </g>
          ))}
          {placed.map((p) => {
            const dim = active != null && active !== p.row.id;
            const isActive = active === p.row.id;
            const cls =
              p.row.dir === "pos"
                ? "fill-positive"
                : p.row.dir === "neg"
                  ? "fill-transparent stroke-negative"
                  : "fill-foreground/30";

            return (
              <circle
                key={p.row.id}
                className={`board-dot cursor-pointer ${cls} ${isActive ? "stroke-foreground" : ""}`}
                cx={p.x}
                cy={p.y}
                opacity={dim ? 0.3 : 1}
                r={p.r}
                strokeWidth={isActive ? 2.5 : 2}
                onMouseEnter={() => linking.setActiveId(p.row.id)}
                onMouseLeave={() => linking.setActiveId(null)}
              >
                <title>{`${p.row.company}, ${formatMoney(p.row.value, symbol)}, ${dateLabel(p.row.tradeDate, locale)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-hairline px-1 pt-3 text-[11.5px] text-foreground/55 dark:border-separator">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-positive" />
            Ahead of the index since
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-negative" />
            Behind it
          </span>
          <span>Dot area is the amount spent.</span>
        </div>
      </div>
    </div>
  );
}
