import type { ComponentType, SVGProps } from "react";

import { useState } from "react";
import {
  ArrowTrendingDownIcon,
  FunnelIcon,
  PresentationChartLineIcon,
  RectangleGroupIcon,
  ScaleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import { BUTTON_RADIUS } from "@/components/button";
import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";
import { FULL_BLEED } from "@/components/full-bleed";
import { Reveal } from "@/components/download/reveal";
import { SectionHeader } from "@/components/download/section-header";
import { AccumulationChart } from "@/components/api/accumulation-chart";
import { ApiFaq } from "@/components/api/api-faq";
import { CodeTabs } from "@/components/api/code-tabs";
import {
  EndpointTable,
  ParamList,
  Path,
} from "@/components/api/endpoint-table";
import { LanguageStrip } from "@/components/api/language-strip";
import { MarketGrid } from "@/components/api/market-grid";
import { RequestAccessModal } from "@/components/api/request-access-modal";
import { ResponseExplorer } from "@/components/api/response-explorer";
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
 *     resolve to their DARK values. Everything in that band, in
 *     `interest-form.tsx` and in the request modal is therefore written with
 *     fixed colours only: literals, or the fixed brand tokens (`ink`,
 *     `brand-brown`), never the theme-aware ones.
 *
 *  Copy rules, both hard constraints:
 *   1. Never mention a free tier, a public sandbox or the currently-open
 *      endpoint. See investigations/2026-07-26-api-product-surface.md §9.
 *   2. No em-dashes, anywhere in reader-facing copy on this page. House style
 *      is canonical in `ddbx-data/worker/llm/prompts.ts` (`HOUSE_STYLE_RULES`)
 *      and applies to hand-written copy as much as to generated recaps: no
 *      em-dashes, no padding phrases, no model or pipeline-vendor names, plain
 *      declarative sentences with specific numbers. Use colons, semicolons or
 *      a full stop.
 */

const SECTION = "mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20";

/** Hero proof cards. Each carries a figure AND the line that stops it being a
 *  bare number: "6" alone invites "six what?", which is the failure mode of
 *  every stat strip on the internet. */
const STATS = [
  { k: "Markets", v: "6", note: "Four registers, plus two US sub-feeds." },
  {
    k: "Regulators parsed",
    v: "4",
    note: "Read from RNS, SEC, AFM and FI directly.",
  },
  { k: "Ingest cadence", v: "15 min", note: "Every quarter hour, at source." },
  { k: "Schema", v: "One", note: "The same keys in every market." },
];

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const FEATURES: { Icon: Icon; h: string; b: string }[] = [
  {
    Icon: FunnelIcon,
    h: "Screened, with the reason written down",
    b: "Every disclosure passes a triage gate that records a verdict and a plain-English rationale, including why something was dismissed. You can audit the screen instead of trusting it.",
  },
  {
    Icon: ScaleIcon,
    h: "Rated, with the case against",
    b: "Rows that clear triage carry a full analysis: rating, confidence, thesis, evidence for and against, key risks and a catalyst window. The bear case ships with the bull case.",
  },
  {
    Icon: PresentationChartLineIcon,
    h: "Benchmarked from disclosure",
    b: "Return and alpha versus the index, from the trade date and from the disclosure date. The disclosure figure is the one a follower could actually have captured.",
  },
  {
    Icon: UserGroupIcon,
    h: "Clusters, detected",
    b: "When several insiders at one issuer buy inside the same window, the rows say so, with tier, count and window length. Breadth is a signal one purchase cannot give you.",
  },
  {
    Icon: ArrowTrendingDownIcon,
    h: "Buy style, classified",
    b: "Whether a purchase leans into a drawdown or chases strength, with the drawdown-from-high and trailing return that decided it. Two identical buys, different meanings.",
  },
  {
    Icon: RectangleGroupIcon,
    h: "One schema, four regulators",
    b: "Free-text UK PDMR notices, SEC Form 4, AFM and FI registers, normalised into a single shape with one sector taxonomy and currency units reconciled.",
  },
];

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
    returns: "MAR Article 19 notifications from Sweden and the Netherlands.",
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
    returns: "Discovery: every market and its capabilities.",
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
        Those give you filings. This gives you filings parsed into one schema
        across four regulators, screened, scored with a written rationale,
        sector-normalised, currency-reconciled and benchmarked against the index
        from both the trade date and the disclosure date. The parsing alone is
        the part most teams underestimate: UK PDMR notifications are free text,
        and an LSE issuer can file in EUR or USD.
      </>
    ),
  },
  {
    q: "How quickly do new filings appear?",
    a: "The ingest pipeline runs every 15 minutes against each regulator’s source, so a disclosure is generally readable within minutes of publication. Deep analysis on the rows that clear triage follows shortly after.",
  },
  {
    q: "How far back does history go?",
    a: "Depth varies by market. The UK series is the longest; the EU registers were added later. Tell us the window your backtest needs and we will confirm exactly what we hold before you commit to anything.",
  },
  {
    q: "Can we get the analysis in another language?",
    a: "Yes. The written fields (summary, thesis, evidence, key risks) are generated per row, so another language is a scope decision taken at contract time, not a rebuild. Say which one you need when you ask for a quote. Source fields keep the register’s own wording either way: a Swedish filing stays Swedish where Finansinspektionen wrote it.",
  },
  {
    q: "Is the analysis investment advice?",
    a: "No. It is research output: an opinionated reading of a disclosure with the evidence on both sides shown, including the case against. It carries a confidence score because it is a judgement rather than a recommendation, and it should be treated as one input among several.",
  },
  {
    q: "Can we redistribute the data in our own product?",
    a: "Depends on the field and the market. Our generated analysis, ratings and derived metrics are ours to license. Redistribution rights for underlying regulatory content vary by source, so every contract states them field by field. We will be specific about what you can and cannot pass on.",
  },
  {
    q: "What happens when a filing is amended or restated?",
    a: "Amendments arrive as their own rows and are flagged, so a point-in-time backtest stays honest. You can reconstruct what was knowable on any given date rather than silently inheriting a later correction.",
  },
  {
    q: "What are the rate limits?",
    a: "Set per agreement against what you are actually doing; a nightly bulk sync and a live product have different shapes. We would rather size it to your use case than make you work around a number picked before we had spoken.",
  },
];

