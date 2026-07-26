// Performance tab of the right-hand channel, following the iOS Performance
// screen's story structure: a verdict-first hero ("Beating the FTSE
// All-Share? — Yes, by X"), then winners-only top performers with a £1,000
// payoff line, then the supporting stats. Fed by the 90-day summary in
// `lib/performance/channel-summary`. The gating model is deliberate:
//
//   • The PROOF is free — the beating-the-index verdict, the sector
//     leaderboard, and the contrarian/momentum style race all render in full.
//     They're the hook: "directors beat the market, here's by how much."
//   • The ACTION is gated — which specific stocks drove it (the contributors)
//     is teased two-deep, then blurred behind an "open the app" CTA. That's
//     the thing worth installing for.
//
// A contributor card opens an explainer modal rather than navigating: the
// number is the hook, but a bare "+89.4%" in a 320px rail is read long before
// it's understood, and what it actually measures (a share price, from a
// disclosed buy, with no position held by anyone here) has to be said before
// it can be trusted. The modal says it, then offers the app. The filing itself
// is still one click away from inside it.

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
  /** Index the live alpha is measured against — names the verdict question.
   *  Falls back to "the market". */
  benchmarkLabel?: string;
  /** Market-currency money formatter; enables the top pick's payoff line. */
  formatStake?: (n: number) => string;
  /** Route for a contributor's deal detail. UK has a dedicated /dealings/:id
   *  page (the default); other markets deep-link via their own `?deal=` param
   *  so a US pick doesn't land on the UK page. */
  dealHref?: (id: string) => string;
}

/** Notional stake behind the payoff line — mirrors the iOS Highlights £1,000
 *  default ("Bought for £1,000 → now worth …"). */
const STAKE = 1000;

/** Rows that stay unblurred before the contributors CTA kicks in. Generous on
 *  purpose — recent good picks are the hook, so let more of them breathe
 *  before the app gate. */
const UNBLURRED = 4;

/** The losing side of the picks-vs-market pair dims to this. */
const MUTED_OPACITY = 0.45;

const STYLE_LABEL: Record<
  ChannelPerformanceSummary["styles"][number]["kind"],
  string
> = {
  contrarian: "Contrarian",
  momentum: "Momentum",
  neutral: "Neutral",
};

// Faux cards shown blurred under the contributors CTA — never the real
// holdings, so the picks aren't sitting in the DOM for a "view source" peek.
// Two are enough to seat the CTA without stretching the rail.
const DECOY = [{ returnPct: 0.184 }, { returnPct: 0.092 }];

function toneClass(ratio: number | null): string {
  if (ratio == null) return "text-muted";

  return ratio >= 0 ? "text-positive" : "text-negative";
}

// Comparison-aware tint for the picks-vs-market pair: the side that's more
// extreme in its direction stays saturated, the other dims. Mixed signs stay
// saturated since colour alone separates them. Port of the /portfolio
// hero-card `tint` (itself a port of iOS `heroTint`).
function pairTone(
  value: number | null,
  other: number | null,
): { className: string; muted: boolean } {
  if (value == null || other == null) {
    return { className: toneClass(value), muted: false };
  }
  const valuePos = value >= 0;
  const otherPos = other >= 0;
  const mutedSameDir = valuePos
    ? value < other // both up: smaller gain dims
    : value > other; // both down: shallower loss dims

  return {
    className: toneClass(value),
    muted: valuePos === otherPos && mutedSameDir,
  };
}

export function ChannelPerformance({
  summary,
  discretionEnabled,
  appHref,
  benchmarkLabel,
  formatStake,
  dealHref,
}: Props) {
  return (
    <div className="px-5 lg:px-4 py-4 space-y-5">
      <HeadlineAlpha benchmarkLabel={benchmarkLabel} summary={summary} />

      <Contributors
        appHref={appHref}
        dealHref={dealHref}
        formatStake={formatStake}
        gated={discretionEnabled}
        rows={summary.contributors}
      />

      <MarketBeat
        count={summary.marketBeatCount}
        total={summary.marketBeatTotal}
      />

      {summary.sectors.length > 0 && (
        <SectorLeaderboard sectors={summary.sectors} />
      )}

      {summary.styles.length > 0 && <StyleRace styles={summary.styles} />}
    </div>
  );
}

/** "14 Jun" from an ISO `YYYY-MM-DD`, formatted in UTC so the day never drifts.
 *  Mirrors the app's "Updated d MMM" caption. */
