// Editorial definitions for the /brokers/best-for/* category pages.
//
// Why this is a dependency-free ESM module at the repo root rather than a .ts
// file under src/: Pages Functions are bundled separately from the Vite app and
// can't resolve the "@/" alias or .tsx, and the app can't import from
// functions/. Same constraint that put shared/seo.js here, same solution — one
// module both pipelines accept, with types alongside in the .d.ts.
//
// ---------------------------------------------------------------------------
// The problem this file exists to solve
// ---------------------------------------------------------------------------
//
// The `badges` array on a BrokerOffer is a set of ATTRIBUTES, not a ranking.
// `best_for_beginners` sits on 8 of the 19 UK brokers and `best_for_isa` on 7.
// So a page built by filtering on a badge is a list of nearly half the market
// in arbitrary order — which is a query result, not a recommendation, and
// exactly the thin-content shape that gets a commercial directory discounted.
//
// Two things fix that, and both live here:
//
//   1. `order` — an explicit editorial ranking per category. The badge decides
//      who is ELIGIBLE; this decides who leads.
//   2. `picks` — one line per broker saying who should choose it and why it
//      differs from the one above.
//
// ---------------------------------------------------------------------------
// Why `picks` copy carries no numbers
// ---------------------------------------------------------------------------
//
// Every figure on these pages is rendered from the live broker record, never
// written into the prose here. Two reasons, and the second is the important
// one:
//
//   - Authored numbers go stale silently. The fee table next to the copy would
//     say one thing and the sentence another.
//   - Under FCA/ASA rules a comparative claim has to be substantiable. A
//     sentence reading "the cheapest FX here" is a claim we'd have to defend;
//     a fee column showing 0.15% next to 0.99% is a fact the reader checks
//     themselves. So the prose does positioning and the table does numbers.
//
// While writing these, two comparative claims drafted from memory turned out
// to be false against the live data (Trading 212 is not the lowest FX —
// InvestEngine charges 0% and Lightyear 0.1%; Moneybox is not one of only two
// LISA providers — five platforms offer one). Both would have shipped as
// unsubstantiated superlatives. Hence the rule.
//
// A category only ships when at least MIN_BROKERS carry its badge. Below that
// the page is a list of two, which reads as a stub and ranks like one.

/** The bar a category clears to get a page. Mirrors the content-bar posture in
 *  functions/sitemap.xml.js — a page with two entries isn't a comparison. */
export const MIN_BROKERS = 3;

/** Column ids the category page knows how to render. Keeps the editorial
 *  choice of "what matters for THIS category" out of the component. */
export const COLUMNS = {
  platformFee: "Platform fee",
  ukDealing: "UK dealing",
  usDealing: "US dealing",
  fx: "FX fee",
  isa: "ISA",
  sipp: "SIPP",
  lisa: "LISA",
  funds: "Funds",
  investmentTrusts: "Investment trusts",
  fractional: "Fractional shares",
  usShares: "US shares",
};

