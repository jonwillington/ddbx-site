// Editorial definitions for the /brokers/compare/* head-to-head pages.
//
// Same rationale as shared/broker-categories.js for living here as plain ESM:
// both the Vite app and the Pages Functions import it, and neither can reach
// the other's module graph.
//
// ---------------------------------------------------------------------------
// Why this list is short, and hand-written
// ---------------------------------------------------------------------------
//
// 19 UK brokers is 171 possible pairs. Generating all of them is the textbook
// doorway-page pattern: near-identical templates differing only in which two
// records they load, which doesn't just fail to rank — it puts the whole
// /brokers directory at risk of being discounted along with it.
//
// So a pair earns a page by passing three tests:
//
//   1. Both platforms genuinely compete for the same job. Every pair below was
//      picked from overlapping editorial badges, not from intuition about
//      search volume.
//   2. There is a real answer. If the honest verdict is "they're equivalent,
//      pick either", the page has nothing to say and shouldn't exist.
//   3. Someone has written the verdict. `verdict` is the whole value of the
//      page — the fee tables are assembled from data, but the paragraph
//      saying which one YOU should pick is the part a template can't produce.
//
// Numbers stay out of the prose here for the same reason as in
// broker-categories.js: comparative claims have to be substantiable under
// FCA/ASA rules, and authored figures drift out of step with the table beside
// them. Where a genuinely useful number exists — the balance at which a flat
// monthly fee overtakes a percentage charge — the page computes it from the
// live records rather than quoting it here.

/** Pair slug from two broker slugs. One definition, so the router, the
 *  sitemap, the footer and the canonical tag can't disagree about whether it's
 *  "a-vs-b" or "b-vs-a". */
export function pairSlug(a, b) {
  return `${a}-vs-${b}`;
}

export function comparisonPath(slug) {
  return `/brokers/compare/${slug}`;
}

export const COMPARISONS = [
  {
    a: "freetrade",
    b: "trading-212",
    title: "Freetrade vs Trading 212",
    description:
      "Two free Stocks & Shares ISAs compared — currency conversion costs, account range and who each one actually suits.",
    // Why we published this pair at all. Kept next to the content so the
    // justification is reviewable rather than remembered.
    whyThisPair:
      "The two platforms we rate most highly overall, both offering a genuinely free ISA. Most people starting out are choosing between exactly these.",
    intro:
      "Both are free to hold an ISA with, both charge no dealing commission, and both are FSCS protected. The differences are narrower than the marketing suggests, but they are not trivial — and which one wins depends almost entirely on whether you plan to buy American shares.",
    verdict:
      "If you’ll buy US shares, Trading 212. Currency conversion is the single largest recurring cost difference between the two, it applies every time you convert, and the gap is wide. If you want a Junior ISA, or to hold funds rather than just shares and ETFs, Freetrade — Trading 212 offers neither. For a UK-shares-only ISA the two are close enough on cost that whichever app you find easier to live with is a defensible tiebreak.",
  },

  {
    a: "aj-bell",
    b: "interactive-investor",
    title: "AJ Bell vs interactive investor",
    description:
      "Percentage platform fee against a flat monthly one — including the balance at which interactive investor becomes cheaper.",
    whyThisPair:
      "The clearest flat-fee versus percentage-fee decision in the UK market, and both carry our ISA, SIPP and funds badges — so they compete for the same investor at the same moment.",
    intro:
      "These two are the same kind of platform — established, full-service, funds and shares in ISAs and SIPPs — charging in structurally different ways. AJ Bell takes a percentage of what you hold; interactive investor takes a fixed sum each month regardless.",
    verdict:
      "The whole decision is your balance, and the crossover figure above is the answer for your pot rather than in the abstract. Below it AJ Bell is cheaper; above it interactive investor is, and the gap widens the more you accumulate — which makes ii the better home for a pension you’ll pay into for decades. Two things override the arithmetic: AJ Bell offers a LISA and ii doesn’t, and if you deal often, ii’s lower per-trade commission narrows the gap further in its favour.",
  },

  {
    a: "trading-212",
    b: "investengine",
    title: "Trading 212 vs InvestEngine",
    description:
      "Two of the cheapest UK platforms, built for different jobs — individual shares against an ETF-only portfolio.",
    whyThisPair:
      "Both carry our lowest-cost badge and both are genuinely near-free, so they surface together constantly — but they are not substitutes, and the cost comparison hides that.",
    intro:
      "On headline charges these look like the same product. They aren’t. One lets you buy any share you like; the other only holds ETFs. Comparing them on fees alone gets you the wrong answer.",
    verdict:
      "InvestEngine is ETFs only — no individual company shares at all. That makes it the cheaper answer when a passive portfolio is the entire plan, and a non-answer the moment you want to buy a single company. Trading 212 costs marginally more to convert currency and lets you buy anything, including fractional shares. Pick on what you intend to hold, then check the cost; doing it the other way round is how people end up on the wrong platform.",
  },

  {
    a: "lightyear",
    b: "trading-212",
    title: "Lightyear vs Trading 212",
    description:
      "Two low-cost ISAs compared on currency conversion, interest on uninvested cash, and whether you get a SIPP.",
    whyThisPair:
      "Both hold our lowest-cost badge and both offer an ISA, so they compete directly on price — where the deciding factor turns out not to be price.",
    intro:
      "Cost separates these two barely at all. What separates them is what you can open, and what happens to money you haven’t invested yet.",
    verdict:
      "Trading 212 has a SIPP and Lightyear doesn’t, which settles it if you want a pension and an ISA in the same place. Lightyear pays interest on uninvested cash, which is worth having if you keep meaningful balances between purchases rather than staying fully invested. On the charges themselves, the difference is small enough that it shouldn’t drive the decision.",
  },

  {
    a: "hargreaves-lansdown",
    b: "aj-bell",
    title: "Hargreaves Lansdown vs AJ Bell",
    description:
      "The two established UK fund platforms compared on platform charges, dealing commission and fund range.",
    whyThisPair:
      "The two incumbent full-service platforms, both carrying our funds badge, with near-identical account ranges and materially different charges.",
    intro:
      "These are the two platforms most long-term UK fund investors end up choosing between. They offer much the same accounts — ISA, SIPP, LISA, Junior ISA — and much the same investment range. The charges are where they part company.",
    verdict:
      "AJ Bell is cheaper on both the platform charge and per-trade dealing, with the same account range, which makes it the default. Hargreaves Lansdown’s case rests on fund range and service depth rather than price. So the practical test is narrow: if you have specific funds in mind, check they’re available on AJ Bell — if they are, the cost difference is difficult to argue against over a holding period measured in decades.",
  },

  {
    a: "moneybox",
    b: "nutmeg",
    title: "Moneybox vs Nutmeg",
    description:
      "The two Lifetime ISA specialists compared — choosing your own investments against having them managed for you.",
    whyThisPair:
      "The two platforms carrying our LISA badge. Anyone opening a Lifetime ISA is choosing between them, and the choice is about control rather than cost.",
    intro:
      "Both are app-first, both are aimed at people early in their investing, and both offer a Lifetime ISA. The difference is who picks the investments.",
    verdict:
      "Moneybox lets you choose; Nutmeg chooses for you. That single distinction is the decision, and the difference in ongoing charge follows from it rather than being a separate consideration — managed portfolios cost more because someone is managing them. Moneybox also offers a SIPP, which Nutmeg doesn’t, so it’s the one that can hold the whole picture. If you actively don’t want to make investment decisions, the higher charge is what that’s worth to you.",
  },
].map((c) => ({ ...c, slug: pairSlug(c.a, c.b) }));

