// KoreaMarket — the KRX plugin for <MarketPage />.
//
// PROGRAMMES LEAD. Korea is the only market here where the news arrives
// BEFORE the trade: under FSCMA art. 173-3, officers and major shareholders
// must announce a purchase at least 30 days ahead once it reaches 1% of the
// company's shares or 50bn won. Those announcements are the headline object
// (`plans.leads`), rendered as one row per buying programme; the purchases
// that carried no announcement sit below them.
//
// Nothing reader-facing on this page uses the word "declaration", or names
// the statute, or says "disclosed". The rows say announced, buying now,
// bought, called off. The statute is one click down, inside MarketPlans.
//
// Four things are deliberate and should survive edits:
//
//   1. Programmes render through MarketPlans, not the dealings table. A
//      MarketDealing asserts a trade date, an entry price and a value that
//      were realised; an announcement has none of those. Reusing the row
//      would state things about it that are not true.
//   2. ONE ROW PER FILING, not per trade leg. /api/kr-dealings returns one
//      row per leg and a single filing can report forty-nine of them across
//      five years. `foldFilings` collapses them the way us.tsx collapses
//      Form 4 legs; the count lands in the Trend cell and the legs in the
//      drawer's "Trades" table.
//   3. ONE PURCHASE, SHOWN ONCE. A filing whose `plan_report_date` matches a
//      programme's `filed_date` for the same stock code belongs to that
//      programme's row and is dropped from the list below — the same join
//      the data side uses to compute `executed_value_krw`. See
//      `loadKoreaPage`.
//   4. A completed purchase is never promoted for having been announced in
//      advance. The announcement is the event; the filing that confirms it
//      only says a plan already on the record was carried out. It earns no
//      row chip, no ordering, no weight of any kind.
//
// WHAT KOREA DOES NOT HAVE, and what the shell is told about it:
//
//   - No rating, triage or analysis layer. So: its own FAQ rather than
//     buildMarketFaq() (whose answers promise a thesis, a six-point score and
//     Contrarian/Momentum tags that do not exist here), no claim anywhere on
//     the page that a filing has been screened, and an Action column that
//     carries a plain fact about the filing rather than a verdict on it.
//   - No Korean app, so no comment counts. Column hidden — and the count is
//     synthetic anyway ("N people are discussing this in the app"), so it
//     would point at a conversation that cannot exist.
//
// WHAT KOREA NOW HAS, and did not when this file was written:
//
//   - Price coverage. /api/prices knows KRX under a VENUE SUFFIX — `.KS` for
//     KOSPI, `.KQ` for KOSDAQ and KONEX — and the KOSPI itself as ^KS11, all
//     stored as native won. So `ticker` is the suffixed symbol and the
//     suffix is stripped for display; Trend and Return are live columns.
//   - Logos by DOMAIN. The logo provider still 404s on a 6-digit stock code,
//     but DART publishes every issuer's homepage, so a Korean row resolves
//     its logo through `website` rather than its ticker. Rows whose filing
//     states no homepage fall back to a monogram of the company name —
//     "006340" would have been meaningless, "SEC" is not.
//
// Data: ddbx-data /api/kr-plans and /api/kr-dealings. Korea is data-side only
// there — it is deliberately NOT in MARKETS or MARKET_CONFIG, so neither app
// decoder is involved. See ddbx-data/investigations/2026-08-03-korea-*.md.

import type {
  MarketConfig,
  MarketDealing,
  MarketFaqItem,
  MarketPlan,
  MarketStats,
  PlansPayload,
} from "@/lib/markets/types";

import { Link } from "react-router-dom";

import { chip } from "@/components/chip";
import { DisclosureSection } from "@/components/disclosure-section";
import { api, type KrDealingWire, type KrPlanWire } from "@/lib/api";
import { HOW_IT_WORKS_PATH } from "@/lib/methodology";

/** KRX continuous trading, 09:00–15:30 KST. */
export const KRX_SESSION = {
  timeZone: "Asia/Seoul",
  openMinute: 9 * 60,
  closeMinute: 15 * 60 + 30,
};

/** Deep link to the how-it-works section that carries Korea's caveats — the
 *  advance-declaration regime and the settlement-date reading below. */
const KOREA_EXPLAINER = `${HOW_IT_WORKS_PATH}#korea-advance-plans`;

/** YYYYMMDD as filed → YYYY-MM-DD, which is what the shell expects. */
const iso = (d: string | null): string =>
  d && /^\d{8}$/.test(d)
    ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
    : (d ?? "");

/** Company names are Hangul in the filing; DART publishes an English name for
 *  every listed issuer and it is joined server-side. Fall back to the Korean
 *  rather than showing nothing — a name is a name. */
const displayName = (en: string | null, ko: string) => en?.trim() || ko;

/** A job title only when it is one the reader can read. `position` is the
 *  verbatim Korean ("회장", "대표이사") and the server publishes an English
 *  reading beside it; roughly a third of filings state no title at all, and
 *  those get nothing rather than a Hangul string a non-Korean reader has to
 *  photograph to understand. */
const roleLabel = (
  role: { label: string } | null,
  position: string | null,
): string | undefined => {
  const label = role?.label?.trim();

  if (label) return label;
  // "-" is how the filing says "no title stated".
  if (position && position !== "-" && !/[가-힯]/.test(position)) return position;

  return undefined;
};