/** The page's atmosphere — the surface the hero panel sits ON, not a texture
 *  inside it.
 *
 *  The API page was a dark rectangle on a flat dark page, which on a page
 *  selling a data product read as an empty slide. The fix belongs behind the
 *  content rather than inside it: the panel stays a clean flat card, and what
 *  gives the page character is what you can see around and through it.
 *
 *  It gives the page shape without giving it colour — nothing here is a hue the
 *  brand doesn't already own.
 *
 *  Five layers, all of them percentage-positioned gradients painted on
 *  full-size `inset-0` divs:
 *
 *  1. A 64px lattice at 5% white, masked to a soft lobe around the response
 *     panel. A grid is the one ornament an API page can wear honestly — it's
 *     the shape of a table — but a grid that runs edge to edge is a wireframe,
 *     so the mask is what keeps it atmosphere.
 *  2. A warm `brand-amber` bloom over the top-right, as if the page were lit
 *     from over the response panel's shoulder. Same accent the kicker uses.
 *  3. A cooler, wider bloom low on the left, so the light has a direction
 *     instead of being one symmetric glow.
 *  4. Two broad diagonal rakes of white crossing the blooms. These are the
 *     "shape" — the thing that stops the rest reading as a vignette. They run
 *     off both sides of the viewport on purpose: a band that bleeds off the
 *     edge reads as a shape passing through, where one that stops inside the
 *     frame reads as an object someone forgot to finish.
 *  5. A fade to the page background across the bottom, so the whole thing
 *     dissolves before the lower sections rather than ending.
 *
 *  NOTHING MAY TERMINATE AT THIS ELEMENT'S BOX EDGE. The first version clipped
 *  the lattice — its radial mask was still at ~85% strength where the layer's
 *  right edge met the root's `overflow-x-clip`, which put a hard vertical seam
 *  down the page and made the whole effect read as something cut off. Hence:
 *  no `overflow-hidden` here, no child positioned outside the box, every radial
 *  reaching full transparency inside its own extent, and the bottom handled by
 *  a fade layer rather than a `mask-image` on this element (a mask would tile
 *  by default over anything that overflowed).
 *
 *  All static gradients: no blur filters, no animation, nothing to repaint on
 *  scroll.
 *
 *  Positioning: `absolute` inside an `isolate`d page wrapper rather than
 *  `fixed`. The layout root paints an opaque background, so a negative-z layer
 *  outside a stacking context of its own would sit behind that background and
 *  never be seen. `isolate` on the wrapper is what lets `-z-10` mean "behind
 *  this page's content" instead of "behind the site". */
