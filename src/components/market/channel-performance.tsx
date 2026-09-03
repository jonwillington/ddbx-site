// Performance tab of the right-hand channel.
//
// The previous version was five widgets that each answered "did the picks
// beat the market?" — a verdict, a pair of percentages, a hit-rate bar, a
// sector list and a style race — and none of them contained a sentence. A
// reader was handed data and left to assemble the story. This one tells it:
//
//   1. THE STORY — one figure ("+3.5pp ahead of the FTSE All-Share"), one
//      line naming the rated slice and both returns, and the hit rate as a
//      row. The total sits in the eyebrow so the numbers reconcile.
//   2. THE PICKS — one plate: the top performer with who / how much / when
//      under its name and the £1,000 payoff line (the one thing the old rail
//      already did right), then the runners-up as rows with the same subline.
//   3. THE EDGE — where the outperformance came from: at most three sector
//      rows, each with its sample size, so a two-buy sector can't masquerade
//      as a trend.
//
// Kept deliberately short. A first cut told the whole story in prose and the
// rail read as a wall of text; the words that survive are the ones a figure
// can't carry on its own — which slice, who bought, and what £1,000 became.
//
// Same gating model as before. The PROOF is free (the story, the edge); the
// ACTION — which specific stocks drove it — is shown a few deep and then
// gated behind the app. The contrarian/momentum race no longer renders here:
// it's the full page's job, and in a 320px rail it was a fifth "vs" frame.
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
import { AppModal } from "@/components/app-modal";
import { CompanyLogo } from "@/components/company-logo";

interface Props {
  summary: ChannelPerformanceSummary;
  /** When true, gate the contributors behind the app CTA. */
  discretionEnabled: boolean;
  /** App Store URL for this market. */
  appHref: string;
  /** Index the live alpha is measured against — named throughout the story.
   *  Falls back to "the market". */
  benchmarkLabel?: string;
  /** Market-currency money formatter (major units); enables the payoff line
   *  and the "bought £250,000" clause. */
  formatStake?: (n: number) => string;
  /** Compact variant ("£48k") for the runners-up sublines. Falls back to
   *  `formatStake`. */
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

/** Sectors the edge section lists. Three is what the sentence can name. */
const MAX_EDGE_SECTORS = 3;

/** Honest adjective for the rated slice the headline reflects — "the 18 our
 *  analysis rated noteworthy". `every_buy` takes a different sentence. */
const SLICE_ADJECTIVE: Record<
  ChannelPerformanceSummary["headlineUniverse"],
  string
> = {
  every_buy: "",
  suggested: "worth watching",
  significant: "significant",
  noteworthy: "noteworthy",
};

const CARD_CLASS =
  "rounded-2xl border border-hairline bg-white/45 shadow-[0_12px_32px_-28px_rgba(61,43,26,0.7)] dark:border-border/70 dark:bg-surface-secondary/35";

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

/** "up 5.6%" / "down 2.1%" / "flat" — the story reads returns as words, not
 *  signed figures, because "+5.6%" in a sentence is a table cell that got
 *  lost. */
function upDown(ratio: number): string {
  const pct = Math.abs(ratio * 100).toFixed(1);

  if (Math.abs(ratio) < 0.0005) return "flat";

  return ratio > 0 ? `up ${pct}%` : `down ${pct}%`;
}

/** Compact role for the runners-up sublines, where "Non-Executive Director"
 *  would eat the row. Unknown titles pass through when short, otherwise the
 *  name is used instead. A PCA ("Person Closely Associated to Chair" — a
 *  spouse, a family trust) is matched before "chair" so it isn't crowned. */
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

/** The role as a clause the hero sentence can carry: "Rahul Dhir, Chief
 *  Executive Officer, bought …". A PCA becomes "an associate of the Chair"
 *  because the regulatory label means nothing to a reader; anything else
 *  keeps its full title unless it's too long for a 320px rail, when the
 *  compact form stands in or the clause is dropped. */
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
  formatStakeCompact,
  dealHref,
}: Props) {
  const index = benchmarkLabel ?? "the market";

  return (
    <div className="px-5 lg:px-4 py-3.5 space-y-4">
      <Story index={index} summary={summary} />

      <Picks
        appHref={appHref}
        dealHref={dealHref}
        formatStake={formatStake}
        formatStakeCompact={formatStakeCompact ?? formatStake}
        gated={discretionEnabled}
        rows={summary.contributors}
      />

      <Edge index={index} sectors={summary.sectors} />
    </div>
  );
}

