// CongressMarket — the USG (US congressional / STOCK Act) plugin for
// <MarketPage />. Ratingless market (like SE/NL): no deep-analysis pipeline,
// so "Signal" is the deterministic triage verdict (jurisdiction + notable
// size/options) rather than a Rating. Buys only — sales/junk are dropped
// server-side. Member portraits (public-domain) show in the detail drawer.
import type { MarketConfig, MarketDealing, Tone } from "@/lib/markets/types";
import type { Analysis, GovDealing } from "@/types/ddbx";
import type { PriceFormat } from "@/components/position-card";

import { BoltIcon } from "@heroicons/react/24/solid";

import { api } from "@/lib/api";
import { RatingBadge } from "@/components/rating-badge";
import { DeltaBadge } from "@/components/market/market-row";

const SPY_TICKER = "^GSPC";
const SPY_LABEL = "S&P 500";

const USD_FORMAT: PriceFormat = {
  formatPrice: (n) => `$${n.toFixed(2)}`,
  // Approximate — PTR amounts are disclosed as ranges, so the value column is a
  // band midpoint, not an exact figure. The precise band shows in the row cell.
  formatValue: (n) => (n >= 1_000_000 ? `~$${(n / 1_000_000).toFixed(1)}M` : `~$${Math.round(n / 1000)}k`),
  quoteToValue: 1,
};

/** Amounts are disclosed as a BAND — format the range, never a false-precision
 *  point value. */
const k = (n: number): string => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `$${Math.round(n / 1000)}k`);
function formatBand(min: number | null, max: number | null): string {
  if (min == null) return "—";
  return max == null ? `over ${k(min)}` : `${k(min)}–${k(max)}`;
}

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
  PR: "Puerto Rico", GU: "Guam", VI: "U.S. Virgin Islands", AS: "American Samoa",
  MP: "Northern Mariana Islands",
};

/** Readable location for a member — full state name + House district ("New
 *  Jersey-5"). Party is dropped (it's its own chip now); falls back to chamber. */
const stateLine = (r: GovDealing["reporter"]): string => {
  if (!r.state) return r.chamber === "senate" ? "Senate" : "House";
  const name = US_STATES[r.state] ?? r.state;
  return r.district != null ? `${name}-${r.district}` : name;
};

/** Strip the instrument-class descriptor PTRs append to the issuer name
 *  ("- Common Stock", "Class A Common Stock", "Ordinary Shares", "American
 *  Depositary Shares") so the row shows a clean company name. The full
 *  descriptor stays on the wire row and is shown in the detail drawer. */
function cleanCompany(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\s,–-]*\b(Class\s+[A-Z0-9]+\s+)?(Common|Ordinary)\s+(Stock|Shares)\b.*$/i, "")
    .replace(/[\s,–-]*\bAmerican\s+Depositary\s+(Shares|Receipts)\b.*$/i, "")
    .replace(/[\s,–-]*\bDepositary\s+(Shares|Receipts)\b.*$/i, "")
    .replace(/[\s,–-]+$/, "")
    .trim();
  return cleaned || name.trim();
}

/* ─── Wire → MarketDealing ───────────────────────────────────────────── */

export function toMarketDealing(d: GovDealing): MarketDealing<GovDealing> {
  const buy = d.transaction_type === "purchase";
  const isOption = d.asset_type === "option";
  return {
    key: d.id,
    id: d.id,
    ticker: d.ticker ?? "",
    // Clean name for the row + drawer header; the full instrument descriptor
    // stays on `raw` and shows in the drawer body ("Security").
    company: cleanCompany(d.company),
    insiderName: d.reporter.name,
    // Location only (full state name + district) — party is shown as a chip on
    // the member row, not repeated in this line.
    insiderRole: stateLine(d.reporter),
    insiderPhotoUrl: d.reporter.photo_url,
    party: d.reporter.party,
    disclosedDate: d.disclosed_date,
    tradeDate: d.trade_date,
    isPurchase: buy,
    // Band midpoint — a sort/scale proxy only; the real band shows in the row
    // cell + detail drawer.
    value: d.amount_mid ?? null,
    entryPrice: null, // PTRs carry no per-share price
    shares: 0,
    legCount: 1,
    triageVerdict: d.triage?.verdict,
    rating: d.rating, // deterministic significant/noteworthy/minor — the user-facing label
    sector: d.sector_normalized ?? undefined,
    cluster: d.cluster ?? null,
    livePerformance: d.live_performance ?? null,
    actionLabel: isOption ? "Options purchase" : "Open-market buy",
    actionTone: "buy" as Tone,
    raw: d,
  };
}