/** The filing states the filer's relationship to the company as a statutory
 *  class, in the plural ("Shareholders holding 10% or more"), because that is
 *  what the class is called. A row describes exactly one filer and is read by
 *  someone who has never met the statute, so both readings were wrong: the
 *  plural reads as a mistake, and "effective controlling shareholder" is the
 *  regulation's phrase rather than a description of a person.
 *
 *  An explicit map rather than a de-pluralising regex — there are two of
 *  these, and a regex would eventually eat the wrong "s". Anything unmapped
 *  passes through verbatim rather than being guessed at. */
const HOLDER_STATUS: Record<string, string> = {
  "Shareholders holding 10% or more": "holds over 10%",
  "Effective controlling shareholders": "controlling shareholder",
};

const holderStatus = (raw: string | null): string | undefined => {
  if (!raw || raw === "-") return undefined;

  return HOLDER_STATUS[raw] ?? raw;
};

/* ─── Symbols ────────────────────────────────────────────────────────── */

/** A 6-digit KRX stock code is not a symbol anything outside Korea can price.
 *  The quote provider keys KRX on the code plus a VENUE suffix: `.KS` for the
 *  main board, `.KQ` for KOSDAQ — and KONEX, whose few names are carried on
 *  the KOSDAQ feed rather than one of their own.
 *
 *  This is the ticker the row holds, because the price and history fetches
 *  read `dealing.ticker` verbatim. `formatTickerDisplay` puts the bare code
 *  back for the reader, who has no use for the suffix. */
const priceSymbol = (
  stockCode: string | null,
  venue: string | null,
): string => {
  if (!stockCode) return "";

  return `${stockCode}.${venue === "KOSPI" ? "KS" : "KQ"}`;
};

/* ─── Money ──────────────────────────────────────────────────────────── */

const won = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

/** ₩4,999,995,000 is a number, not a quantity — nobody outside Korea sizes it
 *  on sight. The worker already converts every filing, so the reader gets the
 *  won as filed with the sterling reading under it. Approximate on purpose:
 *  the rate is the one held on the server, and pretending to the pound would
 *  overstate what a daily FX snapshot knows. */
const approxGbp = (gbp: number | null | undefined): string | null => {
  if (gbp == null || gbp <= 0) return null;
  if (gbp >= 1e6) return `≈ £${(gbp / 1e6).toFixed(1)}m`;
  if (gbp >= 1e3) return `≈ £${Math.round(gbp / 1e3)}k`;

  return `≈ £${Math.round(gbp)}`;
};

const compactWon = (n: number): string =>
  n >= 1e12
    ? `₩${(n / 1e12).toFixed(1)}tn`
    : n >= 1e9
      ? `₩${(n / 1e9).toFixed(1)}bn`
      : n >= 1e6
        ? `₩${(n / 1e6).toFixed(0)}m`
        : won.format(n);

/* ─── Adapters ───────────────────────────────────────────────────────── */

function toPlan(w: KrPlanWire): MarketPlan {
  return {
    key: w.rcept_no,
    id: w.rcept_no,
    ticker: w.stock_code ?? "",
    company: displayName(w.company_en, w.company),
    // The issuer homepage, which is how a Korean logo resolves — see the
    // header note. Null on filings where DART states none.
    logoDomain: w.website,
    venue: w.venue,
    insiderName: displayName(w.reporter_name_en, w.reporter_name),
    insiderRole: roleLabel(null, w.position),
    holderStatus: holderStatus(w.major_holder),
    filedDate: iso(w.filed_date),
    windowStart: w.window_start ? iso(w.window_start) : null,
    windowEnd: w.window_end ? iso(w.window_end) : null,
    noticeDays: w.notice_days,
    plannedShares: w.plan_shares,
    plannedValue: w.plan_value_krw,
    // Sterling leads the row and won sits beneath it — see MarketPlan. The
    // raw number travels alongside the formatted string so the size verdict
    // can be thresholded on it without re-parsing "≈ £830k".
    plannedValueSecondary: approxGbp(w.plan_value_gbp),
    plannedValueGbp: w.plan_value_gbp,
    plannedPercent: w.plan_pct,
    purposeLabel: w.purpose_reading?.label ?? null,
    purposeHint: w.purpose_reading?.hint ?? null,
    // Only shown when a reading exists — the raw Korean alone would be noise
    // to a reader who cannot parse it.
    purposeRaw: w.purpose_reading ? w.purpose : null,
    isWithdrawn: w.is_withdrawal === 1,
    executedShares: w.executed_shares,
    executedValue: w.executed_value_krw,
  };
}

/* ─── Folding a filing's legs ────────────────────────────────────────── */

/** One DART filing after its trade legs are folded together.
 *
 *  /api/kr-dealings returns ONE ROW PER TRADE LEG, keyed `<rcept_no>-<n>`. A
 *  Korean insider who bought on forty-nine occasions between 2021 and 2026 and
 *  reported the lot in a single September filing therefore arrived as
 *  forty-nine rows — same company, same person, same disclosure date, one per
 *  screen. Across a 200-row window that is 81 real filings; 36 of them have
 *  more than one leg.
 *
 *  So the page folds by `rcept_no`, exactly as the US side folds Form 4 legs
 *  (see `groupRows` / `UsRowGroup` in us.tsx). The folded row carries the
 *  first leg's identity fields verbatim and the aggregate money, with every
 *  leg kept on `legs` so the drawer can show the working. */
