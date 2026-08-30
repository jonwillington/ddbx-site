/** Curated sample deals for the hero "deal radar" — the notification copy and
 *  the price history the showcase panel cycles through. Hand-picked rather
 *  than fetched: these are the hero's sales pitch, so every one has to land,
 *  and a hero that can be empty or mid-fetch is a hero with a loading state.
 *
 *  Each deal carries the shape of the price the director bought INTO, because
 *  that is the part the reader can't get from a filing list. The series are
 *  hand-authored from the real filings and deliberately unitless — the chart
 *  states no figures and no axis, so only the shape is load-bearing (see
 *  hero-price-chart.tsx). Every number a reader actually reads lives in the
 *  notification body, where it's a real disclosed amount.
 */

export type HeroDeal = {
  /** Stable id (used as the React key). */
  id: string;
  /** Exchange-qualified ticker for the company logo (logo.dev). */
  ticker: string;
  /** Bare ticker, as the chart labels it. */
  symbol: string;
  /** App Store icon for the market this notification belongs to. */
  icon: string;
  /** App title shown in the banner header, e.g. "ddbx.uk". */
  app: string;
  /** Short attention tag before the lead, e.g. "BREAKING" / "JUST IN". Varied
   *  across deals so the stack doesn't read as repetitive. */
  tag: string;
  /** Ticker + company lead, e.g. "ECEL · Eurocell". */
  lead: string;
  /** The disclosure copy after the lead. */
  body: string;
  /** Rebased daily closes. Unitless: the chart rescales to its own box and
   *  never prints a value, so these carry shape only. */
  series: number[];
  /** Index into `series` where the director bought. The trade marker lands
   *  here, and (unless `filedIndex` says otherwise) so does the alert. */
  buyIndex: number;
  /** What kind of price action the director bought into — mirrors
   *  `Dealing.buy_style.kind`, and drives the chart's caption with the same
   *  words `BuyStyleChip` uses. Omitted where the classification doesn't
   *  apply (Congress: the trade and the filing are weeks apart, so "bought
   *  into strength" would describe a price the filer never saw us see). */
  buyStyle?: "contrarian" | "momentum";
  /** Congress only: where the trade was actually DISCLOSED. A second marker
   *  lands here and the notification fires here rather than at `buyIndex`,
   *  so the chart shows the thing that matters about a PTR — how much price
   *  went by between the trade and the day anyone could know about it. */
  filedIndex?: number;
  /** Overrides the caption derived from `buyStyle`. */
  chartLabel?: string;
};

const UK_DEALS: HeroDeal[] = [
  {
    id: "ecel",
    ticker: "ECEL.L",
    symbol: "ECEL",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "BREAKING",
    lead: "ECEL · Eurocell",
    body: "New CEO William Truman bought £21k with the shares a third off their high, taking him to ~£68k in under a month.",
    buyStyle: "contrarian",
    buyIndex: 34,
    series: [
      101.4, 100.2, 100.8, 103.4, 107.5, 108.6, 111, 113.3, 114, 111.2, 110.6,
      110.5, 109, 106.3, 106.1, 105.5, 103.7, 101.9, 101.8, 100.2, 96.7, 94,
      92.2, 88.8, 85, 84, 84.3, 83.5, 81.7, 81, 78.8, 75.4, 72.9, 72.7, 72,
      72.2, 73.6, 75.7, 75, 74.7, 76.1, 78.9, 79.8, 82.5, 85.4, 87.5, 86.6,
      87.5,
    ],
  },
  {
    id: "av",
    ticker: "AV.L",
    symbol: "AV.",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "JUST IN",
    lead: "AV. · Aviva",
    body: "CEO bought £120k with the shares at a 12-month high, the largest board purchase this year.",
    buyStyle: "momentum",
    buyIndex: 34,
    series: [
      100.4, 98.9, 100.4, 100.5, 99.5, 97.1, 98.1, 97.6, 97, 96.4, 98.6, 98,
      97.9, 98.8, 102.2, 102.8, 104.9, 107.5, 110.6, 109.2, 109.3, 109.4, 109.3,
      106.7, 107.2, 107.5, 107, 105.6, 108.4, 111.1, 113.4, 115.7, 120.8, 122.7,
      121.9, 121.8, 125, 125.7, 125.7, 127.4, 130.4, 130.3, 130.8, 133.4, 135.4,
      135.2, 136.6, 139.6,
    ],
  },
  {
    id: "otb",
    ticker: "OTB.L",
    symbol: "OTB",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "SIGNAL",
    lead: "OTB · On The Beach",
    body: "Chairman added £45k after a 30% fall, his first open-market purchase in over two years.",
    buyStyle: "contrarian",
    buyIndex: 33,
    series: [
      99.8, 99.8, 101.6, 101.5, 101.8, 103.7, 105.6, 102.4, 97.4, 92, 86.5,
      80.6, 79.6, 80.6, 80.6, 78.8, 79.1, 78.7, 77.7, 76.4, 77.9, 77.8, 77.3,
      76.4, 77.2, 75.6, 74.4, 73.8, 74.7, 73, 72.1, 71.5, 71.7, 70, 70.9, 72.9,
      75.2, 75.1, 76.3, 76.7, 77.1, 76.9, 79.8, 81.9, 83.1, 83.4, 85.5, 85.1,
    ],
  },
  {
    id: "alt",
    ticker: "ALT.L",
    symbol: "ALT",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "NEW FILING",
    lead: "ALT · Altitude Group",
    body: "CFO topped up £12k near the lows, the third board purchase this quarter.",
    buyStyle: "contrarian",
    buyIndex: 36,
    series: [
      99.3, 101.3, 99.6, 98.1, 97.1, 96.6, 93.7, 92.9, 93.2, 93.5, 91.7, 92.2,
      93.2, 93.3, 92.7, 94.7, 96, 95, 92.9, 92, 89.7, 86.4, 84.9, 85.2, 84.7,
      83.9, 84.7, 85.6, 85, 84.5, 86.1, 86.1, 83.6, 80.8, 79.4, 76.7, 75.1,
      75.8, 78.3, 78.7, 78.9, 79.7, 81.4, 81.2, 83, 85.4, 87.5, 86.6,
    ],
  },
];

