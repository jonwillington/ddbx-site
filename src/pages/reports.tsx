/** The report archive — /reports.
 *
 *  A stable, dated index of every monthly report. The archive is the half of
 *  "recurring original research" that makes it citable: a rolling page that
 *  silently replaces last month's analysis gives anyone linking to it a moving
 *  target, so the index lists months and every month keeps its own URL forever.
 *
 *  Thin today — the API holds two UK months — and that's fine. It grows by
 *  twelve URLs a year per market without anyone writing anything, because the
 *  reports are already generated. This page exists so that accumulation lands
 *  somewhere.
 */
import type { MonthlySummaryListItem } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { monthLabel, reportPath } from "../../shared/months.js";

import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { marketForPath } from "@/lib/markets/registry";

const R = {
  rule: "border-[#e8e0d5] dark:border-separator",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
} as const;

export default function ReportsPage() {
  const { marketParam, label } = useMemo(() => {
    const id = marketForPath(
      "/",
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id;
    const us = id === "us" || id === "usg" || id === "djt";

    return {
      marketParam: us ? "US" : undefined,
      label: us ? "US insider buying" : "UK director buying",
    };
  }, []);

  const [months, setMonths] = useState<MonthlySummaryListItem[] | null>(null);

  useEffect(() => {
    let live = true;

    api
      .monthlySummaries(marketParam)
      .then((r) => live && setMonths(r.summaries))
      .catch(() => live && setMonths([]));

    return () => {
      live = false;
    };
  }, [marketParam]);

  const sorted = [...(months ?? [])].sort((a, b) =>
    b.month.localeCompare(a.month),
  );

  return (
    <DefaultLayout>
      <div className="mx-auto w-full max-w-[860px] pb-16">
        <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {label} reports
        </h1>
        <p className={`mt-4 max-w-[62ch] ${R.body}`}>
          A report every month: what insiders bought, what it was worth, which
          sectors they concentrated in, and how the previous month’s featured
          buys have actually performed since — including the ones that didn’t
          work.
        </p>

        {months === null ? (
          <div className="mt-10 animate-pulse space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded bg-foreground/[0.06]" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className={`mt-10 ${R.body}`}>
            No reports published for this market yet.
          </p>
        ) : (
          <ul className={`mt-10 border-t ${R.rule}`}>
            {sorted.map((m) => (
              <li key={m.month} className={`border-b ${R.rule} py-5`}>
                <Link
                  className="text-[17px] font-semibold tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
                  to={reportPath(m.month)}
                >
                  {monthLabel(m.month)}
                </Link>
                <p className={`mt-1.5 max-w-[62ch] ${R.body}`}>{m.headline}</p>
              </li>
            ))}
          </ul>
        )}

        <p className={`mt-10 ${R.label} leading-[1.6]`}>
          Reports are generated from disclosed filings and marked against
          subsequent closing prices. Past performance is not a reliable
          indicator of future results.
        </p>
      </div>
    </DefaultLayout>
  );
}
