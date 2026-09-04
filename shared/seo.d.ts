// Type surface for shared/seo.js. The implementation is plain ESM JS because
// Cloudflare Pages Functions bundle it directly (see the header comment there);
// these declarations keep the TypeScript side of the app fully checked.

export declare const BRAND: string;
export declare const SITE_NAME: string;

export declare const MARKET_HOST_BY_ID: Record<string, string>;
export declare const HOST_DEFAULT_MARKET: Record<string, string>;
/** Market ids that publish their own broker directory. Drives canonical
 *  selection, the primary nav and the sitemap — see shared/seo.js. */
export declare const BROKER_DIRECTORY_MARKET_IDS: string[];
export declare function marketPublishesBrokers(marketId: string): boolean;
export declare function brokerCanonicalHost(hostname: string): string;
export declare function brokerMarketForHost(hostname: string): string | null;

export interface MarketSeo {
  label: string;
  documentTitle: string;
}

export declare const MARKET_SEO: Record<string, MarketSeo>;

export interface RouteSeo {
  title: string;
  description: string;
  /** Market id the route resolved to — "uk" | "us" | "usg" | "djt" | "se" | "nl". */
  marketId: string;
}

/** `ddbx · <rest>` — the one title shape the whole site uses. */
export declare function brandTitle(rest: string): string;

export declare function isProductionHost(hostname?: string): boolean;
/** True when `pathname` is a UK/US-only research page (sectors, biggest-buys,
 *  companies, company, reports) served on a host whose market is SE or NL. */
export declare function isForeignResearchPath(
  pathname?: string,
  hostname?: string,
): boolean;
export declare function marketIdForPath(
  pathname: string,
  hostname?: string,
): string;
export declare function seoForPath(
  pathname: string,
  hostname?: string,
): RouteSeo;
export declare function canonicalUrlFor(
  pathname: string,
  hostname?: string,
): string | null;
export declare function isIndexable(
  pathname: string,
  hostname?: string,
): boolean;
