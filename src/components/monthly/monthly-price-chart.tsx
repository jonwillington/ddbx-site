import type { MonthlyChartBar } from "@/types/ddbx";

import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";

type Period = "month" | "ytd" | "max";

const HEIGHT = 180;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;
const PAD_RIGHT = 8;
const Y_AXIS_INSET = 44;

interface Bar {
  date: string;
  price: number; // GBP major units
}

/** Self-contained price line for a featured item. The "Month" tab renders the
 *  downsampled bars the API already embedded; "YTD"/"Max" lazily fetch wider
 *  history via /api/prices/history (UK pence → GBP). A dashed reference line
 *  marks the copycat entry price and a dot marks the disclosure date. */
import { BUTTON_SELECTED } from "@/components/button";
export function MonthlyPriceChart({
  ticker,
  monthBars,
  entryPriceGbp,
  disclosedDate,
}: {
  ticker: string;
  /** The embedded month-window bars (`MonthlyChartBar`, GBP in `price`). */
  monthBars: MonthlyChartBar[];
  /** Copycat entry in GBP major units (entry_price_pence / 100). */
  entryPriceGbp: number | null;
  disclosedDate: string;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [wideBars, setWideBars] = useState<Record<"ytd" | "max", Bar[] | null>>(
    { ytd: null, max: null },
  );
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const el = wrapRef.current;

    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;

      if (w) setWidth(w);
    });

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Lazily fetch the wider windows the first time they're selected.
  useEffect(() => {
    if (period === "month") return;
    if (wideBars[period]) return;
    let cancelled = false;
    const days = period === "ytd" ? daysSinceJan1(disclosedDate) : 365;

    setLoading(true);
    api
      .priceHistory(ticker, days)
      .then((rows) => {
        if (cancelled) return;
        const mapped: Bar[] = rows.map((b) => ({
          date: b.date,
          price: b.close_pence / 100,
        }));

        setWideBars((prev) => ({ ...prev, [period]: mapped }));
      })
      .catch(() => {
        if (!cancelled) setWideBars((prev) => ({ ...prev, [period]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, ticker, disclosedDate, wideBars]);

  const bars: Bar[] = useMemo(() => {
    if (period === "month") {
      return monthBars.map((b) => ({ date: b.date, price: b.price }));
    }

    return wideBars[period] ?? [];
  }, [period, monthBars, wideBars]);

  const geom = useMemo(() => {
    if (bars.length < 2) return null;
    const prices = bars.map((b) => b.price);
    const entry = entryPriceGbp ?? null;
    let min = Math.min(...prices);
    let max = Math.max(...prices);

    if (entry != null) {
      min = Math.min(min, entry);
      max = Math.max(max, entry);
    }
    if (max === min) {
      max += 1;
      min -= 1;
    }
    const innerW = width - Y_AXIS_INSET - PAD_RIGHT;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const x = (i: number) => Y_AXIS_INSET + (i / (bars.length - 1)) * innerW;
    const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * innerH;
    const path = bars
      .map(
        (b, i) =>
          `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(b.price).toFixed(1)}`,
      )
      .join(" ");
    const discIdx = bars.findIndex((b) => b.date >= disclosedDate);

    return { min, max, x, y, path, entry, discIdx, innerW };
  }, [bars, width, entryPriceGbp, disclosedDate]);

  return (
    <div ref={wrapRef} className="w-full">
      <div className="mb-2 flex justify-end">
        <div className="inline-flex rounded-full border border-separator bg-surface/40 p-1 text-xs">
          {(
            [
              { key: "month", label: "Month" },
              { key: "ytd", label: "YTD" },
              { key: "max", label: "Max" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                period === opt.key
                  ? BUTTON_SELECTED
                  : "text-muted hover:text-foreground"
              }`}
              type="button"
              onClick={() => setPeriod(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!geom ? (
        <div
          className="flex items-center justify-center text-xs text-muted"
          style={{ height: HEIGHT }}
        >
          {loading ? "Loading…" : "No price history"}
        </div>
      ) : (
        <svg
          className="w-full overflow-visible"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
        >
          {/* y-axis labels */}
          <text
            className="fill-current text-muted"
            fontSize="10"
            x="0"
            y={PAD_TOP + 4}
          >
            £{geom.max.toFixed(2)}
          </text>
          <text
            className="fill-current text-muted"
            fontSize="10"
            x="0"
            y={HEIGHT - PAD_BOTTOM}
          >
            £{geom.min.toFixed(2)}
          </text>

          {/* entry reference line */}
          {geom.entry != null && (
            <line
              className="stroke-current text-muted/60"
              strokeDasharray="4 3"
              strokeWidth="1"
              x1={Y_AXIS_INSET}
              x2={width - PAD_RIGHT}
              y1={geom.y(geom.entry)}
              y2={geom.y(geom.entry)}
            />
          )}

          {/* price line */}
          <path
            className="text-[#5a4128] dark:text-[#ad9479]"
            d={geom.path}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />

          {/* disclosure marker */}
          {geom.discIdx >= 0 && (
            <circle
              className="text-[#5a4128] dark:text-[#ad9479]"
              cx={geom.x(geom.discIdx)}
              cy={geom.y(bars[geom.discIdx].price)}
              fill="currentColor"
              r="3.5"
              stroke="white"
              strokeWidth="1.5"
            />
          )}

          {/* x-axis end labels */}
          <text
            className="fill-current text-muted"
            fontSize="10"
            x={Y_AXIS_INSET}
            y={HEIGHT - 4}
          >
            {shortDate(bars[0].date)}
          </text>
          <text
            className="fill-current text-muted"
            fontSize="10"
            textAnchor="end"
            x={width - PAD_RIGHT}
            y={HEIGHT - 4}
          >
            {shortDate(bars[bars.length - 1].date)}
          </text>
        </svg>
      )}
    </div>
  );
}

function daysSinceJan1(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const jan1 = Date.parse(`${year}-01-01`);
  const d = Date.parse(isoDate);

  if (Number.isNaN(jan1) || Number.isNaN(d)) return 365;

  return Math.max(30, Math.round((d - jan1) / 86_400_000) + 30);
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");

  return `${d}/${m}`;
}