export const CATEGORIES = [
  {
    slug: "beginners",
    badge: "best_for_beginners",
    h1: "Best trading platforms for beginners",
    // Title/description are consumed by shared/seo.js, so the tab, the OG card
    // and the SERP all read from this one string.
    title: "Best UK trading platforms for beginners",
    description:
      "The UK investing platforms that are simplest to start with — what each one costs, which tax wrappers it supports, and who should pick which.",
    intro: [
      "Starting out, the platform matters less than the habit — but the wrong one adds costs you won’t notice for years. The three things that actually bite a beginner are a percentage platform fee on a small pot, a currency conversion charge if you buy American shares, and a tax wrapper you can’t open because the app doesn’t offer it.",
      "Everything below offers a Stocks & Shares ISA and FSCS protection. They differ on what they charge to hold your money, what they charge to convert it, and how much of the decision-making they take off your hands.",
    ],
    whatToLookFor: [
      "A free or flat platform fee — a percentage charge costs little on £1,000 and a lot on £50,000.",
      "The FX fee, if you plan to buy US shares. It applies every time you convert, and the spread between platforms here is wide.",
      "Whether you need a SIPP or LISA now or later — moving platforms later is possible but tedious.",
      "Whether you want to choose investments yourself. Managed portfolios cost more and remove the decision.",
    ],
    columns: ["platformFee", "ukDealing", "fx", "isa", "sipp", "lisa"],
    order: [
      "freetrade",
      "trading-212",
      "moneybox",
      "nutmeg",
      "plum",
      "etoro",
      "vanguard-uk",
      "wealthify",
    ],
    picks: {
      freetrade:
        "A free ISA and SIPP in one simple app. The default pick if you’re mostly buying UK shares.",
      "trading-212":
        "The same free ISA with materially cheaper currency conversion — the better pick if you’ll buy US shares.",
      moneybox:
        "Worth the ongoing charge if you want a LISA and a pension sitting alongside the ISA in one app.",
      nutmeg:
        "Pick if you’d rather not choose investments at all — the portfolio is built and run for you.",
      plum: "Pick if automated saving matters to you as much as investing does.",
      etoro:
        "Commission-free global shares and fractional investing in a social app. No SIPP.",
      "vanguard-uk":
        "Only worth it if Vanguard’s own index funds are all you ever want to hold.",
      wealthify:
        "Managed portfolios like Nutmeg’s, at a lower ongoing charge, with a SIPP available.",
    },
  },

  {
    slug: "isa",
    badge: "best_for_isa",
    h1: "Best Stocks & Shares ISA platforms",
    title: "Best Stocks & Shares ISA platforms in the UK",
    description:
      "Compare UK Stocks & Shares ISA providers on platform fees, dealing costs and currency charges — with who each one actually suits.",
    intro: [
      "Every platform here offers a Stocks & Shares ISA, so the wrapper isn’t the differentiator — the charges inside it are. On a £20,000 allowance the gap between a free platform and a 0.45% one is meaningful before you’ve picked a single holding.",
      "The other split is structural: percentage fees are cheaper on small pots and punishing on large ones, flat monthly fees are the reverse. Where the lines cross depends on your balance, which is why the cost model further down lets you set the pot size.",
    ],
    whatToLookFor: [
      "Percentage fee versus flat monthly fee — the crossover point moves with your balance.",
      "Dealing commission, if you trade rather than hold.",
      "The FX charge on non-GBP holdings, applied on every conversion.",
      "Whether the platform offers funds and investment trusts, or shares and ETFs only.",
    ],
    columns: ["platformFee", "ukDealing", "fx", "funds", "investmentTrusts"],
    order: [
      "trading-212",
      "freetrade",
      "investengine",
      "lightyear",
      "aj-bell",
      "interactive-investor",
      "xtb",
    ],
    picks: {
      "trading-212":
        "No platform fee, no dealing commission and low currency conversion — the strongest all-round ISA for most people.",
      freetrade:
        "Equally free to hold, with a SIPP alongside it. Costlier on currency conversion if you buy US shares.",
      investengine:
        "ETF-only, with no platform fee on a DIY portfolio. Pick if a passive portfolio is the whole plan.",
      lightyear:
        "Low-cost global shares with interest paid on cash you haven’t invested yet. No SIPP.",
      "aj-bell":
        "A percentage charge, but funds, investment trusts and a LISA on one established platform.",
      "interactive-investor":
        "A flat monthly fee rather than a percentage — the arithmetic turns in its favour once the pot is large.",
      xtb: "No platform fee and commission-free dealing, with a narrower range of accounts.",
    },
  },

  {
    slug: "funds",
    badge: "best_for_funds",
    h1: "Best platforms for funds and investment trusts",
    title: "Best UK platforms for funds and investment trusts",
    description:
      "Where to hold OEICs, unit trusts and investment trusts in the UK — platform charges, fund dealing costs and range, compared.",
    intro: [
      "Fund investors are charged differently from share investors. Dealing commission barely matters — most platforms deal funds free — and the platform’s percentage charge, levied on everything you hold, becomes the number that compounds against you.",
      "That makes this the category where the flat-fee model earns its keep. Below roughly £30,000 a percentage charge is usually cheaper; above it, a fixed monthly fee wins, and keeps winning as the pot grows.",
    ],
    whatToLookFor: [
      "The platform’s percentage charge, and whether it’s capped.",
      "Whether fund dealing is free — most here deal funds at no cost, but share dealing still carries commission.",
      "Fund range, if you have specific funds in mind.",
      "Flat fee versus percentage, judged against the pot you expect to hold, not the one you have today.",
    ],
    columns: ["platformFee", "ukDealing", "funds", "investmentTrusts", "sipp"],
    order: [
      "aj-bell",
      "hargreaves-lansdown",
      "interactive-investor",
      "fidelity-uk",
      "vanguard-uk",
    ],
    picks: {
      "aj-bell":
        "The full-service fund platform at a lower percentage charge than its closest rival. The default pick here.",
      "hargreaves-lansdown":
        "The widest fund range in the UK, and the charge reflects it. Worth it if range is the deciding factor.",
      "interactive-investor":
        "A flat monthly fee instead of a percentage — cheapest of these once the pot is big enough.",
      "fidelity-uk":
        "A large fund range with free fund dealing, at a percentage charge.",
      "vanguard-uk":
        "Vanguard’s own funds only. The cheapest way to hold them, and no use for anything else.",
    },
  },

  {
    slug: "lowest-cost",
    badge: "lowest_cost",
    h1: "Cheapest UK trading platforms",
    title: "Cheapest UK trading platforms and ISAs",
    description:
      "The lowest-cost UK investing platforms on platform fees, dealing commission and FX — and where the headline rate hides a real cost.",
    intro: [
      "\"Cheapest\" depends on what you hold and how often you move it. A platform with no fees at all can still be the expensive option if it charges a percentage every time you convert currency to buy an American share.",
      "The ordering below is by total cost for a typical portfolio, not by headline rate — the modelled figures further down show why those two answers differ. Each platform’s cheapness also comes with a constraint, and those are named.",
    ],
    whatToLookFor: [
      "The FX fee, which is the cost most often overlooked and the one that recurs.",
      "What the platform gives up to be cheap — a narrower account range, ETFs only, or no funds.",
      "Whether \"no commission\" is funded by a wider spread or by interest retained on your cash.",
      "Whether the free tier is the tier you’d actually use.",
    ],
    columns: ["platformFee", "ukDealing", "usDealing", "fx", "fractional"],
    order: ["trading-212", "investengine", "lightyear", "xtb"],
    picks: {
      "trading-212":
        "No platform fee and no dealing commission, with currency conversion low enough not to matter for most people.",
      investengine:
        "No platform fee and no conversion charge — the cheapest here on paper, provided ETFs are all you want.",
      lightyear:
        "Very low currency conversion, plus interest paid on cash sitting uninvested.",
      xtb: "No platform fee and commission-free dealing, with conversion costs between the others here.",
    },
  },

  {
    slug: "sipp",
    badge: "best_for_sipp",
    h1: "Best SIPP providers",
    title: "Best SIPP providers in the UK",
    description:
      "Self-invested personal pensions compared on platform charges, dealing costs and what you can actually hold inside them.",
    intro: [
      "A SIPP is a long holding — often decades — which changes what matters. Dealing commission you pay a handful of times is noise; a percentage charge levied annually on a growing balance is not.",
      "A managed personal pension is not a SIPP. Everything below lets you choose the investments yourself, which is the distinction that matters if you want anything beyond a default fund.",
    ],
    whatToLookFor: [
      "How the charge behaves as the pot grows — this is the account where flat fees most often win.",
      "Whether you can hold funds and investment trusts, or only shares and ETFs.",
      "Any separate pension administration or drawdown charge, which sits outside the platform fee.",
      "That it’s genuinely self-invested, not a managed pension with a fund picker.",
    ],
    columns: ["platformFee", "ukDealing", "funds", "investmentTrusts", "fx"],
    order: ["aj-bell", "freetrade", "interactive-investor"],
    picks: {
      "aj-bell":
        "The most complete of the three — funds, investment trusts and shares in one SIPP.",
      freetrade:
        "A genuinely free SIPP if you’re holding shares and ETFs rather than funds.",
      "interactive-investor":
        "A flat monthly fee, which is the cheapest of these once the pension is large.",
    },
  },
];

