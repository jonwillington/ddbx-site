import { BUTTON_RADIUS } from "@/components/button";
import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";
import { FULL_BLEED } from "@/components/full-bleed";
import { Reveal } from "@/components/download/reveal";
import { SectionHeader } from "@/components/download/section-header";
import { ApiFaq } from "@/components/api/api-faq";
import { CodeTabs } from "@/components/api/code-tabs";
import {
  EndpointTable,
  ParamList,
  Path,
} from "@/components/api/endpoint-table";
import { InterestForm } from "@/components/api/interest-form";
import { JsonBlock, Terminal, elide, gain } from "@/components/api/terminal";
import DefaultLayout from "@/layouts/default";
import { usePinnedTheme } from "@/lib/use-pinned-theme";

/** `/api` — the developer-API product page. Cross-market by construction: one
 *  page, no market prop, no discretion gating. `/developers` 301s here.
 *
 *  PERMANENTLY DARK. It's a technical surface and the terminal blocks that
 *  carry it only work on the dark palette. Consequences, all handled:
 *   - `usePinnedTheme("dark")` paints on mount and restores the visitor's own
 *     theme on unmount, without writing localStorage.
 *   - `Navbar` hides the theme toggle here (a control that does nothing reads
 *     as broken).
 *   - The closing band inverts to CREAM. The site's grammar is "one
 *     contrasting object per page, and that object is the ask" — on a dark
 *     page that flips polarity rather than disappearing.
 *   - Because `.dark` is pinned, theme-aware tokens inside the cream band
 *     resolve to their DARK values. Everything in that band and in
 *     `interest-form.tsx` is therefore written with literal colours.
 *
 *  Copy rule: this page must never mention a free tier, a public sandbox or
 *  the currently-open endpoint. See
 *  investigations/2026-07-26-api-product-surface.md §9.
 */

const SECTION = "mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20";

/** Real response shape, trimmed from a live `/api/dealings` row. Numbers and
 *  prose are genuine — the page's credibility rests on that. */
const SAMPLE_ROW = {
  id: "d-dd78dccd98db8eff",
  trade_date: "2026-07-24",
  disclosed_date: "2026-07-24",
  director: {
    name: "Brusk Korkmaz",
    role: "Chief Executive Officer",
    company: "Hercules Plc",
  },
  ticker: "HERC.L",
  tx_type: "buy",
  shares: 100000,
  price_pence: 39.75,
  value_gbp: 39750,
  sector_normalized: "Industrials",
  cluster: { tier: "strong", count: 3, window_days: 14 },
  buy_style: { kind: "dip", drawdown_from_high_pct: -0.31 },
  live_performance: { alpha_pct_disclosed: gain(12.4), as_of: "2026-07-26" },
  analysis: {
    rating: "significant",
    confidence: 0.88,
    // Kept short deliberately: the hero panel is ~480px, and a long string
    // clips at the edge, which reads as a broken payload in the one object
    // the page is asking to be trusted. The full summary ships in the API.
    summary: "Third July purchase by the founder-CEO.",
    evidence_for: elide("4 items"),
    evidence_against: elide("2 items"),
    key_risks: elide("3 items"),
    catalyst_window: "6m",
  },
} as const;

const SNIPPETS = [
  {
    label: "curl",
    title: "GET /api/dealings",
    meta: "200 OK",
    code: `curl -H "Authorization: Bearer $DDBX_KEY" \\
  "https://api.ddbx.uk/api/dealings?rating=significant&limit=50"`,
  },
  {
    label: "Python",
    title: "Walk history with the cursor",
    meta: "python 3.11",
    code: `import requests

s = requests.Session()
s.headers["Authorization"] = f"Bearer {KEY}"
cursor, rows = None, []

while True:  # page back through disclosure history
    r = s.get("https://api.ddbx.uk/api/dealings",
              params={"before": cursor, "limit": 200}).json()
    if not r["dealings"]:
        break
    rows += r["dealings"]
    cursor = r["dealings"][-1]["disclosed_date"]`,
  },
  {
    label: "JavaScript",
    title: "Every market in one call",
    meta: "node 20",
    code: `// /api/markets is the discovery endpoint: it tells you which
// feeds exist and what each one supports, so you never hardcode.
const { markets } = await fetch(BASE + "/markets", { headers })
  .then((r) => r.json());

const feeds = await Promise.all(
  markets.map((m) => fetch(BASE + m.endpoints.dealings, { headers })
    .then((r) => r.json())),
);`,
  },
];