function PageAtmosphere() {
  const latticeMask =
    "radial-gradient(46% 40% at 72% 20%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 76%)";

  return (
    <div
      aria-hidden
      // The break-out is written out rather than reusing FULL_BLEED: that
      // constant carries `relative`, and which of `relative`/`absolute` wins
      // depends on their order in the generated stylesheet, not on the order
      // they appear here. Not a bet worth taking on a positioning-critical
      // layer.
      //
      // `-top-24` runs it up behind the sticky navbar, which paints its own
      // background over the top: the layer's top edge is never a line you can
      // see, for the same reason nothing else here stops at a boundary.
      className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[1700px] w-screen -translate-x-1/2"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: latticeMask,
          WebkitMaskImage: latticeMask,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(64% 46% at 74% 12%, rgba(238,197,132,0.19), rgba(238,197,132,0.06) 44%, transparent 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 40% at 14% 46%, rgba(255,255,255,0.075), rgba(255,255,255,0.022) 44%, transparent 74%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(104deg, transparent 20%, rgba(255,255,255,0.055) 40%, transparent 58%), linear-gradient(76deg, transparent 42%, rgba(255,255,255,0.038) 62%, transparent 82%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[620px]"
        style={{
          background:
            // `--background`, not `--color-background`: globals.css defines the
            // raw custom property and Tailwind's `bg-background` maps onto it.
            // The page is theme-pinned dark, so this always resolves to the
            // warm charcoal the layout root is painting.
            "linear-gradient(to bottom, transparent, var(--background, oklch(22% 0.022 55)) 88%)",
        }}
      />
    </div>
  );
}

/** The reference section's atmosphere — the same idea as `PageAtmosphere`, but
 *  doing a different job, which is the only reason to use it twice.
 *
 *  Repeating the hero's warm bloom halfway down would read as wallpaper: the
 *  same gesture at the same strength in two places is a texture, not a
 *  composition. So this one drops the amber entirely and leads with the
 *  lattice, wider-spaced and a touch stronger than the hero's. This is the part
 *  of the page that IS a schema — ten endpoints, a param list and two tables —
 *  and a grid behind it is the one ornament that means something there.
 *
 *  Anchored to the section rather than to a pixel offset from the top of the
 *  page: it hangs off the section's own box with negative insets, so it stays
 *  put when the copy above it changes length. Every gradient dies inside its
 *  own extent — see PageAtmosphere for why that rule is absolute here. */
function ReferenceAtmosphere() {
  const latticeMask =
    "radial-gradient(52% 40% at 30% 46%, #000 0%, rgba(0,0,0,0.45) 46%, transparent 76%)";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-40 -top-40 left-1/2 -z-10 w-screen -translate-x-1/2"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          maskImage: latticeMask,
          WebkitMaskImage: latticeMask,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(56% 42% at 82% 62%, rgba(255,255,255,0.05), rgba(255,255,255,0.015) 44%, transparent 74%)",
        }}
      />
    </div>
  );
}

/** The closing band's atmosphere — the same treatment, inverted.
 *
 *  The band is the page's one polarity flip: cream on a permanently dark page,
 *  because the site's grammar is "one contrasting object per page, and that
 *  object is the ask". Flat, it was the only part of the page with no light on
 *  it at all, which made the flip read as a missing background rather than as
 *  a deliberate change of surface.
 *
 *  Inverted means inverted: the lattice is black at 3.5% instead of white at
 *  5%, and the bloom is `brand-brown` rather than `brand-amber` — the same
 *  accent this band already uses for its kicker. Both are centred behind the
 *  button rather than thrown to the top-right, because the band is centred now
 *  and the light should point at the one thing there is to do.
 *
 *  Fixed colour literals only, no theme-aware tokens: `.dark` is pinned on this
 *  page, so anything token-driven inside this band resolves to its DARK value.
 *  See the file header. */
function BandAtmosphere() {
  const latticeMask =
    "radial-gradient(44% 52% at 50% 42%, #000 0%, rgba(0,0,0,0.4) 48%, transparent 78%)";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(26,20,13,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,20,13,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: latticeMask,
          WebkitMaskImage: latticeMask,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            // Alphas run higher here than on the dark layers and still land
            // softer: white over #f5f0e8 moves each channel by (255 - base) x
            // alpha, so 50% white is a ~7-point lift where 5% white on the
            // warm charcoal is a ~10-point one. Light surfaces need more
            // number for less effect.
            "radial-gradient(52% 60% at 50% 34%, rgba(90,65,40,0.08), rgba(90,65,40,0.025) 46%, transparent 76%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, transparent 26%, rgba(255,255,255,0.5) 48%, transparent 70%)",
        }}
      />
    </div>
  );
}

