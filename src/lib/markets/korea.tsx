// KoreaMarket — the KRX plugin for <MarketPage />.
//
// DECLARATIONS LEAD. Korea is the only market here where the disclosure
// arrives BEFORE the trade: under FSCMA art. 173-3, officers and major
// shareholders must declare a purchase at least 30 days ahead once it reaches
// 1% of the company's shares or 50bn won. Those declarations are the headline
// object (`plans.leads`), and the completed purchases below them are the
// supporting record.
//
// Two things are deliberate and should survive edits:
//
//   1. Declarations render through MarketPlans, not the dealings table. A
//      MarketDealing asserts a trade date, an entry price and a value that
//      were realised; a declaration has none of those. Reusing the row would
//      state things about it that are not true.
//   2. A completed purchase is never promoted for having been pre-declared.
//      The declaration is the event; the filing that confirms it, weeks
//      later, only says a plan already on the record was carried out. The
//      drawer states the fact when it exists (`plan_report_date`) because a
//      reader looking at one filing deserves to know it was foretold — but
//      it earns no row chip, no ordering, no weight of any kind.
//
// WHAT KOREA DOES NOT HAVE, and what the shell is told about it:
//
//   - No rating, triage or analysis layer. So: no Action column, its own FAQ
//     rather than buildMarketFaq() (whose answers promise a thesis, a
//     six-point score and Contrarian/Momentum tags that do not exist here),
//     and no claim anywhere on the page that a filing has been screened.
//   - No price coverage. /api/prices returns nothing for a 6-digit KRX code
//     and /api/logo/ticker 404s on every one. So: enableLivePrices off,
//     enableLogos off, and the Trend / vs KOSPI columns hidden rather than
//     rendered as sixty em-dashes.
//   - No Korean app, so no comment counts. Column hidden.
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

/** The filing states the filer's relationship to the company in the plural
 *  ("Shareholders holding 10% or more") because it names a statutory class.
 *  A card describes exactly one filer, so the class reads as a mistake there.
 *  An explicit map rather than a de-pluralising regex — there are two of
 *  these, and a regex would eventually eat the wrong "s". */
const HOLDER_STATUS: Record<string, string> = {
  "Shareholders holding 10% or more": "shareholder holding 10% or more",
  "Effective controlling shareholders": "effective controlling shareholder",
};

