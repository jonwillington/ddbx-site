// Market-cap band hubs: where insiders bought, grouped by company size.
//
// Plain ESM at the root, read by both src/pages/market-cap.tsx and
// functions/market-cap/[[route]].js, for the reason the rest of shared/ is.
//
// ---------------------------------------------------------------------------
// Why size bands and not index membership
// ---------------------------------------------------------------------------
//
// "FTSE 250 director dealings" is the better query and it was specced twice
// (2026-08-02 §6, 2026-08-19 §3.5). It is also not free: FTSE 100/250
// constituent lists are FTSE Russell's licensed IP, as the S&P 500's are S&P
// DJI's, so republishing one as a page is a licensing question before it is an
// engineering one — and it needs a new table plus a quarterly refresh pinned to
// index review dates.
//
// Size bands capture nearly the same intent with none of that. `market_cap` is
// already in the product (company_stats, migration 031, refreshed daily from
// Yahoo) and as of 2026-08-19 it is served on /api/companies, so a band page is
// one cheap call with no new data model and no maintenance calendar.
//
// ---------------------------------------------------------------------------
// The currency trap, which is the whole reason banding needs a module
// ---------------------------------------------------------------------------
//
// Two things about `market_cap` are not what the field names suggest, both
// measured against live rows:
//
//   1. `stats_currency` describes the PRICE QUOTE, not the cap. 422 of the 433
//      capped UK issuers say `GBp` — prices quoted in pence — while the cap
//      itself is in POUNDS. Anglo American arrives as 41,048,702,976 with
//      currency "GBp", and that is £41bn, not £410m. Dividing by 100 to
//      "convert pence" is wrong by two orders of magnitude in the direction
//      that looks plausible.
//   2. The currency is not the market's. A London listing that reports in EUR
//      (Metlen, €6.9bn) or USD (Halyk Bank) sits in the UK rows with a
//      non-sterling cap, and there is no FX anywhere in this system.
//
// So banding accepts only issuers whose cap is already in the market's own
// currency, and the pages state how many were set aside. Ten of 433 UK issuers
// on 2026-08-19. Converting them would mean inventing an exchange rate, and
// ranking them unconverted would put a €7bn company in the wrong band.

/** Whether an issuer's `market_cap` is denominated in the market's own money.
 *
 *  Case-insensitive, which is the load-bearing part: the UK feed reports "GBp"
 *  for 422 of the 433 capped issuers, and that upper-cases to "GBP". It means
 *  the PRICE is quoted in pence — the cap beside it is already pounds — so
 *  treating "GBp" as foreign would discard almost the whole UK market, and
 *  treating it as pence would divide every UK cap by 100. See the header. */
function isNativeCurrency(currency, market) {
  const c = String(currency ?? "").toUpperCase();

  if (market === "US") return c === "USD";

  return c === "GBP";
}

/** The bands, largest first.
 *
 *  Thresholds are the conventional ones and they are market-relative on
 *  purpose: the same $2bn that makes a US company small-cap makes a UK one
 *  solidly mid-cap. They are an editorial line rather than a derived one, so
 *  every page prints the numbers it used rather than applying them quietly. */
export const BANDS = [
  {
    slug: "large",
    label: "Large-cap",
    plural: "Large-cap companies",
    /** Inclusive floor, per market, in the market's own currency. */
    min: { UK: 10_000_000_000, US: 10_000_000_000 },
    max: { UK: null, US: null },
    blurb:
      "The biggest listed companies, where a director's own purchase is small against the share register and the signal is about conviction rather than control. Buying here is rarer and usually more deliberate.",
  },
  {
    slug: "mid",
    label: "Mid-cap",
    plural: "Mid-cap companies",
    min: { UK: 2_000_000_000, US: 2_000_000_000 },
    max: { UK: 10_000_000_000, US: 10_000_000_000 },
    blurb:
      "Companies big enough to be well covered and small enough that a board still moves the register. This is where insider buying is most often read as a view on the business rather than on the sector.",
  },
  {
    slug: "small",
    label: "Small-cap",
    plural: "Small-cap companies",
    min: { UK: 0, US: 0 },
    max: { UK: 2_000_000_000, US: 2_000_000_000 },
    blurb:
      "Smaller listings, where insiders are often the largest holders and a single purchase can be a meaningful share of daily volume. The buying is more frequent here, and so is the noise.",
  },
];

export const BAND_SLUGS = BANDS.map((b) => b.slug);

export function bandBySlug(slug) {
  return BANDS.find((b) => b.slug === String(slug ?? "")) ?? null;
}

export function bandPath(slug) {
  return slug ? `/market-cap/${slug}` : "/market-cap";
}

/** Below this many issuers a band page is a stub. Same posture as the sector
 *  bar — a band that can field three companies is not a view of a market. */
export const MIN_COMPANIES = 5;

