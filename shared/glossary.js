// The /learn glossary.
//
// Plain ESM at the root, like the rest of the shared content modules, so
// src/pages/learn.tsx and functions/learn/[slug].js render identical words.
//
// ---------------------------------------------------------------------------
// The canonicalisation decision
// ---------------------------------------------------------------------------
//
// One SPA serves ddbx.uk, ddbx.us and ddbx.eu. Publish a glossary naively and
// every entry exists three times at three URLs with identical text, which
// splits our own signal and is the single most likely unforced error in this
// whole page family.
//
// So every entry declares exactly ONE owning market, and is published on that
// host alone. Requests for a UK-owned entry on ddbx.us are noindexed and
// canonicalised to the owning host, so there is never a duplicate to
// de-duplicate and no hreflang to maintain.
//
// Ownership follows the law, not convenience:
//   - PDMR, MAR Article 19, RNS announcements and closed periods are UK/EU
//     regulatory concepts -> ddbx.uk
//   - Form 4, the STOCK Act and Rule 10b5-1 are US ones -> ddbx.us
//   - Concepts that aren't jurisdictional at all (cluster buying, open-market
//     versus vesting, what a purchase actually signals) would otherwise be the
//     duplicates. They get a single owner — UK, which has the longer history
//     of analysed filings behind the examples — and the other market links to
//     them rather than restating them.
//
// ---------------------------------------------------------------------------
// Why each entry ends in live data
// ---------------------------------------------------------------------------
//
// A definition of "PDMR" competes with the FCA handbook, Wikipedia and every
// broker's education hub, and loses. What we have that they don't is the
// filings: `liveData` names a feed the page appends real, current examples
// from, so the entry ends with the concept actually happening rather than
// stopping at the definition. Entries where no honest example exists set it to
// null instead of forcing one.

/** Which host publishes an entry. See the header — exactly one per entry. */
export const OWNER_HOST = { uk: "ddbx.uk", us: "ddbx.us" };