const US_DEALS: HeroDeal[] = [
  {
    id: "pltr",
    ticker: "PLTR",
    symbol: "PLTR",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "BREAKING",
    lead: "PLTR · Palantir",
    body: "Director bought $180k into a 30% run, the first insider purchase since the IPO lock-up.",
    buyStyle: "momentum",
    buyIndex: 36,
    series: [
      101.2, 101.3, 100.3, 100.6, 102.8, 103.2, 103.3, 105.1, 106.6, 104.9, 103,
      102.9, 102.2, 100.4, 100.5, 102.9, 103.7, 104.1, 106.4, 110, 111.3, 113.4,
      116.8, 119.4, 117.7, 117.1, 117, 116.2, 113.4, 114.3, 115.3, 116.3, 117.1,
      122.2, 125.9, 128, 128.4, 132.5, 134.2, 135.2, 135, 137.7, 137.4, 139.4,
      142.9, 148.1, 147.4, 147.8,
    ],
  },
  {
    id: "gs",
    ticker: "GS",
    symbol: "GS",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "GS · Goldman Sachs",
    body: "Board member bought $300k with the stock 22% off its high, the first open-market insider buy since 2022.",
    buyStyle: "contrarian",
    buyIndex: 35,
    series: [
      100.5, 99.6, 101.4, 101, 100.2, 100.1, 102.8, 102.6, 102.7, 103, 104.4,
      102, 101.1, 100.9, 101.6, 99.1, 99.1, 99, 98.8, 96, 96.2, 95.4, 93.9,
      90.9, 90.6, 88.4, 86.1, 84, 85.4, 84.7, 83.5, 82.2, 82.1, 79.3, 77.6,
      77.4, 79.2, 79.6, 81.3, 82.7, 83.5, 82.8, 84.8, 87.6, 89.8, 90.6, 93.1,
      94.2,
    ],
  },
  {
    id: "sofi",
    ticker: "SOFI",
    symbol: "SOFI",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "SOFI · SoFi Technologies",
    body: "CEO added $250k at 52-week lows, ~$610k across the month.",
    buyStyle: "contrarian",
    buyIndex: 32,
    series: [
      99.9, 101.5, 99, 97.6, 96.8, 96.7, 94.7, 95.2, 95.3, 94, 90.3, 89.1, 87.7,
      86.1, 84.8, 86.2, 85.9, 84, 81.9, 81.6, 80, 78.4, 78.6, 79.7, 78.4, 76.3,
      75.2, 73.8, 71.2, 69.6, 69.6, 69.1, 67.9, 68.1, 69.5, 69.4, 69.1, 70.4,
      73, 73.5, 73.8, 74.7, 76.2, 76.4, 78.9, 81.7, 83.4, 82.6,
    ],
  },
  {
    id: "rblx",
    ticker: "RBLX",
    symbol: "RBLX",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "RBLX · Roblox",
    body: "CFO purchased $90k as the stock broke to a 6-month high, a second buy in three weeks.",
    buyStyle: "momentum",
    buyIndex: 35,
    series: [
      100.3, 99.3, 97.5, 98.7, 97.9, 96.3, 94.3, 95.1, 93.7, 93.4, 94.6, 98.2,
      98.8, 100.1, 101.6, 103.5, 101.6, 101.8, 102.1, 102.4, 99.6, 99.6, 99.4,
      99.6, 99.2, 103.2, 106.3, 108.5, 109.3, 112.6, 112.2, 111.6, 112.6, 117,
      117.8, 118, 118.7, 121.5, 120.9, 121.8, 123.7, 125.8, 125.5, 127.7, 130.5,
      131.8, 130.5, 132.1,
    ],
  },
];