export type KrDealingGroup = KrDealingWire & { legs: KrDealingWire[] };

/** Sum of a nullable column, or null when no leg states one. Distinguishing
 *  "nothing filed a value" from "the values add to zero" matters: the first is
 *  a gap in the record and the second is a fact. */
function sumOrNull(
  legs: KrDealingWire[],
  pick: (l: KrDealingWire) => number | null,
): number | null {
  let total: number | null = null;

  for (const l of legs) {
    const v = pick(l);

    if (v != null) total = (total ?? 0) + v;
  }

  return total;
}

function foldFilings(rows: KrDealingWire[]): KrDealingGroup[] {
  const byFiling = new Map<string, KrDealingWire[]>();

  for (const r of rows as Array<KrDealingWire | null | undefined>) {
    // Defensive: one malformed row should not take the whole market's render
    // down with it. Mirrors the same guard in us.tsx's groupRows.
    if (!r?.rcept_no) continue;
    const legs = byFiling.get(r.rcept_no);

    if (legs) legs.push(r);
    else byFiling.set(r.rcept_no, [r]);
  }

  // Insertion order is the API's own newest-disclosure-first ordering, so the
  // folded list needs no re-sort.
  return Array.from(byFiling.values()).map((unsorted) => {
    const legs = [...unsorted].sort((a, b) =>
      a.trade_date.localeCompare(b.trade_date),
    );
    const earliest = legs[0];
    const latest = legs[legs.length - 1];
    const sharesChange = legs.reduce((n, l) => n + l.shares_change, 0);
    const valueKrw = sumOrNull(legs, (l) => l.value_krw);
    // The value-weighted average, which is what "the price they paid" means
    // across a filing that touched the market forty-nine times. Falls back to
    // the last leg's own price when no leg states a value.
    const priceKrw =
      valueKrw != null && sharesChange !== 0
        ? Math.round(valueKrw / sharesChange)
        : latest.price_krw;
    // Measured against the holding BEFORE the first leg, which is the only
    // before-holding the filing's own arithmetic is anchored on. Null when
    // that field is missing or zero, rather than dividing by it.
    const stake =
      earliest.shares_before != null && earliest.shares_before > 0
        ? Math.round((sharesChange / earliest.shares_before) * 1000) / 10
        : null;

    return {
      ...earliest,
      // The filing, not the leg. Legs share every identity field, so only the
      // aggregates below are recomputed.
      id: earliest.rcept_no,
      trade_date: latest.trade_date,
      shares_before: earliest.shares_before,
      shares_change: sharesChange,
      value_krw: valueKrw,
      value_gbp: sumOrNull(legs, (l) => l.value_gbp),
      price_krw: priceKrw,
      stake_change_pct: stake,
      legs,
    };
  });
}

function toDealing(w: KrDealingGroup): MarketDealing<KrDealingGroup> {
  const company = displayName(w.company_en, w.company);

  return {
    key: w.rcept_no,
    id: w.rcept_no,
    // Venue-suffixed, because this is what the price fetches are keyed on.
    ticker: priceSymbol(w.stock_code, w.venue),
    company,
    logoDomain: w.website,
    // A KRX code makes a nonsense monogram ("006"), so the name supplies the
    // fallback glyph when the logo lookup comes back empty.
    logoMonogram: company,
    insiderName: displayName(w.reporter_name_en, w.reporter_name),
    insiderRole: roleLabel(w.role, w.position),
    disclosedDate: iso(w.disclosed_date),
    // 변동일 is the SETTLEMENT date for on-market trades, not the execution
    // date. It is the closest thing the filing gives to a trade date and is
    // labelled as the trade date throughout the shell; the how-it-works page
    // carries the caveat rather than the row. On a folded filing it is the
    // LATEST leg — the most recent thing that happened.
    tradeDate: iso(w.trade_date),
    isPurchase: w.shares_change > 0,
    value: w.value_krw,
    valueSecondary: approxGbp(w.value_gbp),
    entryPrice: w.price_krw,
    shares: Math.abs(w.shares_change),
    legCount: w.legs.length,
    raw: w,
  } as MarketDealing<KrDealingGroup>;
}

/* ─── One load per page, shared by both lists ────────────────────────── */

/** ~£25k at ~1,750 KRW/GBP. Without a floor the feed is unreadable: the median
 *  individual buy is about £15k and a seventh of all filings are treasury-stock
 *  bonuses. Measured in ddbx-data/investigations/2026-08-03-korea-market-probe.md. */
const MIN_KRW = 43_750_000;

/** The worker's ceiling. At the old 60 the whole feed was a single day of
 *  Korean filings — a page that says "newest first" and then stops inside one
 *  date reads as broken, and there is nothing to scroll. 200 buys about three
 *  trading weeks. */
const DEALINGS_LIMIT = 200;

/** Also the worker's ceiling, and raised from 60 for the join below: at 60 the
 *  announcements reached back only to late June and two thirds of the
 *  purchases that belong to one could not find it. At 200 the list reaches
 *  back to January and eleven of the window's eighty-one filings match. */
