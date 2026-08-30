/** The real filings on /how-it-works, drawn.
 *
 *  Four surfaces, one cast (src/lib/methodology-examples.ts):
 *
 *  - SpecimenCard      — the filing the page threads through everything,
 *                        introduced right after the thesis.
 *  - CheckInPractice   — under each check, the specimen's verdict (via the
 *                        check's own `passLine`, the same machinery the
 *                        walkthrough uses) and a real filing that failed it.
 *  - RatingExampleLine — one linked real filing under each rating meaning.
 *  - TrackedExamples   — two rated buys measured LIVE against the index. The
 *                        alpha is fetched at render (api.dealing/usDealing),
 *                        never copied into the repo: an embedded return is
 *                        stale the day after and wrong within a month. A
 *                        filing whose fetch fails, or that comes back without
 *                        a live figure, renders nothing — absent beats a
 *                        stale or invented number, the same posture as the
 *                        research panel on this page.
 *
 *  Everything gates on `examplesFor` returning non-null (UK/US only), so the
 *  page still composes for markets without an analysis layer.
 */
import type {
  ExampleFiling,
  MethodologyExamples,
} from "@/lib/methodology-examples";
import type { MethodologyCheck } from "@/lib/methodology";
import type { LivePerformance, Rating } from "@/types/ddbx";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CompanyLogo } from "@/components/company-logo";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";
import { api } from "@/lib/api";
import { specimenContext } from "@/lib/methodology-examples";

const RULE = "border-hairline dark:border-separator";
const PANEL =
  "rounded-2xl border border-hairline bg-sheet dark:border-white/[0.07] dark:bg-surface";

/** "15 Jul 2026" — the filing pages' short date shape. */
function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The worked example, introduced. Sits between the thesis and the contents
 *  strip so the reader meets the filing before the machinery that judges it. */
