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

// The number on the faux row shown blurred above the contributors CTA — never
// a real holding, so the gated picks aren't sitting in the DOM for a
// "view source" peek. One row is enough to say "the list continues".
const DECOY_RETURN = 0.184;

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
    <div className="px-5 lg:px-4 py-3.5 space-y-3">
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
    <section className="relative overflow-hidden rounded-2xl border border-hairline bg-white/45 px-3.5 py-3 shadow-[0_12px_32px_-28px_rgba(61,43,26,0.7)] dark:border-border/70 dark:bg-surface-secondary/35">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-positive/10 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>90-day performance</Eyebrow>
          <span className="font-mono text-[10px] text-muted tabular-nums">
            {lastUpdated ? `Updated ${formatUpdated(lastUpdated)}` : ""}
          </span>
        </div>

        <p className="mt-2 text-[11px] font-medium text-foreground/70">
          Beating the {benchmarkLabel ?? "market"}?
        </p>
        {alphaPct != null && <Verdict alphaPct={alphaPct} />}

        {/* The comparison as two full-width rows rather than a 2×2 grid of
            boxes: the long universe label ("Noteworthy picks") no longer wraps
            to a second line, the numbers share one right edge, and the whole
            pair costs two rules instead of four walls. */}
        <dl className="mt-2.5 divide-y divide-hairline/90 border-y border-hairline/90 dark:divide-border/60 dark:border-border/60">
          <Stat
            label={UNIVERSE_LABEL[headlineUniverse]}
            muted={picksTone.muted}
            tone={picksTone.className}
            value={formatSignedPct(picksReturnPct)}
          />
          <Stat
            label="The market"
            muted={benchTone.muted}
            tone={benchTone.className}
            value={formatSignedPct(benchmarkReturnPct)}
          />
        </dl>

        <p className="mt-1.5 text-[10px] leading-snug text-muted">
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
      className={`mt-px text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.03em] tabular-nums ${toneClass}`}
    >
      {level ? (
        "Level with it"
      ) : (
        <>
          {ahead ? "Yes" : "No"}
          <span className="font-normal text-foreground/55 text-sm">
            {ahead ? ", by " : ", behind by "}
          </span>
          {`${Math.abs(pp).toFixed(1)}pp`}
        </>
      )}
    </p>
  );
}

/** One row of the hero comparison strip: label left, figure on the shared
 *  right edge. */