/** The story: one figure, one paragraph, one bar. Replaces the old verdict
 *  card, the two-row comparison strip and the separate hit-rate panel, all
 *  of which said "vs market" in a different voice. */
function Story({
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
    lastUpdated,
    totalBuys,
    sampleSize,
    headlineUniverse,
  } = summary;

  const pp = alphaPct == null ? null : alphaPct * 100;
  const level = pp != null && Math.abs(pp) < 0.05;
  const ahead = pp != null && pp > 0;
  const figureTone = level
    ? "text-foreground"
    : ahead
      ? "text-positive"
      : "text-negative";

  return (
    <section className={`relative overflow-hidden px-3.5 py-3 ${CARD_CLASS}`}>
      {/* The one permitted sub-perceptual wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-positive/10 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>
            Last {CHANNEL_WINDOW_DAYS} days · {totalBuys}{" "}
            {totalBuys === 1 ? "buy" : "buys"}
          </Eyebrow>
          <span className="font-mono text-[10px] text-muted tabular-nums">
            {lastUpdated ? `to ${formatDay(lastUpdated, "short")}` : ""}
          </span>
        </div>

        {pp == null ? (
          <p className="mt-2 text-[15px] font-semibold text-foreground">
            Not enough data yet
          </p>
        ) : (
          <p className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-[1.85rem] font-semibold leading-none tracking-[-0.03em] tabular-nums ${figureTone}`}
            >
              {level
                ? "Level"
                : `${ahead ? "+" : "−"}${Math.abs(pp).toFixed(1)}pp`}
            </span>
            <span className="text-[12px] leading-tight text-foreground/60">
              {level
                ? `with the ${index}`
                : ahead
                  ? `ahead of the ${index}`
                  : `behind the ${index}`}
            </span>
          </p>
        )}

        {picksReturnPct != null && (
          <p className="mt-1.5 text-[12px] leading-snug text-foreground/70">
            <StorySentence
              benchmarkReturnPct={benchmarkReturnPct}
              headlineUniverse={headlineUniverse}
              picksReturnPct={picksReturnPct}
              sampleSize={sampleSize}
              totalBuys={totalBuys}
            />
          </p>
        )}

        {marketBeatTotal > 0 && (
          <HitRate count={marketBeatCount} total={marketBeatTotal} />
        )}
      </div>
    </section>
  );
}

/** One line under the figure: "The 110 rated noteworthy are up 5.6%, vs
 *  +2.1% for the index." The total sits in the eyebrow, the index is named
 *  beside the figure, so the sentence only has to say which slice and what
 *  it did. A missing benchmark drops its clause rather than printing a dash. */
function StorySentence({
  totalBuys,
  sampleSize,
  headlineUniverse,
  picksReturnPct,
  benchmarkReturnPct,
}: {
  totalBuys: number;
  sampleSize: number;
  headlineUniverse: ChannelPerformanceSummary["headlineUniverse"];
  picksReturnPct: number;
  benchmarkReturnPct: number | null;
}) {
  const everyBuy = headlineUniverse === "every_buy" || sampleSize === totalBuys;
  const subject = everyBuy ? (
    <>Equal-weighted, {totalBuys === 1 ? "it is" : "they are"}</>
  ) : (
    <>
      The{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {sampleSize}
      </span>{" "}
      rated {SLICE_ADJECTIVE[headlineUniverse]}{" "}
      {sampleSize === 1 ? "is" : "are"}
    </>
  );

  return (
    <>
      {subject}{" "}
      <span
        className={`font-semibold tabular-nums ${toneClass(picksReturnPct)}`}
      >
        {upDown(picksReturnPct)}
      </span>
      {benchmarkReturnPct != null && (
        <>
          , vs{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatSignedPct(benchmarkReturnPct)}
          </span>{" "}
          for the index
        </>
      )}
      .
    </>
  );
}

/** The hit rate as one hairline row: caption left, share right, a thin bar
 *  under both. Colour carries meaning — green only once more than half beat
 *  the index. */
function HitRate({ count, total }: { count: number; total: number }) {
  const rate = count / total;
  const good = rate >= 0.5;

  return (
    <div className="mt-2.5 border-t border-hairline/90 pt-2 dark:border-border/60">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] text-foreground/70 tabular-nums">
          <span className="font-semibold text-foreground">{count}</span> of{" "}
          {total} beat it
        </span>
        <span
          className={`text-[13px] font-semibold leading-none tabular-nums ${good ? "text-positive" : "text-foreground/70"}`}
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

/** Where the outperformance came from: at most three hairline rows, each
 *  carrying its sector's sample size so the reader can see when a lead rests
 *  on two buys. Sectors that trailed the index aren't an edge and don't
 *  appear. */
function Edge({
  sectors,
  index,
}: {
  sectors: ChannelPerformanceSummary["sectors"];
  index: string;
}) {
  const leaders = sectors
    .filter((s) => s.meanAlphaPct > 0)
    .slice(0, MAX_EDGE_SECTORS);

  if (leaders.length === 0) return null;

  return (
    <section className="border-t border-hairline pt-3 dark:border-border/60">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Where the edge came from</Eyebrow>
        <span className="shrink-0 text-[10px] text-muted">vs {index}</span>
      </div>
      <ul className="mt-2 divide-y divide-hairline/80 border-y border-hairline/80 dark:divide-border/50 dark:border-border/50">
        {leaders.map((s) => (
          <li
            key={s.sector}
            className="flex items-baseline justify-between gap-2 py-1.5"
          >
            <span className="min-w-0 truncate text-[12px] text-foreground/85">
              {s.sector}
              <span className="ml-1.5 font-mono text-[9.5px] text-muted tabular-nums">
                {s.dealCount} {s.dealCount === 1 ? "buy" : "buys"}
              </span>
            </span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-positive">
              {formatSignedPct(s.meanAlphaPct)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Picks({
  rows,
  gated,
  appHref,
  formatStake,
  formatStakeCompact,
  dealHref,
}: {
  rows: ChannelContributor[];
  gated: boolean;
  appHref: string;
  formatStake?: (n: number) => string;
  formatStakeCompact?: (n: number) => string;
  dealHref?: (id: string) => string;
}) {
  const [explained, setExplained] = useState<ChannelContributor | null>(null);

  if (rows.length === 0) return null;

  const visible = gated ? rows.slice(0, UNBLURRED) : rows;
  const hiddenCount = gated ? Math.max(0, rows.length - UNBLURRED) : 0;

  const [hero, ...rest] = visible;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Best recent picks</Eyebrow>
        <span className="shrink-0 text-[10px] text-muted">
          share price since disclosure
        </span>
      </div>

      {/* One plate: the top pick as its taller first row, the runners-up
          under it, and the gate as the last row — so the list ends in a lock
          rather than a floating button, and every return lands on one right
          edge. */}
      <ul
        className={`mt-2 divide-y divide-hairline/80 overflow-hidden ${CARD_CLASS} dark:divide-border/50`}
      >
        <HeroPick
          formatStake={formatStake}
          formatStakeCompact={formatStakeCompact}
          row={hero}
          onOpen={setExplained}
        />

        {rest.map((row) => (
          <PickRow
            key={row.id}
            formatStakeCompact={formatStakeCompact}
            row={row}
            onOpen={setExplained}
          />
        ))}

        {gated && hiddenCount > 0 && (
          <li>
            <a
              className="group flex items-center justify-center gap-1.5 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-brown transition-colors hover:bg-brand-brown/[0.06] dark:text-brand-tan dark:hover:bg-surface-secondary/80"
              data-ga-event="cta_channel_see_all_picks_in_app"
              data-ga-label={`See all ${rows.length} picks in app`}
              href={appHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <LockClosedIcon className="h-3 w-3 opacity-70" />
              <span className="whitespace-nowrap">
                {hiddenCount} more {hiddenCount === 1 ? "pick" : "picks"} in the
                app
              </span>
            </a>
          </li>
        )}
      </ul>

      <ContributorExplainer
        appHref={appHref}
        dealHref={dealHref}
        formatStake={formatStake}
        row={explained}
        onClose={() => setExplained(null)}
      />
    </section>
  );
}

/** The top pick: company and return, then who / how much / when on one
 *  line, then the £1,000 payoff. The list is winners-only, so the payoff
 *  never shows a loss — same guarantee the app's plate makes. */
function HeroPick({
  row,
  formatStake,
  formatStakeCompact,
  onOpen,
}: {
  row: ChannelContributor;
  formatStake?: (n: number) => string;
  formatStakeCompact?: (n: number) => string;
  onOpen: (row: ChannelContributor) => void;
}) {
  return (
    <li>
      <button
        className="group block w-full px-3 py-3 text-left transition-colors hover:bg-white/60 dark:hover:bg-surface-secondary/60"
        data-ga-event="cta_channel_open_contributor_explainer"
        data-ga-label={row.ticker}
        type="button"
        onClick={() => onOpen(row)}
      >
        <span className="flex items-center gap-2.5">
          <CompanyLogo size={36} ticker={row.ticker} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold leading-tight text-foreground group-hover:text-brand-brown dark:group-hover:text-brand-tan">
              {row.company}
            </span>
            <span className="block font-mono text-[10px] leading-tight text-muted">
              {row.ticker}
            </span>
          </span>
          <span
            className={`shrink-0 text-2xl font-bold leading-none tabular-nums ${toneClass(row.returnPct)}`}
          >
            {formatSignedPct(row.returnPct)}
          </span>
        </span>

        {/* Who, how much, when — one line, full width so the name fits. */}
        <span className="mt-1.5 block truncate text-[11px] leading-tight text-foreground/70 tabular-nums">
          <span className="font-semibold text-foreground">
            {row.insiderName}
          </span>
          {[
            shortRole(row.insiderRole),
            row.value != null && formatStakeCompact
              ? formatStakeCompact(row.value)
              : null,
            formatDay(row.disclosedDate, "short"),
          ]
            .filter(Boolean)
            .map((part) => ` · ${part}`)
            .join("")}
        </span>

        {formatStake && (
          <span className="mt-2 flex items-baseline gap-1 border-t border-positive/15 pt-1.5 text-[10.5px] tabular-nums text-muted">
            {formatStake(STAKE)} at disclosure →
            <span className="font-semibold text-foreground">
              {formatStake(STAKE * (1 + row.returnPct))} today
            </span>
          </span>
        )}
      </button>
    </li>
  );
}

/** A runner-up: company, then who / how much / when in one muted subline,
 *  return on the shared right edge. */
function PickRow({
  row,
  formatStakeCompact,
  onOpen,
}: {
  row: ChannelContributor;
  formatStakeCompact?: (n: number) => string;
  onOpen: (row: ChannelContributor) => void;
}) {
  const who = shortRole(row.insiderRole) ?? row.insiderName;
  const subline = [
    who,
    row.value != null && formatStakeCompact
      ? formatStakeCompact(row.value)
      : null,
    formatDay(row.disclosedDate, "short"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/60 dark:hover:bg-surface-secondary/60"
        data-ga-event="cta_channel_open_contributor_explainer"
        data-ga-label={row.ticker}
        type="button"
        onClick={() => onOpen(row)}
      >
        <CompanyLogo size={28} ticker={row.ticker} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-foreground group-hover:text-brand-brown dark:group-hover:text-brand-tan">
            {row.company}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted tabular-nums">
            {subline}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-bold tabular-nums ${toneClass(row.returnPct)}`}
        >
          {formatSignedPct(row.returnPct)}
        </span>
      </button>
    </li>
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
              <p className="text-[11px] text-muted">
                share price since {formatDay(row.disclosedDate)}, {row.daysHeld}{" "}
                {row.daysHeld === 1 ? "day" : "days"} ago
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-foreground/[0.04] px-3.5 py-3 text-[13px] leading-relaxed text-muted">
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

          <div className="mt-5 space-y-3 text-[13px] leading-relaxed text-foreground/70">
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
              It&rsquo;s among the strongest performers of every disclosed buy
              in the last {CHANNEL_WINDOW_DAYS} days. It&rsquo;s a winner chosen
              after the fact, so read it as evidence that insider buying is
              worth watching, not as a prediction about this company.
            </p>
            <p>
              Past performance is not a reliable indicator of future results.
              ddbx is information, not financial advice, and capital is at risk.
            </p>
          </div>

          <a
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-ink px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2118] dark:bg-white dark:text-ink dark:hover:bg-white/90"
            data-ga-event="cta_channel_picks_explainer_download"
            data-ga-label={row.ticker}
            href={appHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Get the app. Every buy as it files
          </a>
          <p className="mt-2 text-center text-[11px] text-muted">
            Free for 7 days, cancel any time.
          </p>

          {/* The old destination, kept as the quiet second option — someone
              who wanted the filing rather than the explanation still gets
              there in one more click. */}
          <Link
            className="mt-4 block text-center text-[12.5px] text-foreground/55 underline underline-offset-4 hover:text-foreground"
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
    <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
      {children}
    </h3>
  );
}
