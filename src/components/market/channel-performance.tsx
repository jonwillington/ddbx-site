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
// When discretion mode is off the contributors link straight through to the
// deal detail like the full page does.

import type {
  ChannelContributor,
  ChannelPerformanceSummary,
} from "@/lib/performance/channel-summary";

import { Link } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";

import { CHANNEL_WINDOW_DAYS } from "@/lib/performance/channel-summary";
import { formatSignedPct } from "@/lib/performance/format";
import { BUTTON_FILLED_GROUP, BUTTON_RADIUS } from "@/components/button";
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
}

/** Notional stake behind the payoff line — mirrors the iOS Highlights £1,000
 *  default ("Bought for £1,000 → now worth …"). */
const STAKE = 1000;

/** Rows that stay unblurred before the contributors CTA kicks in. */
const UNBLURRED = 2;

/** The losing side of the picks-vs-market pair dims to this. */
const MUTED_OPACITY = 0.45;

/** Most cells the beat-the-market waffle will draw — past this it switches to a
 *  proportional fill so a busy market doesn't sprawl down the rail. */
const WAFFLE_MAX_CELLS = 40;

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

  return ratio >= 0
    ? "text-[#1e6b18] dark:text-[#5cd84a]"
    : "text-[#8b2020] dark:text-[#e84d4d]";
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
}: Props) {
  return (
    <div className="px-5 lg:px-4 py-4 space-y-5">
      <HeadlineAlpha benchmarkLabel={benchmarkLabel} summary={summary} />

      <Contributors
        appHref={appHref}
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
    <div>
      <SectionHeading>Beating the {benchmarkLabel ?? "market"}?</SectionHeading>

      {alphaPct != null && <Verdict alphaPct={alphaPct} />}

      <div className="mt-3 flex items-start gap-4">
        <Stat
          align="left"
          label={UNIVERSE_LABEL[headlineUniverse]}
          muted={picksTone.muted}
          tone={picksTone.className}
          value={formatSignedPct(picksReturnPct)}
        />
        <Stat
          align="right"
          label="The market"
          muted={benchTone.muted}
          tone={benchTone.className}
          value={formatSignedPct(benchmarkReturnPct)}
        />
      </div>

      <p className="mt-2 text-[10px] text-muted">
        Last {CHANNEL_WINDOW_DAYS} days
        {lastUpdated ? ` · Updated ${formatUpdated(lastUpdated)}` : ""}
      </p>
    </div>
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
      ? "text-[#1e6b18] dark:text-[#5cd84a]"
      : "text-[#8b2020] dark:text-[#e84d4d]";

  return (
    <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${toneClass}`}>
      {level ? (
        "Level with it"
      ) : (
        <>
          {ahead ? "Yes" : "No"}
          <span className="font-normal text-foreground/70 text-base">
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

/** Beat-the-market waffle — one square per buy (green = beat the market), so
 *  the reader sees how *often* directors won, not just by how much. Above
 *  WAFFLE_MAX_CELLS it shows a proportional fill instead of a cell per buy. */
function MarketBeat({ count, total }: { count: number; total: number }) {
  if (total === 0) return null;

  const rate = count / total;
  const cells = Math.min(total, WAFFLE_MAX_CELLS);
  const greens =
    total <= WAFFLE_MAX_CELLS ? count : Math.round(rate * WAFFLE_MAX_CELLS);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <SectionHeading>Beat the market</SectionHeading>
        <span className="text-[10px] text-muted tabular-nums">
          {count} of {total} buys · {Math.round(rate * 100)}%
        </span>
      </div>
      <div
        aria-hidden
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <span
            key={i}
            className={`aspect-square rounded-sm ${
              i < greens
                ? "bg-[#1e6b18]/80 dark:bg-[#5cd84a]/80"
                : "bg-foreground/10"
            }`}
          />
        ))}
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
      <SectionHeading>Best sectors vs market</SectionHeading>
      <ul className="space-y-1.5">
        {sectors.map((s) => (
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
                    ? "h-full rounded-full bg-[#1e6b18]/70 dark:bg-[#5cd84a]/70"
                    : "h-full rounded-full bg-[#8b2020]/70 dark:bg-[#e84d4d]/70"
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
}: {
  rows: ChannelContributor[];
  gated: boolean;
  appHref: string;
  formatStake?: (n: number) => string;
}) {
  if (rows.length === 0) return null;

  const visible = gated ? rows.slice(0, UNBLURRED) : rows;
  const hiddenCount = gated ? Math.max(0, rows.length - UNBLURRED) : 0;

  return (
    <section className="space-y-2">
      <SectionHeading>Top performers</SectionHeading>
      <ul className="space-y-1.5">
        {visible.map((row, i) => (
          <ContributorCard
            key={row.id}
            formatStake={formatStake}
            rank={i}
            row={row}
          />
        ))}
      </ul>

      {gated && hiddenCount > 0 && (
        <a
          className="relative block mt-1.5 group"
          data-ga-event="cta_channel_see_all_picks_in_app"
          data-ga-label={`See all ${rows.length} picks in app`}
          href={appHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          {/* Blurred decoy cards — the real tickers never reach the DOM. */}
          <div
            aria-hidden
            className="pointer-events-none select-none space-y-1.5"
            style={{ filter: "blur(5px)" }}
          >
            {DECOY.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[#d0c8be]/50 dark:border-border/50 p-3"
              >
                <span className="w-9 h-9 rounded-full shrink-0 bg-foreground/10" />
                <span className="flex-1 min-w-0 space-y-1.5">
                  <span className="block h-2.5 w-24 rounded bg-foreground/15" />
                  <span className="block h-2 w-12 rounded bg-foreground/10" />
                </span>
                <span className="tabular-nums font-bold text-lg text-[#1e6b18] dark:text-[#5cd84a]">
                  {formatSignedPct(d.returnPct)}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 ${BUTTON_RADIUS} ${BUTTON_FILLED_GROUP} text-[11px] font-medium px-3 py-1.5 shadow-lg transition-colors`}
            >
              <LockClosedIcon className="w-3 h-3" />
              See all {rows.length} picks in the app
            </span>
          </div>
        </a>
      )}
    </section>
  );
}

