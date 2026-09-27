// Performance tab of the right-hand channel.
//
// Rebuilt 2026-09-27 around what the money did. The previous cut told a
// story in three blocks (a vs-index figure with a sentence and a hit-rate
// bar, a hero pick with the insider's name, role, size and date, then a
// sector breakdown) and still read as busy — every row carried a company
// name, a person and a subline of small print. Now:
//
//   1. WINNERS — one plate. Each row is logo, ticker, what £1,000 at
//      disclosure is worth today, and the return. Tickers rather than names:
//      the rail is 280px, names truncated, and the logo already says who it
//      is. Who bought, how much and when lives in the explainer a click away.
//   2. LOSERS — the same rows for the worst three, so the rail shows both
//      sides of the ledger rather than a highlight reel.
//   3. OVERALL — the rated buys' average return beside the index's, the gap
//      in points, and how many beat it.
//
// The sector "edge" block is gone from the rail; it's the full page's job.
//
// Same gating model as before: the winners are shown a few deep and then
// gated behind the app. Losers are never gated.
//
// A pick opens an explainer modal rather than navigating: a bare "+70.2%" is
// read before it's understood, and what it measures (a share price, from a
// disclosed buy, with no position held by anyone here) has to be said before
// it can be trusted. The modal says it, then offers the app.

import type {
  ChannelContributor,
  ChannelPerformanceSummary,
} from "@/lib/performance/channel-summary";

import { useState } from "react";
import { Link } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";

import { CHANNEL_WINDOW_DAYS } from "@/lib/performance/channel-summary";
import { formatSignedPct } from "@/lib/performance/format";
import { displayTicker } from "@/lib/company";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { AppModal } from "@/components/app-modal";
import { CompanyLogo } from "@/components/company-logo";
import { panel } from "@/components/ui/panel";

interface Props {
  summary: ChannelPerformanceSummary;
  /** When true, gate the contributors behind the app CTA. */
  discretionEnabled: boolean;
  /** App Store URL for this market. */
  appHref: string;
  /** Index the live alpha is measured against. Falls back to "the market". */
  benchmarkLabel?: string;
  /** Market-currency money formatter (major units); enables the £1,000 line
   *  on each winner and in the explainer. */
  formatStake?: (n: number) => string;
  /** Compact money formatter. No longer drawn in the rail (the rows carry
   *  no deal size); kept so callers don't change. */
  formatStakeCompact?: (n: number) => string;
  /** Route for a contributor's deal detail. UK has a dedicated /dealings/:id
   *  page (the default); other markets deep-link via their own `?deal=` param
   *  so a US pick doesn't land on the UK page. */
  dealHref?: (id: string) => string;
}

/** Notional stake behind the payoff line — mirrors the iOS Highlights £1,000
 *  default ("Bought for £1,000 → now worth …"). */
const STAKE = 1000;

/** Picks that stay visible before the app gate. Generous on purpose — recent
 *  good picks are the hook, so let them breathe before the ask. */
const UNBLURRED = 4;

/** Names the slice the headline averages — the app picks whichever rated
 *  slice beat the index by most, so "rated buys" would overclaim. */
const SLICE_LABEL: Record<
  ChannelPerformanceSummary["headlineUniverse"],
  string
> = {
  every_buy: "Every buy",
  suggested: "Worth watching",
  significant: "Rated significant",
  noteworthy: "Rated noteworthy",
};

const CARD_CLASS = panel({ variant: "inset", lift: true });

function toneClass(ratio: number | null): string {
  if (ratio == null) return "text-muted";

  return ratio >= 0 ? "text-positive" : "text-negative";
}

/** "12 June" (or "12 Jun") from an ISO `YYYY-MM-DD`, formatted in UTC so the
 *  day never drifts. */
function formatDay(iso: string, style: "long" | "short" = "long"): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: style,
    timeZone: "UTC",
  });
}

/** Compact role, used by `roleClause` when a full title is too long. A PCA
 *  ("Person Closely Associated to Chair" — a spouse, a family trust) is
 *  matched before "chair" so it isn't crowned. */
const PCA_RE = /person closely associated(?:\s+(?:to|with)\s+(?:the\s+)?)?/i;

const ROLE_SHORT: [RegExp, string][] = [
  [PCA_RE, "Associate"],
  [/chief executive|\bceo\b/i, "CEO"],
  [/chief financial|finance director|\bcfo\b/i, "CFO"],
  [/chief operating|\bcoo\b/i, "COO"],
  [/chair/i, "Chair"],
  [/non[- ]exec|\bned\b/i, "Non-exec"],
  [/director/i, "Director"],
];