/* ─── Slot components ────────────────────────────────────────────────── */

// Options marker for the name column — party lives on the member row (it's a
// person attribute, redundant on each of their trades). Same rounded-md shape
// as the cluster chip, violet tint to stay distinct.
function CongressRowNameBadge({ dealing }: { dealing: MarketDealing<GovDealing> }) {
  if (dealing.raw.asset_type !== "option") return null;
  return (
    <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300">
      <BoltIcon className="h-3 w-3 shrink-0" />
      Options
    </span>
  );
}

function CongressRowActionCell({ dealing }: { dealing: MarketDealing<GovDealing> }) {
  // Just the classification rating (not the pipeline-internal verdict). The
  // options marker now lives in the name column beside the cluster chip; size
  // is in the value column + the drawer's exact disclosed band.
  return (
    <div className="flex items-center justify-end gap-1">
      {dealing.rating ? (
        <RatingBadge rating={dealing.rating} />
      ) : (
        // Match the US/UK "Skipped" pill exactly (capitalised, not uppercase)
        // so the congress table reads consistently with the others.
        <span className="inline-flex items-center justify-center rounded-md border border-[#d8d0c6]/55 bg-transparent px-2 py-0.5 text-[11px] text-[#a89e8c] dark:text-foreground/40">
          Skipped
        </span>
      )}
    </div>
  );
}

/** Performance block (drawer DetailPosition slot). Congress PTRs carry no
 *  per-share fill price, so there's no honest "you'd be up £X" position card —
 *  instead we surface the server-precomputed return as of the latest close,
 *  anchored both at the trade date (the member's actual window) and the
 *  disclosure date (what a copycat could have entered at), each paired with its
 *  alpha vs the S&P. Reads straight off live_performance — no price fetch. When
 *  the ticker has no cached prices, says so explicitly rather than showing a
 *  fake 0%. */