const DEALING_ENDPOINTS = [
  {
    path: "/api/dealings",
    returns: "UK PDMR disclosures, newest first. Cursor-paginated.",
  },
  {
    path: "/api/us-dealings",
    returns: "SEC Form 4 open-market purchases, with view masks.",
  },
  {
    path: "/api/eu-dealings",
    returns: "MAR Article 19 notifications — Sweden and the Netherlands.",
  },
  {
    path: "/api/gov-dealings",
    returns: "US congressional STOCK Act filings, scored by committee lane.",
    beta: true,
  },
  {
    path: "/api/dealings/:id",
    returns: "A single disclosure with full analysis.",
  },
];

const REFERENCE_ENDPOINTS = [
  {
    path: "/api/markets",
    returns: "Discovery — every market and its capabilities.",
  },
  {
    path: "/api/directors/:id",
    returns: "One insider: their history and aggregates.",
  },
  {
    path: "/api/companies",
    returns: "Issuer index with deal counts and totals.",
  },
  {
    path: "/api/company/:market/:key/stats",
    returns: "Fundamentals and analyst consensus.",
  },
  {
    path: "/api/news/:market",
    returns: "Per-market news, matched to issuers.",
  },
];

const FAQ = [
  {
    q: "How is this different from reading EDGAR or RNS directly?",
    a: (
      <>
        Those give you filings. This gives you filings that have been parsed
        into one schema across four regulators, screened, scored with a written
        rationale, sector-normalised, currency-reconciled and benchmarked
        against the index from both the trade date and the disclosure date. The
        parsing alone is the part most teams underestimate — UK PDMR
        notifications are free text, and an LSE issuer can file in EUR or USD.
      </>
    ),
  },
  {
    q: "How quickly do new filings appear?",
    a: "The ingest pipeline runs every 15 minutes against each regulator's source, so a disclosure is generally readable within minutes of publication. Deep analysis on the rows that clear triage follows shortly after.",
  },
  {
    q: "How far back does history go?",
    a: "Depth varies by market — the UK series is the longest, the EU registers were added later. Tell us the window your backtest needs and we'll confirm exactly what we hold before you commit to anything.",
  },
  {
    q: "Is the analysis investment advice?",
    a: "No. It is research output — an opinionated reading of a disclosure with the evidence on both sides shown, including the case against. It carries a confidence score precisely because it is a judgement, not a recommendation, and it should be treated as one input among several.",
  },
  {
    q: "Can we redistribute the data in our own product?",
    a: "Depends on the field and the market. Our generated analysis, ratings and derived metrics are ours to license. Redistribution rights for underlying regulatory content vary by source, so they're agreed per contract rather than assumed — we'll be specific about what you can and can't pass on.",
  },
  {
    q: "What happens when a filing is amended or restated?",
    a: "Amendments arrive as their own rows and are flagged, so a point-in-time backtest stays honest — you can reconstruct what was actually knowable on any given date rather than silently inheriting a later correction.",
  },
  {
    q: "What are the rate limits?",
    a: "Set per agreement against what you're actually doing; a nightly bulk sync and a live product have different shapes. We'd rather size it to your use case than make you work around a number picked before we'd spoken.",
  },
];