export function comparisonBySlug(slug) {
  return COMPARISONS.find((c) => c.slug === String(slug ?? "")) ?? null;
}

export const COMPARISON_SLUGS = COMPARISONS.map((c) => c.slug);

/** Both broker records for a pair, or null if either is missing from the API.
 *  A half-populated comparison page is worse than none — it would render a
 *  verdict about a platform whose figures aren't on the page. */
export function brokersForComparison(comparison, brokers) {
  if (!comparison) return null;
  const a = (brokers ?? []).find((x) => x.slug === comparison.a);
  const b = (brokers ?? []).find((x) => x.slug === comparison.b);

  return a && b ? { a, b } : null;
}

/** The balance at which a flat monthly platform fee becomes cheaper than a
 *  percentage one.
 *
 *  This is the number the flat-vs-percentage comparison actually turns on, and
 *  every published version of this advice states it as a rule of thumb rather
 *  than working it out. We hold both fee schedules, so we can solve it:
 *
 *      flat * 12 = (pct / 100) * pot   =>   pot = flat * 1200 / pct
 *
 *  Returns null unless exactly one side charges a flat monthly fee and the
 *  other a percentage — for any other shape the crossover isn't meaningful and
 *  the page shouldn't invent one. Deliberately ignores dealing commission and
 *  FX: those depend on behaviour rather than balance, and folding assumptions
 *  about them into a headline number would overstate its precision. */
export function feeCrossover(a, b) {
  const shape = (broker) => ({
    flat: broker?.fees?.platform_fee_monthly_gbp ?? 0,
    pct: broker?.fees?.platform_fee_pct ?? 0,
  });
  const sa = shape(a);
  const sb = shape(b);

  const flatSide = sa.flat > 0 && !sa.pct ? a : sb.flat > 0 && !sb.pct ? b : null;
  const pctSide = sa.pct > 0 && !sa.flat ? a : sb.pct > 0 && !sb.flat ? b : null;

  if (!flatSide || !pctSide || flatSide === pctSide) return null;

  const flat = flatSide.fees.platform_fee_monthly_gbp;
  const pct = pctSide.fees.platform_fee_pct;

  if (!flat || !pct) return null;

  return {
    /** Balance in £ at which the two platform charges are equal. */
    pot: Math.round((flat * 1200) / pct),
    /** Cheaper below the crossover. */
    cheaperBelow: pctSide,
    /** Cheaper above it. */
    cheaperAbove: flatSide,
  };
}
