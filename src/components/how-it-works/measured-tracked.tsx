/** Two rated buys, measured live, as rows rather than cards.
 *
 *  ---------------------------------------------------------------------------
 *  Why rows
 *  ---------------------------------------------------------------------------
 *
 *  The card version (`TrackedExamples`, in the since-deleted worked-examples.tsx) put each filing
 *  in its own bordered box side by side, which is the one arrangement that
 *  makes two numbers hard to compare: the figures sit at different heights in
 *  different boxes with a gutter between them. The design language's third
 *  tenet is the full-width hairline row, and it is right here for the ordinary
 *  reason — the alphas land in one column, at one x, and read down.
 *
 *  It also gives the section's proof objects a shape distinct from the panel
 *  above them. The rail is the size of the record; these are two readings out
 *  of it. Two panels stacked would have read as one thing said twice.
 *
 *  ---------------------------------------------------------------------------
 *  Truth posture (unchanged from the cards — do not relax any of this)
 *  ---------------------------------------------------------------------------
 *
 *  Nothing here is embedded. Each filing is fetched at render by id, the alpha
 *  comes off the live row (`alpha_pct_disclosed`, falling back to
 *  `alpha_pct_trade`), the rating comes off the live analysis rather than the
 *  curated fallback, and `as_of` is required — a return with no date on it is
 *  a number without provenance and is not drawn. A copied return is stale the
 *  day after and wrong within a month.
 *
 *  What IS new is that failure and emptiness are told apart. The card version
 *  collapsed both into absence, so a broken API and a filing that simply has
 *  no figure yet produced the same silent gap. Here:
 *
 *    - some rows came back        → draw them
 *    - none came back, fetches threw → one quiet line saying the figures did
 *                                      not load (nothing stale is invented)
 *    - none came back, no fetch threw → nothing at all: the filings genuinely
 *                                      have no measured figure yet, and a
 *                                      sentence about that is noise
 *
 *  The intro sentence lives inside this component, so it disappears with the
 *  rows it promises.
 */
import type { MethodologyExamples } from "@/lib/methodology-examples";
import type { LivePerformance, Rating } from "@/types/ddbx";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import { RULE, shortDate } from "@/components/how-it-works/shared";
import { SpecimenMark } from "@/components/how-it-works/specimen-mark";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";
import { api } from "@/lib/api";
const ROW_LINK =
  "group relative -mx-2 block rounded-lg px-2 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";
/** Mark lane, logo, subject, figure. The figure track only exists from `sm`;
 *  below that it drops under the subject rather than squeezing the name, which
 *  is the one thing in the row that must never truncate. */
const GRID =
  "grid grid-cols-[1rem_2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 sm:grid-cols-[1rem_2.75rem_minmax(0,1fr)_11.5rem]";

interface TrackedLive {
  filing: MethodologyExamples["tracked"][number];
  rating: Rating;
  alpha: number;
  basis: "disclosure" | "trade";
  asOf: string;
  isSpecimen: boolean;
}