export default function ApiPage() {
  usePinnedTheme("dark");
  const [askOpen, setAskOpen] = useState(false);
  const openAsk = () => setAskOpen(true);

  return (
    <DefaultLayout>
      {/* `isolate` scopes the atmosphere's negative z-index to this page —
          see PageAtmosphere for why it can't just be a fixed layer. */}
      <div className="relative isolate">
        <PageAtmosphere />

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="pt-2 md:pt-6">
          <div className="rounded-3xl border border-white/[0.08] bg-[oklch(19%_0.022_55)] p-6 md:p-10 lg:p-12">
            {/* `grid-cols-1` rather than bare `grid`: the implicit column is
              `auto`-sized, so the response panel's <pre> (which is ~500px of
              unbreakable monospace) widened the whole column past the viewport
              on mobile and clipped the headline and copy off the right edge.
              `grid-cols-1` is minmax(0,1fr), which lets the panel's own
              overflow-x own the scrolling instead. */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-14">
              <div>
                <span
                  className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.lg} bg-brand-amber/15 text-brand-amber`}
                >
                  Developer API · Private beta
                </span>
                <h1 className="mt-6 text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.028em] text-white sm:text-[44px] lg:text-[58px]">
                  Four insider registers, one JSON schema.
                </h1>
                <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.55] text-white/60">
                  Every director and insider purchase across the UK, US, Sweden
                  and the Netherlands: screened, rated with a written rationale,
                  and benchmarked against the index from the day it was
                  disclosed.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    className={`${BUTTON_RADIUS} bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-white/90`}
                    data-ga-event="cta_api_hero_request"
                    data-ga-label="API hero"
                    type="button"
                    onClick={openAsk}
                  >
                    Request access
                  </button>
                  <a
                    className={`${BUTTON_RADIUS} bg-white/[0.08] px-6 py-3.5 text-[15px] font-semibold text-white/85 transition-colors hover:bg-white/[0.14]`}
                    href="#reference"
                  >
                    Read the reference
                  </a>
                </div>
              </div>

              <ResponseExplorer />
            </div>

            {/* Proof cards. These used to be a separate full-bleed strip below
              the hero, where four bare figures on an empty band read as filler
              between two real sections. Inside the hero they are what the
              headline is standing on. */}
            <dl className="mt-10 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-8 sm:grid-cols-4 lg:mt-12">
              {STATS.map((s) => (
                <div
                  key={s.k}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5"
                >
                  <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                    {s.k}
                  </dt>
                  <dd className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-white">
                    {s.v}
                  </dd>
                  <p className="mt-2 text-[12px] leading-[1.45] text-white/40">
                    {s.note}
                  </p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── 01 The data ──────────────────────────────────────────────────── */}
        <section className={`${SECTION} pt-16 md:pt-24`}>
          <SectionHeader
            index={1}
            kicker="The data"
            sub="Most insider feeds stop at the filing. These rows carry the screen that judged it, the rating, the cluster it belongs to, the style of the buy and the price action since."
            title="Every row carries a verdict."
            tone="dark"
            total={4}
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {/* Stagger resets per row rather than running 0-300ms across all
              six: Reveal's own note caps a stagger at ~240ms before it starts
              reading as the page being slow. */}
            {FEATURES.map((c, i) => (
              <Reveal key={c.h} delay={(i % 3) * 60}>
                <div className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
                  <c.Icon
                    aria-hidden="true"
                    className="h-6 w-6 text-brand-amber"
                    strokeWidth={1.4}
                  />
                  <h3 className="mt-4 text-[16px] font-semibold leading-snug text-white">
                    {c.h}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-[1.6] text-white/55">
                    {c.b}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Outside the grid on purpose. Language is a scope decision taken
            once, not a seventh field that arrives in every row, and a seventh
            box would have said the opposite. See language-strip.tsx. */}
          <Reveal className="mt-14 md:mt-20">
            <LanguageStrip />
          </Reveal>
        </section>

        {/* ── 02 The picture ───────────────────────────────────────────────── */}
        <section className={SECTION}>
          <SectionHeader
            index={2}
            kicker="The picture"
            sub="A row gives you the disclosure date, the size of the buy, the cluster it belongs to and the return since. Plot those against a price series and the buying is legible on its own timeline."
            title="One issuer, six insiders, ninety days."
            tone="dark"
            total={4}
          />

          <Reveal className="mt-10">
            <AccumulationChart />
          </Reveal>
          <p className="mt-4 max-w-[64ch] text-[12.5px] leading-[1.55] text-white/40">
            Illustrative series, not a real issuer. The fields it is drawn from
            are real: <Path>disclosed_date</Path>, <Path>value_gbp</Path>,{" "}
            <Path>cluster</Path> and <Path>live_performance</Path>. Price bars
            are not part of the feed; bring your own.
          </p>
        </section>

        {/* ── 03 The reference ─────────────────────────────────────────────── */}
        <section className={`${SECTION} relative isolate`} id="reference">
          <ReferenceAtmosphere />
          <SectionHeader
            index={3}
            kicker="The reference"
            sub="Predictable REST over JSON, with cursor pagination and edge-cached reads. A discovery endpoint means you never hardcode a market."
            title="Ten endpoints and a bearer token."
            tone="dark"
            total={4}
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
                    desc: "ISO dates. before is the pagination cursor; pass the oldest disclosed_date you hold.",
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
                Full reference, schema documentation and an OpenAPI spec ship
                with access. Field-level definitions for <Path>analysis</Path>,{" "}
                <Path>cluster</Path> and <Path>buy_style</Path> are included.
              </p>
            </div>
          </div>
        </section>

        {/* ── 04 Coverage ──────────────────────────────────────────────────── */}
        <section className={SECTION}>
          <SectionHeader
            index={4}
            kicker="The markets"
            sub="Cross-market is the hard part and the reason this exists. Each register speaks its own language; you get one."
            title="Four regulators, one shape."
            tone="dark"
            total={4}
          />

          <MarketGrid />
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className={SECTION}>
          <ApiFaq
            items={FAQ}
            standfirst="Anything not covered here, put it in the form. It reaches a person."
            title="Before you ask for a quote"
          />
        </section>

        {/* ── Request access — the inverted band ───────────────────────────── */}
        <section
          className={`${FULL_BLEED} isolate mt-6 bg-[#f5f0e8] text-ink`}
          id="request-access"
        >
          <BandAtmosphere />

          {/* Centred, and cut to the ask alone.

            This band went left-set-and-ruled like the numbered sections above
            it, carrying the pitch, a five-column spec row and the legal note.
            But it isn't a section of the document — it's the end of it, and
            the one thing on it a visitor can act on is a single button. Set
            left with a spec table under it, the button was one object among
            several and the eye had to find it. Centred with nothing else in
            the frame, it is the only place to look.

            The spec row went with the left-set version rather than moving:
            every line of it (bearer token, market subsets, history window,
            language, support) is already answered in the FAQ directly above
            and restated in the modal the button opens. Third time on one
            screen was reading, not information. */}
          <div className="relative mx-auto max-w-[1280px] px-4 py-20 text-center md:px-6 md:py-28">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown">
              Request access
            </p>
            <h2 className="mx-auto mt-5 max-w-[20ch] text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
              Get in touch for pricing.
            </h2>
            {/* The headline used to carry "quoted per use case", which stated
                a policy where the band wants an invitation. It survives as the
                tail of this line: still the one commercial fact worth knowing
                before you click, now in the sentence that already promises a
                reply rather than in the position that should be selling. */}
            <p className="mx-auto mt-4 max-w-[42ch] text-balance text-[16.5px] leading-[1.6] text-ink/65">
              Tell us what you&rsquo;re building and we&rsquo;ll come back with
              scope and a number, priced to your use case.
            </p>

            <button
              className={`${BUTTON_RADIUS} mt-9 bg-ink px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2118]`}
              data-ga-event="cta_api_band_request"
              data-ga-label="API closing band"
              type="button"
              onClick={openAsk}
            >
              Request pricing
            </button>
            <p className="mt-4 text-[13px] text-ink/50">
              Two working days. No newsletter, no onward sharing.
            </p>

            <p className="mx-auto mt-16 max-w-[58ch] text-[11.5px] leading-[1.6] text-ink/40">
              Research output, not investment advice. Ratings carry a stated
              confidence and are not recommendations to trade. Redistribution
              rights vary by source and are agreed per contract.
            </p>
          </div>
        </section>
      </div>

      <RequestAccessModal open={askOpen} onClose={() => setAskOpen(false)} />
    </DefaultLayout>
  );
}
