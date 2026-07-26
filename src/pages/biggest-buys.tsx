/** Biggest insider buys — /biggest-buys (rolling) and /biggest-buys/:year.
 *
 *  The ranking rules and the published methodology both live in
 *  shared/leaderboard.js so the crawler pre-render and the hydrated page can't
 *  disagree about the order, and so the words describing the rules sit next to
 *  the code enforcing them.
 *
 *  Note on people: this ranks TRANSACTIONS and names whoever filed each one,
 *  which is what the disclosure itself is. It deliberately does not rank
 *  PEOPLE — an "most active directors" board would be a persistent profile of
 *  an individual assembled by us, which is the surface the plan defers until
 *  the privacy handling is thought through.
 *
 *  The rolling board is canonical and the year boards are the archive, not the
 *  other way round: if /biggest-buys/2026 were canonical, the canonical target
 *  would move every January.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import {
  buyAlpha,
  buyPerson,
  buyValue,
  leaderboardPath,
  rankBuys,
  yearBounds,
  METHODOLOGY,
  TOP_N,
} from "../../shared/leaderboard.js";
import { windowStart } from "../../shared/sectors.js";

import {
  alphaClass,
  money,
  R,
  signedPct,
  useSectorMarket,
} from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { API_BASE } from "@/lib/api";
import {
  cleanCompanyName,
  cleanInsiderName,
  companyPath,
  displayTicker,
} from "@/lib/company";
import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { AppCtaBand } from "@/components/seo/app-cta-band";
import { MeterBar } from "@/components/seo/meter-bar";
import { leaderboardCta } from "@/components/seo/cta-copy";
import {
  TrackingNotice,
  TRACKING_SINCE_YEAR,
} from "@/components/seo/tracking-notice";

export default function BiggestBuysPage() {
  const { year } = useParams<{ year?: string }>();
  const market = useSectorMarket();
  const bounds = useMemo(() => (year ? yearBounds(year) : null), [year]);
  const invalidYear = Boolean(year) && !bounds;

  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);

  useEffect(() => {
    if (invalidYear) return;
    let live = true;
    const since = bounds ? bounds.since : windowStart(new Date());

    fetchDealingsWindow({
      apiBase: API_BASE,
      market: market.id,
      since,
      until: bounds ? bounds.until : null,
    })
      .then(
        (r: { dealings: Array<Dealing | UsDealing>; complete: boolean }) => {
          if (!live) return;
          setRows(r.dealings);
          setComplete(r.complete);
        },
      )
      .catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market.id, bounds, invalidYear]);

  const { ranked, suppressed } = useMemo(() => {
    const r = rankBuys(rows ?? [], market.id, TOP_N);

    return { ranked: r.rows, suppressed: r.suppressed };
  }, [rows, market.id]);

  // Bars scale to rank 1, so the board reads as "how much bigger was the top
  // buy" rather than as a row of near-full bars.
  const topValue = useMemo(
    () => (ranked.length > 0 ? buyValue(ranked[0]) : 0),
    [ranked],
  );

  if (invalidYear) {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65">
          That isn’t a year we have data for.{" "}
          <Link className="underline" to="/biggest-buys">
            See the latest biggest buys
          </Link>
          .
        </p>
      </DefaultLayout>
    );
  }

  const periodLabel = year ? `in ${year}` : "of the last twelve months";
  const thisYear = new Date().getFullYear();
  // Only offer years we actually hold filings for. The pipeline's first
  // disclosures land in March 2026, so a "Biggest buys of 2025" link is a
  // promise of an empty board — worse than no link at all.
  const archive = [thisYear, thisYear - 1]
    .filter((y) => y >= TRACKING_SINCE_YEAR)
    .filter((y) => String(y) !== year);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={market.id === "US" ? "us" : "uk"}
        placement="biggest_buys_rail"
        ukHeading="Start investing"
      />
      <article className="mx-auto w-full max-w-[860px] pb-16">
        {year && (
          <nav className={`${R.label} pt-2`}>
            <Link className="hover:text-foreground/70" to="/biggest-buys">
              Biggest buys
            </Link>
            <span className="mx-1.5 opacity-40">/</span>
            <span>{year}</span>
          </nav>
        )}

        <h1 className="mt-5 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          The biggest {market.label} insider buys {periodLabel}
        </h1>
        <p className={`mt-4 max-w-[62ch] ${R.body}`}>
          The largest open-market purchases {market.noun} made in their own
          companies, with how each has performed against the market since it was
          disclosed.
        </p>

        <TrackingNotice className="mt-3 max-w-[62ch]" />

        {!complete && (
          // Truncation is invisible unless you say so: the board still renders
          // and still looks complete. Better a caveat than a wrong answer
          // presented as a right one.
          <p className={`mt-4 ${R.label} leading-[1.6]`}>
            We couldn’t load the whole period, so this ranking may be missing
            older purchases.
          </p>
        )}

        {rows === null ? (
          <div className="mt-10 animate-pulse space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-11 rounded bg-foreground/[0.06]" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <p className={`mt-10 ${R.body}`}>
            No qualifying open-market purchases in this period.
          </p>
        ) : (
          <>
            <ol className={`mt-8 border-t ${R.rule}`}>
              {ranked.map((d, i) => (
                <BuyRow
                  key={d.id ?? i}
                  deal={d}
                  position={i + 1}
                  repeat={ranked.findIndex((x) => x.ticker === d.ticker) !== i}
                  symbol={market.symbol}
                  topValue={topValue}
                />
              ))}
            </ol>

            {suppressed.size > 0 && (
              <p className={`mt-4 ${R.label} leading-[1.6]`}>
                {[...suppressed.entries()]
                  .map(
                    ([ticker, n]) =>
                      `${displayTicker(ticker)} had ${n} further qualifying ${n === 1 ? "purchase" : "purchases"}`,
                  )
                  .join("; ")}
                , held back so a single company doesn’t fill the board.
              </p>
            )}
          </>
        )}

        <AppCtaBand
          body={leaderboardCta.body}
          gaLabel={year ? `Biggest buys · ${year}` : "Biggest buys"}
          headline={leaderboardCta.headline}
          marketId={market.id === "US" ? "us" : "uk"}
          screenshotSlot="cluster"
        />

        <section className={`mt-12 border-t ${R.rule} pt-7`}>
          <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
            How this is put together
          </h2>
          <ul className="mt-4 space-y-2.5">
            {METHODOLOGY.map((line: string) => (
              <li key={line} className={`flex gap-2.5 ${R.body}`}>
                <span
                  aria-hidden
                  className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
                />
                <span className="max-w-[62ch]">{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {archive.length > 0 && (
          <section className={`mt-10 border-t ${R.rule} pt-7`}>
            <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-foreground">
              By year
            </h2>
            <ul className="mt-4 space-y-1.5">
              {year && (
                <li>
                  <Link
                    className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                    to="/biggest-buys"
                  >
                    Last twelve months
                  </Link>
                </li>
              )}
              {archive.map((y) => (
                <li key={y}>
                  <Link
                    className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                    to={leaderboardPath(y)}
                  >
                    Biggest buys of {y}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </DefaultLayout>
  );
}

function BuyRow({
  deal: d,
  position,
  symbol,
  topValue,
  repeat,
}: {
  deal: Dealing | UsDealing;
  position: number;
  symbol: string;
  /** Rank 1's consideration — every bar is drawn relative to it. */
  topValue: number;
  /** This ticker already appeared higher up the board. */
  repeat: boolean;
}) {
  const alpha = buyAlpha(d);
  const cluster = d.cluster?.tier;
  const ticker = displayTicker(d.ticker ?? "");
  const value = buyValue(d);
  // Mark the original consideration to the stock's own move since the trade —
  // NOT to `alpha`, which is measured against the benchmark and would misstate
  // the holding's value. Null when we have no post-trade mark.
  const stockPct = d.live_performance?.return_pct_trade;
  const worthNow =
    typeof stockPct === "number" && value > 0
      ? value * (1 + stockPct / 100)
      : null;

  return (
    <li className={`flex items-baseline gap-4 border-b ${R.rule} py-3.5`}>
      {/* Zero-padded mono rank. The podium carries full ink and everything
          below it drops back — a ranked list where 1 and 17 are set in the
          same grey isn't ranked, it's numbered. */}
      <span
        aria-hidden
        className={`w-7 shrink-0 font-mono text-[12px] tabular-nums ${
          position <= 3 ? "text-foreground" : "text-foreground/35"
        }`}
      >
        {String(position).padStart(2, "0")}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          {repeat && (
            // Same company, further down the board. Saying so turns what looked
            // like a duplicate row into the point: this issuer had several.
            <span
              aria-hidden
              className="shrink-0 text-[12px] leading-none text-foreground/30"
              title="Another purchase in the same company"
            >
              &#8627;
            </span>
          )}
          <CompanyLogo size={22} ticker={d.ticker ?? ""} />
          <Link
            className="truncate text-[14.5px] font-medium text-foreground underline-offset-4 hover:underline"
            to={companyPath(d.ticker ?? "")}
          >
            {cleanCompanyName(d.company ?? "") || ticker}
          </Link>
          <TickerPill ticker={ticker} />
        </span>
        <span className={`mt-1 block truncate ${R.label}`}>
          {cleanInsiderName(buyPerson(d) ?? "") || "—"} &middot; {d.trade_date}
          {cluster && ` · ${cluster} cluster`}
        </span>
        <MeterBar className="mt-2 max-w-[22rem]" max={topValue} value={value} />
      </span>

      <span className="shrink-0 text-right">
        {/* The two numbers the page exists to show. They were set at 15px and
            12px — smaller than the company name beside them — so the board read
            as a list of names with footnotes. */}
        <span className="block text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground sm:text-[26px]">
          {money(value, symbol)}
        </span>
        <span
          className={`mt-1.5 block text-[15px] font-medium tabular-nums ${alphaClass(alpha)}`}
        >
          {signedPct(alpha)}
        </span>
        {/* What the stake is worth now. The percentage says how it moved; this
            says what it became, which is the thing a reader actually pictures. */}
        {worthNow != null && (
          <span className="mt-1 block text-[12px] tabular-nums text-foreground/45">
            now {money(worthNow, symbol)}
          </span>
        )}
      </span>
    </li>
  );
}