const PLANS_LIMIT = 200;

interface KoreaPage {
  plans: MarketPlan[];
  notice: PlansPayload["notice"];
  /** Folded filings with NO announcement of their own in this page's plan
   *  set — see `loadKoreaPage` for why the other ones are dropped. */
  dealings: MarketDealing<KrDealingGroup>[];
  stats: MarketStats;
}

/** Five minutes, matching the TTL on api.ts's own response cache. */
const PAGE_TTL_MS = 5 * 60 * 1000;

let pageCache: { at: number; value: Promise<KoreaPage> } | null = null;

/** BOTH LISTS COME FROM ONE LOAD, because the second is defined against the
 *  first. A completed purchase that was announced in advance is the SAME EVENT
 *  as the programme row above it, and the page was showing it twice: once as
 *  "64% bought" inside Kukil Metal's row, and again as a standalone purchase
 *  below, with no thread between them.
 *
 *  The join is the data side's own, from listKrPlans in
 *  ddbx-data/worker/pipeline/kr/queries.ts, which computes each plan's
 *  `executed_value_krw` as the sum of dealings where
 *  `d.stock_code = p.stock_code AND d.plan_report_date = p.filed_date`. Same
 *  key here, so the two can never disagree about which purchase belongs to
 *  which announcement.
 *
 *  A filing whose announcement is OLDER than the plan window still renders
 *  below, unattached — that is not a bug, and the lower table's subtitle says
 *  so. The alternative is dropping a real purchase off the page because the
 *  announcement that explains it has scrolled out of a 200-row list.
 *
 *  Cached at module level so `fetchPlans` and `fetchDealings`, which the shell
 *  calls from two different components, share one pair of requests rather than
 *  hitting both endpoints twice each. */
function loadKoreaPage(): Promise<KoreaPage> {
  if (pageCache && Date.now() - pageCache.at < PAGE_TTL_MS)
    return pageCache.value;

  const value = (async (): Promise<KoreaPage> => {
    const [plansRes, dealingsRes] = await Promise.all([
      api.krPlans({ limit: PLANS_LIMIT }),
      api.krDealings({ limit: DEALINGS_LIMIT, minKrw: MIN_KRW }),
    ]);

    const planWires = plansRes.plans ?? [];
    const announced = new Set(
      planWires.map((p) => `${p.stock_code}|${p.filed_date}`),
    );
    const dealings = foldFilings(dealingsRes.dealings ?? [])
      .filter(
        (f) =>
          !(
            f.plan_report_date &&
            announced.has(`${f.stock_code}|${f.plan_report_date}`)
          ),
      )
      .map(toDealing);

    return {
      plans: planWires.map(toPlan),
      notice: plansRes.notice && {
        headline: plansRes.notice.headline,
        body: plansRes.notice.body,
        // The server's own label is "How advance declarations work", and
        // "declaration" is the one word this page no longer uses anywhere a
        // reader can see it. Overridden here rather than in ddbx-data so the
        // wording change does not need a Worker deploy; the body still
        // travels from the server. Worth pushing upstream
        // (worker/pipeline/kr) the next time that file is touched.
        learnMoreLabel: "More on how the Korean feed reads",
        learnMorePath: plansRes.notice.learn_more_path,
      },
      dealings,
      stats: {
        total: dealings.length,
        viewCounts: { signal: dealings.length },
        latestDisclosedLabel: dealings[0]?.disclosedDate
          ? `Latest filing ${dealings[0].disclosedDate}`
          : undefined,
      },
    };
  })().catch((err) => {
    pageCache = null;
    throw err;
  });

  pageCache = { at: Date.now(), value };

  return value;
}

async function fetchPlans(): Promise<PlansPayload> {
  const { plans, notice } = await loadKoreaPage();

  return { plans, notice };
}

async function fetchDealings(): Promise<{
  dealings: MarketDealing<KrDealingGroup>[];
  stats: MarketStats;
}> {
  const { dealings, stats } = await loadKoreaPage();

  return { dealings, stats };
}

/* ─── Config ─────────────────────────────────────────────────────────── */

/** Listing board, beside the insider line. A 6-digit code carries no tier the
 *  way a `.L` or a NASDAQ symbol does, so KOSPI / KOSDAQ / KONEX is the only
 *  thing on the row that says how large a company this is. Quiet on purpose:
 *  it is an attribute of the issuer, not a judgement on the filing. */
function KrRowNameBadge({
  dealing,
}: {
  dealing: MarketDealing<KrDealingGroup>;
}) {
  const venue = dealing.raw.venue;

  if (!venue) return null;

  return (
    <span
      className={`${chip()} shrink-0 bg-black/[0.04] text-muted dark:bg-white/[0.06]`}
    >
      {venue}
    </span>
  );
}

