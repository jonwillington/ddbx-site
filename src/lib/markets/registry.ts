// Central registry of every market the site knows about — the MarketSwitcher
// (route → flag/label) and MarketPage (route → config) read from here, so it
// stays the one place a market is declared to exist. Page titles and
// descriptions are NOT here: they live in shared/seo.js, which the edge renders
// into the HTML for crawlers before this code ever runs.
//
// Adding a new market:
//   1. Write its MarketConfig at src/lib/markets/<id>.tsx
//   2. Add an entry below with its route prefix
//   3. Mount a page shim at src/pages/<id>-preview.tsx (1 line) and wire
//      routes in src/App.tsx
import type { MarketConfig } from "./types";

import {
  GB,
  NL,
  SE,
  US,
  type FlagComponent,
} from "country-flag-icons/react/3x2";

// Host maps and the route → market rules live in shared/seo.js. The edge
// (functions/_middleware.js) has to answer "which market owns this URL?"
// before any of this React code exists, and two copies of that answer would
// drift — so this module is a consumer of them, not a second source.
import {
  HOST_DEFAULT_MARKET,
  MARKET_HOST_BY_ID,
  marketIdForPath,
} from "../../../shared/seo.js";

import { CongressMarket } from "./congress";
import { DjtMarket } from "./djt";
import { NetherlandsMarket } from "./netherlands";
import { SwedenMarket } from "./sweden";
import { UkMarket } from "./uk";
import { UsMarket } from "./us";

export type MarketRegion = "europe" | "north-america";

export const REGION_LABEL: Record<MarketRegion, string> = {
  europe: "Europe",
  "north-america": "North America",
};

/** Order regions render in the switcher dropdown. */
export const REGION_ORDER: MarketRegion[] = ["europe", "north-america"];

export interface MarketRegistryEntry {
  /** MarketConfig.id — "uk" | "us" | "se" | "nl". */
  id: string;
  /** Short code for the switcher chip. */
  code: string;
  /** Display label in the switcher dropdown. */
  label: string;
  /** Route the switcher links to. */
  route: string;
  /** Canonical dashboard path for this market on its own domain. */
  canonicalRoute: string;
  /** Flag icon component. */
  Flag: FlagComponent;
  /** Region the market lives in — drives switcher grouping. */
  region: MarketRegion;
  /** Hidden markets keep their routes + domain mapping but never show in the
   *  navbar switcher (e.g. Trump Media — reachable at /djt, not promoted). */
  hidden?: boolean;
  /** The MarketConfig itself — what MarketPage consumes. */
  config: MarketConfig;
}

export const MARKETS: MarketRegistryEntry[] = [
  {
    id: "uk",
    code: "UK",
    label: "UK",
    route: "/",
    canonicalRoute: "/",
    Flag: GB,
    region: "europe",
    config: UkMarket as MarketConfig,
  },
  {
    id: "us",
    code: "US",
    label: "US",
    route: "/us",
    canonicalRoute: "/",
    Flag: US,
    region: "north-america",
    config: UsMarket as MarketConfig,
  },
  {
    id: "usg",
    code: "USG",
    label: "Congress",
    route: "/congress",
    canonicalRoute: "/congress",
    Flag: US,
    region: "north-america",
    config: CongressMarket as MarketConfig,
  },
  {
    id: "djt",
    code: "DJT",
    label: "Trump Media",
    route: "/djt",
    canonicalRoute: "/djt",
    Flag: US,
    region: "north-america",
    hidden: true,
    config: DjtMarket as MarketConfig,
  },
  {
    id: "se",
    code: "SE",
    label: "SE",
    route: "/se",
    canonicalRoute: "/",
    Flag: SE,
    region: "europe",
    config: SwedenMarket as MarketConfig,
  },
  {
    id: "nl",
    code: "NL",
    label: "NL",
    route: "/nl",
    canonicalRoute: "/nl",
    Flag: NL,
    region: "europe",
    config: NetherlandsMarket as MarketConfig,
  },
];

function safeHostname(hostname?: string): string | null {
  if (hostname && hostname.trim().length > 0) return hostname.toLowerCase();
  if (typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname.toLowerCase();
  }

  return null;
}

function byId(id: string): MarketRegistryEntry | undefined {
  return MARKETS.find((m) => m.id === id);
}

/** Canonical dashboard path on the market's own domain. */
export function marketDashboardPath(market: MarketRegistryEntry): string {
  return market.canonicalRoute;
}

/** Canonical performance path on the market's own domain. */
export function marketPerformancePath(market: MarketRegistryEntry): string {
  if (market.id === "uk") return "/portfolio";
  if (market.id === "nl") return "/nl/performance";

  return "/performance";
}

/** Build a market-aware URL. In local/dev hosts this stays relative. */
export function marketHref(
  market: MarketRegistryEntry,
  path: string,
  hostname?: string,
): string {
  const host = safeHostname(hostname);
  const targetHost = MARKET_HOST_BY_ID[market.id];

  // Dev/local hosts (localhost, preview URLs) don't participate in
  // domain-based routing. Keep links on the current origin and map
  // canonical cross-domain paths back to the local route shape.
  if (!host || !(host in HOST_DEFAULT_MARKET)) {
    return localPathForMarket(market, path);
  }
  if (!targetHost) return path;
  if (host === targetHost) return path;

  return `https://${targetHost}${path}`;
}

function localPathForMarket(
  market: MarketRegistryEntry,
  canonicalPath: string,
): string {
  if (canonicalPath === "/") return market.route;
  if (canonicalPath === "/performance") {
    return market.id === "uk" ? "/portfolio" : `${market.route}/performance`;
  }

  return canonicalPath;
}

/** "Get in touch" / support address for the market that owns this route —
 *  `trades@` on the market's own domain (UK → trades@ddbx.uk, US → trades@
 *  ddbx.us, SE/NL → trades@ddbx.eu). Falls back to ddbx.uk. */
export function marketContactEmail(
  pathname: string,
  hostname?: string,
): string {
  const market = marketForPath(pathname, hostname);

  return `trades@${MARKET_HOST_BY_ID[market.id] ?? "ddbx.uk"}`;
}

/** Resolve a route to its owning market. UK is the default for paths that
 *  don't match a more specific market prefix. */
export function marketForPath(
  pathname: string,
  hostname?: string,
): MarketRegistryEntry {
  const uk = MARKETS.find((m) => m.id === "uk");

  if (!uk) throw new Error("UK market must be registered");

  // The rules themselves (preview aliases, /congress vs /directors/:id, the
  // host default, longest-prefix fallback) live in shared/seo.js so the edge
  // resolves routes identically. This just maps the id back to its entry.
  return (
    byId(marketIdForPath(pathname, safeHostname(hostname) ?? undefined)) ?? uk
  );
}