export function MeasuredExamples({
  examples,
  marketId,
}: {
  examples: MethodologyExamples;
  marketId: string;
}) {
  // null = in flight (skeletons hold the arrived geometry).
  const [rows, setRows] = useState<TrackedLive[] | null>(null);
  const [threw, setThrew] = useState(false);

  useEffect(() => {
    let alive = true;

    setRows(null);
    setThrew(false);

    Promise.all(
      examples.tracked.map(
        async (
          filing,
        ): Promise<{ row: TrackedLive } | { failed: true } | null> => {
          try {
            const live =
              marketId === "us"
                ? await api.usDealing(filing.id)
                : await api.dealing(filing.id);
            const lp: LivePerformance | null | undefined =
              live.live_performance;
            const alpha = lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade;

            // No live figure, or no date to pin it to. Not a failure — this
            // filing simply has no measurement yet — so it returns null and
            // says nothing.
            if (lp == null || alpha == null || lp.as_of == null) return null;

            return {
              row: {
                filing,
                rating: live.analysis?.rating ?? filing.rating,
                alpha,
                basis: lp.alpha_pct_disclosed != null ? "disclosure" : "trade",
                asOf: lp.as_of,
                isSpecimen: filing.id === examples.specimen.id,
              },
            };
          } catch {
            return { failed: true };
          }
        },
      ),
    ).then((results) => {
      if (!alive) return;
      setRows(
        results
          .map((r) => (r && "row" in r ? r.row : null))
          .filter((r): r is TrackedLive => r !== null),
      );
      setThrew(results.some((r) => r != null && "failed" in r));
    });

    return () => {
      alive = false;
    };
  }, [examples, marketId]);

  // Fetched, and nothing usable came back. Two different silences.
  if (rows !== null && rows.length === 0) {
    if (!threw) return null;

    return (
      <p className="mt-6 max-w-[64ch] text-[14px] leading-[1.65] text-foreground/55">
        The live figures for the worked filings did not come back this time.
        They are read from the API at the moment you load the page and are never
        stored here, so nothing is shown rather than something out of date.
      </p>
    );
  }

  const hasSpecimen = rows?.some((r) => r.isSpecimen) ?? true;
  const benchmark = marketId === "us" ? "the S&P 500" : "the FTSE All-Share";

  return (
    <>
      <p className="mt-7 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
        Two of those measurements up close. Two rated buys
        {hasSpecimen
          ? ", one of them the worked example threaded through this page"
          : ""}
        , each scored against {benchmark} over its own window. The figures are
        read from the API as you load the page and move with the market:
      </p>

      <div className={`mt-5 border-t ${RULE}`}>
        {rows === null
          ? examples.tracked.map((t) => (
              <div key={t.id} className={`border-b py-4 ${RULE}`}>
                <div className={GRID}>
                  <span />
                  <Skeleton circle h={44} w={44} />
                  <div>
                    <Skeleton className="rounded" h={16} w="45%" />
                    <Skeleton className="mt-2 rounded" h={12} w="75%" />
                  </div>
                  <div className="col-start-3 sm:col-start-4 sm:row-start-1">
                    <Skeleton className="rounded" h={20} w={72} />
                    <Skeleton className="mt-2 rounded" h={11} w="90%" />
                  </div>
                </div>
              </div>
            ))
          : rows.map((row) => (
              <TrackedRow key={row.filing.id} benchmark={benchmark} row={row} />
            ))}
      </div>
    </>
  );
}

function TrackedRow({
  row,
  benchmark,
}: {
  row: TrackedLive;
  benchmark: string;
}) {
  const { filing, rating, alpha, basis, asOf, isSpecimen } = row;
  // U+2212, matching formatSignedPct's minus.
  const signed = `${alpha > 0 ? "+" : alpha < 0 ? "−" : ""}${Math.abs(
    alpha,
  ).toFixed(1)}%`;

  return (
    <div className={`border-b ${RULE}`}>
      <Link className={`${ROW_LINK} py-4`} to={filing.path}>
        <div className={GRID}>
          {/* The specimen mark's lane. Present on both rows so the logos line
              up whether or not the specimen is one of them. */}
          <span className="flex h-11 items-center justify-center">
            {isSpecimen ? <SpecimenMark /> : null}
            {isSpecimen ? (
              <span className="sr-only">The worked example. </span>
            ) : null}
          </span>

          <CompanyLogo size={44} ticker={filing.ticker} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="text-[16px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground group-hover:underline group-hover:underline-offset-4">
                {filing.company}
              </p>
              <RatingBadge rating={rating} />
            </div>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-foreground/60">
              {filing.name}
              {filing.role ? `, ${filing.role.toLowerCase()}` : ""} ·{" "}
              {filing.value} on {shortDate(filing.date)}
            </p>
          </div>

          {/* The only colour in this section, and the reason the section is
              allowed it: this is a market outcome, measured. */}
          <div className="col-start-3 sm:col-start-4 sm:row-start-1 sm:text-right">
            <p
              className={`text-[22px] font-semibold tabular-nums leading-none tracking-[-0.02em] ${
                alpha > 0
                  ? "text-positive"
                  : alpha < 0
                    ? "text-negative"
                    : "text-foreground/70"
              }`}
            >
              {signed}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-[1.45] text-foreground/45">
              vs {benchmark} since{" "}
              {basis === "disclosure" ? "disclosure" : "the trade"}, as of{" "}
              {shortDate(asOf)}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