function shortRole(role?: string): string | undefined {
  if (!role) return undefined;
  for (const [re, short] of ROLE_SHORT) if (re.test(role)) return short;

  return role.length <= 14 ? role : undefined;
}

/** The role as a clause the explainer sentence can carry: "Rahul Dhir, Chief
 *  Executive Officer, bought …". A PCA becomes "an associate of the Chair"
 *  because the regulatory label means nothing to a reader. */
function roleClause(role?: string): string | undefined {
  if (!role) return undefined;
  const pca = role.match(PCA_RE);

  if (pca) {
    const rest = role.slice(pca.index! + pca[0].length).trim();

    return rest ? `an associate of the ${rest}` : "an associate of a director";
  }

  return role.length <= 28 ? role : shortRole(role);
}

export function ChannelPerformance({
  summary,
  discretionEnabled,
  appHref,
  benchmarkLabel,
  formatStake,
  dealHref,
}: Props) {
  const index = benchmarkLabel ?? "the market";
  const [explained, setExplained] = useState<ChannelContributor | null>(null);
  const hasPicks =
    summary.contributors.length > 0 || summary.laggards.length > 0;

  return (
    <div className="px-5 lg:px-4 py-3.5 space-y-5">
      <PickList
        window
        appHref={appHref}
        formatStake={formatStake}
        gated={discretionEnabled}
        rows={summary.contributors}
        title="Winners"
        onOpen={setExplained}
      />

      <PickList
        appHref={appHref}
        formatStake={formatStake}
        gated={false}
        rows={summary.laggards}
        title="Losers"
        onOpen={setExplained}
      />

      {hasPicks && (
        <p className="-mt-3 text-caption text-muted">
          Share price since the director&rsquo;s buy was disclosed.
        </p>
      )}

      <Scorecard index={index} summary={summary} />

      <ContributorExplainer
        appHref={appHref}
        dealHref={dealHref}
        formatStake={formatStake}
        row={explained}
        onClose={() => setExplained(null)}
      />
    </div>
  );
}

/** A plate of picks: one uniform row each, ending in the app gate when
 *  gated. The winners list is winners-only and the losers list losers-only,
 *  so a row's colour never contradicts its heading. */
function PickList({
  title,
  window: showWindow = false,
  rows,
  gated,
  appHref,
  formatStake,
  onOpen,
}: {
  title: string;
  /** Show the "Last 90 days" caption beside the heading (first list only). */
  window?: boolean;
  rows: ChannelContributor[];
  gated: boolean;
  appHref: string;
  formatStake?: (n: number) => string;
  onOpen: (row: ChannelContributor) => void;
}) {
  if (rows.length === 0) return null;

  const visible = gated ? rows.slice(0, UNBLURRED) : rows;
  const hiddenCount = gated ? Math.max(0, rows.length - UNBLURRED) : 0;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        {showWindow && (
          <span className="micro text-muted">
            Last {CHANNEL_WINDOW_DAYS} days
          </span>
        )}
      </div>

      <ul
        className={`mt-2 divide-y divide-hairline/80 overflow-hidden ${CARD_CLASS} dark:divide-border/50`}
      >
        {visible.map((row) => (
          <PickRow
            key={row.id}
            formatStake={formatStake}
            row={row}
            onOpen={onOpen}
          />
        ))}

        {gated && hiddenCount > 0 && (
          <li>
            <a
              className="group flex items-center justify-center gap-1.5 px-3 py-2.5 micro text-brand-brown transition-colors hover:bg-brand-brown/[0.06] dark:text-brand-tan dark:hover:bg-surface-secondary/80"
              data-ga-event="cta_channel_see_all_picks_in_app"
              data-ga-label={`See all ${rows.length} picks in app`}
              href={appHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <LockClosedIcon className="h-3 w-3 opacity-70" />
              <span className="whitespace-nowrap">
                {hiddenCount} more in the app
              </span>
            </a>
          </li>
        )}
      </ul>
    </section>
  );
}

/** Logo, ticker, what £1,000 became, and the return on the shared right
 *  edge. Nothing else: who bought and when is the explainer's job. */