// Congress (`usg`) ships inside the US app, so it reuses the US app icon and
// label. Dollar bands (not exact fills) match how Periodic Transaction Reports
// disclose. These carry `filedIndex` instead of a `buyStyle`: a PTR surfaces
// weeks after the trade, so the honest thing to show is the distance between
// the two, not what the price was doing on the day.
const USG_DEALS: HeroDeal[] = [
  {
    id: "nvda",
    ticker: "NVDA",
    symbol: "NVDA",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "NVDA · NVIDIA",
    body: "Senator from Texas disclosed a $250k-$500k buy, filed 38 days after the trade.",
    buyIndex: 22,
    filedIndex: 38,
    chartLabel: "Trade to filing",
    series: [
      100.5, 98.4, 99.2, 99.6, 99.3, 96.5, 96.7, 96.2, 95.7, 94.8, 97.6, 98.5,
      98.5, 98, 99.7, 98.8, 98.8, 100, 103, 102.8, 103, 103.7, 104.6, 103.5,
      105.7, 110, 113.9, 115.3, 118.3, 120.9, 120.7, 119.7, 123, 126.6, 128,
      129.4, 132.7, 133.8, 132.3, 133.1, 136, 137, 136.4, 138.5, 140.1, 139.3,
      138.6, 141.4,
    ],
  },
  {
    id: "lmt",
    ticker: "LMT",
    symbol: "LMT",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "LMT · Lockheed Martin",
    body: "Virginia Representative on Armed Services bought $15k-$50k, filed 41 days after the trade.",
    buyIndex: 24,
    filedIndex: 38,
    chartLabel: "Trade to filing",
    series: [
      98.7, 99.7, 100.6, 100.1, 100.4, 102.2, 102.3, 100.7, 100.9, 102.2, 102,
      101, 101.9, 101.7, 99.5, 97.3, 97.8, 97.2, 96.5, 96.9, 99.3, 99, 98.5, 99,
      100.6, 99.8, 101.4, 104.5, 107.7, 107.5, 109.5, 111.3, 112.2, 111.1,
      114.3, 116.8, 118.1, 117.1, 119.2, 119, 119, 119.1, 122.9, 122.9, 122.5,
      122.3, 124.7, 123,
    ],
  },
  {
    id: "jpm",
    ticker: "JPM",
    symbol: "JPM",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "JPM · JPMorgan",
    body: "New York Representative on Financial Services disclosed a $50k-$100k purchase, 34 days after it happened.",
    buyIndex: 20,
    filedIndex: 37,
    chartLabel: "Trade to filing",
    series: [
      100.1, 99.5, 100.1, 102.5, 102.1, 101.3, 101.7, 103.4, 102.3, 102.2,
      102.6, 102.6, 99.5, 98.7, 98.9, 99.4, 98.5, 100.8, 102.4, 102.6, 100.8,
      102.4, 103, 103.7, 104.4, 108.3, 108.8, 108.6, 108, 110, 109.1, 109.9,
      111.9, 115.1, 114.1, 114.7, 115.5, 116.5, 114.4, 116.2, 117.9, 118.8,
      117.1, 118.8, 119.3, 119, 118.2, 121,
    ],
  },
  {
    id: "msft",
    ticker: "MSFT",
    symbol: "MSFT",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "BREAKING",
    lead: "MSFT · Microsoft",
    body: "Florida Senator's spouse bought $100k-$250k, filed 37 days after the trade.",
    buyIndex: 21,
    filedIndex: 36,
    chartLabel: "Trade to filing",
    series: [
      100.6, 99.6, 100.3, 100.3, 98.4, 97.5, 98.7, 99, 97.8, 98.2, 99.2, 98.9,
      98, 99.8, 101.4, 101.2, 100.9, 103.1, 103.6, 103.1, 103.3, 105.6, 105.6,
      106.2, 108.1, 111.1, 110.6, 111.3, 113, 115, 113.8, 115.8, 118.2, 120,
      118.6, 120.9, 122.1, 122.6, 121.5, 124.5, 124.9, 124.4, 123.4, 126.7,
      126.9, 127.2, 127.6, 130.2,
    ],
  },
];

/** Where the notification fires for a deal: the day it was DISCLOSED. For UK
 *  and US filings that is close enough to the trade to be the same point on
 *  the chart; a Congressional PTR is weeks later, and says so. */
export function alertIndexOf(deal: HeroDeal): number {
  return deal.filedIndex ?? deal.buyIndex;
}

export function dealsForMarket(marketId?: string): HeroDeal[] {
  if (marketId === "us") return US_DEALS;
  if (marketId === "usg") return USG_DEALS;

  return UK_DEALS;
}
