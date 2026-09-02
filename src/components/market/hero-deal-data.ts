/** The hero "success stories" — the notification copy and the price series
 *  the showcase panel cycles through, one real filing per entry.
 *
 *  Every deal here is a genuine disclosure that ddbx surfaced, chosen for
 *  how the price went afterwards: each cycle of the panel is "you got the
 *  alert, here is what the shares did, up X% in N days". Hand-picked rather
 *  than fetched, because these are the hero's sales pitch — every one has to
 *  land, and a hero that can be empty or mid-fetch is a hero with a loading
 *  state.
 *
 *  The series are REAL closes, not hand-drawn: `scripts/hero-deal-series.mjs`
 *  pulls them from /api/prices/history around each filing and rebases them so
 *  the disclosure close is 100. They are still deliberately unitless — the
 *  chart prints no axis and no price — but the outcome the panel states
 *  ("+135% in 107 days") is computed from these exact points, so the figure
 *  and the picture cannot disagree. `asOf` is the last close in the window;
 *  the snapshot goes stale slowly (the story is about what already happened)
 *  and is refreshed by re-running the script. Every figure inside the
 *  notification body is a disclosed amount from the filing itself.
 */

export type HeroDeal = {
  /** Stable id (used as the React key, and as the cast key in
   *  scripts/hero-deal-series.mjs). */
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
  /** Ticker + company lead, e.g. "HAS · Hays". */
  lead: string;
  /** The disclosure copy after the lead. Figures in it are from the filing. */
  body: string;
  /** Real daily closes, rebased so the disclosure close is 100. Unitless: the
   *  chart rescales to its own box and never prints a value, so only the shape
   *  and the return derived from it are load-bearing. About thirty closes
   *  precede the trade; the rest is what followed, up to `asOf`. */
  series: number[];
  /** Index into `series` where the director bought. The trade marker lands
   *  here, and (unless `filedIndex` says otherwise) so does the alert. Trades
   *  disclosed within a few sessions are collapsed onto their disclosure. */
  buyIndex: number;
  /** What kind of price action the director bought into — mirrors
   *  `Dealing.buy_style.kind`, and drives the chart's caption with the same
   *  words `BuyStyleChip` uses. Omitted where the classification was
   *  neutral. */
  buyStyle?: "contrarian" | "momentum";
  /** Where the trade was actually DISCLOSED, when that is materially later
   *  than the trade (a late Congressional PTR). A second marker lands here and
   *  the notification fires here rather than at `buyIndex`. */
  filedIndex?: number;
  /** ISO date of the disclosure — the day the alert fired. With `asOf` it
   *  gives the hold length the outcome line states. */
  disclosedDate: string;
  /** ISO date of the last close in `series`. */
  asOf: string;
};