const holderStatus = (raw: string | null): string | undefined => {
  if (!raw || raw === "-") return undefined;

  return HOLDER_STATUS[raw] ?? raw;
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
    plannedValueSecondary: approxGbp(w.plan_value_gbp),
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

function toDealing(w: KrDealingWire): MarketDealing<KrDealingWire> {
  return {
    key: w.id,
    id: w.id,
    ticker: w.stock_code ?? "",
    company: displayName(w.company_en, w.company),
    insiderName: displayName(w.reporter_name_en, w.reporter_name),
    insiderRole: roleLabel(w.role, w.position),
    disclosedDate: iso(w.disclosed_date),
    // 변동일 is the SETTLEMENT date for on-market trades, not the execution
    // date. It is the closest thing the filing gives to a trade date and is
    // labelled as the trade date throughout the shell; the how-it-works page
    // carries the caveat rather than the row.
    tradeDate: iso(w.trade_date),
    isPurchase: w.shares_change > 0,
    value: w.value_krw,
    valueSecondary: approxGbp(w.value_gbp),
    entryPrice: w.price_krw,
    shares: Math.abs(w.shares_change),
    raw: w,
  } as MarketDealing<KrDealingWire>;
}

async function fetchPlans(): Promise<PlansPayload> {
  const r = await api.krPlans({ limit: 60 });

  return {
    plans: (r.plans ?? []).map(toPlan),
    notice: r.notice && {
      headline: r.notice.headline,
      body: r.notice.body,
      learnMoreLabel: r.notice.learn_more_label,
      learnMorePath: r.notice.learn_more_path,
    },
  };
}

/** ~£25k at ~1,750 KRW/GBP. Without a floor the feed is unreadable: the median
 *  individual buy is about £15k and a seventh of all filings are treasury-stock
 *  bonuses. Measured in ddbx-data/investigations/2026-08-03-korea-market-probe.md. */
const MIN_KRW = 43_750_000;

/** The worker's ceiling. At the old 60 the whole feed was a single day of
 *  Korean filings — a page that says "newest first" and then stops inside one
 *  date reads as broken, and there is nothing to scroll. 200 buys about three
 *  trading weeks. */
const DEALINGS_LIMIT = 200;

async function fetchDealings(): Promise<{
  dealings: MarketDealing<KrDealingWire>[];
  stats: MarketStats;
}> {
  const r = await api.krDealings({ limit: DEALINGS_LIMIT, minKrw: MIN_KRW });
  const dealings = (r.dealings ?? []).map(toDealing);

  return {
    dealings,
    stats: {
      total: dealings.length,
      viewCounts: { signal: dealings.length },
      latestDisclosedLabel: dealings[0]?.disclosedDate
        ? `Latest disclosure ${dealings[0].disclosedDate}`
        : undefined,
    },
  };
}

/* ─── Config ─────────────────────────────────────────────────────────── */

/** Korea ships no rating, triage or analysis layer, so a row has no action to
 *  offer beyond what the table already shows. The column itself is hidden via
 *  `hiddenColumns`; this stays as the slot the shell requires. */
function KrRowActionCell() {
  return null;
}

/** The filing's own record, in the reader's units.
 *
 *  `plan_report_date` is stated here and nowhere else. It is a neutral fact
 *  about this one filing — that the purchase was on the record before it
 *  happened — and a reader who has just scrolled past the declarations
 *  section is owed the connection. It is deliberately not a row chip and
 *  never sorts or scores anything: see the header note. */
function KrDetailBody({ dealing }: { dealing: MarketDealing<KrDealingWire> }) {
  const w = dealing.raw;
  const gbp = approxGbp(w.value_gbp);
  // Median lag is about five days, but late and corrective filings run to
  // years. A feed sorted by disclosure that quietly carries a trade from two
  // years ago needs to say so where the dates are.
  const lagDays = daysBetween(iso(w.trade_date), iso(w.disclosed_date));

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <DetailPair
          label="Shares"
          value={Math.abs(w.shares_change).toLocaleString("en-GB")}
        />
        <DetailPair
          label="Price paid"
          value={w.price_krw != null ? won.format(w.price_krw) : "—"}
        />
        <DetailPair
          label="Total"
          sub={gbp ?? undefined}
          value={w.value_krw != null ? won.format(w.value_krw) : "—"}
        />
        <DetailPair
          label="Stake change"
          value={
            w.stake_change_pct != null
              ? `${w.stake_change_pct}pp`
              : "Not stated"
          }
        />
        <DetailPair label="Settled" value={iso(w.trade_date)} />
        <DetailPair
          label="Disclosed"
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

      {w.plan_report_date ? (
        <p className="text-[12.5px] leading-[1.5] text-foreground/60">
          This purchase was declared in advance on {iso(w.plan_report_date)},
          under the rule that puts a Korean insider&apos;s intended buy on the
          record before they make it.
        </p>
      ) : null}
    </div>
  );
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
      value: "As filed, in won. Sterling shown as an approximation",
    },
  ];

  const caveats: string[] = [
    "A declaration is an intention, not a trade. It can be withdrawn, and about one in ten is.",
    "The date on a completed filing is the settlement date, not the moment of execution — and Korean disclosure can trail the trade by weeks, occasionally by years.",
    "Nothing here is rated. There is no triage pass, no thesis and no score behind a Korean row, so read the filing rather than looking for our verdict on it.",
    "Small filings are held back. Below roughly £25,000 the feed is mostly treasury-stock bonuses rather than decisions, so a size floor is applied.",
  ];

  return (
    <div className="space-y-7">
      <p className="text-[15px] leading-relaxed text-foreground/90">
        Korea is the one market here where the disclosure arrives{" "}
        <em>before</em> the trade. Once a planned purchase reaches 1% of a
        company&apos;s shares or 50bn won, the insider has to announce it at
        least 30 days ahead and then buy inside a window of 30 days or less. So
        the headline object on this page is a purchase nobody has made yet.
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
        Two things, in order. First the <strong>declarations</strong>: Korean
        law makes an officer or major shareholder announce a large share
        purchase <em>before</em> making it, naming the size and the window it
        has to happen in. Then the <strong>completed purchases</strong>: buys
        already filed with DART, newest disclosure first.
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
    question: "Can an insider back out after declaring?",
    answer: (
      <>
        Yes, and about one in ten does. A withdrawn declaration stays on this
        page rather than disappearing — a controlling shareholder calling off a
        purchase is itself worth knowing, and hiding it would make the record
        look more decisive than it is.
      </>
    ),
  },
  {
    question: "Why is the trade date older than the disclosure date?",
    answer: (
      <>
        Two reasons. The date on the filing is the <em>settlement</em> date
        rather than the moment of execution, and Korean filings can arrive well
        after the fact — most within a week, some very late indeed. The list is
        ordered by disclosure, which is when the information actually became
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
    question: "Why are the amounts in won?",
    answer: (
      <>
        Because that&apos;s what was filed, and converting the headline figure
        would put a number in front of you that appears in no document. The
        approximate sterling reading sits beneath it, at the rate we hold on the
        day — treat it as a sense of scale, not a quote.
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
        is one input, not a sure thing, and a declaration is only a statement of
        intent.
      </>
    ),
  },
];

