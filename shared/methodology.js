// The six checks, as data, in the one place both module graphs can read.
//
// This array used to live in src/lib/methodology.ts, whose header records that
// it was already the consolidation of FOUR independent copies that had drifted
// into disagreeing about what the same test asked. Moving it here rather than
// copying it again is the same fix applied one level out: the pre-render
// Functions under functions/ cannot import from the Vite graph, so a filing
// page's crawler view was about to become a fifth copy — and did, briefly, as
// `CHECKLIST_LABELS` in shared/filings.js.
//
// Plain ESM at the repo root, types alongside in methodology.d.ts, exactly as
// shared/seo.js does. src/lib/methodology.ts re-exports from here, so every
// existing consumer of `@/lib/methodology` is untouched.
//
// The truth boundary from that file still applies and is worth repeating: the
// keys mirror `RatingChecklist` in ddbx-data/worker/db/types.ts and the order
// mirrors `CHECKLIST_KEYS` in worker/pipeline/analyze.ts. If a check changes
// meaning in ddbx-data it changes here in the same cycle, or the site is
// describing a product that no longer exists.

/** The six checks, in the order they're scored. */
export const CHECKS = [
  {
    key: "open_market_buy",
    label: "Open-market buy",
    question: "Was it an open-market buy?",
    body: "They paid for the shares themselves on the open market. Not an option grant, a vesting, or an internal transfer.",
    detail:
      "This is the check that does the most work, because it throws away the most. A vesting, a scheme release, a placing and an option exercise all appear on the wire as an insider acquiring shares, and none of them means the insider chose to buy at today’s price. Only a purchase made with their own money, at the price anyone else could have paid, tells you anything about what they think the shares are worth.",
    passLine: (c) =>
      c.price
        ? `${c.name} paid ${c.price} a share on the open market, ${c.value} of their own money.`
        : `${c.name} put ${c.value} of their own money in on the open market.`,
  },
  {
    key: "senior_insider",
    label: "Senior insider",
    question: "Was it a senior insider?",
    body: "The buyer is a CEO, CFO, or a board member close to the business, not a junior name on the register.",
    detail:
      "Disclosure rules catch a wide net: company secretaries, divisional managers, and in some markets the people closely associated with them. They file the same form as the chief executive. The check asks whether this particular buyer is close enough to the business to be acting on something more than the share price, which usually means the board and the finance function.",
    passLine: (c) =>
      c.role
        ? `${c.name} is ${c.role} at ${c.company}, close enough to see the whole picture.`
        : `${c.name} is a senior insider at ${c.company}.`,
  },
  {
    key: "meaningful_conviction",
    label: "Meaningful conviction",
    question: "Did they show real conviction?",
    body: "The amount is large relative to what they earn, so it reads as a real commitment rather than a token.",
    detail:
      "Size on its own says very little: a hundred thousand pounds is a rounding error to one chief executive and a year’s pay to another. The check weighs the purchase against what the buyer plausibly earns and already holds, so a large buy at a small company can clear it while a larger one at a mega-cap does not.",
    passLine: (c) => `${c.value} of personal capital. That is not a token.`,
  },
  {
    key: "no_alternative_explanation",
    label: "No scheme or plan",
    question: "Was the timing their own call?",
    body: "Nothing mechanical explains the timing: no dividend reinvestment, no pre-arranged trading plan, no contractual or tax deadline.",
    detail:
      "A trade that was going to happen anyway carries no information. Pre-arranged plans (a 10b5-1 in the US, a savings scheme in the UK) set the date months in advance, and a shareholding requirement written into a contract forces the buy regardless of what the insider thinks. The check looks for anything that would have produced this purchase on this day without a decision behind it.",
    passLine: () =>
      "Nothing mechanical explains the timing: no plan, no scheme, no deadline forcing it.",
  },
  {
    key: "supporting_context_found",
    label: "Supporting context",
    question: "Does the context hold up?",
    body: "Either there is news that makes the timing make sense, or nothing public argues against it. A buy in a quiet period can be the strongest kind.",
    detail:
      "This is not a demand for a catalyst. It asks whether the public record is consistent with the purchase: recent results, guidance, sector news, the share price’s own history. A buy the week after a well-received set of results reads differently from one made into a profit warning, and a buy with no news at all around it is often the most interesting of the three.",
    passLine: (c) =>
      `The timing holds up against everything public about ${c.company}.`,
  },
  {
    key: "no_major_counter_signal",
    label: "No major counter-signal",
    question: "Is the picture otherwise clean?",
    body: "Nothing serious points the other way: no other insiders selling at the same time, no open investigation, no sign the business is still getting worse.",
    detail:
      "One insider buying while three sell is not a signal, it is a disagreement. The check sweeps for the things that would undercut the buy whatever its own merits: concurrent disposals by colleagues, a regulatory investigation, an accounting problem, a business still deteriorating on its own numbers.",
    passLine: () =>
      "No insiders selling against it, no open investigation, nothing pointing the other way.",
  },
];

export const CHECK_COUNT = CHECKS.length;

/** The same number, spelled, for running prose. */
export const CHECK_COUNT_WORD = "six";