export const ENTRIES = [
  {
    slug: "pdmr",
    owner: "uk",
    term: "PDMR",
    title: "What is a PDMR?",
    description:
      "Person Discharging Managerial Responsibilities — who counts as one, what they have to disclose when they trade their own company's shares, and why it matters.",
    // 'clusters' | 'open-market' | 'recent' | null
    liveData: "recent",
    liveHeading: "Recent PDMR purchases",
    body: [
      "A Person Discharging Managerial Responsibilities — PDMR — is the UK and EU regulatory term for someone senior enough at a listed company that their share dealings have to be made public. It covers the board, and it also covers senior executives who aren't directors but who have regular access to inside information and the authority to take decisions affecting the company's future.",
      "The category exists because the job title isn't the point. A divisional chief executive who sees the numbers before the market does is in the same position as a main-board director, whatever the org chart says, so the rules follow the access rather than the label. People closely associated with a PDMR — spouses, dependent children, and companies or trusts they control — are caught too, for the obvious reason.",
      "When a PDMR buys or sells shares in their own company, the transaction has to be notified promptly and then announced publicly. That announcement is what this site is built on: it is the moment a private decision becomes a public fact.",
      "The disclosure tells you what happened, not why. A PDMR buying is a person with better information than you choosing to increase their exposure with their own money — which is interesting — but the same filing format covers purchases made for entirely mechanical reasons, which is why distinguishing an open-market buy from everything else matters more than the headline.",
    ],
    related: ["mar-article-19", "open-market-buy", "closed-period"],
  },
  {
    slug: "mar-article-19",
    owner: "uk",
    term: "MAR Article 19",
    title: "MAR Article 19: managers' transactions explained",
    description:
      "The rule that makes UK and EU directors disclose their own share dealings — what it requires, the notification deadline, and the threshold below which nothing is announced.",
    liveData: "recent",
    liveHeading: "Recent disclosures under these rules",
    body: [
      "Article 19 of the Market Abuse Regulation is the provision that turns a director's share purchase into a public announcement. It requires a PDMR, and anyone closely associated with them, to notify both the company and the regulator of transactions in the company's shares or debt instruments, and requires the company to make that notification public.",
      "The deadline is short by design — a matter of business days, not weeks — because a disclosure regime that lagged the market would tell you only what used to be true. Speed is the point: the announcement is meant to reach the market while it still describes the current position.",
      "There is a de minimis threshold. Below a modest annual total, transactions don't have to be notified at all, which is why you rarely see very small purchases in the record. National regulators have discretion to raise that threshold, so the exact figure depends on the jurisdiction.",
      "Article 19 also contains the closed-period rule, which bars PDMRs from dealing in the run-up to results. That restriction is the reason insider buying arrives in bursts rather than evenly through the year.",
    ],
    related: ["pdmr", "closed-period", "rns-announcements"],
  },
  {
    slug: "closed-period",
    owner: "uk",
    term: "Closed period",
    title: "Closed periods: when directors can't buy",
    description:
      "The window before results when UK and EU directors are barred from dealing, and why insider buying clusters immediately after an announcement.",
    liveData: null,
    body: [
      "A closed period is a stretch of time before a company publishes its results during which PDMRs are prohibited from dealing in its shares. The logic is straightforward: in the weeks before results, the people running the company know how the period went and the market doesn't.",
      "The prohibition runs for a defined period immediately before the announcement of interim and year-end results. Companies frequently impose their own additional restrictions on top of the regulatory minimum, and many operate a policy of requiring clearance before any dealing at any time.",
      "The practical consequence is visible in the data. Director buying is not spread evenly across the calendar — it bunches in the days and weeks after results are published, because that's when the window opens. A cluster of purchases immediately following an announcement is partly a signal about conviction and partly just the first opportunity anyone had.",
      "That matters when you're reading timing. A purchase made the day after results is not necessarily more urgent than one made a month later; it may simply be the earliest legal moment. Purchases made deep into an open window, when the buyer could have acted weeks earlier and chose now, arguably say more.",
    ],
    related: ["mar-article-19", "pdmr", "cluster-buying"],
    cta: {
      headline: "Know the moment the window reopens.",
      body: "Closed periods end and the buying starts the same week. The app pushes every disclosure the day it files, so you see the cluster forming rather than reading about it a month later.",
    },
    ctaSlot: "cluster",
  },
  {
    slug: "rns-announcements",
    owner: "uk",
    term: "RNS",
    title: "RNS announcements and how director dealings reach the market",
    description:
      "How a UK director's share purchase becomes public — the Regulatory News Service, what a Director/PDMR Shareholding announcement contains, and how it differs from a TR-1.",
    liveData: "recent",
    liveHeading: "Recent announcements",
    body: [
      "UK listed companies publish regulatory information through a Regulatory News Service, a channel that distributes announcements to the market simultaneously. It is the mechanism that makes disclosure genuinely public rather than selectively shared, and it is where director dealings appear.",
      "A director's purchase is typically announced under a heading such as \"Director/PDMR Shareholding\". The announcement names the person and their role, the number of shares, the price paid, the date of the transaction, and the resulting holding. That structure is why the data can be parsed reliably at all.",
      "A TR-1 is a different document that people often conflate with this one. TR-1 notifications concern major shareholdings — the disclosures triggered when any investor's stake crosses defined percentage thresholds. A TR-1 can be filed by an institution with no management role whatsoever, and a director's routine purchase usually doesn't trigger one.",
      "So the two answer different questions. A Director/PDMR announcement tells you an insider changed their personal position; a TR-1 tells you someone's stake crossed a size threshold. Only the first is evidence about what management thinks.",
    ],
    related: ["pdmr", "mar-article-19"],
  },
  {
    slug: "open-market-buy",
    owner: "uk",
    term: "Open-market buy",
    title: "Open-market buys versus vesting, options and placings",
    description:
      "Why most large insider disclosures aren't purchases at all, and how to tell a genuine open-market buy from a share award.",
    liveData: "open-market",
    liveHeading: "Recent confirmed open-market buys",
    body: [
      "This is the distinction that matters most, and the one the raw filings hide. A great many disclosures that look like an insider acquiring shares are not purchases in any meaningful sense: they are share awards vesting, options being exercised at a pre-set strike, shares issued in a placing, or scrip taken instead of a cash dividend.",
      "None of those involve the insider deciding, at today's price, to put their own money at risk. A vesting award arrives whether the recipient wants it or not. An option exercised at a strike fixed years ago says something about the strike, not about today. Yet all of them are disclosed through the same channel, in the same format, and they are disproportionately the largest numbers.",
      "The tell is the price. An open-market purchase is transacted at or around the market price on the day; an award or an exercise is transacted at a price that reflects the terms of a scheme rather than the market. Comparing the filed price against that day's closing price separates them mechanically, without having to trust how the announcement is worded.",
      "That test is how every buy on this site is classified, and rows that can't be priced are left out of rankings rather than assumed genuine. A leaderboard that skipped this step would be topped by share allotments under a heading about buying.",
    ],
    related: ["pdmr", "cluster-buying", "what-a-director-buy-signals"],
  },
  {
    slug: "cluster-buying",
    owner: "uk",
    term: "Cluster buying",
    title: "Cluster buying: when several insiders buy at once",
    description:
      "Why multiple insiders buying the same company within a short window is treated as a stronger signal than any single purchase.",
    liveData: "clusters",
    liveHeading: "Recent clusters",
    body: [
      "A cluster is several insiders at the same company buying within a short window of each other. It is treated as more informative than a single purchase, and the reasoning is about eliminating alternative explanations rather than about the money involved.",
      "One director buying can mean many things. They may have had a bonus to deploy, or a personal view unrelated to the business, or a habit of buying every year regardless. Those explanations are individual. When four people who all sit in the same meetings independently reach the same conclusion in the same fortnight, the individual explanations stop working and a shared one — that they collectively think the shares are cheap — becomes the simpler reading.",
      "Size is not the same as breadth, and breadth is the part that's hard to fake. A single very large purchase by a founder who already owns a third of the company tells you less than four modest purchases by four unrelated executives, because the founder was always going to be exposed either way.",
      "Clusters are also partly an artefact of the calendar: closed periods mean everyone's dealing window opens at the same moment, so some clustering is coincidence of timing rather than a meeting of minds. That's why the window matters, and why a cluster spread across an open period reads differently from one bunched in the first two days after results.",
    ],
    related: ["closed-period", "open-market-buy", "what-a-director-buy-signals"],
  },
  {
    slug: "what-a-director-buy-signals",
    owner: "uk",
    term: "Reading a director buy",
    title: "What a director buying their own shares actually tells you",
    description:
      "An honest account of what insider purchases do and don't predict, and which features of a filing carry information.",
    liveData: "recent",
    liveHeading: "Recent purchases",
    body: [
      "The case for paying attention to insider purchases is narrow and worth stating precisely. Directors sell for many reasons — tax, a house, diversification, divorce — so selling carries little information. They buy for essentially one: they expect the shares to be worth more. That asymmetry, not any claim of prescience, is the whole argument.",
      "What it does not mean is that a purchase predicts the share price. Insiders are frequently early, sometimes by years, and are as capable as anyone of being wrong about their own company. They are also subject to a well-documented bias toward optimism about the thing they run.",
      "The features that carry information are mostly not the headline. Whether it was a genuine open-market purchase rather than an award. Whether several people bought independently. How large it is relative to that person's existing holding and their pay, rather than in absolute pounds. Whether they bought into a falling price or a rising one. And whether the buyer is someone with a track record worth anything.",
      "Treated as one input among several, that's useful. Treated as a recommendation, it isn't — which is why everything here is information rather than advice, and why the performance figures published alongside it include the purchases that didn't work.",
    ],
    related: ["open-market-buy", "cluster-buying", "pdmr"],
  },
  {
    slug: "form-4",
    owner: "us",
    term: "Form 4",
    title: "SEC Form 4: how US insider trades become public",
    description:
      "What a Form 4 filing is, who has to file one, the two-business-day deadline, and how to read the transaction codes.",
    liveData: "recent",
    liveHeading: "Recent Form 4 purchases",
    body: [
      "Form 4 is the filing that makes US insider dealing public. Officers, directors and beneficial owners of more than ten percent of a company's stock must report changes in their ownership to the Securities and Exchange Commission, and those filings are published as they arrive.",
      "The deadline is unusually tight — two business days from the transaction — which makes the US regime one of the most current disclosure systems anywhere. By the time you read a Form 4, the trade is typically days old rather than weeks.",
      "The critical field is the transaction code. Code P is an open-market purchase: the insider bought at the prevailing price with their own money. Code A is an award or grant, code M an option exercise, code S a sale, code F shares withheld to cover tax. Those codes are the difference between a purchase and a payroll event, and reading a Form 4 without them is close to meaningless.",
      "Ten-percent owners complicate the picture. A fund that crosses the ownership threshold files Form 4s like any insider, but its buying reflects a portfolio decision rather than management's view from inside the business — so a very large filing is sometimes an institution rebalancing rather than an executive backing their own company.",
    ],
    related: ["rule-10b5-1", "stock-act"],
  },
  {
    slug: "rule-10b5-1",
    owner: "us",
    term: "Rule 10b5-1",
    title: "Rule 10b5-1 plans and why they change what a trade means",
    description:
      "Pre-arranged trading plans, the affirmative defence they provide, and why a trade made under one carries less information.",
    liveData: null,
    body: [
      "Rule 10b5-1 lets an insider set up a trading plan in advance — specifying amounts, prices and dates — at a time when they don't hold material non-public information. Trades then execute automatically according to the plan, and the insider has an affirmative defence against an allegation that they traded on inside knowledge.",
      "The mechanism exists for a real problem. Executives are paid substantially in stock and are in possession of inside information much of the time; without a way to sell on a pre-committed schedule, they could be locked in almost permanently.",
      "It matters for interpretation because a trade executed under a plan reflects a decision made months earlier, under different conditions, and possibly for reasons as mundane as funding a tax bill. Filings note when a transaction was made pursuant to a plan, and that note substantially reduces what the trade tells you about present conviction.",
      "The rules have been tightened over time — with cooling-off periods between adopting a plan and trading under it, and constraints on running overlapping plans — in response to evidence that some insiders were using plans in ways that looked closer to timing than to abstinence.",
    ],
    related: ["form-4"],
  },
  {
    slug: "stock-act",
    owner: "us",
    term: "STOCK Act",
    title: "The STOCK Act: congressional trading disclosure",
    description:
      "The law requiring members of Congress to disclose their trades, what it covers, and the reporting gaps that make it weaker than corporate insider rules.",
    liveData: null,
    body: [
      "The Stop Trading on Congressional Knowledge Act, passed in 2012, made explicit that members of Congress and senior staff are not exempt from insider trading law, and required them to disclose securities transactions above a modest dollar threshold.",
      "It matters because legislators routinely encounter information that moves markets before the public does — from committee briefings, from oversight of specific industries, from advance knowledge of legislation and appropriations. Whether that access is systematically exploited is disputed; that it exists is not.",
      "The disclosure regime is considerably weaker than the corporate one. Deadlines are measured in weeks rather than the two business days a Form 4 requires, so a trade can be a month old before it surfaces. Amounts are reported in broad bands rather than exact figures, so a filing tells you a purchase fell somewhere within a wide range. Filings often cover a spouse's account. Penalties for late filing have generally been small.",
      "So congressional disclosures are worth watching for a different reason than corporate ones: not because the timing is actionable, but because the pattern — which committees, which sectors, which members trade in the industries they oversee — is visible in aggregate even when any single filing is stale and imprecise.",
    ],
    related: ["form-4"],
  },
];

export const ENTRY_SLUGS = ENTRIES.map((e) => e.slug);

export function entryBySlug(slug) {
  return ENTRIES.find((e) => e.slug === String(slug ?? "")) ?? null;
}

export function learnPath(slug) {
  return slug ? `/learn/${slug}` : "/learn";
}

/** Market id ("uk" | "us") that owns a host, or null for anything else —
 *  including ddbx.eu, which owns no glossary entries today. */
export function ownerForHost(host) {
  const h = String(host ?? "")
    .toLowerCase()
    .replace(/^www\./, "");

  if (h === OWNER_HOST.uk) return "uk";
  if (h === OWNER_HOST.us) return "us";

  return null;
}

/** Entries published on a given host. */
export function entriesForHost(host) {
  const owner = ownerForHost(host);

  return owner ? ENTRIES.filter((e) => e.owner === owner) : [];
}

/** Absolute canonical URL for an entry — always its owning host, so a request
 *  arriving on the wrong domain points at the one true copy. */
export function canonicalUrlForEntry(entry) {
  return entry
    ? `https://${OWNER_HOST[entry.owner]}${learnPath(entry.slug)}`
    : null;
}
