// CongressMarket — the USG (US congressional / STOCK Act) plugin for
// <MarketPage />. Ratingless market (like SE/NL): no deep-analysis pipeline,
// so "Signal" is the deterministic triage verdict (jurisdiction + notable
// size/options) rather than a Rating. Buys only — sales/junk are dropped
// server-side. Member portraits (public-domain) show in the detail drawer.
import type { MarketConfig, MarketDealing, Tone } from "@/lib/markets/types";
import type { Analysis, GovDealing } from "@/types/ddbx";
import type { PriceFormat } from "@/components/position-card";

import { useEffect, useState } from "react";
import { BoltIcon } from "@heroicons/react/24/solid";

import { api } from "@/lib/api";
import { RatingBadge } from "@/components/rating-badge";
import { PositionCard } from "@/components/position-card";
import { MiniPriceChart } from "@/components/mini-price-chart";

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

function compactCommitteeName(name: string): string {
  return name
    .replace("House Committee on ", "")
    .replace("Permanent Select Committee on ", "");
}

function reporterCommittees(d: GovDealing): string[] {
  return (d.reporter.committees ?? [])
    .filter((c) => c.includes("Committee"))
    .map(compactCommitteeName);
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

/** Latest cached close on or before `date` (handles weekends / holidays). */
function closeOnOrBefore(
  bars: { date: string; close_pence: number }[],
  date: string,
): number | null {
  let best: { date: string; close_pence: number } | null = null;
  for (const b of bars) {
    if (b.date <= date && (!best || b.date > best.date)) best = b;
  }
  return best?.close_pence ?? null;
}

const fmtSignedPct = (n: number, unit: "%" | "pp"): string =>
  `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}${unit}`;

const deltaToneClass = (n: number): string =>
  n >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

/** The disclosure-gap story — the single most powerful read for Congress:
 *  PTRs disclose weeks late, so the move BETWEEN the trade and its public
 *  filing is return the public never had a chance to act on. We surface both
 *  anchored returns (server-computed `live_performance`) and call out the gap
 *  explicitly. Raw returns, not alpha — the headline is "how much happened
 *  before you could see it". Hidden when we don't have both anchors. */
function DisclosureGapCallout({
  dealing,
}: {
  dealing: MarketDealing<GovDealing>;
}) {
  const d = dealing.raw;
  const lp = d.live_performance;
  const rt = lp?.return_pct_trade;
  const rd = lp?.return_pct_disclosed;
  if (rt == null || rd == null) return null;

  const gap = rt - rd; // ≈ the move captured during the disclosure blackout
  const lagDays = Math.round(
    (Date.parse(d.disclosed_date.slice(0, 10)) -
      Date.parse(d.trade_date.slice(0, 10))) /
      86_400_000,
  );

  return (
    <div className="space-y-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/60">Since the trade</span>
        <span className={`font-semibold tabular-nums ${deltaToneClass(rt)}`}>
          {fmtSignedPct(rt, "%")}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/60">Since public disclosure</span>
        <span className={`font-semibold tabular-nums ${deltaToneClass(rd)}`}>
          {fmtSignedPct(rd, "%")}
        </span>
      </div>
      {lagDays > 1 && (
        <div className="flex items-start gap-1.5 border-t border-foreground/10 pt-2 text-[13px] leading-snug text-foreground/80">
          <BoltIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span>
            <span className={`font-semibold ${deltaToneClass(gap)}`}>
              {fmtSignedPct(gap, "pp")}
            </span>{" "}
            of that move happened in the {lagDays} days between the trade and
            its public disclosure — before anyone could act on it.
          </span>
        </div>
      )}
    </div>
  );
}

/** Position block (drawer DetailPosition slot) — the same entry → now → return
 *  → vs-S&P tiles + price chart the UK/US drawers use. Congress PTRs carry no
 *  per-share fill price, so we anchor on the close on the trade date (the same
 *  anchor live_performance's trade return uses) and hide the cash sub-lines
 *  (amounts are disclosed only as a band, with no share count, so a derived
 *  £/$ figure would be invented). Prices are fetched on open, one ticker. */
function CongressDetailPosition({
  dealing,
}: {
  dealing: MarketDealing<GovDealing>;
}) {
  const d = dealing.raw;
  const ticker = d.ticker ?? "";
  const tradeDate = d.trade_date.slice(0, 10);
  const disclosedDate = (d.disclosed_date || d.trade_date).slice(0, 10);

  const [entry, setEntry] = useState<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [spEntry, setSpEntry] = useState<number | null>(null);
  const [spCurrent, setSpCurrent] = useState<number | null>(null);

  // US tickers store closes in cents; ^GSPC stores raw index points (left as-is
  // — return ratios are unit-free).
  const usd = (closePence: number) => closePence / 100;

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    api
      .latestPrices([ticker, SPY_TICKER])
      .then((rows) => {
        if (cancelled) return;
        const t = rows.find(
          (r) => r.ticker.toUpperCase() === ticker.toUpperCase(),
        );
        const sp = rows.find((r) => r.ticker === SPY_TICKER);

        setCurrent(t ? usd(t.price_pence) : null);
        setSpCurrent(sp ? sp.price_pence : null);
      })
      .catch(() => {
        if (!cancelled) setCurrent(null);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    api
      .priceHistory(ticker, 365)
      .then((bars) => {
        if (cancelled) return;
        const close = closeOnOrBefore(bars, tradeDate);

        setEntry(close != null ? usd(close) : null);
      })
      .catch(() => {
        if (!cancelled) setEntry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker, tradeDate]);

  useEffect(() => {
    let cancelled = false;

    api
      .priceHistory(SPY_TICKER, 365)
      .then((bars) => {
        if (!cancelled) setSpEntry(closeOnOrBefore(bars, tradeDate));
      })
      .catch(() => {
        if (!cancelled) setSpEntry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (!ticker) return null;

  return (
    <div className="space-y-4">
      {entry != null && current != null ? (
        <PositionCard
          hideAmounts
          benchmark={{ entry: spEntry, current: spCurrent, label: SPY_LABEL }}
          current={current}
          entry={entry}
          fmt={USD_FORMAT}
        />
      ) : (
        <p className="text-sm italic text-muted">
          No price data cached for {ticker} yet.
        </p>
      )}

      <DisclosureGapCallout dealing={dealing} />
      {entry != null && (
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-4">
          <MiniPriceChart
            disclosedDate={disclosedDate}
            entryPrice={entry}
            fmt={USD_FORMAT}
            normalizeClose={(closePence) => closePence / 100}
            tickerForApi={ticker}
            tickerForDisplay={ticker}
            tradeDate={tradeDate}
          />
        </div>
      )}
    </div>
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
  const committees = reporterCommittees(d);
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
        <section className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {d.rating ? (
                <RatingBadge rating={d.rating} />
              ) : (
                <span className="inline-flex items-center justify-center rounded-md border border-[#d8d0c6]/55 bg-transparent px-2 py-0.5 text-[11px] text-[#a89e8c] dark:text-foreground/40">
                  Skipped
                </span>
              )}
              <h3 className="text-base font-semibold">
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
            <div className="space-y-1.5">
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
        <section className="space-y-2 border-t border-foreground/10 pt-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Wider filing assessment</h3>
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

      {(dealing.sector || committees.length > 0) && (
        <section className="space-y-1.5 border-t border-foreground/10 pt-4">
          <h3 className="text-base font-semibold">Context</h3>
          {dealing.sector && (
            <div className="text-sm text-foreground/70">
              <span className="text-muted">Industry</span> · {dealing.sector}
            </div>
          )}
          {committees.length > 0 && (
            <div className="text-sm text-foreground/70">
              <span className="text-muted">Committees</span> ·{" "}
              {committees.join(" · ")}
            </div>
          )}
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
 *  fabricated midpoint. Keep this grid to the filing facts only; contextual
 *  signal (industry / committees / triage reason) lives in the body section. */
function congressDetailFields(dealing: MarketDealing<GovDealing>) {
  const d = dealing.raw;

  return [
    { label: "Disclosed range", value: formatBand(d.amount_min, d.amount_max) },
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
  ];
}

const isGovSignal = (d: MarketDealing<GovDealing>): boolean =>
  d.triageVerdict === "promising" || d.triageVerdict === "maybe";

/* ─── "What are we looking for?" sheet (Congress-specific) ───────────────
 * The shared sheet explains the six-point insider-buy checklist (open-market
 * buy / senior insider / conviction / …). That model doesn't apply to
 * Congress: a member isn't an insider at the company they're buying, so the
 * signal is jurisdiction + size + leverage + clustering, not the checklist.
 * This body replaces it. */
function CongressExplainer() {
  const meta: { label: string; value: string }[] = [
    { label: "Source", value: "US House Clerk — STOCK Act PTRs" },
    { label: "Who files", value: "Representatives, their spouses & dependents" },
    { label: "Amounts", value: "Disclosed as ranges, never exact figures" },
    { label: "Timing", value: "Filed up to ~45 days after the trade" },
  ];

  const criteria: { title: string; body: string }[] = [
    {
      title: "Committee jurisdiction",
      body: "The member sits on a committee that oversees the company’s industry — an Armed Services member buying a defense contractor, say. The clearest reason a trade is worth a second look.",
    },
    {
      title: "Notable size",
      body: "The disclosed band is large for a personal trade, so it reads as a real position rather than pocket change.",
    },
    {
      title: "Leverage (options)",
      body: "An options purchase rather than plain stock — a higher-conviction, higher-risk bet on the same name.",
    },
    {
      title: "Cluster",
      body: "Several members buying the same company around the same time, which can point to a shared read on it.",
    },
  ];

  const caveats: string[] = [
    "It’s a flag, not an accusation. A committee overlap shows a trade worth seeing — it doesn’t prove anything about how the decision was made.",
    "The trade may not be the member’s own. Spouses and dependents file under the same name.",
    "The picture is approximate and late. Amounts are bands, and disclosure can trail the trade by weeks.",
  ];

  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed text-foreground/90">
        Members of Congress write the laws and sit on the committees that
        oversee whole industries. When one buys stock in a company their own
        committee regulates — or places an unusually large or leveraged bet —
        that’s worth seeing. The STOCK Act forces them to disclose it; we
        surface the trades that stand out.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">How we read it</h3>
        <p className="text-sm leading-relaxed text-foreground/70">
          We take the Periodic Transaction Reports (PTRs) filed with the US
          House Clerk, keep the purchases — sales and non-trades are dropped —
          and standardise every filing here. House only for now.
        </p>
        <dl className="overflow-hidden rounded-xl border border-black/[0.06] divide-y divide-black/[0.06] dark:border-white/[0.08] dark:divide-white/[0.08]">
          {meta.map((m) => (
            <div
              key={m.label}
              className="flex items-baseline justify-between gap-4 px-3.5 py-2.5"
            >
              <dt className="shrink-0 text-xs uppercase tracking-wide text-muted">
                {m.label}
              </dt>
              <dd className="text-right text-sm text-foreground/85">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">What makes a trade stand out</h3>
        <p className="text-sm leading-relaxed text-foreground/70">
          A member of Congress isn’t betting on a business they run, so we don’t
          score conviction or seniority the way we do for company insiders.
          Instead a buy is flagged when at least one of these is true — and the
          more it hits, the higher it rates (significant, noteworthy, or minor):
        </p>
        <ol className="space-y-3">
          {criteria.map((item, i) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5a4128]/12 text-xs font-semibold text-[#5a4128] dark:bg-[#ad9479]/15 dark:text-[#ad9479]">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground/70">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm leading-relaxed text-foreground/60">
          Everything else is filed as routine and tucked into the “skipped”
          group.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">A few honest caveats</h3>
        <ul className="space-y-2">
          {caveats.map((c) => (
            <li
              key={c}
              className="flex gap-2.5 text-sm leading-relaxed text-foreground/70"
            >
              <span
                aria-hidden
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/30"
              />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#5a4128]/20 bg-[#5a4128]/[0.06] p-4 dark:border-[#ad9479]/25 dark:bg-[#ad9479]/[0.08]">
        <h3 className="text-sm font-semibold">Still tuning</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
          This is an early preview. As we see how these trades play out, we
          adjust which patterns we flag and how highly we rate them.
        </p>
      </section>
    </div>
  );
}

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
  explainer: <CongressExplainer />,
  explainerSubtitle: "US House · STOCK Act",
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
  columnHelp: {
    disclosed:
      "Date the Periodic Transaction Report was filed. The STOCK Act allows up to ~45 days after the trade.",
    ticker: "US exchange ticker symbol.",
    company:
      "The company and the member of Congress (or their spouse) who bought it.",
    value:
      "Disclosed amount band — the STOCK Act reports ranges, not exact figures.",
    trend:
      "Number of buys in this row, plus the stock's 1-year price trend (trade date marked).",
    performance:
      "Stock return since the trade — or alpha vs the S&P 500 when that view is selected.",
    action:
      "Signal rating from committee-jurisdiction overlap, trade size, and cross-member clustering.",
  },
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
  DetailPosition: CongressDetailPosition,
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
