/** The search palette's corpus: companies, insiders and the site's own pages,
 *  scoped to the market the reader is on.
 *
 *  Companies and insiders come from the same two index endpoints the
 *  /companies and /directors hubs read (/api/companies, /api/directors-index),
 *  fetched once per market on the palette's first open and held for the
 *  session. They are edge-cached lists of a few hundred KB, which is cheaper
 *  than a round trip per keystroke and makes every result instant after the
 *  first.
 *
 *  Only UK and US have those indexes. Congress and Trump Media ride the US
 *  host and get its lists; SE, NL and KR have no company or insider pages, so
 *  they search pages only rather than linking a reader into a 404.
 *
 *  Pages are the navigation the masthead and footer already carry (site-nav),
 *  plus every glossary guide the market owns — one list, so search can never
 *  offer a page the nav would not. */

import type { DirectorIndexRow } from "@/types/ddbx";

import { entriesForOwner, learnPath } from "../../../shared/glossary.js";
import { directorMeetsBar, directorPath } from "../../../shared/directors.js";
import { usInsiderDisplayName } from "../../../shared/us-names.js";

import { searchable, type Searchable } from "./match";

import { api, type CompanyIndexEntry } from "@/lib/api";
import { cleanCompanyName, companyHref, displayTicker } from "@/lib/company";
import { displayCompany } from "@/lib/display-name";
import {
  MARKETS,
  marketDashboardPath,
  marketHref,
  type MarketRegistryEntry,
} from "@/lib/markets/registry";
import { footerGroups, learnNavLinks } from "@/lib/site-nav";

export type EntityMarket = "uk" | "us";

/** The entity lists a market id searches, or null for markets with none. */
export function entityMarketFor(marketId: string): EntityMarket | null {
  if (marketId === "uk") return "uk";
  if (marketId === "us" || marketId === "usg" || marketId === "djt")
    return "us";

  return null;
}

export interface CompanyHit {
  kind: "company";
  id: string;
  href: string;
  name: string;
  ticker: string;
  /** Storage key, for the logo. */
  key: string;
  market: EntityMarket;
  deals: number;
  lastTrade: string;
  s: Searchable;
  /** Tie-break inside a score tier. */
  weight: number;
}

export interface InsiderHit {
  kind: "insider";
  id: string;
  href: string;
  name: string;
  company: string;
  ticker: string;
  market: EntityMarket;
  buys: number;
  s: Searchable;
  weight: number;
}

export interface PageHit {
  kind: "page";
  id: string;
  href: string;
  name: string;
  /** Which part of the site it belongs to — Research, Learn… */
  group: string;
  s: Searchable;
  weight: number;
}

export type SearchHit = CompanyHit | InsiderHit | PageHit;

export interface EntityIndex {
  companies: CompanyHit[];
  insiders: InsiderHit[];
}

const cache = new Map<EntityMarket, Promise<EntityIndex>>();
const settled = new Map<EntityMarket, EntityIndex>();

function recencyBoost(iso: string | undefined): number {
  if (!iso) return 0;
  const days = (Date.now() - Date.parse(iso)) / 86_400_000;

  return Number.isFinite(days) ? Math.max(0, 1 - days / 365) : 0;
}

function buildCompanies(
  rows: CompanyIndexEntry[],
  market: EntityMarket,
): CompanyHit[] {
  return rows.flatMap((c) => {
    const href = companyHref(c.key, market);

    if (!href) return [];
    const ticker = displayTicker(c.key);
    const name =
      market === "us"
        ? displayCompany(c.company, c.key)
        : cleanCompanyName(c.company);

    return [
      {
        kind: "company" as const,
        id: `c:${market}:${c.key}`,
        href,
        name,
        ticker,
        key: c.key,
        market,
        deals: c.deals,
        lastTrade: c.last_trade_date,
        s: searchable(name, ticker),
        weight:
          Math.log1p(c.deals) +
          0.5 * Math.log1p(c.analysed) +
          recencyBoost(c.last_trade_date),
      },
    ];
  });
}

function buildInsiders(
  rows: DirectorIndexRow[],
  market: EntityMarket,
  home: MarketRegistryEntry,
): InsiderHit[] {
  const host =
    typeof window === "undefined" ? undefined : window.location.hostname;

  return rows.map((d) => {
    const name = market === "us" ? usInsiderDisplayName(d.name) : d.name;
    const company =
      market === "us"
        ? displayCompany(d.company, d.ticker)
        : cleanCompanyName(d.company);

    return {
      kind: "insider" as const,
      id: `d:${market}:${d.id}`,
      href: marketHref(home, directorPath(d.id, market), host),
      name,
      company,
      ticker: d.ticker,
      market,
      buys: d.buys,
      s: searchable(name, "", company),
      weight:
        Math.log1p(d.buys) +
        (directorMeetsBar(d) ? 1 : 0) +
        recencyBoost(d.last_disclosed),
    };
  });
}

/** Companies and insiders for a market. One request pair per market per
 *  session; a failure is not cached, so the next open tries again. */
export function loadEntityIndex(market: EntityMarket): Promise<EntityIndex> {
  const hit = cache.get(market);

  if (hit) return hit;
  const home = MARKETS.find((m) => m.id === market)!;
  const p = Promise.all([
    api.companies(market === "us" ? "US" : "UK"),
    api.directorsIndex(market).then((r) => r.directors ?? []),
  ]).then(([companies, directors]) => {
    const idx = {
      companies: buildCompanies(companies, market),
      insiders: buildInsiders(directors, market, home),
    };

    settled.set(market, idx);

    return idx;
  });

  cache.set(market, p);
  p.catch(() => cache.delete(market));

  return p;
}

/** Synchronous peek at an index that has already arrived, so a reopened
 *  palette renders its results on the first frame instead of flashing the
 *  loading rows. */
export function settledEntityIndex(market: EntityMarket): EntityIndex | null {
  return settled.get(market) ?? null;
}

/** Every page the palette can offer on this market, deduplicated by href. */
export function pageCatalogue(
  pathname: string,
  market: MarketRegistryEntry,
): PageHit[] {
  const host =
    typeof window === "undefined" ? undefined : window.location.hostname;
  const out = new Map<string, PageHit>();
  const add = (name: string, href: string, group: string, weight = 0) => {
    if (out.has(href)) return;
    out.set(href, {
      kind: "page",
      id: `p:${href}`,
      href,
      name,
      group,
      s: searchable(name, "", group),
      weight,
    });
  };

  add(
    `${market.label} deals`,
    marketHref(market, marketDashboardPath(market), host),
    "Deals",
    3,
  );
  const entityMarket = entityMarketFor(market.id);

  if (entityMarket) {
    add(
      "All insiders",
      marketHref(
        market,
        directorPath("", entityMarket).replace(/\/$/, ""),
        host,
      ),
      "Research",
      2,
    );
  }

  for (const g of footerGroups(pathname, host)) {
    for (const l of g.links)
      add(l.label, l.href, g.title, g.title === "Research" ? 2 : 1);
  }

  if (market.id === "uk" || market.id === "us") {
    for (const l of learnNavLinks(pathname, host))
      add(l.label, l.href, "Learn", 1);
    const owner = market.id === "us" ? "us" : "uk";

    for (const e of entriesForOwner(owner)) {
      add(
        e.title ?? e.term,
        marketHref(market, learnPath(e.slug), host),
        "Learn",
      );
    }
  }

  add("API", "/api", "Developers");
  add("MCP connector", "/mcp", "Developers");

  return [...out.values()];
}
