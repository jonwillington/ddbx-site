/** Curated sample deals for the hero "deal radar" — the notification copy the
 *  showcase panel's queue + stack cycle through. Hand-picked rather than
 *  fetched: these are the hero's sales pitch, so every one has to land. */

export type HeroDeal = {
  /** Stable id (used as the React key). */
  id: string;
  /** Exchange-qualified ticker for the company logo (logo.dev). */
  ticker: string;
  /** App Store icon for the market this notification belongs to. */
  icon: string;
  /** App title shown in the banner header, e.g. "ddbx.uk". */
  app: string;
  /** Short attention tag before the lead, e.g. "BREAKING" / "JUST IN". Varied
   *  across deals so the stack doesn't read as repetitive. */
  tag: string;
  /** Ticker + company lead, e.g. "ECEL · Eurocell". */
  lead: string;
  /** The disclosure copy after the em dash. */
  body: string;
};

const UK_DEALS: HeroDeal[] = [
  {
    id: "ecel",
    ticker: "ECEL.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "BREAKING",
    lead: "ECEL · Eurocell",
    body: "New CEO William Truman bought another £21k near 52-week lows, ~£68k total in under a month.",
  },
  {
    id: "av",
    ticker: "AV.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "JUST IN",
    lead: "AV. · Aviva",
    body: "CEO bought £120k in the open market, the largest board purchase this year.",
  },
  {
    id: "otb",
    ticker: "OTB.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "SIGNAL",
    lead: "OTB · On The Beach",
    body: "Chairman added £45k, his first open-market purchase in over two years.",
  },
  {
    id: "alt",
    ticker: "ALT.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "NEW FILING",
    lead: "ALT · Altitude Group",
    body: "CFO topped up £12k, a third cluster buy this quarter near the lows.",
  },
];

const US_DEALS: HeroDeal[] = [
  {
    id: "pltr",
    ticker: "PLTR",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "BREAKING",
    lead: "PLTR · Palantir",
    body: "Director bought $180k in the open market, the first insider purchase since the IPO lock-up.",
  },
  {
    id: "gs",
    ticker: "GS",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "GS · Goldman Sachs",
    body: "Board member bought $300k of stock, the first open-market insider buy since 2022.",
  },
  {
    id: "sofi",
    ticker: "SOFI",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "SOFI · SoFi Technologies",
    body: "CEO added $250k of stock near 52-week lows, ~$610k across the month.",
  },
  {
    id: "rblx",
    ticker: "RBLX",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "RBLX · Roblox",
    body: "CFO purchased $90k, a second open-market buy in three weeks.",
  },
];

// Congress (`usg`) ships inside the US app, so it reuses the US app icon/label.
// Dollar bands (not exact fills) match how Periodic Transaction Reports
// disclose.
const USG_DEALS: HeroDeal[] = [
  {
    id: "nvda",
    ticker: "NVDA",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "NVDA · NVIDIA",
    body: "Senator from Texas disclosed a $250k–$500k buy, filed 38 days after the trade.",
  },
  {
    id: "lmt",
    ticker: "LMT",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "LMT · Lockheed Martin",
    body: "Virginia Representative on Armed Services bought $15k–$50k, a committee-jurisdiction overlap.",
  },
  {
    id: "jpm",
    ticker: "JPM",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "JPM · JPMorgan",
    body: "New York Representative on Financial Services disclosed a $50k–$100k purchase.",
  },
  {
    id: "msft",
    ticker: "MSFT",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "BREAKING",
    lead: "MSFT · Microsoft",
    body: "Florida Senator's spouse bought $100k–$250k, the family's largest tech position this year.",
  },
];

export function dealsForMarket(marketId?: string): HeroDeal[] {
  if (marketId === "us") return US_DEALS;
  if (marketId === "usg") return USG_DEALS;

  return UK_DEALS;
}