function formatUpdated(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Honest label for the slice the headline reflects — mirrors the app naming
 *  the signal it's showing rather than implying every buy. */
const UNIVERSE_LABEL: Record<
  ChannelPerformanceSummary["headlineUniverse"],
  string
> = {
  every_buy: "Director picks",
  suggested: "Suggested picks",
  significant: "Significant picks",
  noteworthy: "Noteworthy picks",
};

/** Verdict-first hero, following the iOS Analysis entry card: it leads with
 *  the answer to "Beating the {index}?" rather than two bare percentages, and
 *  the percentages become the supporting pair underneath. */
function HeadlineAlpha({
  summary,
  benchmarkLabel,
}: {
  summary: ChannelPerformanceSummary;
  benchmarkLabel?: string;
}) {
  const {
    picksReturnPct,
    benchmarkReturnPct,
    alphaPct,
    lastUpdated,
    headlineUniverse,
  } = summary;

  const picksTone = pairTone(picksReturnPct, benchmarkReturnPct);
  const benchTone = pairTone(benchmarkReturnPct, picksReturnPct);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#d8cec1]/70 bg-white/45 px-4 py-4 shadow-[0_12px_32px_-28px_rgba(61,43,26,0.7)] dark:border-border/70 dark:bg-surface-secondary/35">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-positive/10 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
            90-day performance
          </span>
          <span className="text-[10px] text-muted">
            {lastUpdated ? `Updated ${formatUpdated(lastUpdated)}` : ""}
          </span>
        </div>

        <p className="mt-2.5 text-xs font-medium text-foreground/75">
          Beating the {benchmarkLabel ?? "market"}?
        </p>
        {alphaPct != null && <Verdict alphaPct={alphaPct} />}

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#ddd4c8]/70 bg-[#ddd4c8]/70 dark:border-border/70 dark:bg-border/70">
          <div className="bg-[#faf7f2]/90 p-2.5 dark:bg-surface">
            <Stat
              align="left"
              label={UNIVERSE_LABEL[headlineUniverse]}
              muted={picksTone.muted}
              tone={picksTone.className}
              value={formatSignedPct(picksReturnPct)}
            />
          </div>
          <div className="bg-[#faf7f2]/90 p-2.5 dark:bg-surface">
            <Stat
              align="right"
              label="The market"
              muted={benchTone.muted}
              tone={benchTone.className}
              value={formatSignedPct(benchmarkReturnPct)}
            />
          </div>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Equal-weight return from picks disclosed in the last{" "}
          {CHANNEL_WINDOW_DAYS} days.
        </p>
      </div>
    </section>
  );
}

/** The one-line answer — "Yes, by 4.1pp" — mirroring the iOS beatingVerdict
 *  copy. Near-zero alpha reads "Level with it" rather than crowning a side. */
function Verdict({ alphaPct }: { alphaPct: number }) {
  const pp = alphaPct * 100;
  const level = Math.abs(pp) < 0.05;
  const ahead = pp > 0;

  const toneClass = level
    ? "text-foreground"
    : ahead
      ? "text-positive"
      : "text-negative";

  return (
    <p
      className={`mt-0.5 text-[1.7rem] font-semibold leading-tight tracking-[-0.025em] tabular-nums ${toneClass}`}
    >
      {level ? (
        "Level with it"
      ) : (
        <>
          {ahead ? "Yes" : "No"}
          <span className="font-normal text-foreground/60 text-base">
            {ahead ? ", by " : ", behind by "}
          </span>
          {`${Math.abs(pp).toFixed(1)}pp`}
        </>
      )}
    </p>
  );
}