const UK_DEALS: HeroDeal[] = [
  {
    id: "has",
    ticker: "HAS.L",
    symbol: "HAS",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "BREAKING",
    lead: "HAS · Hays",
    body: "New CEO bought £147k at 30p near 52-week lows, four days before his permanent appointment was announced.",
    buyStyle: "contrarian",
    buyIndex: 32,
    disclosedDate: "2026-05-18",
    asOf: "2026-09-02",
    series: [
      109.5, 108.2, 107.9, 104.3, 103, 103.8, 99.9, 98.2, 96.2, 101.3, 104.3,
      105.9, 109.3, 111.4, 107.8, 107.3, 105, 104.7, 106.3, 106.7, 108.4, 108.4,
      110.4, 108.6, 110.6, 113.9, 112.3, 112.3, 108.4, 100.3, 98, 97.3, 100,
      101.2, 102, 103.2, 101.5, 102.9, 105.3, 107.9, 107.1, 110.8, 109.7, 108.2,
      111.2, 112.7, 117.7, 112.6, 114.8, 115.1, 119.7, 117.9, 116.2, 114.2,
      113.7, 106.6, 97.7, 104.7, 104.8, 107.2, 108.9, 105.2, 101.2, 106.9,
      108.8, 111.3, 114.7, 117.7, 115.3, 116.4, 139.3, 158.4, 154.7, 155.8,
      172.1, 176.9, 177.4, 174.7, 186.4, 189.3, 189.4, 192.4, 209.4, 209.9,
      195.8, 183.1, 189.3, 196.6, 195.3, 202.4, 214.1, 215.9, 220.1, 210.7, 213,
      224.3, 224.7, 225.3, 232, 220.8, 234.2, 235.4, 247.4, 243.2, 237.3, 249.5,
      240.6, 235.5,
    ],
  },
  {
    id: "eman",
    ticker: "EMAN.L",
    symbol: "EMAN",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "SIGNAL",
    lead: "EMAN · Everyman Media",
    body: "Founder-director bought £127k at 25.5p near all-time lows, part of a £255k buying programme while a strategic holder built a stake.",
    buyIndex: 40,
    disclosedDate: "2026-03-16",
    asOf: "2026-09-02",
    series: [
      109.8, 109.8, 109.8, 109.8, 109.8, 109.8, 109.8, 109.8, 109.8, 109.8,
      109.8, 107.8, 107.8, 107.8, 107.8, 103.9, 103.9, 103.9, 96.1, 96.1, 96.1,
      96.5, 96.1, 96.1, 96.1, 96.1, 96.1, 96.1, 96.1, 96.1, 96.1, 96.1, 96.1,
      96.1, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
      100, 100, 121.6, 145.1, 135.3, 137.3, 135.3, 135.3, 135.3, 141.2, 141.2,
      141.2, 141.2, 141.2, 135.3, 133.3, 133.3, 135.3, 135.3, 133.3, 131.4,
      129.4, 125.5, 127.5, 127.5, 129.4, 131.4, 131.4, 131.4, 131.4, 131.4,
      131.4, 131.4, 131.4, 131.4, 131.4, 131.4, 131.4, 131.4, 139.2, 139.2,
      139.2, 139.2, 139.2, 145.9, 143.1, 145.1, 145.1, 145.1, 145.1, 145.1,
      145.1, 145.1, 145.1, 137.3, 137.3, 143.1, 132.5, 150.6, 167.1, 168.6,
      180.4, 190.2, 192.2, 192.2, 190.2, 192.2, 188.2, 188.2, 192.2, 192.2,
      192.2, 196.1, 196.1, 196.1, 192.2, 196.1, 196.1, 194.1, 194.1, 194.1,
      194.1, 196.1, 196.1, 196.1, 196.1, 196.1, 196.1, 196.1, 196.1, 196.1,
      190.2, 190.2, 184.3, 186.3, 186.3, 186.7, 184.3, 186.3, 198, 203.9, 211.8,
      225.5, 217.6, 219.6, 219.6, 219.6, 217.6, 217.6, 219.6, 218.9,
    ],
  },
  {
    id: "sfor",
    ticker: "SFOR.L",
    symbol: "SFOR",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "JUST IN",
    lead: "SFOR · S4 Capital",
    body: "Non-executive director bought £245k at 24.65p, roughly 95% below the 2021 high.",
    buyIndex: 38,
    disclosedDate: "2026-03-26",
    asOf: "2026-09-01",
    series: [
      99.1, 92.5, 91.7, 89, 90.8, 90.3, 92.3, 89, 86, 87.5, 83.5, 84.2, 82.9,
      80.9, 80.9, 77.6, 76.5, 77.2, 75.4, 75.4, 77.4, 75.4, 78.1, 78.3, 78.5,
      75.4, 80.7, 78.3, 74.3, 76.8, 76.5, 75.4, 74.4, 72.6, 71.5, 75.2, 91.2,
      93.7, 100, 97.6, 97.2, 102.2, 109.2, 111.8, 116.7, 128.5, 135.7, 135.7,
      140.1, 139.2, 142.1, 142.5, 148.5, 145.2, 155.5, 150.7, 148.3, 149.4,
      149.4, 156.6, 159.7, 159.6, 149.8, 153.3, 153.5, 153.7, 167.6, 164.7,
      150.2, 152.2, 150.7, 147.6, 146.9, 153.9, 155.3, 159.4, 162.3, 151.1,
      150.6, 153.1, 158.1, 157.5, 159.6, 159.2, 152.8, 141.4, 136.9, 129, 133.5,
      135.3, 137.5, 136.4, 127.9, 127.9, 125, 125.6, 124.4, 122.1, 118.6, 115.8,
      110.3, 112.5, 115.8, 121.3, 133.3, 132.4, 130.1, 132.4, 124.4, 124.6,
      127.4, 130.1, 130, 130, 133.1, 130.9, 130.1, 132, 132.4, 129, 130.3,
      137.9, 147.1, 150.7, 144.1, 138.4, 141, 144.1, 190.8, 199.6, 192.6, 200.4,
      197.1, 191.9, 193, 197.1, 192.3, 196.7, 187.5, 184.6, 186.8, 181.4, 180.7,
      178.7, 182.4, 182, 182.2,
    ],
  },
  {
    id: "tlw",
    ticker: "TLW.L",
    symbol: "TLW",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "NEW FILING",
    lead: "TLW · Tullow Oil",
    body: "Chair’s spouse bought £130k at 13.6p into a 26% drawdown, the third insider purchase in under a month.",
    buyStyle: "contrarian",
    buyIndex: 32,
    disclosedDate: "2026-06-17",
    asOf: "2026-09-01",
    series: [
      113.1, 122, 135.8, 120.5, 107.8, 108.7, 114, 126.7, 124.2, 120.6, 125,
      134, 131.8, 126.8, 130.4, 129.5, 123.8, 118.8, 119.6, 113.7, 121.2, 121.1,
      118.1, 119, 115.5, 116.7, 110.7, 120.5, 116.4, 117, 100.2, 97.3, 100,
      91.3, 95.6, 97, 92.9, 91.9, 94.3, 83.3, 86.1, 87.2, 87.3, 86.9, 89.2,
      90.8, 94, 103.9, 96.2, 93.8, 102.3, 104.2, 100.2, 101.1, 100.2, 105.4,
      104.7, 108, 115.2, 107.8, 101.4, 102.1, 108, 112.7, 115.1, 111.9, 115.4,
      107.7, 105.4, 105.1, 108, 110.8, 109.9, 109.3, 111.1, 119.4, 129.5, 138.9,
      149.8, 153.2, 154, 155.5, 142.9, 150.3, 154.4, 167.3,
    ],
  },
];