export function SpecimenCard({ specimen }: { specimen: ExampleFiling }) {
  return (
    <div className={`mt-6 ${PANEL} px-5 py-4`}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-brand-brown dark:text-brand-tan">
        The worked example
      </p>
      <div className="mt-3 flex items-start gap-3.5">
        <CompanyLogo size={36} ticker={specimen.ticker} />
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
            {specimen.name}
            {specimen.role ? (
              <span className="font-normal text-foreground/60">
                {" "}
                · {specimen.role}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[13.5px] leading-[1.5] text-foreground/70">
            Bought {specimen.value} of {specimen.company} shares
            {specimen.price ? ` at ${specimen.price}` : ""} on{" "}
            {shortDate(specimen.date)}.
          </p>
        </div>
        <span className="ml-auto shrink-0">
          <RatingBadge rating={specimen.rating} />
        </span>
      </div>
      <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.65] text-foreground/75">
        {specimen.line} This one purchase runs through the whole page: each
        check below shows how it was judged, and the last section shows how it
        has actually done since.{" "}
        <Link
          className="font-medium text-foreground underline underline-offset-4"
          to={specimen.path}
        >
          See the filing
        </Link>
      </p>
    </div>
  );
}

/** The verdict pair under a check: how the specimen cleared it, and a real
 *  filing that didn't. One ruled panel, two rows, so the contrast reads as
 *  one object rather than two loose paragraphs. The counter row is optional —
 *  a check with no honest counter-example in the corpus shows only the pass. */
export function CheckInPractice({
  check,
  specimen,
  counter,
}: {
  check: MethodologyCheck;
  specimen: ExampleFiling;
  counter?: ExampleFiling;
}) {
  return (
    <div
      className={`mt-4 max-w-[62ch] overflow-hidden rounded-xl border ${RULE} divide-y divide-black/[0.06] dark:divide-white/[0.08]`}
    >
      <VerdictRow passed>
        <span className="text-foreground/85">
          {check.passLine(specimenContext(specimen))}
        </span>{" "}
        <Link
          className="whitespace-nowrap text-foreground/50 underline underline-offset-4 hover:text-foreground"
          to={specimen.path}
        >
          {specimen.company}
        </Link>
      </VerdictRow>
      {counter ? (
        <VerdictRow passed={false}>
          <span className="text-foreground/70">{counter.line}</span>{" "}
          <Link
            className="whitespace-nowrap text-foreground/50 underline underline-offset-4 hover:text-foreground"
            to={counter.path}
          >
            See the filing
          </Link>
        </VerdictRow>
      ) : null}
    </div>
  );
}

function VerdictRow({
  passed,
  children,
}: {
  passed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          passed
            ? "bg-positive/10 text-positive"
            : "bg-negative/10 text-negative"
        }`}
      >
        {passed ? "✓" : "✗"}
      </span>
      {/* The tick is decorative; the words carry the verdict. */}
      <p className="text-[13.5px] leading-[1.6]">
        <span className="sr-only">{passed ? "Cleared: " : "Failed: "}</span>
        {children}
      </p>
    </div>
  );
}

/** One linked real filing under a rating's meaning. */
export function RatingExampleLine({ example }: { example: ExampleFiling }) {
  return (
    <p className="mt-2 text-[13px] leading-[1.6] text-foreground/60">
      {example.line}{" "}
      <Link
        className="whitespace-nowrap underline underline-offset-4 hover:text-foreground"
        to={example.path}
      >
        {example.company}, {shortDate(example.date)}
      </Link>
    </p>
  );
}

interface TrackedLive {
  filing: ExampleFiling;
  rating: Rating;
  alpha: number;
  basis: "disclosure" | "trade";
  asOf: string;
}

/** Two rated buys, measured live. The section above the cards explains the
 *  method; these are the method's output at its real, current values. */
export function TrackedExamples({
  examples,
  marketId,
}: {
  examples: MethodologyExamples;
  marketId: string;
}) {
  // null = still loading (skeletons hold the geometry); [] = nothing usable
  // came back (render nothing — failed and empty both end in absence here,
  // because the cards are evidence, and evidence you can't fetch isn't shown).
  const [rows, setRows] = useState<TrackedLive[] | null>(null);

  useEffect(() => {
    let alive = true;

    Promise.all(
      examples.tracked.map(async (filing): Promise<TrackedLive | null> => {
        try {
          const row =
            marketId === "us"
              ? await api.usDealing(filing.id)
              : await api.dealing(filing.id);
          const lp: LivePerformance | null | undefined = row.live_performance;
          const alpha = lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade;

          // No live figure, or no date to pin it to — the card would be a
          // number without provenance, so it isn't drawn.
          if (lp == null || alpha == null || lp.as_of == null) return null;

          return {
            filing,
            rating: row.analysis?.rating ?? filing.rating,
            alpha,
            basis: lp.alpha_pct_disclosed != null ? "disclosure" : "trade",
            asOf: lp.as_of,
          };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (alive) setRows(results.filter((r): r is TrackedLive => r !== null));
    });

    return () => {
      alive = false;
    };
  }, [examples, marketId]);

  if (rows !== null && rows.length === 0) return null;

  const hasSpecimen =
    rows?.some((r) => r.filing.id === examples.specimen.id) ?? true;

  return (
    <>
      {/* The intro lives here rather than on the page so it disappears with
          the cards: a sentence promising figures that didn't arrive is worse
          than no sentence. */}
      <p className="mt-7 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
        This is what those measurements look like up close. Two rated buys from
        this year
        {hasSpecimen
          ? ", one of them the worked example from the top of this page"
          : ""}
        , each scored live against the index over its own window. The figures
        are live and move with the market:
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows === null
          ? examples.tracked.map((t) => (
              <div key={t.id} className={`${PANEL} px-4 py-4`}>
                <Skeleton className="rounded" h={20} w="60%" />
                <Skeleton className="mt-3 rounded" h={14} w="80%" />
                <Skeleton className="mt-4 rounded" h={28} w="40%" />
              </div>
            ))
          : rows.map((row) => (
              <TrackedCard
                key={row.filing.id}
                benchmark={
                  marketId === "us" ? "the S&P 500" : "the FTSE All-Share"
                }
                row={row}
              />
            ))}
      </div>
    </>
  );
}

function TrackedCard({
  row,
  benchmark,
}: {
  row: TrackedLive;
  benchmark: string;
}) {
  const { filing, rating, alpha, basis, asOf } = row;
  // U+2212, matching formatSignedPct's minus.
  const signed = `${alpha > 0 ? "+" : alpha < 0 ? "−" : ""}${Math.abs(
    alpha,
  ).toFixed(1)}%`;

  return (
    <div className={`${PANEL} px-4 py-4`}>
      <div className="flex items-center gap-2.5">
        <CompanyLogo size={24} ticker={filing.ticker} />
        <p className="min-w-0 truncate text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
          {filing.company}
        </p>
        <span className="ml-auto shrink-0">
          <RatingBadge rating={rating} />
        </span>
      </div>
      <p className="mt-2.5 text-[12.5px] leading-[1.55] text-foreground/60">
        {filing.name}
        {filing.role ? `, ${filing.role.toLowerCase()}` : ""} · {filing.value}{" "}
        on {shortDate(filing.date)}
      </p>
      <p
        className={`mt-3 text-[22px] font-semibold tabular-nums leading-none tracking-[-0.01em] ${
          alpha > 0
            ? "text-positive"
            : alpha < 0
              ? "text-negative"
              : "text-foreground/70"
        }`}
      >
        {signed}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-[1.5] text-foreground/45">
        vs {benchmark} since{" "}
        {basis === "disclosure" ? "disclosure" : "the trade"}, as of{" "}
        {shortDate(asOf)}
      </p>
    </div>
  );
}