function PickRow({
  row,
  formatStake,
  onOpen,
}: {
  row: ChannelContributor;
  formatStake?: (n: number) => string;
  onOpen: (row: ChannelContributor) => void;
}) {
  return (
    <li>
      <button
        aria-label={`${row.company}: ${formatSignedPct(row.returnPct)} since disclosure`}
        className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-surface-secondary/60"
        data-ga-event="cta_channel_open_contributor_explainer"
        data-ga-label={row.ticker}
        type="button"
        onClick={() => onOpen(row)}
      >
        <CompanyLogo size={32} ticker={row.ticker} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-body font-semibold leading-tight text-foreground group-hover:text-brand-brown dark:group-hover:text-brand-tan">
            {displayTicker(row.ticker)}
          </span>
          {formatStake && (
            <span className="mt-0.5 block truncate text-caption leading-tight text-muted tabular-nums">
              {formatStake(STAKE)} →{" "}
              <span className="font-semibold text-foreground">
                {formatStake(STAKE * (1 + row.returnPct))}
              </span>
            </span>
          )}
        </span>
        <span
          className={`shrink-0 text-lede font-bold tabular-nums ${toneClass(row.returnPct)}`}
        >
          {formatSignedPct(row.returnPct)}
        </span>
      </button>
    </li>
  );
}

/** The footnote to the winners: not just the best few — how the whole rated
 *  slice did against the index, and how many of them beat it. */
function Scorecard({
  summary,
  index,
}: {
  summary: ChannelPerformanceSummary;
  index: string;
}) {
  const {
    alphaPct,
    picksReturnPct,
    benchmarkReturnPct,
    marketBeatCount,
    marketBeatTotal,
    sampleSize,
    totalBuys,
    headlineUniverse,
  } = summary;
  const everyBuy = headlineUniverse === "every_buy" || sampleSize === totalBuys;
  const pp = alphaPct == null ? null : alphaPct * 100;
  const level = pp != null && Math.abs(pp) < 0.05;
  const ahead = pp != null && pp > 0;

  return (
    <section className="border-t border-rule pt-3">
      <Eyebrow>Overall</Eyebrow>

      {picksReturnPct == null ? (
        <p className="mt-2 text-small text-muted">Not enough data yet</p>
      ) : (
        <>
          {/* The two averages side by side: what the buys did, what the index
              did over the same days. The gap is the line beneath. */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="text-caption text-muted">
                {everyBuy ? "Every buy" : SLICE_LABEL[headlineUniverse]}
              </div>
              <div
                className={`text-figure font-semibold tabular-nums ${toneClass(picksReturnPct)}`}
              >
                {formatSignedPct(picksReturnPct)}
              </div>
            </div>
            {benchmarkReturnPct != null && (
              <div>
                <div className="truncate text-caption text-muted">{index}</div>
                <div className="text-figure font-semibold tabular-nums text-foreground/70">
                  {formatSignedPct(benchmarkReturnPct)}
                </div>
              </div>
            )}
          </div>
          {pp != null && (
            <p className="mt-1.5 text-small text-foreground/70">
              {level ? (
                "Level with the index"
              ) : (
                <>
                  <span
                    className={`font-semibold tabular-nums ${ahead ? "text-positive" : "text-negative"}`}
                  >
                    {Math.abs(pp).toFixed(1)}pp
                  </span>{" "}
                  {ahead ? "ahead of" : "behind"} the index
                </>
              )}
            </p>
          )}
        </>
      )}

      {marketBeatTotal > 0 && (
        <HitRate count={marketBeatCount} total={marketBeatTotal} />
      )}
    </section>
  );
}

/** The hit rate as one hairline row: caption left, share right, a thin bar
 *  under both. Colour carries meaning — green only once more than half beat
 *  the index. */
function HitRate({ count, total }: { count: number; total: number }) {
  const rate = count / total;
  const good = rate >= 0.5;

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-caption text-foreground/70 tabular-nums">
          <span className="font-semibold text-foreground">{count}</span> of{" "}
          {total} beat it
        </span>
        <span
          className={`text-num leading-none tabular-nums ${good ? "text-positive" : "text-foreground/70"}`}
        >
          {Math.round(rate * 100)}%
        </span>
      </div>
      <div
        aria-label={`${count} of ${total} buys beat the index`}
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10"
        role="img"
      >
        <div
          className={`h-full rounded-full ${good ? "bg-positive dark:bg-positive/80" : "bg-foreground/40"}`}
          style={{ width: `${rate * 100}%` }}
        />
      </div>
    </div>
  );
}

