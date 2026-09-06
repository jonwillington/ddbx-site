// Sector hubs: the 11 normalised ICB sectors, their URL slugs, and the
// aggregation both renderers run.
//
// Plain ESM at the repo root for the usual reason — src/pages/sector.tsx and
// functions/sectors/[slug].js both need it and neither can import the other's
// module graph.
//
// ---------------------------------------------------------------------------
// What these pages are for
// ---------------------------------------------------------------------------
//
// Not primarily to rank on "UK technology director dealings", though they may.
// Their first job is structural: /companies is a single flat index feeding
// several hundred company pages, which is poor crawl distribution and leaves us
// with no mid-tail landing pages at all. Sector hubs put a layer between the
// two and give the footer something to link to.
//
// Their second job is the part nobody else can copy. We already compute median
// return and median ALPHA per sector for the monthly report, so these pages
// publish sector performance of insider buying — not a filtered list of
// filings. The editorial framing below is deliberately short because the data
// is the argument; eleven essays about what "Industrials" means would be
// exactly the padding these pages need to avoid.
//
// Both markets are supported from one code path: UK rows carry `value_gbp`,
// US rows carry `value`, and every row in both feeds carries
// `sector_normalized` (verified 2026-07-26: 786/786 UK, 532/532 US YTD).

/** Below this many buys in the window a sector page is a stub. Same posture as
 *  the company content bar in functions/sitemap.xml.js and MIN_BROKERS in
 *  broker-categories.js — publish the ones with something to say. */
export const MIN_BUYS = 5;

/** The 11 values of SectorNormalized in ddbx-data/worker/db/types.ts, with the
 *  slug each maps to and a one-line framing.
 *
 *  `framing` says what insider buying in this sector tends to look like, not
 *  what the sector is — the reader knows what energy companies do. Kept to a
 *  sentence on purpose. */
export const SECTORS = [
  {
    slug: "technology",
    label: "Technology",
    framing:
      "Founder- and executive-heavy registers, so buying here is often concentrated in a handful of names with large personal stakes already.",
  },
  {
    slug: "financials",
    label: "Financials",
    framing:
      "Banks, insurers and asset managers, where directors are frequently required to build and hold shares — which makes discretionary open-market buying the signal worth isolating.",
  },
  {
    slug: "industrials",
    label: "Industrials",
    framing:
      "Engineering, transport and support services under one heading — a wide, fragmented sector where the buying comes from many small registers rather than a few large ones.",
  },
  {
    slug: "health-care",
    label: "Health Care",
    framing:
      "Pharma and biotech, where a director buy often lands close to trial or regulatory news and the price history around it is worth reading carefully.",
  },
  {
    slug: "consumer-discretionary",
    label: "Consumer Discretionary",
    framing:
      "Retail, leisure and travel — the sector where insider buying most often clusters after a share-price drawdown.",
  },
  {
    slug: "consumer-staples",
    label: "Consumer Staples",
    framing:
      "Food, drink and household goods. Fewer disclosures, and typically from larger, slower-moving registers.",
  },
  {
    slug: "energy",
    label: "Energy",
    framing:
      "Oil, gas and renewables, where buying tends to track the commodity cycle more than company-specific news.",
  },
  {
    slug: "basic-materials",
    label: "Basic Materials",
    framing:
      "Miners and chemicals, including a long tail of small explorers where director purchases are a meaningful share of free float.",
  },
  {
    slug: "real-estate",
    label: "Real Estate",
    framing:
      "REITs and property developers, where buys often follow a discount to net asset value rather than an earnings event.",
  },
  {
    slug: "utilities",
    label: "Utilities",
    framing:
      "Regulated names with low disclosure volume, so a single cluster moves this sector's numbers noticeably.",
  },
  {
    slug: "telecommunications",
    label: "Telecommunications",
    framing:
      "A short list of carriers and infrastructure owners, so disclosures are few and a month-to-month figure here can turn on a single filing.",
  },
];

export const SECTOR_SLUGS = SECTORS.map((s) => s.slug);

export function sectorBySlug(slug) {
  return SECTORS.find((s) => s.slug === String(slug ?? "")) ?? null;
}

/** "Consumer Discretionary" -> the sector entry. The API emits labels; URLs
 *  carry slugs. */
export function sectorByLabel(label) {
  return SECTORS.find((s) => s.label === String(label ?? "")) ?? null;
}

export function sectorPath(slug) {
  return `/sectors/${slug}`;
}

/** Currency symbol per market, so the renderers can't disagree about it. */
export const MARKET_SYMBOL = { UK: "£", US: "$" };

/** How many companies the detail page's ranked list shows, and how many
 *  filings sit under it. Here rather than in the page because the caption
 *  says the number out loud ("Top 20 by value bought") and a cap that only one
 *  of the two renderers knows about is how a "top 20" ends up showing 15. */
export const TOP_COMPANIES = 20;
export const RECENT_BUYS = 12;