export default function ApiPage() {
  usePinnedTheme("dark");

  return (
    <DefaultLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-2 md:pt-6">
        <div className="rounded-3xl border border-white/[0.08] bg-[oklch(19%_0.022_55)] p-6 md:p-10 lg:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-14">
            <div>
              <span
                className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.lg} bg-[#eec584]/15 text-[#eec584]`}
              >
                Developer API · Private beta
              </span>
              <h1 className="mt-6 text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.028em] text-white sm:text-[44px] lg:text-[54px]">
                Insider filings, decoded and scored, over the wire.
              </h1>
              <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.55] text-white/60">
                Four regulators, one schema. Every director and insider purchase
                across the UK, US, Sweden and the Netherlands — screened, rated
                with a written rationale, and benchmarked against the index from
                the day it was disclosed.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  className={`${BUTTON_RADIUS} bg-white px-6 py-3.5 text-[15px] font-semibold text-[#1a140d] transition-colors hover:bg-white/90`}
                  data-ga-event="cta_api_hero_request"
                  data-ga-label="API hero"
                  href="#request-access"
                >
                  Request access
                </a>
                <a
                  className={`${BUTTON_RADIUS} bg-white/[0.08] px-6 py-3.5 text-[15px] font-semibold text-white/85 transition-colors hover:bg-white/[0.14]`}
                  href="#reference"
                >
                  Read the reference
                </a>
              </div>
            </div>

            <Terminal meta="200 OK · 142 ms" title="GET /api/dealings">
              <JsonBlock value={SAMPLE_ROW} />
            </Terminal>
          </div>
        </div>
      </section>

      {/* ── Proof strip ──────────────────────────────────────────────────── */}
      <section
        className={`${FULL_BLEED} mt-14 border-y border-white/[0.08] bg-white/[0.03] md:mt-20`}
      >
        <div className="mx-auto max-w-6xl px-4 py-9 md:px-6">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { k: "Markets", v: "6" },
              { k: "Regulators parsed", v: "4" },
              { k: "Ingest cadence", v: "15 min" },
              { k: "Schema", v: "One" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">
                  {s.k}
                </dt>
                <dd className="mt-1.5 text-[24px] font-semibold tracking-[-0.02em] text-white">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[12.5px] leading-[1.5] text-white/40">
            Read from primary regulatory sources — RNS, SEC EDGAR, AFM and
            Finansinspektionen — never a third-party summary.
          </p>
        </div>
      </section>

      {/* ── 01 The data ──────────────────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeader
          index={1}
          kicker="The data"
          sub="Most insider feeds stop at the filing. The value is in what happens after it lands — and that is what every row carries."
          title="A row is a judgement, not a record."
          tone="dark"
          total={3}
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              h: "Screened, with the reason written down",
              b: "Every disclosure passes a triage gate that records a verdict and a plain-English rationale — including why something was dismissed. You can audit the screen, not just trust it.",
            },
            {
              h: "Rated, with the case against",
              b: "Rows that clear triage carry a full analysis: rating, confidence, thesis, evidence for AND against, key risks and a catalyst window. The bear case ships with the bull case.",
            },
            {
              h: "Benchmarked from disclosure",
              b: "Return and alpha versus the index, from the trade date and from the disclosure date. The disclosure figure is the one a follower could actually have captured.",
            },
            {
              h: "Clusters, detected",
              b: "When several insiders at one issuer buy inside the same window, the rows say so — tier, count and window. Breadth is the signal that a single purchase can't give you.",
            },
            {
              h: "Buy style, classified",
              b: "Whether a purchase leans into a drawdown or chases strength, with the drawdown-from-high and trailing return that decided it. Two identical buys, different meanings.",
            },
            {
              h: "One schema, four regulators",
              b: "Free-text UK PDMR notices, SEC Form 4, AFM and FI registers — normalised into a single shape, one sector taxonomy, and currency units reconciled.",
            },
          ].map((c, i) => (
            <Reveal key={c.h} delay={i * 60}>
              <div className="h-full rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5">
                <h3 className="text-[16px] font-semibold leading-snug text-white">
                  {c.h}
                </h3>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-white/55">
                  {c.b}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 02 The reference ─────────────────────────────────────────────── */}
      <section className={SECTION} id="reference">
        <SectionHeader
          index={2}
          kicker="The reference"
          sub="Predictable REST over JSON. Cursor pagination, edge-cached reads, and a discovery endpoint so you never hardcode a market."
          title="Boring on purpose."
          tone="dark"
          total={3}
        />

        <div className="mt-10 grid gap-x-10 gap-y-4 border-t border-white/[0.12] py-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">
              Dealings
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-white/45">
              The core feeds. One per regulator family.
            </p>
          </div>
          <div className="min-w-0">
            <EndpointTable rows={DEALING_ENDPOINTS} />
            <ParamList
              params={[
                {
                  name: "rating",
                  desc: "significant · noteworthy · minor · routine",
                },
                {
                  name: "view",
                  desc: "Per-market masks, e.g. signal or interesting, to skip grants and option exercises.",
                },
                {
                  name: "since / before",
                  desc: "ISO dates. before is the pagination cursor — pass the oldest disclosed_date you hold.",
                },
                { name: "limit", desc: "Page size, capped per agreement." },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-4 border-t border-white/[0.12] py-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">
              Context
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-white/45">
              Everything you join a dealing against.
            </p>
          </div>
          <div className="min-w-0">
            <EndpointTable rows={REFERENCE_ENDPOINTS} />
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-4 border-t border-white/[0.12] py-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">
              Quickstart
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-white/45">
              Authenticate with a bearer token. That&rsquo;s the whole setup.
            </p>
          </div>
          <div className="min-w-0">
            <CodeTabs snippets={SNIPPETS} />
            <p className="mt-5 text-[13.5px] leading-[1.6] text-white/40">
              Full reference, schema documentation and an OpenAPI spec ship with
              access. Field-level definitions for <Path>analysis</Path>,{" "}
              <Path>cluster</Path> and <Path>buy_style</Path> are included.
            </p>
          </div>
        </div>
      </section>

      {/* ── 03 Coverage ──────────────────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeader
          index={3}
          kicker="The markets"
          sub="Cross-market is the hard part and the reason this exists. Each register speaks a different language; you get one."
          title="Four regulators, one shape."
          tone="dark"
          total={3}
        />

        <div className="mt-10 border-t border-white/[0.12]">
          {[
            {
              m: "United Kingdom",
              s: "RNS — PDMR notifications",
              n: "Free-text disclosures, parsed. Full analysis, performance tracking and portfolio surfaces.",
            },
            {
              m: "United States",
              s: "SEC EDGAR — Form 4",
              n: "Open-market purchases separated from grants, exercises and tax withholdings. Full analysis and performance.",
            },
            {
              m: "Sweden",
              s: "Finansinspektionen — Insynsregister",
              n: "MAR Article 19 notifications, ISIN-resolved to tradeable tickers.",
            },
            {
              m: "Netherlands",
              s: "AFM — MAR Article 19 register",
              n: "Euronext Amsterdam listings, common shares separated from rights and options.",
            },
            {
              m: "US Congress",
              s: "STOCK Act — House & Senate PTRs",
              n: "Scored on committee jurisdiction, own-name vs spouse account, and filer base rate.",
              beta: true,
            },
          ].map((r) => (
            <div
              key={r.m}
              className="grid gap-2 border-b border-white/[0.12] py-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8"
            >
              <div>
                <p className="text-[17px] font-semibold leading-snug text-white">
                  {r.m}
                  {r.beta ? (
                    <span
                      className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} ml-2 bg-[#eec584]/15 align-middle text-[#eec584]`}
                    >
                      Beta
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 font-mono text-[11.5px] uppercase tracking-[0.1em] text-[#ad9479]">
                  {r.s}
                </p>
              </div>
              <p className="text-[14px] leading-[1.65] text-white/55">{r.n}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className={SECTION}>
        <ApiFaq
          items={FAQ}
          standfirst="Anything not covered here, put it in the form — it reaches a person, not a queue."
          title="Before you ask for a quote"
        />
      </section>

      {/* ── Request access — the inverted band ───────────────────────────── */}
      <section
        className={`${FULL_BLEED} mt-6 bg-[#f5f0e8] text-[#1a140d]`}
        id="request-access"
      >
        <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a4128]">
                Request access
              </p>
              <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[40px]">
                Pricing is quoted per use case.
              </h2>
              <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.6] text-[#1a140d]/65">
                A nightly bulk sync, a live product surface and a research
                backtest are different shapes, and pricing them from one list
                would mean overcharging most people. Tell us what you&rsquo;re
                building and we&rsquo;ll come back with scope and a number.
              </p>

              <dl className="mt-9 max-w-[38ch] border-t border-black/10">
                {[
                  ["Access", "Bearer token, issued per environment"],
                  ["Markets", "Any subset, or all of them"],
                  ["History", "Sized to your backtest window"],
                  ["Support", "A person, by email"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-6 border-b border-black/10 py-3"
                  >
                    <dt className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1a140d]/45">
                      {k}
                    </dt>
                    <dd className="text-right text-[14px] text-[#1a140d]/75">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <InterestForm />
            </div>
          </div>

          <p className="mt-12 max-w-[70ch] text-xs leading-[1.6] text-[#1a140d]/40">
            Research output, not investment advice. Ratings and analysis are
            generated judgements with a stated confidence, not recommendations
            to trade. Redistribution rights for underlying regulatory content
            vary by source and are agreed per contract.
          </p>
        </div>
      </section>
    </DefaultLayout>
  );
}
