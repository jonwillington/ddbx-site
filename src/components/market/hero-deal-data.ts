/** Sample deals for the hero "deal radar" — the notification copy plus the real
 *  HQ location of the company referenced, so the left-hand map can beacon where
 *  each disclosed buy happened and pan between them in lockstep with the
 *  right-hand notification stack.
 *
 *  The live API doesn't carry company HQ geo, so these are curated samples (the
 *  notifications were already hand-picked). Coordinates are the companies' real
 *  head-office cities. */

export type HeroDeal = {
  /** Stable id (used as the React key + the map marker id). */
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
  /** Human-readable HQ location, e.g. "Manchester, UK". */
  city: string;
  /** HQ longitude / latitude (WGS84). */
  lng: number;
  lat: number;
};

export type HeroMapConfig = {
  /** Overview centre the map rests at between beacons. */
  center: [number, number];
  /** Overview zoom. */
  zoom: number;
  /** Zoom the camera flies to when a beacon fires on a city. */
  flyZoom: number;
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
    city: "Alfreton, UK",
    lng: -1.385,
    lat: 53.097,
  },
  {
    id: "av",
    ticker: "AV.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "JUST IN",
    lead: "AV. · Aviva",
    body: "CEO bought £120k in the open market, the largest board purchase this year.",
    city: "London, UK",
    lng: -0.082,
    lat: 51.514,
  },
  {
    id: "otb",
    ticker: "OTB.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "SIGNAL",
    lead: "OTB · On The Beach",
    body: "Chairman added £45k, his first open-market purchase in over two years.",
    city: "Manchester, UK",
    lng: -2.242,
    lat: 53.48,
  },
  {
    id: "alt",
    ticker: "ALT.L",
    icon: "/ios-app-icon-uk.png",
    app: "ddbx.uk",
    tag: "NEW FILING",
    lead: "ALT · Altitude Group",
    body: "CFO topped up £12k, a third cluster buy this quarter near the lows.",
    city: "Manchester, UK",
    lng: -2.291,
    lat: 53.463,
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
    city: "Denver, CO",
    lng: -104.99,
    lat: 39.739,
  },
  {
    id: "gs",
    ticker: "GS",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "JUST IN",
    lead: "GS · Goldman Sachs",
    body: "Board member bought $300k of stock, the first open-market insider buy since 2022.",
    city: "New York, NY",
    lng: -74.014,
    lat: 40.715,
  },
  {
    id: "sofi",
    ticker: "SOFI",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "SIGNAL",
    lead: "SOFI · SoFi Technologies",
    body: "CEO added $250k of stock near 52-week lows, ~$610k across the month.",
    city: "San Francisco, CA",
    lng: -122.417,
    lat: 37.776,
  },
  {
    id: "rblx",
    ticker: "RBLX",
    icon: "/ios-app-icon-us.png",
    app: "ddbx.us",
    tag: "NEW FILING",
    lead: "RBLX · Roblox",
    body: "CFO purchased $90k — a second open-market buy in three weeks.",
    city: "San Mateo, CA",
    lng: -122.325,
    lat: 37.563,
  },
];

const UK_MAP: HeroMapConfig = { center: [-1.9, 53.0], zoom: 5.4, flyZoom: 8.5 };
const US_MAP: HeroMapConfig = { center: [-97, 39], zoom: 3.1, flyZoom: 5.6 };

/** Anything other than "us" falls back to UK (matches the notification stack). */
export function dealsForMarket(marketId?: string): HeroDeal[] {
  return marketId === "us" ? US_DEALS : UK_DEALS;
}

export function mapConfigForMarket(marketId?: string): HeroMapConfig {
  return marketId === "us" ? US_MAP : UK_MAP;
}