const US_DEALS: HeroDeal[] = [
  {
    id: "smwb",
    ticker: "SMWB",
    symbol: "SMWB",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "BREAKING",
    lead: "SMWB · Similarweb",
    body: "Founder-CEO bought $200k at $3.56, one of four insiders putting $813k in over four days after a Q1 beat and raised guidance.",
    buyStyle: "momentum",
    buyIndex: 31,
    disclosedDate: "2026-05-20",
    asOf: "2026-08-31",
    series: [
      69.9, 70.2, 64.9, 61, 62.6, 63.9, 68.1, 68.3, 68.8, 69.6, 70.7, 70.4,
      67.8, 67.8, 70.4, 70.7, 70.9, 73.6, 82.2, 79.1, 83.5, 80.4, 85.9, 89.8,
      83.5, 81.7, 74.6, 80.4, 82.7, 89.5, 96.3, 100, 99, 108.1, 104.2, 101.3,
      109.7, 108.6, 113.9, 114.7, 112.8, 113.4, 106.3, 108.1, 107.3, 109.2,
      110.7, 114.7, 137.4, 132.2, 127.5, 130.6, 134.3, 130.1, 135.1, 134.8,
      146.6, 161.8, 160.5, 172.5, 161.8, 163.9, 166.5, 161.8, 172.5, 174.3,
      186.6, 172.8, 191.4, 184.6, 182.2, 175.1, 174.1, 164.4, 158.6, 164.7,
      178.8, 188.2, 187.4, 189, 187.7, 190.6, 194.2, 194.8, 193.2, 196.6, 194.2,
      189.8, 230.1, 235.9, 232.7, 224.1, 224.3, 218.6, 213.6, 215.7, 235.3,
      233.8, 237.2, 240.6, 237.7, 236,
    ],
  },
  {
    id: "niq",
    ticker: "NIQ",
    symbol: "NIQ",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "NIQ · NIQ Global",
    body: "CEO bought $1.0M at $8.43, four days after Q1 results beat expectations.",
    buyStyle: "contrarian",
    buyIndex: 30,
    disclosedDate: "2026-05-18",
    asOf: "2026-08-31",
    series: [
      127.1, 128.1, 128.7, 117.1, 115.5, 117.4, 118.2, 120, 127.5, 129, 131.1,
      128.8, 127.1, 124.3, 127.9, 125.1, 122.3, 125.8, 121, 115.2, 115.9, 116.7,
      115.9, 124, 118.7, 111.7, 114.1, 111.2, 90.8, 90.8, 100, 94.8, 94.8, 93.6,
      94.7, 92.5, 93.5, 92.4, 92.4, 98.7, 93.4, 91, 93.5, 92.5, 91.3, 92.1,
      92.5, 90.4, 91.6, 94.5, 92.8, 90.5, 91.7, 88.8, 89.6, 90.8, 88.3, 95.6,
      96.1, 103.5, 106.5, 109.4, 108.7, 121.8, 121.2, 124.3, 124.6, 122.6,
      122.4, 121.7, 123.5, 121.8, 118.9, 117.4, 117.7, 115.5, 119, 122.6, 129.6,
      132.6, 126, 123.7, 128, 129.6, 129.1, 129.2, 129.3, 129.3, 183.6, 186.2,
      186.7, 193.2, 191, 191.8, 202.8, 201, 208, 212.4, 213.1, 207.5, 211.2,
      212.6, 212.6,
    ],
  },
  {
    id: "via",
    ticker: "VIA",
    symbol: "VIA",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "VIA · Via Transportation",
    body: "Director’s first open-market buy: $367k at $14.70, about 63% below the IPO price, four weeks after a beat-and-raise.",
    buyIndex: 32,
    disclosedDate: "2026-06-11",
    asOf: "2026-08-31",
    series: [
      103.1, 104.3, 104.5, 103, 110, 114.1, 112.3, 117.4, 124.3, 117.3, 114.7,
      95.7, 90.2, 97.4, 99.9, 101, 95.1, 98.3, 98.2, 101.4, 97.8, 97.2, 98.2,
      103.2, 115.4, 104.6, 102.4, 103.5, 99.9, 101, 99.3, 99.9, 100, 102.3,
      101.5, 96.1, 100.4, 103.6, 101.2, 101.9, 102.3, 104.1, 118.4, 126.5,
      122.9, 128.5, 130.8, 131, 123.6, 121.4, 124.1, 121.5, 124.1, 126.5, 126.6,
      124.7, 121.7, 125.9, 122.5, 118.6, 115.7, 119.9, 132.8, 139.5, 140, 136.1,
      137.8, 142.8, 148.4, 144.7, 146.1, 150.5, 157.9, 169.7, 178.6, 177.4,
      172.2, 169.5, 178.7, 180, 182.9, 185.8, 189, 187.1, 191.5, 193.6, 194.4,
    ],
  },
  {
    id: "gshd",
    ticker: "GSHD",
    symbol: "GSHD",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "GSHD · Goosehead Insurance",
    body: "President & COO bought $99k at $37.50 near a 52-week low, a day after the CEO’s $184k buy.",
    buyStyle: "contrarian",
    buyIndex: 30,
    disclosedDate: "2026-05-15",
    asOf: "2026-08-31",
    series: [
      112.7, 118.2, 118.6, 121.2, 112.2, 107.5, 111.3, 107.6, 109.4, 114.9,
      116.5, 118.6, 118.6, 121.1, 134.8, 128.2, 128.2, 130, 125.4, 119, 115.6,
      115.8, 112.8, 109.1, 111.9, 108.5, 106.7, 105.3, 96.7, 97.9, 100, 111.9,
      109.7, 109.9, 112.9, 110.7, 106.2, 100.1, 93.6, 91.3, 97.3, 95.9, 91.3,
      95.1, 101.9, 97, 95.4, 102.6, 98, 97.8, 95.8, 99.5, 93.3, 98, 103.6,
      106.4, 115.3, 116.8, 124.5, 127.4, 128.8, 134.4, 139.9, 140.8, 147.7,
      151.1, 140.7, 142.2, 145.7, 133.6, 137.2, 146.5, 144.2, 152, 142.8, 136.5,
      143.2, 156, 164.7, 182.8, 187.8, 169.6, 164.7, 174.4, 182.1, 177.8, 177.1,
      173.2, 171.4, 173.5, 174.1, 179, 176.1, 171, 172.1, 181.6, 187.8, 192.6,
      193.9, 192.1, 189.4, 187.1, 189.3, 188,
    ],
  },
];