function Stat({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone: string;
  muted: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd
        className={`text-[15px] font-semibold leading-none tabular-nums ${tone}`}
        style={muted ? { opacity: MUTED_OPACITY } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

/** Compact proportion bar — the rail can contain more than 100 buys, so a
 * literal waffle would either sprawl or imply that sampled cells are deals. */
function MarketBeat({ count, total }: { count: number; total: number }) {
  if (total === 0) return null;

  const rate = count / total;

  return (
    <section className="rounded-xl bg-hairline/50 px-3 py-2.5 dark:bg-surface-secondary/55">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Picks that beat the market</Eyebrow>
        <span className="text-xl font-semibold leading-none tracking-tight text-positive tabular-nums">
          {Math.round(rate * 100)}%
        </span>
      </div>
      <div
        aria-label={`${count} of ${total} buys beat the market`}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"
        role="img"
      >
        <div
          className="h-full rounded-full bg-positive dark:bg-positive/80"
          style={{ width: `${rate * 100}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-muted tabular-nums">
        {count} of {total} buys
      </p>
    </section>
  );
}

/** A ranked row whose bar is the row itself — the magnitude fills the track
 *  behind the label instead of sitting on a second line under it. Halves the
 *  height of every leaderboard row, which is what buys the fifth sector. */
function TrackRow({
  label,
  suffix,
  value,
  ratio,
}: {
  label: string;
  suffix?: string;
  value: number;
  ratio: number;
}) {
  return (
    <li className="relative overflow-hidden rounded-md bg-hairline/45 dark:bg-separator/40">
      <div
        aria-hidden
        className={`absolute inset-y-0 left-0 ${value >= 0 ? "bg-positive/20" : "bg-negative/20"}`}
        style={{ width: `${Math.max(4, ratio * 100)}%` }}
      />
      <div className="relative flex items-baseline justify-between gap-2 px-2 py-[3px]">
        <span className="truncate text-[11.5px] text-foreground/85">
          {label}
          {suffix && (
            <span className="ml-1 font-mono text-[9.5px] text-muted">
              {suffix}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 text-[11.5px] font-semibold tabular-nums ${toneClass(value)}`}
        >
          {formatSignedPct(value)}
        </span>
      </div>
    </li>
  );
}

function SectorLeaderboard({
  sectors,
}: {
  sectors: ChannelPerformanceSummary["sectors"];
}) {
  const max = Math.max(...sectors.map((s) => Math.abs(s.meanAlphaPct)), 0.0001);

  return (
    <section className="border-t border-hairline pt-3 dark:border-border/60">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Where picks found an edge</Eyebrow>
        <span className="shrink-0 text-[10px] text-muted">vs market</span>
      </div>
      <ul className="mt-2 space-y-1">
        {sectors.slice(0, 5).map((s) => (
          <TrackRow
            key={s.sector}
            label={s.sector}
            ratio={Math.abs(s.meanAlphaPct) / max}
            value={s.meanAlphaPct}
          />
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
  const max = Math.max(...styles.map((s) => Math.abs(s.meanReturnPct)), 0.0001);

  return (
    <section className="border-t border-hairline pt-3 dark:border-border/60">
      <Eyebrow>Contrarian vs momentum</Eyebrow>
      <ul className="mt-2 space-y-1">
        {styles.map((s) => (
          <TrackRow
            key={s.kind}
            label={STYLE_LABEL[s.kind]}
            ratio={Math.abs(s.meanReturnPct) / max}
            suffix={`${s.dealCount}`}
            value={s.meanReturnPct}
          />
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

  const [hero, ...rest] = visible;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Best recent picks</Eyebrow>
        <span className="shrink-0 text-[10px] text-muted">
          since disclosure
        </span>
      </div>

      <ul className="mt-2 space-y-1.5">
        <HeroContributorCard
          formatStake={formatStake}
          row={hero}
          onOpen={setExplained}
        />
      </ul>

      {/* The runners-up as one plate of hairline-divided rows rather than four
          separately bordered cards: same information, ~40% of the height, and
          every return lands on one right edge so the column can be scanned in
          a single pass. The gate's ghost row and CTA are rows of the same
          plate — the list ends in a lock rather than a floating button. */}
      {(rest.length > 0 || (gated && hiddenCount > 0)) && (
        <ul className="mt-1.5 divide-y divide-hairline/80 overflow-hidden rounded-xl border border-hairline dark:divide-border/50 dark:border-border/50">
          {rest.map((row) => (
            <ContributorRow key={row.id} row={row} onOpen={setExplained} />
          ))}

          {gated && hiddenCount > 0 && (
            <li>
              <a
                className="group block"
                data-ga-event="cta_channel_see_all_picks_in_app"
                data-ga-label={`See all ${rows.length} picks in app`}
                href={appHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span
                  aria-hidden
                  className="pointer-events-none flex select-none items-center gap-2.5 px-2.5 py-1.5 opacity-50"
                  style={{
                    filter: "blur(4px)",
                    maskImage: "linear-gradient(to bottom, black, transparent)",
                  }}
                >
                  <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-foreground/10" />
                  <span className="h-2.5 w-24 rounded bg-foreground/15" />
                  <span className="ml-auto text-[15px] font-bold text-positive tabular-nums">
                    {formatSignedPct(DECOY_RETURN)}
                  </span>
                </span>

                <span className="flex items-center justify-center gap-1.5 bg-sheet/70 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-brown transition-colors group-hover:bg-brand-brown/[0.07] dark:bg-surface/70 dark:text-brand-tan dark:group-hover:bg-surface-secondary/80">
                  <LockClosedIcon className="h-3 w-3 opacity-70" />
                  Unlock {hiddenCount} more{" "}
                  {hiddenCount === 1 ? "pick" : "picks"}
                </span>
              </a>
            </li>
          )}
        </ul>
      )}

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

/** The top pick, kept as a lifted card — logo, company, a big bold return, and
 *  the iOS-style £1,000 payoff line ("£1,000 at disclosure → £1,894 today").
 *  The list is winners-only, so the payoff never shows a loss — same guarantee
 *  the app's plate makes by rendering only when in profit. */
function HeroContributorCard({
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
        className="group block w-full rounded-xl border border-hairline bg-white/45 px-3 py-2.5 text-left shadow-[0_8px_24px_-22px_rgba(61,43,26,0.8)] transition-colors hover:border-positive/30 hover:bg-white/70 dark:border-border/70 dark:bg-surface-secondary/35"
        data-ga-event="cta_channel_open_contributor_explainer"
        data-ga-label={row.ticker}
        type="button"
        onClick={() => onOpen(row)}
      >
        <span className="flex items-center gap-2.5">
          <CompanyLogo size={38} ticker={row.ticker} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight text-foreground group-hover:text-brand-brown dark:group-hover:text-brand-tan">
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

/** A runner-up as a single line: logo, name, ticker, return. One row per pick
 *  so four of them read as a ranked column rather than four stacked boxes. */
function ContributorRow({
  row,
  onOpen,
}: {
  row: ChannelContributor;
  onOpen: (row: ChannelContributor) => void;
}) {
  return (
    <li>
      <button
        className="group flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors hover:bg-brand-brown/[0.05] dark:hover:bg-surface-secondary/60"
        data-ga-event="cta_channel_open_contributor_explainer"
        data-ga-label={row.ticker}
        type="button"
        onClick={() => onOpen(row)}
      >
        <CompanyLogo size={26} ticker={row.ticker} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground group-hover:text-brand-brown dark:group-hover:text-brand-tan">
          {row.company}
        </span>
        <span className="shrink-0 font-mono text-[9.5px] text-muted">
          {row.ticker}
        </span>
        <span
          className={`w-[3.5rem] shrink-0 text-right text-[15px] font-bold tabular-nums ${toneClass(row.returnPct)}`}
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
              the day that purchase was disclosed to the latest close we hold,
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
 *  size. Four differently-styled section titles used to compete with the
 *  figures; one repeated label lets the numbers carry the panel. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
      {children}
    </h3>
  );
}
