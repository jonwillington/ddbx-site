// Central registry of every market the site knows about. Both the
// MarketSwitcher (route → flag/label) and DocumentTitle (route → page title)
// read from here so we have one place to declare a market exists.
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

const MARKET_HOST_BY_ID: Record<string, string> = {
  uk: "ddbx.uk",
  us: "ddbx.us",
  se: "ddbx.eu",
  nl: "ddbx.eu",
};

const HOST_DEFAULT_MARKET: Record<string, string> = {
  "ddbx.uk": "uk",
  "www.ddbx.uk": "uk",
  "ddbx.us": "us",
  "www.ddbx.us": "us",
  "ddbx.eu": "se",
  "www.ddbx.eu": "se",
};

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

/** Resolve a route to its owning market. UK is the default for paths that
 *  don't match a more specific market prefix. */
export function marketForPath(
  pathname: string,
  hostname?: string,
): MarketRegistryEntry {
  const uk = MARKETS.find((m) => m.id === "uk");
  const host = safeHostname(hostname);

  if (!uk) throw new Error("UK market must be registered");
  if (pathname.startsWith("/us-preview"))
    return MARKETS.find((m) => m.id === "us") ?? uk;
  if (pathname.startsWith("/se-preview") || pathname.startsWith("/eu"))
    return MARKETS.find((m) => m.id === "se") ?? uk;
  if (pathname.startsWith("/nl-preview"))
    return MARKETS.find((m) => m.id === "nl") ?? uk;
  if (pathname === "/us" || pathname.startsWith("/us/"))
    return MARKETS.find((m) => m.id === "us") ?? uk;
  if (pathname === "/se" || pathname.startsWith("/se/"))
    return MARKETS.find((m) => m.id === "se") ?? uk;
  if (pathname === "/nl" || pathname.startsWith("/nl/"))
    return MARKETS.find((m) => m.id === "nl") ?? uk;

  if (host && HOST_DEFAULT_MARKET[host]) {
    return byId(HOST_DEFAULT_MARKET[host]) ?? uk;
  }

  const match = MARKETS.filter((m) => m.route !== "/")
    .sort((a, b) => b.route.length - a.route.length)
    .find((m) => pathname === m.route || pathname.startsWith(`${m.route}/`));

  if (match) return match;

  return uk;
}
