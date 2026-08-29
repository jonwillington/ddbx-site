// "Company focus" section for the UK homepage — where the buying is
// concentrated, in two strands: cluster episodes (several directors, one
// company, days apart) and the companies whose buys are performing best.
// Both are computed from the already-loaded 90-day channel window via the
// same shared/boards.js helpers the board pages use, so a figure here can
// never disagree with /cluster-buys or /best-performing-buys — and the
// section costs no extra network.
//
// Scope is labelled "last 90 days" deliberately: the board pages rank a
// 12-month window, so the two surfaces answer different questions and can't
// contradict each other. Cards link to the company pages; each strand's
// footer links to its board. Empty ≠ failed: a strand with nothing to show
// falls back to a number-free teaser for its board page, never "0 clusters".
import type { Dealing } from "@/types/ddbx";
import type { MarketDealing } from "@/lib/markets/types";
import type { ClusterEpisode, CompanyActivity } from "../../../shared/boards";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { companyRollup, rankClusters } from "../../../shared/boards.js";

import { AlphaBadge } from "@/components/boards/filing-row";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/skeleton";
import { cleanCompanyName, companyPath } from "@/lib/company";
import { formatGbp } from "@/lib/performance/format";

const CARD_CLASS =
  "flex items-center gap-3 rounded-xl border border-hairline bg-sheet px-3.5 py-3 transition-colors hover:border-brand-brown/30 dark:border-separator dark:bg-surface dark:hover:border-brand-tan/30";

/** Top performers need at least this many priced buys before a median means
 *  anything — one lucky pick shouldn't crown a company. */
const MIN_ALPHA_COUNT = 2;
const MAX_PER_STRAND = 3;

export function UkHomeSpotlights({
  dealings,
  failed,
}: {
  /** The 90-day channel window — null while loading. */
  dealings: MarketDealing<Dealing>[] | null;
  /** True when the channel fetch errored. */
  failed: boolean;
}) {
  const raw = useMemo(() => dealings?.map((d) => d.raw) ?? null, [dealings]);

  const clusters = useMemo<ClusterEpisode[]>(
    () => (raw ? rankClusters(raw, "UK", MAX_PER_STRAND).rows : []),
    [raw],
  );
  const topCompanies = useMemo<CompanyActivity[]>(
    () =>
      raw
        ? companyRollup(raw, "UK")
            .filter(
              (c) => c.medianAlpha != null && c.alphaCount >= MIN_ALPHA_COUNT,
            )
            .sort((a, b) => (b.medianAlpha ?? 0) - (a.medianAlpha ?? 0))
            .slice(0, MAX_PER_STRAND)
        : [],
    [raw],
  );

  const loading = raw === null && !failed;

  return (
    <section aria-label="Company focus" className="w-full pt-14 md:pt-20">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Company focus · last 90 days
        </p>
        <h2 className="text-[20px] font-semibold leading-[1.2] tracking-[-0.015em] text-foreground sm:text-[22px]">
          Where the buying is concentrated
        </h2>
      </header>

      <div className="mt-6 space-y-8">
        <Strand
          boardHref="/cluster-buys"
          boardLabel="See all cluster buys"
          loading={loading}
          teaser="Cluster buys: several directors, one company, days apart."
          title="Directors buying together"
        >
          {clusters.map((ep) => (
            <SpotlightCard
              key={`${ep.ticker}-${ep.firstDate}`}
              detail={
                <>
                  {ep.named} directors bought{" "}
                  {ep.spanDays === 0
                    ? "on the same day"
                    : `within ${ep.spanDays} days`}
                  {ep.value > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="tabular-nums">
                        {formatGbp(ep.value, { compact: true })}
                      </span>
                    </>
                  )}
                </>
              }
              ticker={ep.ticker}
              title={cleanCompanyName(ep.company) || ep.ticker}
            />
          ))}
        </Strand>

        <Strand
          boardHref="/best-performing-buys"
          boardLabel="See the best-performing buys"
          extraLinks={[
            { href: "/most-active-companies", label: "Most-active companies" },
          ]}
          loading={loading}
          teaser="Best performers: ranked by alpha since the buy."
          title="Best-performing companies"
        >
          {topCompanies.map((c) => (
            <SpotlightCard
              key={c.ticker}
              badge={<AlphaBadge ratio={c.medianAlpha} />}
              detail={
                <>
                  median of {c.alphaCount} buys · {c.filings}{" "}
                  {c.filings === 1 ? "buy" : "buys"} · {c.insiders}{" "}
                  {c.insiders === 1 ? "director" : "directors"}
                </>
              }
              ticker={c.ticker}
              title={cleanCompanyName(c.company) || c.ticker}
            />
          ))}
        </Strand>
      </div>
    </section>
  );
}

/** One strand: a small heading, its cards (or skeleton / teaser fallback),
 *  and the link out to the board page that ranks the full 12 months. */
function Strand({
  title,
  children,
  loading,
  teaser,
  boardHref,
  boardLabel,
  extraLinks,
}: {
  title: string;
  children: React.ReactNode[];
  loading: boolean;
  teaser: string;
  boardHref: string;
  boardLabel: string;
  extraLinks?: { href: string; label: string }[];
}) {
  const hasCards = children.length > 0;

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-foreground/85">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: MAX_PER_STRAND }).map((_, i) => (
            <div key={i} className={CARD_CLASS}>
              <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))
        ) : hasCards ? (
          children
        ) : (
          // Failed fetch or an empty 90-day strand: point at the board page
          // that ranks the full year — a real destination, no invented zeros.
          <Link
            className={`${CARD_CLASS} sm:col-span-3`}
            data-ga-event="cta_home_spotlight_board"
            data-ga-label={boardHref}
            to={boardHref}
          >
            <span className="min-w-0 flex-1 text-sm text-foreground/70">
              {teaser}
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        )}
      </div>
      {hasCards && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {[{ href: boardHref, label: boardLabel }, ...(extraLinks ?? [])].map(
            (l) => (
              <Link
                key={l.href}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-brown hover:underline dark:text-brand-tan"
                data-ga-event="cta_home_spotlight_board"
                data-ga-label={l.href}
                to={l.href}
              >
                {l.label}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SpotlightCard({
  ticker,
  title,
  detail,
  badge,
}: {
  ticker: string;
  title: string;
  detail: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      className={CARD_CLASS}
      data-ga-event="cta_home_spotlight_company"
      data-ga-label={ticker}
      to={companyPath(ticker)}
    >
      <CompanyLogo size={34} ticker={ticker} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-xs text-foreground/55">{detail}</span>
      </span>
      {badge && <span className="shrink-0">{badge}</span>}
    </Link>
  );
}