// Congress (`usg`) ships inside the US app, so it reuses the US app icon and
// label. Dollar bands (not exact fills) match how Periodic Transaction Reports
// disclose. These are older filings than the UK/US casts, so their windows
// run up to a year past the disclosure and the outcome reads in months.
const USG_DEALS: HeroDeal[] = [
  {
    id: "mu",
    ticker: "MU",
    symbol: "MU",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "MU · Micron",
    body: "Louisiana Representative on Financial Services disclosed a $100k–$250k buy, held in the member’s own name.",
    buyIndex: 38,
    disclosedDate: "2026-02-03",
    asOf: "2026-08-28",
    series: [
      58.9, 60.2, 62.9, 61.6, 57.5, 56.6, 55.4, 53.8, 59.3, 63.4, 65.9, 65.9,
      68.3, 67.9, 70.2, 69.8, 68, 75.2, 74.4, 81.9, 81, 78, 82.3, 82.5, 80.6,
      79.5, 80.3, 86.5, 87, 92.8, 94.8, 95.3, 92.8, 97.8, 103.8, 103.9, 98.9,
      104.4, 100, 90.5, 91.3, 94.1, 91.4, 89, 97.8, 98.7, 98.1, 95.3, 100.4,
      99.5, 102.1, 100.4, 99.7, 102.3, 99.1, 98.3, 98.4, 90.5, 95.5, 94.7, 88.3,
      92.8, 96.1, 99.8, 96.6, 101.6, 105.3, 110.1, 110.1, 105.9, 100.8, 96.4,
      94.3, 91.1, 84.7, 85.2, 76.7, 80.5, 87.7, 87.3, 90.1, 90, 97, 100.5,
      100.3, 101.7, 111, 108.8, 109, 108.5, 106.9, 107.1, 116.2, 114.8, 118.4,
      125.1, 120.2, 123.6, 123.3, 129.3, 137.4, 152.6, 158.9, 154.2, 178, 189.6,
      182.8, 191.6, 185, 172.8, 162.5, 166.6, 174.5, 181.7, 179, 213.6, 221.3,
      220.2, 231.5, 246.9, 253.7, 257.4, 237.5, 206, 226.3, 223.1, 212.6, 237.4,
      234, 259.4, 243.4, 288.8, 250.8, 250, 289.3, 203.4, 202.4, 206.3, 231.5,
      228.8, 236.1, 219.6, 214.6, 195.6, 176.2, 223.4, 232.3, 230.5, 217.1,
      222.4, 223.7, 223, 222.4,
    ],
  },
  {
    id: "pltr",
    ticker: "PLTR",
    symbol: "PLTR",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "PLTR · Palantir",
    body: "Kentucky Representative on the Oversight Committee disclosed a $1k–$15k buy, filed the day after the trade.",
    buyIndex: 75,
    disclosedDate: "2025-01-22",
    asOf: "2026-01-21",
    series: [
      48.8, 51, 52, 50.6, 53.9, 56.1, 56.6, 56.6, 56.5, 55.2, 54.5, 54.6, 55.9,
      55.5, 55.9, 55.4, 56.7, 58.4, 58.5, 58.4, 56.8, 54.1, 54.5, 53.9, 66.5,
      72.2, 72.7, 76, 78.4, 77.9, 79, 77, 85.6, 79.7, 81.9, 80.8, 79.8, 83.7,
      84.1, 85.5, 85.9, 87.3, 86.4, 92.3, 90.9, 93.5, 99.3, 94.3, 92.2, 94.3,
      95.2, 99, 98.5, 96.8, 93, 96.5, 104.8, 105, 107.2, 106.9, 102.9, 100.4,
      98.4, 97.8, 103.9, 98.8, 91, 88.8, 87.5, 84.5, 85.7, 88.6, 90.1, 93.4,
      95.1, 100, 102.7, 102.7, 98.1, 104.4, 103.8, 105.7, 107.3, 108.9, 135.1,
      131.9, 144.8, 144.2, 151.7, 146.5, 152.7, 153.4, 155, 162.1, 145.8, 138.2,
      131.8, 118, 114.3, 116.2, 110.3, 110.5, 108.5, 109.8, 117.2, 104.7, 110.5,
      99.4, 101.5, 108.8, 103.6, 112.2, 113.6, 109.1, 112, 113.7, 118.3, 125.9,
      125.5, 120, 117.2, 111.7, 109.8, 110.2, 113.8, 108.8, 96.3, 101.3, 100.6,
      119.7, 115.2, 115.2, 120.5, 128, 120.6, 122, 118.1, 122.3, 131.2, 140.2,
      146.7, 149.1, 151, 154.1, 151.2, 161.7, 161, 141.6, 143.7, 155, 152.6,
      154.1, 166.6, 169.4, 166.7, 168.5, 164.3, 163.4, 156.9, 159.1, 160.4,
      160.5, 161, 159.1, 171.4, 171.8, 173.2, 169.1, 156, 166.2, 171.8, 172.8,
      177.4, 175.9, 178.7, 184, 179.8, 182.1, 178.6, 182, 186.3, 185.9, 187.7,
      170.1, 177.3, 170, 171.9, 174.8, 181, 181.7, 186.2, 185.4, 184.9, 194,
      193.3, 196.3, 200.3, 199.7, 197.5, 193.9, 201.2, 201.5, 206.6, 205.4,
      203.3, 206.3, 206, 200.7, 209, 225.4, 233.6, 237, 243.2, 237.6, 243.2,
      239.8, 235.5, 230.5, 226.4, 205.2, 203, 203.2, 206.5, 204.5, 209.3, 203.9,
      205.7, 203.9, 204.4, 201.5, 203.1, 199.2, 203.1, 211.2, 216.9, 213.8, 223,
      222.7, 221.5, 219, 230.2, 237.3, 233.3, 237.5, 233.6, 233, 231, 232.7,
      237.3, 240.6, 243.3, 225.1, 233.6, 237, 238.8, 241.3, 228.2, 230.5, 233.8,
      233.7, 231.7, 231.8, 236.2, 236.1, 228.3, 234.8, 240.2, 246.1, 246.7,
      258.6, 253.1, 260.8, 269.5, 248.1, 244.4, 227.7, 231.5, 251.9, 248.4,
      239.6, 223.9, 226.4, 222.8, 217.7, 215.2, 202.6, 201.4, 211.1, 212.8,
      215.6, 219.1, 217.9, 222.1, 229.1, 231.5, 236.5, 236.1, 236.6, 244.5, 244,
      238.8, 238.4, 244.2, 230.6, 241.6, 251.6, 252.3, 252.5, 252.6, 245.5,
      239.6, 235.3, 231.2, 218.4, 226.4, 233.8, 236.3, 230.1, 230.9, 233.4,
      232.8, 232.1, 230.3, 222.4, 219.2, 215.1,
    ],
  },
  {
    id: "googl",
    ticker: "GOOGL",
    symbol: "GOOGL",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "BREAKING",
    lead: "GOOGL · Alphabet",
    body: "Nancy Pelosi’s spouse disclosed a $250k–$500k position via call options, filed the same day.",
    buyIndex: 70,
    disclosedDate: "2025-01-14",
    asOf: "2026-01-13",
    series: [
      87.5, 87.5, 88.1, 85.9, 86.7, 85.3, 85.5, 86.1, 87, 87.2, 87.1, 85.9,
      86.2, 86.5, 87.1, 85.8, 85.8, 87.1, 87.9, 89.5, 92, 90.2, 90.3, 89.2,
      89.5, 93.1, 95.3, 94, 95.1, 95.8, 94.3, 92.6, 90.9, 92.4, 93.9, 92.8,
      88.4, 86.9, 88.4, 89.2, 89.2, 89.1, 90.4, 90.3, 91.9, 91, 92.1, 92.5,
      97.6, 103, 101.2, 100.1, 103.7, 103, 99.3, 99.4, 100.9, 102.6, 103.4,
      103.1, 101.6, 100.8, 99.8, 99.9, 101.1, 103.8, 103.1, 102.3, 101.3, 100.7,
      100, 103.1, 101.7, 103.3, 104.4, 104.6, 104.4, 105.6, 101.1, 103, 103,
      105.9, 107.6, 106.1, 108.8, 100.9, 101, 97.7, 98.3, 97.7, 96.8, 98.1,
      97.7, 96.9, 97.7, 97.3, 94.7, 94.5, 92.5, 91.1, 88.8, 89.8, 88.1, 90.1,
      91.2, 90.9, 91.7, 87.5, 86.5, 88.1, 85.8, 87.3, 86.6, 84.7, 86.4, 85.8,
      86.5, 88.4, 89.9, 87, 85.5, 81.4, 81.5, 82.8, 82.8, 79.5, 76.8, 77.4,
      76.3, 83.7, 80.6, 82.9, 83.9, 82.4, 80.8, 79.7, 77.9, 79.9, 81.9, 84,
      85.4, 84.7, 84.4, 83.7, 85, 86.5, 86.6, 86.1, 79.8, 81.3, 80.5, 83.5,
      84.1, 87.2, 86.4, 87.6, 87.8, 86.5, 88.9, 90.1, 88.8, 91.2, 90.9, 90.6,
      90.6, 89.1, 87.6, 88.6, 88.7, 91.6, 92.8, 94.2, 93.5, 92.6, 92.1, 93.2,
      92.8, 91.4, 87.9, 87.1, 87.9, 90, 91.5, 94.1, 92.9, 92.7, 94.2, 94.7,
      93.2, 91.9, 93.1, 93.7, 95, 95.7, 96, 96.5, 96.8, 97.6, 100.2, 100.9,
      100.3, 101.3, 101.9, 101.5, 103.2, 103.6, 101.2, 99.7, 102.8, 102.6,
      103.4, 103.6, 106.2, 106, 107.2, 106.5, 107, 107.5, 107.3, 106.3, 105.1,
      105.3, 108.7, 109.9, 109.2, 109.4, 111.6, 112.3, 111.4, 121.6, 122.5,
      123.9, 123.4, 126.3, 126.1, 126.7, 127, 132.7, 132.4, 131.6, 132.9, 134.3,
      133.1, 132.7, 130.3, 129.6, 130, 128.7, 128.2, 129.1, 129.5, 129.4, 132,
      129.6, 129, 127.3, 124.7, 128.7, 129.4, 132.4, 132.6, 133.6, 135.3, 132.1,
      132.7, 133.4, 137, 142, 141, 144.8, 148.4, 148.3, 149.6, 146.3, 149.9,
      150.1, 147, 153, 153.6, 151.2, 146.9, 145.7, 150.3, 149.9, 154.4, 152.6,
      158, 168, 170.5, 168.7, 168.8, 166, 166.5, 168.5, 167.5, 169.4, 165.4,
      167.2, 168.8, 164.7, 163.1, 162.5, 161.6, 156.4, 159.5, 162, 163.3, 165.7,
      165.6, 165.3, 165.3, 165.5, 165, 166.2, 166.9, 165.7, 169.8, 171.6, 173.2,
      175, 177.1,
    ],
  },
  {
    id: "nvda",
    ticker: "NVDA",
    symbol: "NVDA",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "NVDA · NVIDIA",
    body: "Nancy Pelosi’s spouse disclosed a $250k–$500k position via call options, in the same filing as Alphabet.",
    buyIndex: 70,
    disclosedDate: "2025-01-14",
    asOf: "2026-01-13",
    series: [
      90.2, 93.2, 94.8, 96.9, 100.9, 100.7, 102.3, 102.3, 104.8, 99.9, 103,
      103.9, 104.7, 109.1, 109, 105.9, 106.6, 107.4, 106.6, 107.2, 105.8, 100.8,
      102.8, 103.3, 106.2, 110.5, 113, 112, 110.2, 112.5, 111, 111.4, 107.8,
      106.4, 111.6, 110.7, 111.3, 107.7, 103.2, 103.9, 102.7, 104.9, 105.2,
      106.5, 110.2, 110.1, 108.1, 105.4, 102.5, 105.7, 104.2, 101.9, 100.2, 99,
      97.8, 99.2, 102.2, 106, 106.4, 106.2, 104, 104.3, 101.9, 105, 109.6,
      113.4, 106.4, 106.3, 103.1, 101.1, 100, 103.4, 101.4, 104.5, 106.9, 111.6,
      111.7, 108.2, 89.9, 97.9, 93.9, 94.6, 91.1, 88.5, 90.1, 94.7, 97.7, 98.5,
      101.4, 100.8, 99.5, 102.7, 105.4, 105.8, 105.7, 106.3, 102, 98.9, 96.1,
      99.6, 91.2, 94.8, 86.6, 88, 89, 83.9, 85.5, 81.2, 82.5, 87.8, 87.7, 92.3,
      90.7, 87.6, 89.2, 90, 89.3, 92.1, 91.6, 86.3, 84.6, 83.2, 82.3, 83.6,
      83.8, 77.3, 71.6, 74.1, 73.1, 86.8, 81.6, 84.2, 84, 85.2, 79.3, 77, 73.6,
      75.1, 78, 80.8, 84.3, 82.5, 82.7, 82.7, 84.7, 86.9, 86.4, 86.2, 88.8,
      89.1, 88.5, 93.4, 98.6, 102.7, 102.3, 102.8, 102.9, 102, 100, 100.8, 99.6,
      102.8, 102.3, 105.6, 102.6, 104.3, 107.2, 107.7, 106.2, 107.6, 108.2,
      109.3, 108.4, 110, 107.7, 109.8, 109.4, 110.4, 109.2, 109.4, 112.2, 117.1,
      117.7, 119.7, 119.9, 116.3, 119.3, 120.9, 120.1, 121.4, 123.6, 124.5,
      125.2, 124.5, 129.6, 130.1, 131.3, 130.9, 130.1, 126.8, 129.6, 131.9,
      131.7, 134.1, 133.2, 136.1, 135, 131.8, 136.6, 135.3, 136.2, 137.2, 138.7,
      138.2, 139, 137.8, 138.1, 137, 138.1, 133.3, 133.1, 132.8, 135.1, 136.5,
      138, 137.8, 136.7, 132.2, 129.6, 129.5, 130.3, 126.8, 127.7, 129.6, 134.6,
      134.5, 135, 134.9, 132.7, 129.2, 133.8, 134.1, 139.4, 135.4, 134.3, 134.9,
      135.2, 138, 141.6, 142.1, 143.4, 142.4, 140.8, 140.4, 143.5, 146.2, 139,
      142.9, 136.6, 136.5, 138, 139.1, 138.6, 137.5, 136.8, 138.3, 141.4, 145.3,
      152.6, 157.1, 154, 153.7, 157, 150.8, 148.2, 142.7, 142.8, 151.1, 146.6,
      147.1, 141.8, 144.3, 141.6, 137.6, 141.6, 137.1, 135.8, 138.5, 135, 136.8,
      134.3, 136.6, 137.7, 136.3, 139.2, 138.4, 140.8, 140.4, 139.5, 137.3,
      132.8, 133.8, 134.9, 129.7, 132.2, 137.4, 139.4, 143.6, 143.1, 144.6,
      142.9, 142.3, 141.5, 143.3, 142.8, 142.1, 143.5, 140.4, 140.3, 140.4, 141,
    ],
  },
];