/** Korea ships no rating, triage or analysis layer, so this column cannot
 *  hold a verdict the way the UK and US ones do. What it holds instead is the
 *  one fact about a Korean purchase that the money columns cannot state: how
 *  much of the insider's OWN position it was.
 *
 *  `stake_change_pct` is the purchase as a percentage of the holding they
 *  already had — `(shares_change / shares_before) * 100`, computed in
 *  ddbx-data's pipeline/kr/roles.ts. It is NOT percentage points of the
 *  company, and the chip must not read as though it were: "Holding +33%"
 *  means they added a third to what they held, and says nothing about what
 *  fraction of the company that is.
 *
 *  Deliberately NOT a signal. ddbx-data refuted the hypothesis that stake
 *  growth orders returns (it was composition, and it vanishes once drawdown
 *  is held fixed). The chip is here because "bought 12,677 shares" means
 *  nothing on its own, not because the number predicts anything — so it gets
 *  the neutral tint, never the rating palette. */
function KrRowActionCell({
  dealing,
}: {
  dealing: MarketDealing<KrDealingGroup>;
}) {
  const label = stakeChangeLabel(dealing.raw.stake_change_pct);

  if (!label) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <span
        className={`${chip()} bg-transparent text-[#b0a898] dark:text-foreground/45`}
      >
        {label}
      </span>
    </div>
  );
}

/** The chip's text, or null when there is nothing honest to put in it.
 *
 *  Three ways this is nothing: the filing states no before-holding (the
 *  server already returns null for a zero or missing one, so there is no
 *  division by zero to undo here); the figure is absurd, which happens when
 *  a filer's stated prior holding is a token number and a real purchase
 *  divides into it to give four-figure percentages; and a change too small
 *  to round to a readable figure.
 *
 *  One decimal below 10% so a 3.4% addition does not render as "3%", whole
 *  numbers above it where the decimal is noise. */
function stakeChangeLabel(pct: number | null): string | null {
  if (pct == null) return null;
  const abs = Math.abs(pct);

  // An insider who multiplied their holding elevenfold is nearly always a
  // filing whose prior-holding field is wrong, not a real eleven-bagger.
  if (abs > 1000) return null;
  // Below this the chip would round to "+0.0%", which says less than nothing.
  if (abs < 0.05) return null;

  return `Stake ${pct > 0 ? "up" : "down"} ${abs < 10 ? abs.toFixed(1) : Math.round(abs)}%`;
}

/** The filing's own record, in the reader's units.
 *
 *  `plan_report_date` is stated here and nowhere else. It is a neutral fact
 *  about this one filing — that the purchase was on the record before it
 *  happened — and a reader who has just scrolled past the declarations
 *  section is owed the connection. It is deliberately not a row chip and
 *  never sorts or scores anything: see the header note. */