/* ─── The config ─────────────────────────────────────────────────────── */

export const KoreaMarket: MarketConfig<KrDealingWire> = {
  id: "kr",
  title: "Korea (preview)",
  marketLabel: "Korea",

  /* No `heroHeadline`, so the shell promotes this into the <h1> — the SE/NL
     pattern. It has to be here: the templated fallback reads "Which directors
     have been buying shares in Korea companies?", which is both ungrammatical
     and a promise this page does not keep, because the first thing under it
     is a list of purchases nobody has made yet. */
  heroSubhead:
    "Korean insiders have to declare a big share purchase before they make it. Here are those declarations, and the buys that followed.",

  description: (
    <>
      Korean company officers and major shareholders have to declare a share
      purchase <em>before</em> they make it. These are the declarations, newest
      first, with the purchases that followed them below.
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
    valueColumnClass: "w-28",
  },
  // Bars are stored as native won, matching SEK. No scaling.
  normalizeLivePrice: (close_pence: number) => close_pence,

  benchmarkTicker: "^KS11",
  benchmarkLabel: "KOSPI",

  /* Nothing behind these columns. /api/prices has no KRX coverage (a 6-digit
     code returns no latest price and an empty bar series), there is no Korean
     app so no comment counts, and there is no rating to put in an Action
     cell. Rendered, they were four permanently empty columns out of eight. */
  hiddenColumns: ["trend", "performance", "comments", "action"],
  enableLivePrices: false,
  // /api/logo/ticker 404s on every Korean stock code, so every row drew a
  // monogram bubble reading "051". Sweden precedent.
  enableLogos: false,
  showLegCount: false,

  columnHelp: {
    disclosed:
      "The date the purchase was disclosed to DART. Korean filings often arrive days or weeks after the trade — the trade date is shown beneath it when the two differ.",
    ticker: "The KRX stock code. Six digits, not a letter symbol.",
    company: "The company bought, and the insider who bought it.",
    value:
      "Consideration as filed, in won, with an approximate sterling reading beneath it.",
  },

  RowActionCell: KrRowActionCell,
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
    title: "Declared purchases",
    subtitle:
      "Trades Korean insiders have committed to publicly, before making them.",
    leads: true,
    fetchPlans,
    emptyLabel: "No declarations on file yet.",
  },

  /* The page has two stacked lists and only the first of them was named. */
  dealingsHeading: {
    title: "Purchases already made",
    subtitle:
      "Completed buys as filed with DART, newest disclosure first. Separate from the declarations above — these have happened.",
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