/** Where the notification fires for a deal: the day it was DISCLOSED. For
 *  most filings that is the same point as the trade on this scale; a late
 *  Congressional PTR is weeks later, and says so. */
export function alertIndexOf(deal: HeroDeal): number {
  return deal.filedIndex ?? deal.buyIndex;
}

/** The outcome a deal's story ends on: the move from the alert to the last
 *  close in the window, as a whole percent floored toward zero (the panel
 *  never claims more than it draws), and the hold length in calendar days. */
export function outcomeOf(deal: HeroDeal): { pct: number; days: number } {
  const from = deal.series[alertIndexOf(deal)];
  const to = deal.series[deal.series.length - 1];
  const pct = Math.trunc(((to - from) / from) * 100);
  const days = Math.round(
    (Date.parse(deal.asOf) - Date.parse(deal.disclosedDate)) / 86_400_000,
  );

  return { pct, days };
}

/** "107 days" up to about four months, "6 months" beyond — a year-old filing
 *  quoted in days reads as a countdown, not a hold. Months floor, so the
 *  line never rounds a hold up. */
export function formatHold(days: number): string {
  if (days <= 120) return `${days} days`;
  const months = Math.floor(days / 30.44);

  return `${months} month${months === 1 ? "" : "s"}`;
}

export function dealsForMarket(marketId?: string): HeroDeal[] {
  if (marketId === "us") return US_DEALS;
  if (marketId === "usg") return USG_DEALS;

  return UK_DEALS;
}