function KrDetailBody({ dealing }: { dealing: MarketDealing<KrDealingGroup> }) {
  const w = dealing.raw;
  const legs = w.legs;
  const gbp = approxGbp(w.value_gbp);
  // Median lag is about five days, but late and corrective filings run to
  // years. A feed sorted by disclosure that quietly carries a trade from two
  // years ago needs to say so where the dates are.
  const lagDays = daysBetween(iso(w.trade_date), iso(w.disclosed_date));
  const multi = legs.length > 1;
  // Legs arrive sorted oldest-first from foldFilings, so the span is the ends.
  const first = legs[0];
  const last = legs[legs.length - 1];
  const stakeLabel = stakeChangeLabel(w.stake_change_pct);
  const holdingAfter =
    last.shares_before != null ? last.shares_before + last.shares_change : null;
  const holdingSpan =
    first.shares_before != null &&
    first.shares_before > 0 &&
    holdingAfter != null
      ? `${first.shares_before.toLocaleString("en-GB")} to ${holdingAfter.toLocaleString("en-GB")} shares`
      : null;

  return (
    <div className="space-y-3">
      {/* Said in words before it is shown in a table. A row marked "49" is a
          filing that reports forty-nine separate purchases going back five
          years, and a reader who does not know that will read the single
          trade date above it as the date of the whole lot. */}
      {multi ? (
        <p className="text-[12.5px] leading-[1.5] text-foreground/70">
          {legs.length} trades between {longDate(first.trade_date)} and{" "}
          {longDate(last.trade_date)}, all reported in one filing on{" "}
          {longDate(w.disclosed_date)}. The figures below are the totals.
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <DetailPair
          label="Shares"
          value={Math.abs(w.shares_change).toLocaleString("en-GB")}
        />
        <DetailPair
          label={multi ? "Average price" : "Price paid"}
          sub={multi ? "across every trade" : undefined}
          value={w.price_krw != null ? won.format(w.price_krw) : "Not stated"}
        />
        <DetailPair
          label="Total"
          sub={gbp ?? undefined}
          value={w.value_krw != null ? won.format(w.value_krw) : "Not stated"}
        />
        {/* Growth of the filer's OWN holding, not percentage points of the
            company — the two read identically and mean entirely different
            things, so the label says which.

            A filing that reports five years of buying divides a 2026 holding
            into a 2021 one and produces "Stake up 18312.7%", which is
            arithmetic rather than information. `stakeChangeLabel` already
            refuses that figure for the row chip; when it does, the cell states
            the two holdings the legs actually record instead. Both ends come
            straight from the filing — the later one is the last leg's own
            before-and-after, NOT the first leg plus everything in between,
            because a filer's holding also moves through filings that are not
            in this one. */}
        <DetailPair
          label="Stake change"
          sub={
            stakeLabel && w.shares_before != null && w.shares_before > 0
              ? `from ${w.shares_before.toLocaleString("en-GB")} shares`
              : undefined
          }
          value={stakeLabel ?? holdingSpan ?? "Not stated"}
        />
        <DetailPair
          label={multi ? "Last trade settled" : "Settled"}
          value={iso(w.trade_date)}
        />
        <DetailPair
          label="Reported"
          sub={
            lagDays != null && lagDays > 30
              ? `${lagDays} days after the trade`
              : undefined
          }
          value={iso(w.disclosed_date)}
        />
        {w.venue ? <DetailPair label="Board" value={w.venue} /> : null}
        {w.reporter_kind ? (
          <DetailPair label="Filer" value={w.reporter_kind} />
        ) : null}
      </dl>

      {/* The working behind the totals, modelled on the US drawer's "Fills".
          Oldest first, because on a filing that spans years the reader is
          reading a history rather than checking the latest print. */}
      {multi ? (
        <DisclosureSection count={legs.length} title="Trades">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-normal pb-1">Settled</th>
                <th className="text-right font-normal pb-1">Shares</th>
                <th className="text-right font-normal pb-1">Price</th>
                <th className="text-right font-normal pb-1">Value</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {legs.map((leg) => (
                <tr
                  key={leg.id}
                  className="border-t border-black/[0.04] dark:border-white/[0.06]"
                >
                  <td className="py-1">{iso(leg.trade_date)}</td>
                  <td className="py-1 text-right">
                    {leg.shares_change.toLocaleString("en-GB")}
                  </td>
                  <td className="py-1 text-right">
                    {leg.price_krw != null
                      ? won.format(leg.price_krw)
                      : "Not stated"}
                  </td>
                  <td className="py-1 text-right">
                    {leg.value_krw != null
                      ? won.format(leg.value_krw)
                      : "Not stated"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DisclosureSection>
      ) : null}

      {w.plan_report_date ? (
        <p className="text-[12.5px] leading-[1.5] text-foreground/60">
          This purchase was announced in advance on{" "}
          {longDate(w.plan_report_date)}, under the rule that puts a Korean
          insider&apos;s intended buy on the record before they make it.
        </p>
      ) : null}
    </div>
  );
}

/** "4 Sept 2026" from a YYYYMMDD as filed. Used in the drawer's sentences,
 *  where "20260904" is a string the reader has to decode and an ISO date is
 *  only slightly better. */
function longDate(d: string | null): string {
  const s = iso(d);

  if (!s) return "an unstated date";

  return new Date(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole days between two YYYY-MM-DD strings; null when either is unusable. */
function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);

  if (Number.isNaN(a) || Number.isNaN(b)) return null;

  return Math.round((b - a) / 86400000);
}

function DetailPair({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-[11.5px] uppercase tracking-[0.04em] text-foreground/45">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground/85">
        {value}
        {sub ? (
          <span className="block text-[11.5px] text-foreground/50">{sub}</span>
        ) : null}
      </dd>
    </div>
  );
}

/* ─── Explainer ──────────────────────────────────────────────────────── */

/** "What are we looking for?" for a market where the honest answer is
 *  "nothing — we are showing you the filings".
 *
 *  Without this, `?panel=explainer` on /kr opened the shared six-point
 *  walkthrough, which demonstrates a screen that has never been run over a
 *  Korean filing. Supplying a body swaps that for the quiet drawer, the same
 *  route Congress takes for having its own model.
 *
 *  Structured like CongressExplainer on purpose — the two are the only
 *  bespoke bodies in the product and a reader who has seen one should
 *  recognise the other. */
function KoreaExplainer() {
  const meta: { label: string; value: string }[] = [
    {
      label: "Source",
      value: "DART filings to the Financial Supervisory Service",
    },
    {
      label: "Who files",
      value: "Company officers and major shareholders, under FSCMA art. 173-3",
    },
    {
      label: "Notice",
      value: "At least 30 days before the buying window opens",
    },
    {
      label: "Amounts",
      value: "Pounds first, as an approximation. Won beneath, as filed",
    },
  ];

  const caveats: string[] = [
    "An announcement is an intention, not a trade. It can be called off, and about one in ten is.",
    "The date on a completed filing is the settlement date, not the moment of the trade, and a Korean report can trail the trade by weeks, occasionally by years.",
    "One filing can report years of buying at once. Those rows show the count of trades, the totals, and the most recent trade date; the drawer lists every trade.",
    "Nothing here is rated. There is no triage pass, no thesis and no score behind a Korean row, so read the filing rather than looking for our verdict on it.",
    "Small filings are held back. Below roughly £25,000 the feed is mostly treasury-stock bonuses rather than decisions, so a size floor is applied.",
  ];

  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed text-foreground/90">
        Korea is the one market here where the news arrives <em>before</em> the
        trade. Once a planned purchase reaches 1% of a company&apos;s shares or
        50bn won, the insider has to announce it at least 30 days ahead and then
        buy inside a window of 30 days or less. So the page leads with those{" "}
        <strong>buying programmes</strong> — one row each, from the announcement
        to the buying to the finish, or to the day it was called off. Below them
        sit the <strong>other insider buys</strong>: purchases with no advance
        announcement behind them, one row per filing. A purchase that belongs to
        a programme is shown inside it rather than twice.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Where it comes from</h3>
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

      <section className="rounded-xl border border-brand-brown/20 bg-brand-brown/[0.06] p-4 dark:border-brand-tan/25 dark:bg-brand-tan/[0.08]">
        <h3 className="text-sm font-semibold">A data preview</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
          Korea is published as filed while we work out what a signal looks like
          in a market where intent is disclosed ahead of the trade.{" "}
          <Link
            className="underline underline-offset-2 hover:opacity-70"
            to={KOREA_EXPLAINER}
          >
            More on how the Korean feed reads
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────────────── */

/** Korea does not use buildMarketFaq().
 *
 *  That builder answers "what do I actually get?" with "screened and rated
 *  the moment it's filed … the full thesis, the evidence behind the rating,
 *  the risks", and carries a whole question about the Contrarian and Momentum
 *  tags. None of it is true here: Korea has no triage pass, no rating and no
 *  analysis, so those answers described a product this page does not ship.
 *
 *  The two liability answers keep the shared posture verbatim in substance —
 *  information, never a recommendation; no promise of returns — because that
 *  wording is the same undertaking on every market. */
const KOREA_FAQ: MarketFaqItem[] = [
  {
    question: "What am I looking at?",
    answer: (
      <>
        Two lists. First the <strong>buying programmes</strong>: Korean law
        makes a company officer or large shareholder announce a big share
        purchase <em>before</em> making it, saying how much and by when. Each
        row is one of those announcements, from the day it was made to the day
        it was bought or called off. Then <strong>other insider buys</strong>:
        purchases that carried no advance announcement, one row per filing,
        newest first. A purchase that belongs to a programme appears in that
        programme&apos;s row, not twice.
      </>
    ),
  },
  {
    question: "Is this financial advice?",
    answer: (
      <>
        No. It&apos;s the public filing record, tidied up and translated. It is
        information, never a recommendation, and never a guarantee. What you do
        with it is your call.
      </>
    ),
  },
  {
    question: "Do you rate these the way you rate UK and US buys?",
    answer: (
      <>
        Not yet. Every Korean filing here is shown as filed — there is no
        rating, no thesis and no screen behind it, and nothing on this page has
        been judged good or bad. The{" "}
        <Link
          className="underline underline-offset-2 hover:opacity-70"
          to={HOW_IT_WORKS_PATH}
        >
          six-point check
        </Link>{" "}
        runs on the UK and US feeds only.
      </>
    ),
  },
  {
    question: "Can an insider back out after announcing?",
    answer: (
      <>
        Yes, and about one in ten does. Those rows stay on this page under
        &ldquo;Called off&rdquo; rather than disappearing — a controlling
        shareholder cancelling a purchase is itself worth knowing, and hiding it
        would make the record look more decisive than it is.
      </>
    ),
  },
  {
    question: "Why is the trade date older than the date it was reported?",
    answer: (
      <>
        Three reasons. The date on the filing is the <em>settlement</em> date
        rather than the moment of the trade; Korean filings can arrive well
        after the fact, most within a week and some very late indeed; and one
        filing can report years of buying at once, in which case the row shows
        the most recent trade and the drawer lists the lot. The list is ordered
        by when it was reported, which is when the information actually became
        public.{" "}
        <Link
          className="underline underline-offset-2 hover:opacity-70"
          to={KOREA_EXPLAINER}
        >
          More on how the Korean feed reads
        </Link>
        .
      </>
    ),
  },
  {
    question: "Why do you show pounds and won?",
    answer: (
      <>
        Because one of them is the record and the other is readable.
        ₩1,500,000,000 appears in the filing; it is also a number nobody outside
        Korea can size on sight. So the pound figure leads, as an approximation
        at the rate we hold that day, and the won sits under it as what was
        actually filed. Treat the pound as a sense of scale, not a quote, and
        the won as the document.
      </>
    ),
  },
  {
    question: "Is it free?",
    answer: (
      <>
        Yes. Korea is a data preview and free to browse on the web. No account
        needed. There&apos;s no Korean app yet, so there are no alerts for this
        market.
      </>
    ),
  },
  {
    question: "Do you promise returns?",
    answer: (
      <>
        No. We surface the filings and show where they came from. Insider buying
        is one input, not a sure thing, and an announcement is only a statement
        of intent.
      </>
    ),
  },
];

/* ─── The config ─────────────────────────────────────────────────────── */

export const KoreaMarket: MarketConfig<KrDealingGroup> = {
  id: "kr",
  title: "Korea (preview)",
  marketLabel: "Korea",

  /* The templated fallback reads "Which directors have been buying shares in
     Korea companies?", which is both ungrammatical and a promise this page
     does not keep: the first thing under it is a list of purchases nobody has
     made yet. So the headline states Korea's actual rule, in the shortest
     form it survives in, with the consequence for the reader on the tinted
     second line. The UK shape (two short lines, fact then payoff). */
  heroHeadline: (
    <>
      Korean insiders announce
      <span className="block text-brand-brown dark:text-brand-tan">
        before they buy.
      </span>
    </>
  ),
  /* Three bullets, one phone line each, for a reader who has never heard of
     DART: the law, what this page is, what it is worth. No price bullet and
     no trial line — Korea is free on the web and there is no Korean app to
     sell, and a bullet advertising one would be the page's only lie. */
  heroBullets: [
    <>Big insider buys are announced 30 days ahead</>,
    <>Who&rsquo;s buying now, and how much</>,
    <>What the shares did next</>,
  ],
  /* Korea has no app, so the hero used to fall through to the centred SE/NL
     layout. It has the one thing that layout is for the absence of: real
     stories with a price line after them (see KR_DEALS in
     hero-deal-data.ts). The showcase panel is the market's proof, not an app
     demo, so it renders here with no store CTA attached. */
  heroShowcase: true,

  description: (
    <>
      Korean company officers and major shareholders have to announce a large
      share purchase <em>before</em> they make it. These are those buying
      programmes, newest first, with the rest of the insider buying below.
    </>
  ),
  topNotice: "Korean filings are a data preview.",
  locale: "en-GB",
  session: KRX_SESSION,

  priceFormat: {
    formatPrice: (n) => won.format(n),
    formatValue: (n) => won.format(n),
    formatValueCompact: compactWon,
    quoteToValue: 1,
    /* Won is the widest figure in the product: no minor unit, so a mid-sized
       purchase is ten digits and three separators. ₩1,553,806,100 appears in
       the completed feed and declarations run to ₩29,999,985,850, both of
       which crossed the company column's hairline at w-28. The declarations
       table reads this same value off the config, so the two stay aligned. */
    valueColumnClass: "w-36",
  },
  // Bars are stored as native won, matching SEK. No scaling.
  normalizeLivePrice: (close_pence: number) => close_pence,

  benchmarkTicker: "^KS11",
  benchmarkLabel: "KOSPI",

  /* The bare 6-digit code, for the reader. The suffix is a routing detail of
     the quote provider and means nothing to anyone looking at a filing. */
  formatTickerDisplay: (ticker) => ticker.replace(/\.(KS|KQ)$/, ""),

  /* Comments only. There is no Korean app, so the count would be a synthetic
     nudge towards an install that cannot happen — see the header note. Trend,
     Return and Action all carry real content now that KRX prices resolve
     under a venue suffix. */
  hiddenColumns: ["comments"],
  enableLivePrices: true,
  // By DOMAIN, not by ticker: the provider 404s on a 6-digit stock code but
  // knows the issuer's homepage, which DART publishes. See `logoDomain`.
  enableLogos: true,
  /* One row is now one FILING, and a filing can report any number of trades —
     one reports forty-nine. The count is the only thing on the row that says
     so, so it has to be on. See `foldFilings`. */
  showLegCount: true,

  /* Written for someone reading their first Korean filing. No statute, no
     "consideration", no "disclosure" where "reported" will do. */
  columnHelp: {
    disclosed:
      "The day the purchase was reported to Korea's filing system. Reports often arrive days or weeks after the trade, so the trade date is shown beneath when the two differ.",
    ticker:
      "The company's code on the Korean exchange. Six digits, not letters.",
    company:
      "The company bought, the person or firm who bought it, and the board it trades on.",
    value:
      "What they paid, in won as filed, with a rough pound figure beneath it.",
    trend:
      "How many separate trades this one report covers, and the share price over the past year, marked where the buying falls.",
    performance:
      "How the price has moved since, measured from whichever date the toggle is set to: the day it was reported, or the day the trade settled. On the vs-market view it is that move with the KOSPI's move taken out.",
    action:
      "How much bigger this purchase made the buyer's own holding. Not a rating: Korean filings are shown here as filed, and nothing on this page has been screened.",
  },

  RowActionCell: KrRowActionCell,
  RowNameBadge: KrRowNameBadge,
  DetailBody: KrDetailBody,

  views: [{ id: "signal", label: "Buys" }],
  defaultView: "signal",

  /* Both of these are load-bearing, and the table rendered EMPTY without the
     first. The shared Signal filter defaults to "signal", and "signal" means
     `d.rating` is one of significant/noteworthy/minor. No Korean row carries
     a rating, so the default filter matched nothing and the completed-buys
     table showed its empty state on every visit, over a feed of 200 filings.
     `showSignalFilter` then removes the control itself: an axis whose only
     other position empties the list is not a choice worth offering. */
  defaultSignalFilter: "all",
  showSignalFilter: false,

  fetchDealings,

  plans: {
    title: "Insider buying programmes",
    subtitle:
      "Korean insiders must announce a big purchase a month before they buy. Here's who has announced, who is buying right now, and who has finished.",
    leads: true,
    fetchPlans,
    emptyLabel: "Nothing announced yet.",
  },

  /* The second list is now defined against the first: a purchase that belongs
     to a programme above is shown there and not repeated here. See
     `loadKoreaPage`. */
  dealingsHeading: {
    title: "Other insider buys",
    subtitle:
      "Purchases filed without an advance announcement, or whose announcement is older than this list. Grouped by filing, newest first.",
  },

  explainer: <KoreaExplainer />,
  explainerSubtitle: "Korea Exchange · DART",

  /* The default band claims a six-point score. Korea has none. */
  methodologyBand: {
    line: "Korean filings are published here as filed — no rating, no screen.",
    ctaLabel: "How the Korean feed works",
    href: KOREA_EXPLAINER,
  },

  renderEmptyState: () => (
    <>No Korean purchases above the size floor in this window.</>
  ),

  faq: KOREA_FAQ,
};