/** Display name, cleaned of the noise each source appends — "Metlen Energy &
 *  Metals PLC (MTLN)" and "FIRST CITIZENS BANCSHARES INC /DE/".
 *
 *  Mirrors cleanCompanyName() in src/lib/company.ts, which the app uses and
 *  the Pages Functions can't import (separate bundles). The pre-render was
 *  printing the raw filed string while the hydrated page printed the cleaned
 *  one, so a crawler and a reader saw two different company names in the same
 *  table row. */
export function cleanCompanyName(name) {
  let out = String(name ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
}

/** The plural noun for people who file on a market. */
export function marketNoun(market) {
  return market === "US" ? "insiders" : "directors";
}

/** The same noun used attributively — "disclosed director purchases", not
 *  "disclosed directors purchases", which is what the templated sentences read
 *  as before. */
export function marketNounSingular(market) {
  return market === "US" ? "insider" : "director";
}

/** Compact money. Lives here rather than in either renderer because the lead
 *  sentence below is the page's meta description AND a paragraph on the page —
 *  two copies of the rounding rules is two ways for those to differ. */
export function formatMoney(value, symbol) {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}bn`;
  // Promote at the rounding boundary, not the unit boundary: £999,600 rounds
  // to 1000 thousand, which printed as "£1000k" on the biggest-buys board.
  if (n >= 999_500) {
    const m = n / 1_000_000;

    return `${symbol}${m >= 9.95 ? Math.round(m) : m.toFixed(1)}m`;
  }

  return `${symbol}${Math.round(n / 1000)}k`;
}

/** Ratio → "+1.2%". Null renders as "n/a", which is a real state: a sector
 *  whose buys are all too recent to have a mark has no median, and showing 0%
 *  would assert a flat return we haven't observed. */
export function formatSignedPct(ratio) {
  if (ratio == null) return "n/a";

  return `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`;
}

/** The sector's thesis in one templated sentence — the detail page's opening
 *  paragraph and its meta description, from the same string.
 *
 *  Templated from real figures rather than written per sector: at this page
 *  count model-written prose would be real API spend, and mass-generated copy
 *  is what gets demoted. Same reasoning as functions/company/[key].js.
 *
 *  It used to live only in the pre-render, which meant a crawler read a
 *  sentence of numbers that no human visitor ever saw. */
export function leadSentence(row, market) {
  const alpha =
    row.medianAlpha == null
      ? ""
      : ` The median buy has returned ${formatSignedPct(row.medianAlpha)} against the market since it was disclosed.`;

  const companies =
    row.companies === 1
      ? `one ${row.sector.label.toLowerCase()} company`
      : `${row.companies} ${row.sector.label.toLowerCase()} companies`;

  return `${row.buys} disclosed ${marketNounSingular(market)} purchases across ${companies} in the last twelve months, worth ${formatMoney(row.value, MARKET_SYMBOL[market])}.${alpha}`;
}

/** The same job for the index: what the eleven sectors add up to, and which
 *  one leads. `rows` is the publishable set, already sorted by value. */
export function indexLeadSentence(rows, market) {
  const list = rows ?? [];

  if (list.length === 0) {
    return `Disclosed ${marketNounSingular(market)} purchases over the last twelve months, broken down by sector.`;
  }

  const buys = list.reduce((n, r) => n + r.buys, 0);
  const value = list.reduce((n, r) => n + r.value, 0);
  const top = list[0];
  const sectors =
    list.length === 1 ? "one sector" : `${list.length} sectors`;

  return `${buys} disclosed ${marketNounSingular(market)} purchases worth ${formatMoney(value, MARKET_SYMBOL[market])} across ${sectors} in the last twelve months, led by ${top.sector.label.toLowerCase()} at ${formatMoney(top.value, MARKET_SYMBOL[market])}.`;
}

/** Value of a buy in its own market's currency. UK rows carry `value_gbp`,
 *  US rows `value` — one accessor so the aggregation below is market-blind. */
export function dealValue(d) {
  const v = d?.value_gbp ?? d?.value;
  const n = Number(v);

  return isFinite(n) ? n : 0;
}

/** Person on a row: `director` on UK, `reporter` on US. */
export function dealPerson(d) {
  return d?.director?.name ?? d?.reporter?.name ?? null;
}

/** `live_performance.*_pct_*` -> ratio.
 *
 *  The API uses two conventions for the same idea and they differ by 100×.
 *  `LivePerformance` carries PERCENTAGES (1.83 means +1.83%), while the monthly
 *  summary's `median_alpha` carries a RATIO (-0.0027 means -0.27%). Reading a
 *  live_performance field as a ratio produces sector medians like "+993%" —
 *  which is how this was caught. Everything downstream of here is a ratio, so
 *  it formats identically to the report's sector table.
 *
 *  Mirrors toRatio() in src/lib/performance/channel-summary.ts. */
function toRatio(pct) {
  return pct == null || !Number.isFinite(Number(pct)) ? null : Number(pct) / 100;
}

/** Median of an array of numbers, ignoring null/undefined. Returns null when
 *  nothing is measurable — which is a real state here, not zero: a sector
 *  whose buys are all too recent to have a performance mark has no median, and
 *  rendering 0% would assert a flat return we haven't observed. */
export function median(values) {
  // Filter BEFORE coercing: Number(null) is 0, not NaN, so a null that reaches
  // .map(Number) survives the isFinite gate as a real zero and votes on the
  // median. That is the difference between "no mark" and "flat against the
  // market", which is the one distinction this file exists to protect.
  const nums = values
    .filter((v) => v != null && v !== "")
    .map(Number)
    .filter((n) => isFinite(n))
    .sort((a, b) => a - b);

  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);

  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/** Roll a dealings feed up by sector.
 *
 *  Alpha rather than raw return is the headline: a sector that returned 8% in a
 *  month the whole index rose 7% did not tell you anything, and `live_performance`
 *  already carries the benchmark-relative figure. Rows without a performance
 *  mark still count toward buys and value — they just don't vote on the median.
 *
 *  Returns every sector present in the data, richest first by total value. */
export function sectorRollup(dealings) {
  const bySlug = new Map();

  for (const d of dealings ?? []) {
    const sector = sectorByLabel(d?.sector_normalized);

    if (!sector) continue;
    if (!bySlug.has(sector.slug)) {
      bySlug.set(sector.slug, {
        sector,
        buys: 0,
        value: 0,
        companies: new Set(),
        people: new Set(),
        alphas: [],
        returns: [],
        valueByCompany: new Map(),
      });
    }
    const agg = bySlug.get(sector.slug);

    agg.buys += 1;
    agg.value += dealValue(d);
    if (d.ticker) {
      agg.companies.add(d.ticker);
      agg.valueByCompany.set(
        d.ticker,
        (agg.valueByCompany.get(d.ticker) ?? 0) + dealValue(d),
      );
    }
    const person = dealPerson(d);

    if (person) agg.people.add(person);
    // `_disclosed`, not `_trade`. Both are on the wire, and they measure
    // different things: the trade-date mark is the return the insider got, the
    // disclosed-date mark is the one a reader could actually have achieved,
    // because that's the first moment the buy was public. Publishing the
    // insider's own entry as though it were available to the reader would
    // flatter every number on these pages. Mixing the two in one median would
    // be worse than either. Falls back to the trade anchor only when disclosure
    // is missing, matching returnOf/alphaOf in lib/performance/channel-summary.
    const lp = d.live_performance;
    const alpha = toRatio(lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade);
    const ret = toRatio(lp?.return_pct_disclosed ?? lp?.return_pct_trade);

    if (alpha != null) agg.alphas.push(alpha);
    if (ret != null) agg.returns.push(ret);
  }

  return [...bySlug.values()]
    .map((a) => {
      // Concentration, because a sector total can be one company wearing a
      // sector's name. In the US technology sector over the year to
      // 2026-07-26, five filings from a single issuer accounted for $7.9bn of
      // a $8.0bn total — a true figure that describes one event, not a sector.
      // Publishing the total alone would be accurate and misleading at once,
      // so the page discloses the largest issuer's share whenever it dominates.
      const top = [...a.valueByCompany.entries()].sort((x, y) => y[1] - x[1])[0];

      return {
        sector: a.sector,
        buys: a.buys,
        value: a.value,
        companies: a.companies.size,
        people: a.people.size,
        /** How many of `buys` carry a performance mark — the sample the median
         *  is actually drawn from. Returned rather than kept private because a
         *  median over 4 of 61 buys and one over 58 of 61 are different claims
         *  and the page should be able to say which it's making. */
        alphaCount: a.alphas.length,
        medianAlpha: median(a.alphas),
        medianReturn: median(a.returns),
        medianDeal: median([...a.valueByCompany.values()]),
        topCompany: top ? top[0] : null,
        /** 0–1 share of the sector's value from its largest issuer. */
        topCompanyShare: top && a.value > 0 ? top[1] / a.value : null,
      };
    })
    .sort((x, y) => y.value - x.value);
}

/** Above this share from one issuer, a sector total describes an event rather
 *  than a sector, and the page says so next to the number. */
export const CONCENTRATION_THRESHOLD = 0.4;

/** Whether a sector has enough activity in the window to publish. */
export function sectorMeetsBar(row) {
  return Boolean(row) && row.buys >= MIN_BUYS;
}

/** Start of the rolling window these pages describe.
 *
 *  A fixed "this year" window would make January pages nearly empty and
 *  December pages incomparable, so it's a rolling 12 months. Passed in rather
 *  than computed from Date.now() at module scope so callers stay testable.
 *
 *  Note the API caps a single response at DEALINGS_MAX_LIMIT=1000
 *  (ddbx-data/worker/db/queries.ts), which UK crosses during 2026. Callers
 *  fetch this window through fetchDealingsWindow() in shared/dealings-feed.js,
 *  which pages back with the `before` cursor and reports whether it finished —
 *  a single capped request would silently drop the oldest part of the window
 *  and every figure on these pages would quietly understate it. */
export function windowStart(today) {
  const d = new Date(today);

  d.setFullYear(d.getFullYear() - 1);

  return d.toISOString().slice(0, 10);
}
