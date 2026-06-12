// Performance tab of the right-hand channel. A compact mirror of the
// /portfolio backtest, fed by the fetch-free summary in
// `lib/performance/channel-summary`. The gating model is deliberate:
//
//   • The PROOF is free — the picks-vs-market alpha headline, the sector
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
import { ArrowRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";

import { formatSignedPct } from "@/lib/performance/format";

interface Props {
  summary: ChannelPerformanceSummary;
  /** When true, gate the contributors behind the app CTA. */
  discretionEnabled: boolean;
  /** Route to the full interactive backtest (e.g. "/portfolio"). */
  performanceHref: string;
  /** App Store URL for this market. */
  appHref: string;
}

/** Rows that stay unblurred before the contributors CTA kicks in. */
const UNBLURRED = 2;

const STYLE_LABEL: Record<
  ChannelPerformanceSummary["styles"][number]["kind"],
  string
> = {
  contrarian: "Contrarian",
  momentum: "Momentum",
  neutral: "Neutral",
};

// Faux rows shown blurred under the contributors CTA — never the real
// holdings, so the picks aren't sitting in the DOM for a "view source" peek.
const DECOY = [
  { ticker: "•••", returnPct: 0.184 },
  { ticker: "•••", returnPct: 0.092 },
  { ticker: "•••", returnPct: 0.061 },
];

function toneClass(ratio: number | null): string {
  if (ratio == null) return "text-muted";

  return ratio >= 0
    ? "text-[#1e6b18] dark:text-[#5cd84a]"
    : "text-[#8b2020] dark:text-[#e84d4d]";
}

export function ChannelPerformance({
  summary,
  discretionEnabled,
  performanceHref,
  appHref,
}: Props) {
  return (
    <div className="px-5 lg:px-4 py-4 space-y-5">
      <HeadlineAlpha summary={summary} />

      <FullBacktestLink href={performanceHref} />

      {summary.sectors.length > 0 && (
        <SectorLeaderboard sectors={summary.sectors} />
      )}

      {summary.styles.length > 0 && <StyleRace styles={summary.styles} />}

      <Contributors
        appHref={appHref}
        gated={discretionEnabled}
        rows={summary.contributors}
      />
    </div>
  );
}

function HeadlineAlpha({ summary }: { summary: ChannelPerformanceSummary }) {
  const { picksReturnPct, benchmarkReturnPct, sampleSize } = summary;

  return (
    <div>
      <div className="flex items-start gap-4">
        <Stat
          align="left"
          label="Director picks"
          tone={toneClass(picksReturnPct)}
          value={formatSignedPct(picksReturnPct)}
        />
        <Stat
          align="right"
          label="The market"
          tone={toneClass(benchmarkReturnPct)}
          value={formatSignedPct(benchmarkReturnPct)}
        />
      </div>
      <p className="mt-2 text-[10px] text-muted">
        Equal-weight, since disclosure · {sampleSize} director buy
        {sampleSize === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  align,
  tone,
}: {
  label: string;
  value: string;
  align: "left" | "right";
  tone: string;
}) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function FullBacktestLink({ href }: { href: string }) {
  return (
    <Link
      className="flex items-center justify-between rounded-lg border border-[#e8e0d5] dark:border-separator bg-surface/40 px-3 py-2 text-xs font-medium text-foreground/80 hover:text-[#5a4128] dark:hover:text-[#ad9479] transition-colors"
      to={href}
    >
      <span>Run your own backtest</span>
      <ArrowRightIcon className="w-3.5 h-3.5" />
    </Link>
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
}: {
  rows: ChannelContributor[];
  gated: boolean;
  appHref: string;
}) {
  if (rows.length === 0) return null;

  const visible = gated ? rows.slice(0, UNBLURRED) : rows;
  const hiddenCount = gated ? Math.max(0, rows.length - UNBLURRED) : 0;

  return (
    <section className="space-y-2">
      <SectionHeading>Top performing picks</SectionHeading>
      <ul className="space-y-1">
        {visible.map((row) => (
          <ContributorRow key={row.id} row={row} />
        ))}
      </ul>

      {gated && hiddenCount > 0 && (
        <a
          className="relative block mt-1 group"
          href={appHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          {/* Blurred decoy rows — the real tickers never reach the DOM. */}
          <div
            aria-hidden
            className="pointer-events-none select-none space-y-1"
            style={{ filter: "blur(4px)" }}
          >
            {DECOY.map((d, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-2 text-xs"
              >
                <span className="font-mono text-foreground/80">{d.ticker}</span>
                <span className="tabular-nums text-[#1e6b18] dark:text-[#5cd84a]">
                  {formatSignedPct(d.returnPct)}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5a4128] text-white text-[11px] font-medium px-3 py-1.5 shadow-lg group-hover:bg-[#3d2b1a] transition-colors">
              <LockClosedIcon className="w-3 h-3" />
              See all {rows.length} picks in the app
            </span>
          </div>
        </a>
      )}
    </section>
  );
}

function ContributorRow({ row }: { row: ChannelContributor }) {
  return (
    <li>
      <Link
        className="flex items-baseline justify-between gap-2 text-xs group"
        to={`/dealings/${row.id}`}
      >
        <span className="min-w-0">
          <span className="font-mono text-foreground/90 group-hover:text-[#5a4128] dark:group-hover:text-[#ad9479]">
            {row.ticker}
          </span>
          <span className="ml-1.5 text-[10px] text-muted truncate">
            {row.company}
          </span>
        </span>
        <span
          className={`tabular-nums font-medium shrink-0 ${toneClass(row.returnPct)}`}
        >
          {formatSignedPct(row.returnPct)}
        </span>
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