/** What that green number actually is, and how to get the rest of them.
 *
 *  Three things it has to do, in order: say what's being measured (a
 *  share-price change from a disclosed buy, not a ddbx trade and not a
 *  recommendation), say what it isn't (advice, a guarantee, a live price), and
 *  then offer the app — because the honest version of this rail's pitch is
 *  "these are the ones we're showing you; the app is where the rest live". */
function ContributorExplainer({
  row,
  onClose,
  appHref,
  formatStake,
  dealHref,
}: {
  row: ChannelContributor | null;
  onClose: () => void;
  appHref: string;
  formatStake?: (n: number) => string;
  dealHref?: (id: string) => string;
}) {
  return (
    <AppModal
      maxWidthClass="max-w-md"
      open={row !== null}
      subtitle={row ? row.ticker : undefined}
      title={row ? row.company : ""}
      onClose={onClose}
    >
      {row && (
        <>
          <div className="flex items-center gap-3">
            <CompanyLogo size={48} ticker={row.ticker} />
            <div>
              <p
                className={`text-3xl font-bold tabular-nums ${toneClass(row.returnPct)}`}
              >
                {formatSignedPct(row.returnPct)}
              </p>
              <p className="text-caption text-muted">
                share price since {formatDay(row.disclosedDate)}, {row.daysHeld}{" "}
                {row.daysHeld === 1 ? "day" : "days"} ago
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-card bg-foreground/[0.04] px-3.5 py-3 text-small leading-relaxed text-muted">
            <span className="font-semibold text-foreground">
              {row.insiderName}
            </span>
            {roleClause(row.insiderRole)
              ? `, ${roleClause(row.insiderRole)},`
              : ""}{" "}
            disclosed buying{" "}
            {row.value != null && formatStake ? (
              <span className="font-semibold tabular-nums text-foreground">
                {formatStake(row.value)}
              </span>
            ) : (
              "shares"
            )}{" "}
            on {formatDay(row.disclosedDate)}.
            {formatStake && (
              <>
                {" "}
                {formatStake(STAKE)} at disclosure would be{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatStake(STAKE * (1 + row.returnPct))}
                </span>{" "}
                today.
              </>
            )}
          </p>

          <div className="mt-5 space-y-3 text-small leading-relaxed text-foreground/70">
            <p>
              <span className="font-semibold text-foreground">
                What you&rsquo;re looking at.
              </span>{" "}
              A director or insider at {row.company} disclosed buying shares
              with their own money. This is what the share price has done from
              the day that purchase was disclosed to the latest close we hold.
              Nothing has been bought or sold by ddbx, and nobody is holding a
              position.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                Why this one is here.
              </span>{" "}
              {row.returnPct >= 0 ? (
                <>
                  It&rsquo;s among the strongest performers of every disclosed
                  buy in the last {CHANNEL_WINDOW_DAYS} days. It&rsquo;s a
                  winner chosen after the fact, so read it as evidence that
                  insider buying is worth watching, not as a prediction about
                  this company.
                </>
              ) : (
                <>
                  It&rsquo;s among the weakest performers of the last{" "}
                  {CHANNEL_WINDOW_DAYS} days. We show the losers beside the
                  winners because a director buying is a signal, not a
                  guarantee.
                </>
              )}
            </p>
            <p>
              Past performance is not a reliable indicator of future results.
              ddbx is information, not financial advice, and capital is at risk.
            </p>
          </div>

          <a
            className={`mt-6 flex w-full items-center justify-center ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3.5 text-lede font-semibold transition-colors`}
            data-ga-event="cta_channel_picks_explainer_download"
            data-ga-label={row.ticker}
            href={appHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Get the app. Every buy as it files
          </a>
          <p className="mt-2 text-center text-caption text-muted">
            Free for 7 days, cancel any time.
          </p>

          {/* The old destination, kept as the quiet second option — someone
              who wanted the filing rather than the explanation still gets
              there in one more click. */}
          <Link
            className="mt-4 block text-center text-small text-foreground/55 underline underline-offset-4 hover:text-foreground"
            data-ga-event="cta_channel_picks_explainer_see_filing"
            data-ga-label={row.ticker}
            to={dealHref ? dealHref(row.id) : `/dealings/${row.id}`}
            onClick={onClose}
          >
            See the filing on the site
          </Link>
        </>
      )}
    </AppModal>
  );
}

/** The rail's single heading device — the house eyebrow spec at the dense-rail
 *  size. One repeated label lets the sentences and figures carry the panel. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="whitespace-nowrap micro text-foreground/55 @max-[19rem]:tracking-widest">
      {children}
    </h3>
  );
}