function CongressPerformance({
  dealing,
}: {
  dealing: MarketDealing<GovDealing>;
}) {
  const lp = dealing.livePerformance;
  const rows = [
    {
      label: "Since trade",
      ret: lp?.return_pct_trade ?? null,
      alpha: lp?.alpha_pct_trade ?? null,
    },
    {
      label: "Since disclosure",
      ret: lp?.return_pct_disclosed ?? null,
      alpha: lp?.alpha_pct_disclosed ?? null,
    },
  ];
  const hasData = rows.some((r) => r.ret != null);

  return (
    <section className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-wide text-foreground/45">
          Performance
        </h3>
        {hasData && lp?.as_of && (
          <span className="text-[11px] tabular-nums text-foreground/40">
            as of {lp.as_of}
          </span>
        )}
      </div>

      {hasData ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm text-foreground/70">{r.label}</span>
              <div className="flex items-center gap-2.5">
                {r.alpha != null && (
                  <span className="text-[11px] tabular-nums text-foreground/45">
                    {r.alpha >= 0 ? "+" : ""}
                    {r.alpha.toFixed(1)}pp vs S&amp;P
                  </span>
                )}
                {r.ret != null ? (
                  <DeltaBadge value={r.ret} />
                ) : (
                  <span className="text-xs text-muted/50">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-muted">
          No price data cached for this ticker yet.
        </p>
      )}
    </section>
  );
}

/** The filing-level narrative (summary + supporting points + risks). Shared
 *  between the two layouts below — it stands alone as the "wider filing" read
 *  when this buy is one of many in a report, or folds into the single trade
 *  assessment when the filing is just this one name. */
function GovAnalysisNarrative({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm text-foreground/80">{analysis.summary}</div>
      {analysis.thesis_points?.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-sm text-foreground/75">
          {analysis.thesis_points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {analysis.key_risks?.length > 0 && (
        <div className="text-xs text-foreground/55">
          <span className="uppercase tracking-wide">Risks:</span>{" "}
          {analysis.key_risks.join(" · ")}
        </div>
      )}
    </div>
  );
}

function CongressDetailBody({
  dealing,
  allDealings = [],
}: {
  dealing: MarketDealing<GovDealing>;
  allDealings?: MarketDealing<GovDealing>[];
}) {
  const d = dealing.raw;
  // "Part of a wider filing" = the member disclosed several positions in the
  // same PTR (a portfolio rebalance, say). We detect it by counting sibling
  // rows that share this filing_id in the loaded list; a lone row is a focused,
  // single-name filing, where the filing-level read IS the trade-level read —
  // so we don't split it into a separate (repetitive) section.
  const filingSize = allDealings.filter(
    (x) => x.raw.filing_id === d.filing_id,
  ).length;
  const isWiderFiling = filingSize > 1;

  const confidence =
    d.analysis?.confidence != null
      ? `${Math.round(d.analysis.confidence * 100)}% confidence`
      : null;

  return (
    <div className="space-y-4">
      {(d.rating_explain || d.analysis) && (
        <section className="space-y-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {d.rating ? (
                <RatingBadge rating={d.rating} />
              ) : (
                <span className="inline-flex items-center justify-center rounded-md border border-[#d8d0c6]/55 bg-transparent px-2 py-0.5 text-[11px] text-[#a89e8c] dark:text-foreground/40">
                  Skipped
                </span>
              )}
              <h3 className="text-sm font-semibold">
                {isWiderFiling ? "This trade" : "Trade assessment"}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              Why this specific purchase was rated the way it is.
            </p>
          </div>

          {d.rating_explain?.headline && (
            <div className="text-sm font-medium text-foreground/90">
              {d.rating_explain.headline}
            </div>
          )}

          {d.rating_explain && (
            <ul className="space-y-1.5">
              {d.rating_explain.factors.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug">
                  <span
                    aria-hidden="true"
                    className={`mt-px shrink-0 font-semibold tabular-nums ${
                      f.sign === "pos"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : f.sign === "neg"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground/35"
                    }`}
                  >
                    {f.sign === "pos" ? "＋" : f.sign === "neg" ? "－" : "・"}
                  </span>
                  <span
                    className={
                      f.sign === "neutral"
                        ? "text-foreground/55"
                        : "text-foreground/80"
                    }
                  >
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Focused filing: the narrative is about this very trade, so it
              belongs here rather than in a separate "wider filing" section. */}
          {!isWiderFiling && d.analysis && (
            <div className="space-y-1.5 border-t border-foreground/10 pt-2.5">
              {confidence && (
                <div className="text-xs text-foreground/45">{confidence}</div>
              )}
              <GovAnalysisNarrative analysis={d.analysis} />
            </div>
          )}
        </section>
      )}

      {/* Only shown when the buy was genuinely one of several in one report. */}
      {isWiderFiling && d.analysis && (
        <section className="space-y-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Wider filing assessment</h3>
              {confidence && (
                <span className="text-xs text-foreground/45">{confidence}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              Members often disclose many trades in one report. This buy was 1 of{" "}
              {filingSize} positions filed together — here&apos;s the read on the
              whole batch.
            </p>
          </div>
          <GovAnalysisNarrative analysis={d.analysis} />
        </section>
      )}

      <div className="text-xs text-foreground/45">
        Amounts are disclosed as ranges (STOCK Act). ·{" "}
        <a className="underline underline-offset-2 hover:text-foreground/70" href={d.ptr_link} rel="noreferrer" target="_blank">
          View original filing
        </a>
      </div>
    </div>
  );
}

/** Raw-filing facts folded into the drawer's standard metadata grid (see
 *  MarketConfig.detailFields). The disclosed band is the primary money figure —
 *  the STOCK Act discloses ranges, so we show the bracket rather than the
 *  fabricated midpoint. Committees come along too so the jurisdiction context
 *  the rating leans on is one glance away. */
function congressDetailFields(dealing: MarketDealing<GovDealing>) {
  const d = dealing.raw;
  const committees = (d.reporter.committees ?? [])
    .filter((c) => c.includes("Committee"))
    .map((c) =>
      c
        .replace("House Committee on ", "")
        .replace("Permanent Select Committee on ", ""),
    );

  return [
    { label: "Action", value: dealing.actionLabel },
    { label: "Disclosed range", value: formatBand(d.amount_min, d.amount_max) },
    dealing.sector ? { label: "Industry", value: dealing.sector } : null,
    {
      label: "Security",
      value: `${d.company}${d.ticker ? ` · ${d.ticker}` : ""}`,
    },
    { label: "Owner", value: d.owner },
    { label: "Traded", value: d.trade_date },
    {
      label: "Disclosed",
      value: `${d.disclosed_date}${d.is_late ? " (late)" : ""}`,
    },
    committees.length > 0
      ? { label: "Committees", value: committees.join(" · ") }
      : null,
  ];
}

const isGovSignal = (d: MarketDealing<GovDealing>): boolean =>
  d.triageVerdict === "promising" || d.triageVerdict === "maybe";

/* ─── Config ─────────────────────────────────────────────────────────── */

export const CongressMarket: MarketConfig<GovDealing> = {
  id: "usg",
  title: "US Congress (preview)",
  documentTitle: "ddbx · Congressional Trading — US House STOCK Act Filings",
  heroHeadline: (
    <>
      Which members of{" "}
      <span className="text-[#5a4128] dark:text-[#ad9479]">Congress</span> have
      been buying stocks?
    </>
  ),
  description: (
    <>
      US House <strong className="text-foreground/75">STOCK Act</strong> Periodic
      Transaction Reports — what members of Congress (and their spouses) are
      buying. Official House Clerk filings, parsed and triaged automatically.{" "}
      <strong className="text-foreground/75">Signal</strong> = trades with a
      committee-jurisdiction edge, a cross-member cluster, or that are notable by
      size/leverage (large bets, options). <strong className="text-foreground/75">All</strong>{" "}
      shows every buy. Senate coming later.
    </>
  ),
  marketLabel: "US Congress",
  locale: "en-US",
  topNotice: "US Congress is an early preview — House only, no manual curation yet.",
  priceFormat: USD_FORMAT,
  normalizeLivePrice: (close_pence) => close_pence / 100,
  // PTRs disclose dollar ranges, not an exact fill, and land weeks late — so
  // there's no execution price to anchor on. But the move *since the member
  // traded* is exactly the interesting number, so we do fetch live prices +
  // bars: the shell derives the trade-date entry from the fetched bars (see
  // stockEntry in market-page) and the default metric mode for `usg` is
  // performanceSinceTrade.
  enableLivePrices: true,
  enableLogos: true,
  benchmarkTicker: SPY_TICKER,
  benchmarkLabel: SPY_LABEL,
  formatTickerDisplay: (t) => t,
  views: [{ id: "all", label: "All" }],
  defaultView: "all",
  defaultSignalFilter: "all",
  // PTRs disclose weeks late, so "today" is almost always empty — the big
  // Today hero is noise here. Today's filings (when any) fall into the month
  // list as a normal day instead.
  hideTodayHero: true,
  isSignal: isGovSignal,
  isRowMuted: (d) => d.triageVerdict === "skip",
  isSkipped: (d) => d.triageVerdict === "skip",
  // Party axis — Congress-only. Always visible in the filter bar; "all" applies
  // no narrowing. Unresolved filers (no roster match) have no party and drop
  // out of the D / R views.
  extraFilters: [
    {
      id: "party",
      label: "Party",
      defaultValue: "all",
      options: [
        { id: "all", label: "All parties" },
        { id: "D", label: "Democrat" },
        { id: "R", label: "Republican" },
        { id: "I", label: "Independent" },
      ],
      predicate: (value, d) => d.party === value,
    },
  ],
  // Group by member, not company — for Congress the person is the entity of
  // interest (one member often buys many tickers in a day). Portrait anchors
  // the group, connected to the company rows they bought.
  clusterByPerson: true,
  pollIntervalMs: 0,
  async fetchDealings() {
    const r = await api.govDealings({ view: "all", limit: 500 });
    const dealings = r.dealings.map(toMarketDealing);
    const latest = dealings[0]?.disclosedDate;
    return {
      dealings,
      stats: {
        total: dealings.length,
        viewCounts: { all: dealings.length },
        latestDisclosedLabel: latest ? `Latest disclosure ${latest}` : undefined,
      },
    };
  },
  insiderLabel: "Congress member",
  RowActionCell: CongressRowActionCell,
  RowNameBadge: CongressRowNameBadge,
  DetailPosition: CongressPerformance,
  DetailBody: CongressDetailBody,
  detailFields: congressDetailFields,
  // Right-hand news bar — reuse the US market feed (/api/news/us); Congress
  // trades US equities, so US business headlines are the right context.
  fetchNews: () => api.usNews(),
  newsHeading: "US market news",
  newsFooterNote:
    "Third-party headlines (CNBC, MarketWatch, Yahoo Finance, Seeking Alpha); opens in a new tab.",
  renderEmptyState: () => (
    <>No congressional buys stored yet — the ingest cron fills this every few hours.</>
  ),
};
