/** Price series for every ticker on a board, plus the market benchmark.
 *
 *  One /prices/history call per distinct ticker rather than the Performance
 *  prices bundle: the bundle is ~4MB, cut to a rolling window that doesn't
 *  cover a board reaching back to March, and misses tickers either way. The
 *  fan-out is ~19 requests of a few KB, each cached five minutes here and at
 *  the edge, and rows draw as their series land rather than waiting for all.
 */
import type { BoardRow } from "./board-model";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

export type Bars = Array<{ date: string; close: number }>;

export const BENCHMARK: Record<"UK" | "US", { ticker: string; label: string }> =
  {
    UK: { ticker: "^FTAS", label: "the FTSE All-Share" },
    US: { ticker: "^GSPC", label: "the S&P 500" },
  };

export function useBoardPrices(
  rows: BoardRow[] | null,
  market: "UK" | "US",
): Map<string, Bars> {
  const [series, setSeries] = useState<Map<string, Bars>>(() => new Map());

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    let live = true;
    const earliest = rows
      .map((r) => r.disclosedDate)
      .filter(Boolean)
      .sort()[0];
    const days = Math.min(
      400,
      Math.ceil((Date.now() - Date.parse(earliest)) / 864e5) + 45,
    );
    const tickers = [
      ...new Set(rows.map((r) => r.ticker)),
      BENCHMARK[market].ticker,
    ];

    setSeries(new Map());
    tickers.forEach((t) => {
      api
        .priceHistory(t, days)
        .then((bars) => {
          if (!live) return;
          setSeries((prev) => {
            const next = new Map(prev);

            next.set(
              t,
              bars.map((b) => ({ date: b.date, close: b.close_pence })),
            );

            return next;
          });
        })
        .catch(() => {
          /* the row falls back to no sparkline; the figures still state the result */
        });
    });

    return () => {
      live = false;
    };
  }, [rows, market]);

  return series;
}
