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
      "The broadest sector on the UK market by disclosure count, spanning engineering, transport and support services.",
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
      "The smallest sector by disclosure count, and the one where month-to-month figures are least reliable.",
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
  const nums = values
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
 *  (ddbx-data/worker/db/queries.ts). UK is at 786 rows YTD and US 532, so one
 *  request covers both today — but UK will cross 1000 during 2026 and the
 *  caller will need to page back with the `before` cursor. */
export function windowStart(today) {
  const d = new Date(today);

  d.setFullYear(d.getFullYear() - 1);

  return d.toISOString().slice(0, 10);
}