function Stat({
  label,
  value,
  align,
  tone,
  muted,
}: {
  label: string;
  value: string;
  align: "left" | "right";
  tone: string;
  muted: boolean;
}) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div
        className={`text-lg font-semibold tabular-nums ${tone}`}
        style={muted ? { opacity: MUTED_OPACITY } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

/** Compact proportion bar — the rail can contain more than 100 buys, so a
 * literal waffle would either sprawl or imply that sampled cells are deals. */
function MarketBeat({ count, total }: { count: number; total: number }) {
  if (total === 0) return null;

  const rate = count / total;

  return (
    <section className="rounded-2xl bg-[#eee9e1]/65 p-3.5 dark:bg-surface-secondary/55">
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionHeading>Picks that beat the market</SectionHeading>
          <p className="mt-0.5 text-[11px] text-muted tabular-nums">
            {count} of {total} buys
          </p>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-positive tabular-nums">
          {Math.round(rate * 100)}%
        </span>
      </div>
      <div
        aria-label={`${count} of ${total} buys beat the market`}
        className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-foreground/10"
        role="img"
      >
        <div
          className="h-full rounded-full bg-positive shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] dark:bg-positive/80"
          style={{ width: `${rate * 100}%` }}
        />
      </div>
    </section>
  );
}

function SectorLeaderboard({
  sectors,
}: {
  sectors: ChannelPerformanceSummary["sectors"];
}) {
  const max = Math.max(...sectors.map((s) => Math.abs(s.meanAlphaPct)), 0.0001);

  return (
    <section className="space-y-2">
      <div>
        <SectionHeading>Where picks found an edge</SectionHeading>
        <p className="mt-0.5 text-[10px] text-muted">
          Average return above the market
        </p>
      </div>
      <ul className="space-y-1.5">
        {sectors.slice(0, 4).map((s) => (
          <li key={s.sector} className="text-xs">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-foreground/80">{s.sector}</span>
              <span
                className={`tabular-nums font-medium shrink-0 ${toneClass(s.meanAlphaPct)}`}
              >
                {formatSignedPct(s.meanAlphaPct)}
              </span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-[#e8e0d5]/60 dark:bg-separator/60 overflow-hidden">
              <div
                className={
                  s.meanAlphaPct >= 0
                    ? "h-full rounded-full bg-positive/70"
                    : "h-full rounded-full bg-negative/70"
                }
                style={{
                  width: `${Math.max(6, (Math.abs(s.meanAlphaPct) / max) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StyleRace({
  styles,
}: {
  styles: ChannelPerformanceSummary["styles"];
}) {
  return (
    <section className="space-y-2">
      <SectionHeading>Contrarian vs momentum</SectionHeading>
      <ul className="space-y-1">
        {styles.map((s) => (
          <li
            key={s.kind}
            className="flex items-baseline justify-between gap-2 text-xs"
          >
            <span className="text-foreground/80">
              {STYLE_LABEL[s.kind]}
              <span className="ml-1 text-[10px] text-muted">
                ({s.dealCount})
              </span>
            </span>
            <span
              className={`tabular-nums font-medium ${toneClass(s.meanReturnPct)}`}
            >
              {formatSignedPct(s.meanReturnPct)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Contributors({
  rows,
  gated,
  appHref,
  formatStake,
  dealHref,
}: {
  rows: ChannelContributor[];
  gated: boolean;
  appHref: string;
  formatStake?: (n: number) => string;
  dealHref?: (id: string) => string;
}) {
  // Which row's explainer is open. A card used to navigate straight to the
  // deal detail, which answered a question nobody had yet: a big green number
  // in a rail is read before it's understood, and "+89.4%" with "since
  // disclosure" over it doesn't say whose money, measured how, or over what.
  // The modal answers that first, and puts the install where the interest is.
  const [explained, setExplained] = useState<ChannelContributor | null>(null);

  if (rows.length === 0) return null;

  const visible = gated ? rows.slice(0, UNBLURRED) : rows;
  const hiddenCount = gated ? Math.max(0, rows.length - UNBLURRED) : 0;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <SectionHeading>Best recent picks</SectionHeading>
        <span className="text-[10px] text-muted">since disclosure</span>
      </div>
      <ul className="space-y-1.5">
        {visible.map((row, i) => (
          <ContributorCard
            key={row.id}
            formatStake={formatStake}
            rank={i}
            row={row}
            onOpen={setExplained}
          />
        ))}
      </ul>

      <ContributorExplainer
        appHref={appHref}
        dealHref={dealHref}
        formatStake={formatStake}
        row={explained}
        onClose={() => setExplained(null)}
      />

      {gated && hiddenCount > 0 && (
        <a
          className="group mt-2 block"
          data-ga-event="cta_channel_see_all_picks_in_app"
          data-ga-label={`See all ${rows.length} picks in app`}
          href={appHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="relative h-12 overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none select-none space-y-1.5 opacity-50"
              style={{
                filter: "blur(5px)",
                maskImage: "linear-gradient(to bottom, black, transparent)",
              }}
            >
              {DECOY.slice(0, 1).map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#d0c8be]/50 p-3 dark:border-border/50"
                >
                  <span className="h-9 w-9 shrink-0 rounded-full bg-foreground/10" />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="block h-2.5 w-24 rounded bg-foreground/15" />
                    <span className="block h-2 w-12 rounded bg-foreground/10" />
                  </span>
                  <span className="text-lg font-bold text-positive tabular-nums">
                    {formatSignedPct(d.returnPct)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pulled up over the decoy's fade — the ghost row disappears
              *behind* the button instead of leaving a dead strip of
              faded-to-nothing pixels between the list and the CTA. */}
          <span className="relative -mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#d0c8be]/60 bg-[#f5f0e8]/80 px-4 py-2 text-[11px] font-medium text-[#5a4128] backdrop-blur-sm transition-colors group-hover:border-[#5a4128]/35 group-hover:bg-[#f1ebe2]/80 dark:border-border/60 dark:bg-surface/80 dark:text-[#ad9479] dark:group-hover:border-[#ad9479]/35 dark:group-hover:bg-surface-secondary/80">
            <LockClosedIcon className="h-3 w-3 opacity-70" />
            Unlock {hiddenCount} more {hiddenCount === 1 ? "pick" : "picks"} in
            the app
          </span>
        </a>
      )}
    </section>
  );
}

/** Ranked pick card — logo, company, and a big bold return, so the winners
 *  read as names to follow rather than lines in a table. Rank 0 is the hero:
 *  larger logo, larger number, a lifted plate, and the iOS-style £1,000 payoff
 *  line ("£1,000 at disclosure → £1,774 today"). The list is
 *  winners-only, so the payoff never shows a loss — same guarantee the app's
 *  plate makes by rendering only when in profit. */
function ContributorCard({
  row,
  rank,
  formatStake,
  onOpen,
}: {
  row: ChannelContributor;
  rank: number;
  formatStake?: (n: number) => string;
  onOpen: (row: ChannelContributor) => void;
}) {
  const hero = rank === 0;

  return (
    <li>
      <button
        className={`block w-full rounded-xl border px-3 py-2.5 text-left transition-all group ${
          hero
            ? "border-[#cfc5b8]/80 bg-white/45 shadow-[0_8px_24px_-22px_rgba(61,43,26,0.8)] hover:border-positive/30 hover:bg-white/70 dark:border-border/70 dark:bg-surface-secondary/35"
            : "border-[#d0c8be]/50 hover:bg-[#f1ebe2]/60 dark:border-border/50 dark:hover:bg-surface-secondary/60"
        }`}
        data-ga-event="cta_channel_open_contributor_explainer"
        data-ga-label={row.ticker}
        type="button"
        onClick={() => onOpen(row)}
      >
        <span className="flex items-center gap-3">
          <CompanyLogo size={hero ? 44 : 36} ticker={row.ticker} />
          <span className="flex-1 min-w-0">
            <span
              className={`block truncate font-semibold text-foreground group-hover:text-[#5a4128] dark:group-hover:text-[#ad9479] ${
                hero ? "text-sm" : "text-xs"
              }`}
            >
              {row.company}
            </span>
            <span className="block font-mono text-[10px] text-muted">
              {row.ticker}
            </span>
          </span>
          <span
            className={`shrink-0 tabular-nums font-bold ${
              hero ? "text-2xl" : "text-lg"
            } ${toneClass(row.returnPct)}`}
          >
            {formatSignedPct(row.returnPct)}
          </span>
        </span>

        {hero && formatStake && (
          <span className="mt-2.5 flex items-baseline gap-1 border-t border-positive/15 pt-2 text-[11px] tabular-nums text-muted">
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

/** What that green number actually is, and how to get the rest of them.
 *
 *  Three things it has to do, in order: say what's being measured (a
 *  share-price change from a disclosed buy, not a ddbx trade and not a
 *  recommendation), say what it isn't (advice, a guarantee, a live price), and
 *  then offer the app — because the honest version of this rail's pitch is
 *  "these are the four we're showing you; the app is where the rest live". */
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
                share price, since the buy was disclosed
              </p>
            </div>
          </div>

          {formatStake && (
            <p className="mt-4 rounded-xl bg-foreground/[0.04] px-3.5 py-3 text-[13px] tabular-nums text-muted">
              {formatStake(STAKE)} at disclosure would be{" "}
              <span className="font-semibold text-foreground">
                {formatStake(STAKE * (1 + row.returnPct))}
              </span>{" "}
              today.
            </p>
          )}

          <div className="mt-5 space-y-3 text-[13px] leading-relaxed text-foreground/70">
            <p>
              <span className="font-semibold text-foreground">
                What you&rsquo;re looking at.
              </span>{" "}
              A director or insider at {row.company} disclosed buying shares
              with their own money. This is what the share price has done from
              the day that purchase was disclosed to the latest close we hold —
              nothing has been bought or sold by ddbx, and nobody is holding a
              position.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                Why this one is here.
              </span>{" "}
              It&rsquo;s among the strongest performers of every disclosed buy
              in the last {CHANNEL_WINDOW_DAYS} days. It&rsquo;s a winner chosen
              after the fact, so read it as evidence that insider buying is
              worth watching — not as a prediction about this company.
            </p>
            <p>
              Past performance is not a reliable indicator of future results.
              ddbx is information, not financial advice, and capital is at risk.
            </p>
          </div>

          <a
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-[#1a140d] px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2118] dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90"
            data-ga-event="cta_channel_picks_explainer_download"
            data-ga-label={row.ticker}
            href={appHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Get the app — every buy as it files
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold tracking-[-0.005em] text-foreground/75">
      {children}
    </h3>
  );
}