/** How many companies a band page lists. */
export const TOP_COMPANIES = 30;

/** Which band an issuer falls in, or null when it cannot be placed.
 *
 *  Null for a missing cap AND for a cap in someone else's currency — see the
 *  header. Both are "we don't know", not "small". */
export function bandFor(company, market) {
  const cap = Number(company?.market_cap);

  if (!isFinite(cap) || cap <= 0) return null;
  if (!isNativeCurrency(company?.stats_currency, market)) return null;

  return (
    BANDS.find((b) => {
      const min = b.min[market];
      const max = b.max[market];

      return cap >= min && (max == null || cap < max);
    }) ?? null
  );
}

/** Split the company index into bands.
 *
 *  Returns the bands in order plus the two exclusion counts, so a page can say
 *  what it left out instead of quietly narrowing the market. */
export function bandRollup(companies, market) {
  const rows = companies ?? [];
  const buckets = new Map(BANDS.map((b) => [b.slug, []]));
  let noCap = 0;
  let foreignCurrency = 0;

  for (const company of rows) {
    const cap = Number(company?.market_cap);

    if (!isFinite(cap) || cap <= 0) {
      noCap += 1;
      continue;
    }
    if (!isNativeCurrency(company?.stats_currency, market)) {
      foreignCurrency += 1;
      continue;
    }

    const band = bandFor(company, market);

    if (band) buckets.get(band.slug).push(company);
  }

  return {
    bands: BANDS.map((band) => {
      const members = buckets.get(band.slug);

      members.sort(
        (a, b) =>
          (b.total_value ?? 0) - (a.total_value ?? 0) ||
          (b.deals ?? 0) - (a.deals ?? 0),
      );

      return {
        band,
        companies: members,
        count: members.length,
        deals: members.reduce((sum, c) => sum + (c.deals ?? 0), 0),
        value: members.reduce((sum, c) => sum + (c.total_value ?? 0), 0),
      };
    }),
    total: rows.length,
    noCap,
    foreignCurrency,
  };
}

export function bandMeetsBar(row) {
  return (row?.count ?? 0) >= MIN_COMPANIES;
}

/** The threshold sentence a band page prints. Stated, never implied. */
export function thresholdSentence(band, market) {
  const symbol = market === "US" ? "$" : "£";
  const min = band.min[market];
  const max = band.max[market];
  const bn = (n) => `${symbol}${n / 1_000_000_000}bn`;

  if (max == null) return `Companies valued at ${bn(min)} or more.`;
  if (!min) return `Companies valued under ${bn(max)}.`;

  return `Companies valued between ${bn(min)} and ${bn(max)}.`;
}

/** What the rollup set aside, in one sentence, or null when it set aside
 *  nothing. The pages print this rather than letting the totals quietly
 *  disagree with the company index. */
export function exclusionSentence(rollup, market) {
  const parts = [];

  if (rollup.noCap > 0) {
    parts.push(`${rollup.noCap} have no market value on file`);
  }
  if (rollup.foreignCurrency > 0) {
    parts.push(
      `${rollup.foreignCurrency} report theirs in a currency other than ${market === "US" ? "dollars" : "pounds"}, which we do not convert`,
    );
  }
  if (parts.length === 0) return null;

  return `Of the ${rollup.total} companies with disclosed buying, ${parts.join(", and ")}. Those are left unbanded rather than guessed at.`;
}

/** Published methodology for the band pages.
 *
 *  The last line is the awkward one and it is here deliberately. These pages
 *  count from the company index, which is a slightly wider corpus than the
 *  leaderboards read: the index has no filer-role join, so a US purchase by a
 *  holder with no officer post and no board seat is counted here and excluded
 *  from /biggest-buys and the four boards. Republic Services is the visible
 *  case. Saying so beats letting the same currency symbol mean two things on
 *  two pages of one site; closing the gap properly is a ddbx-data change. */
export const METHODOLOGY = [
  "Bands are set on market value in the company's own currency, using the thresholds printed on each page. They are conventional lines rather than derived ones, and they differ by market on purpose — the value that makes a US company small-cap makes a UK one solidly mid-sized.",
  "Market value is refreshed daily from the same source the company pages use. A company that has moved between bands since its insiders bought is shown where it sits today, not where it sat then.",
  "Companies with no market value on file are not placed in a band, and neither are those reporting in a currency other than the market's own — there is no exchange rate anywhere in this system, and converting one would be inventing a number. Both counts are stated.",
  "Totals cover the disclosed purchases the company index counts, in the market's own currency, and are never converted between markets.",
  "This page counts from the company index, which is marginally wider than the leaderboards: it has no way to tell a company officer from a large outside shareholder, so a US purchase by a 10% holder is included here and excluded from the biggest-buys and cluster boards. Where the two disagree, the boards apply the stricter test.",
];