/** Ranked pick card — logo, company, and a big bold return, so the winners
 *  read as names to follow rather than lines in a table. Rank 0 is the hero:
 *  larger logo, larger number, a green-tinted plate, and the iOS-style £1,000
 *  payoff line ("£1,000 at disclosure → £1,774 today"). The list is
 *  winners-only, so the payoff never shows a loss — same guarantee the app's
 *  plate makes by rendering only when in profit. */
function ContributorCard({
  row,
  rank,
  formatStake,
}: {
  row: ChannelContributor;
  rank: number;
  formatStake?: (n: number) => string;
}) {
  const hero = rank === 0;

  return (
    <li>
      <Link
        className={`block rounded-xl border p-3 transition-colors group ${
          hero
            ? "border-[#1e6b18]/25 bg-[#1e6b18]/[0.06] hover:bg-[#1e6b18]/[0.1] dark:border-[#5cd84a]/25 dark:bg-[#5cd84a]/[0.07] dark:hover:bg-[#5cd84a]/[0.11]"
            : "border-[#d0c8be]/50 hover:bg-[#f1ebe2]/60 dark:border-border/50 dark:hover:bg-surface-secondary/60"
        }`}
        data-ga-event="cta_channel_open_contributor_deal"
        data-ga-label={`${row.ticker} ${row.id}`}
        to={`/dealings/${row.id}`}
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
          <span className="mt-2.5 flex items-baseline gap-1 border-t border-[#1e6b18]/15 dark:border-[#5cd84a]/15 pt-2 text-[11px] tabular-nums text-muted">
            {formatStake(STAKE)} at disclosure →
            <span className="font-semibold text-foreground">
              {formatStake(STAKE * (1 + row.returnPct))} today
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </h3>
  );
}