/** Slug -> category, for the router and the Functions. */
export function categoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === String(slug ?? "")) ?? null;
}

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

/** Path for a category page. One definition so the router, the sitemap, the
 *  footer and the canonical tag can't disagree. */
export function categoryPath(slug) {
  return `/brokers/best-for/${slug}`;
}

/** Brokers for a category, in editorial order, filtered to those actually
 *  carrying the badge.
 *
 *  `order` is the editorial ranking and the badge is the eligibility test, and
 *  the two can disagree — a broker can be dropped from the badge in ddbx-data
 *  while its slug is still listed here, or gain the badge before anyone has
 *  written its pick line. So: badge decides membership, `order` decides
 *  sequence, and anything badged but unordered lands at the end rather than
 *  vanishing. A broker with no pick line still renders; it just leads with its
 *  own tagline. */
export function brokersForCategory(category, brokers) {
  if (!category) return [];
  const eligible = (brokers ?? []).filter((b) =>
    (b.badges ?? []).includes(category.badge),
  );
  const rank = new Map(category.order.map((slug, i) => [slug, i]));

  return eligible.sort(
    (a, b) =>
      (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name),
  );
}

/** Whether a category has enough brokers to publish. Checked at render AND in
 *  the sitemap, so an unpublishable category is never advertised. */
export function categoryMeetsBar(category, brokers) {
  return brokersForCategory(category, brokers).length >= MIN_BROKERS;
}
