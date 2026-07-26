/** Sector index — /sectors.
 *
 *  Ranks the normalised ICB sectors by insider buying over a rolling year, with
 *  the median alpha of each sector's buys alongside the volume. The ranking is
 *  the page: "where are insiders putting money, and has it worked" is a
 *  question we can answer from our own data and most sources can't.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  MIN_BUYS,
} from "../../shared/sectors.js";

import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { SectorFigures, useSectorMarket, R } from "@/components/sector-ui";
import { AppCtaBand } from "@/components/seo/app-cta-band";
import { sectorCta } from "@/components/seo/cta-copy";
import { TrackingNotice } from "@/components/seo/tracking-notice";

export default function SectorsPage() {
  const market = useSectorMarket();
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);

  useEffect(() => {
    let live = true;
    const since = windowStart(new Date());

    // One code path, two feeds: UK rows come back as `Dealing`, US as
    // `UsDealing`, and everything downstream reads only the fields both share
    // (ticker, trade_date, sector_normalized, live_performance) plus the
    // value accessor in shared/sectors.js that knows about value_gbp vs value.
    const load: Promise<Array<Dealing | UsDealing>> =
      market.id === "US"
        ? api.usDealings({ since, limit: 1000 }).then((r) => r.dealings)
        : api.dealingsWindow(since, 1000);

    load.then((d) => live && setRows(d)).catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market.id]);

  const rollup = useMemo(() => sectorRollup(rows ?? []), [rows]);
  const publishable = rollup.filter(sectorMeetsBar);
  // Bars scale to the biggest sector on the page — the list is a comparison
  // between these eleven, not against any absolute figure.
  const maxValue = publishable.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <DefaultLayout>
      <div className="mx-auto w-full max-w-[860px] pb-16">
        <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {market.label} insider buying by sector
        </h1>
        <p className={`mt-4 max-w-[62ch] ${R.body}`}>
          Where {market.noun} have been buying their own shares over the last
          twelve months, and how those buys have performed against the market
          since they were disclosed.
        </p>

        <TrackingNotice className="mt-3 max-w-[62ch]" />

        {rows === null ? (
          <div className="mt-10 animate-pulse space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded bg-foreground/[0.06]" />
            ))}
          </div>
        ) : publishable.length === 0 ? (
          <p className={`mt-10 ${R.body}`}>
            Not enough disclosed activity to break down by sector yet.
          </p>
        ) : (
          <ul className={`mt-10 border-t ${R.rule}`}>
            {publishable.map((row) => (
              <li key={row.sector.slug} className={`border-b ${R.rule} py-4`}>
                <Link
                  className="text-[16px] font-semibold tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
                  to={sectorPath(row.sector.slug)}
                >
                  {row.sector.label}
                </Link>
                <SectorFigures
                  className="mt-3"
                  market={market}
                  maxValue={maxValue}
                  row={row}
                />
              </li>
            ))}
          </ul>
        )}

        <AppCtaBand
          body={sectorCta().body}
          gaLabel="Sectors index"
          headline={sectorCta().headline}
          marketId={market.id === "US" ? "us" : "uk"}
          screenshotSlot="cluster"
        />

        <p className={`mt-10 ${R.label} leading-[1.6]`}>
          Rolling twelve months of disclosed purchases. Sectors with fewer than{" "}
          {MIN_BUYS} buys in the window are omitted. Median alpha is measured
          from the disclosure-day close against the market, not from the
          insider’s own entry price, and is marked to the latest cached close.
          Past performance is not a reliable indicator of future results.
        </p>
      </div>
    </DefaultLayout>
  );
}
