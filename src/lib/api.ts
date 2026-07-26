import type {
  BrokerBadge,
  BrokerOffer,
  DailySummaryResponse,
  Dealing,
  DirectorDetail,
  EuDealing,
  EuDirectorDetail,
  GovDealing,
  LatestPrice,
  MonthlySummariesResponse,
  MonthlySummaryResponse,
  Portfolio,
  Rating,
  UkNewsItem,
  UsDealing,
  UsDirectorDetail,
} from "@/types/ddbx";

/** One issuer in the /companies index. */
export interface CompanyIndexEntry {
  /** Storage key — the LSE ticker with its `.L` suffix on UK, the bare symbol
   *  on US. Public URLs drop the suffix; see tickerToSlug in lib/company.ts. */
  key: string;
  company: string;
  deals: number;
  last_trade_date: string;
  /** How many of this issuer's dealings have a written analysis. */
  analysed: number;
}

/** The company-page bundle. Deals arrive as the market's own wire type, so a
 *  UK row is a `Dealing` and a US row a `UsDealing`. */
export interface CompanyPage {
  market: "UK" | "US";
  key: string;
  company: string;
  summary: {
    deals: number;
    /** Distinct directors (UK) or reporting insiders (US). */
    people: number;
    total_value: number;
    currency: "GBP" | "USD";
    first_trade_date: string | null;
    last_trade_date: string | null;
    analysed: number;
    congress_trades: number;
  };
  deals: Array<Dealing | UsDealing>;
  stats: CompanyStatsPanel | null;
  news: { items: UkNewsItem[]; fetched_at: string | null };
  gov: GovDealing[];
}

/** The Freetrade-style stats panel (worker: db/company-stats.ts). */
export interface CompanyStatsPanel {
  beta: number | null;
  peRatio: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  pbRatio: number | null;
  pegRatio: number | null;
  previousClose: number | null;
  open: number | null;
  currency: string | null;
  fetchedAt: string | null;
  description: string | null;
}

export interface EuScrapeResult {
  source: "FI";
  from: string;
  to: string;
  fetched_bytes: number;
  totalRows: number;
  parsed: number;
  skipped: number;
  rows: EuDealing[];
  errors: Array<{ rowIdx: number; message: string }>;
}

export interface UsDealingsStats {
  total: number;
  /** Rows passing the `view=interesting` predicate (open-market direct buy, no 10b5-1, non-derivative, value >= $50k). */
  interesting: number;
  /** Rows in the `interesting` set that also have a Haiku triage verdict in {maybe, promising}. */
  signal: number;
  /** Logical filings (filing_id, transaction_code) that have been triaged at all. */
  triaged: number;
  by_code: Array<{ code: string; n: number }>;
  latest_disclosed_date: string | null;
}

const WORKER_BASE = (() => {
  // Strip the trailing `/api` so admin routes (`/__us-*`) hit the worker root.
  const apiBase =
    (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

  return apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
})();

// In dev, Vite proxies /api to wrangler dev (see vite.config.ts).
// In prod on Cloudflare Pages, set VITE_API_BASE to the Worker URL, e.g.
//   VITE_API_BASE=https://director-dealings.<your-subdomain>.workers.dev/api
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

/** The `/api` base the app fetches from — `/api` in dev (Vite-proxied to
 *  wrangler), the full Worker URL in prod. Exported so non-JSON consumers like
 *  the company-logo image proxy resolve to the same origin. */
export const API_BASE = BASE;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);

  if (!res.ok) throw new Error(`${path} ${res.status}`);

  return (await res.json()) as T;
}

/** In-memory response cache with a five-minute TTL, matching the Worker's
 *  own max-age on /api/prices/*. Ports `PriceHistoryCache` from the iOS
 *  APIClient: re-opening a deal used to refetch its whole series and show
 *  the loading state again, even seconds later.
 *
 *  Stores the in-flight promise rather than the resolved value, so two
 *  components mounting in the same tick share one request instead of
 *  racing. A rejected lookup is evicted so the next caller retries. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<
  string,
  { at: number; value: Promise<unknown> }
>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = responseCache.get(key);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as Promise<T>;

  const value = load().catch((err) => {
    responseCache.delete(key);
    throw err;
  });

  responseCache.set(key, { at: Date.now(), value });

  return value;
}

export const api = {
  dealings: (rating?: Rating) =>
    get<{ dealings: Dealing[] }>(
      rating ? `/dealings?rating=${rating}` : "/dealings",
    ).then((r) => r.dealings),
  /** Windowed history walk — `since` is an inclusive ISO YYYY-MM-DD lower
   *  bound on disclosed_date; the worker honours `limit` up to 1000 (the
   *  no-param default is 200, ~a month of UK flow). Feeds surfaces that need
   *  more history than the default list, e.g. the channel's 90-day backtest. */
  dealingsWindow: (since: string, limit = 1000) =>
    get<{ dealings: Dealing[] }>(
      `/dealings?since=${since}&limit=${limit}`,
    ).then((r) => r.dealings),
  dealing: (id: string) => get<Dealing>(`/dealings/${id}`),
  portfolio: (fy?: number) =>
    get<Portfolio>(fy != null ? `/portfolio?fy=${fy}` : `/portfolio`),
  director: (id: string) => get<DirectorDetail>(`/directors/${id}`),
  usDirector: (id: string) => get<UsDirectorDetail>(`/directors/us/${id}`),
  seDirector: (nameOrKey: string) =>
    get<EuDirectorDetail>(`/directors/se/${encodeURIComponent(nameOrKey)}`),
  nlDirector: (nameOrKey: string) =>
    get<EuDirectorDetail>(`/directors/nl/${encodeURIComponent(nameOrKey)}`),
  latestPrices: (tickers: string[]) =>
    get<{ prices: LatestPrice[] }>(
      `/prices/latest?tickers=${tickers.join(",")}`,
    ).then((r) => r.prices),
  priceOn: (ticker: string, date: string) =>
    get<{ price: number | null }>(
      `/prices/on?ticker=${encodeURIComponent(ticker)}&date=${date}`,
    ).then((r) => r.price),
  priceHistory: (ticker: string, days = 90) =>
    cached(`history:${ticker}:${days}`, () =>
      get<{ bars: { date: string; close_pence: number }[] }>(
        `/prices/history?ticker=${encodeURIComponent(ticker)}&days=${days}`,
      ).then((r) => r.bars),
    ),
  gbpPerUsdHistory: (days = 730) =>
    get<{ rates: { date: string; gbp_per_usd: number }[] }>(
      `/fx/gbp-per-usd?days=${days}`,
    ).then((r) => r.rates),
  /** Index of available monthly retrospectives for a market, newest first.
   *  UK omits the market param (like the other endpoints). Powers the
   *  "View the {month} report" CTA and the month chooser. */
  monthlySummaries: (market?: string) =>
    get<MonthlySummariesResponse>(
      `/monthly-summaries${market ? `?market=${market}` : ""}`,
    ),
  /** Full monthly retrospective article for a YYYY-MM month. */
  monthlySummary: (month: string, market?: string) =>
    get<MonthlySummaryResponse>(
      `/monthly-summary?month=${month}${market ? `&market=${market}` : ""}`,
    ),
  ukNews: () =>
    get<{ items: UkNewsItem[]; fetched_at: string | null }>("/news/uk"),
  usNews: () =>
    get<{ items: UkNewsItem[]; fetched_at: string | null }>("/news/us"),
  seNews: () =>
    get<{ items: UkNewsItem[]; fetched_at: string | null }>("/news/se"),
  nlNews: () =>
    get<{ items: UkNewsItem[]; fetched_at: string | null }>("/news/nl"),
  /** Broker-comparison / affiliate directory for a market (UK default). The
   *  list is small and long-cached, so the detail page reuses it via
   *  `broker(slug)` rather than hitting a per-slug endpoint. */
  brokers: (market = "UK") =>
    get<{ brokers: BrokerOffer[] }>(`/brokers?market=${market}`).then(
      (r) => r.brokers,
    ),
  broker: (slug: string, market = "UK") =>
    get<{ brokers: BrokerOffer[] }>(`/brokers?market=${market}`).then(
      (r) => r.brokers.find((b) => b.slug === slug) ?? null,
    ),
  /** Everything one company page renders, in a single edge-cached response:
   *  the issuer's dealings with analysis attached, the Yahoo stats panel,
   *  recent news, and — on US issuers — congressional trades in the same
   *  ticker. Bundled rather than fanned out because these pages get crawled;
   *  see functions/company/[key].js. */
  companyPage: (market: string, key: string) =>
    get<CompanyPage>(
      `/company/${market.toUpperCase()}/${encodeURIComponent(key)}/page`,
    ),
  /** Indexable issuers for a market, with the counts the /companies hub and
   *  the sitemap use to apply their content bar. */
  companies: (market = "UK") =>
    get<{ market: string; companies: CompanyIndexEntry[] }>(
      `/companies?market=${market.toUpperCase()}`,
    ).then((r) => r.companies),
  version: () => get<{ latest: string | null; total: number }>("/version"),
  /** UK daily summary for a given YYYY-MM-DD. Returns null on 404 — the
   *  endpoint 404s for days the team hasn't written one for yet, which
   *  is expected, not an error the UI should surface. */
  dailySummary: async (date: string): Promise<DailySummaryResponse | null> => {
    const res = await fetch(
      `${BASE}/daily-summary?date=${encodeURIComponent(date)}`,
    );

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`/daily-summary ${res.status}`);

    return (await res.json()) as DailySummaryResponse;
  },
  /** USG — congressional (House STOCK Act) dealings. view=signal returns the
   *  triage-cleared set (jurisdiction + notable/marquee); view=all the raw
   *  buy stream. Buys only (sales/junk dropped server-side). */
  govDealings: (
    opts: { view?: "signal" | "all"; ticker?: string; limit?: number } = {},
  ) => {
    const qs = new URLSearchParams();

    if (opts.view) qs.set("view", opts.view);
    if (opts.ticker) qs.set("ticker", opts.ticker);
    if (opts.limit != null) qs.set("limit", String(opts.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return get<{ dealings: GovDealing[] }>(`/gov-dealings${suffix}`);
  },
  usDealings: (
    opts: {
      limit?: number;
      code?: string;
      ticker?: string;
      view?: "interesting" | "signal" | "all";
      /** Inclusive ISO YYYY-MM-DD lower bound on disclosed date — used by the
       *  channel's 90-day performance window. */
      since?: string;
    } = {},
  ) => {
    const qs = new URLSearchParams();

    if (opts.limit != null) qs.set("limit", String(opts.limit));
    if (opts.code) qs.set("code", opts.code);
    if (opts.ticker) qs.set("ticker", opts.ticker);
    if (opts.view) qs.set("view", opts.view);
    if (opts.since) qs.set("since", opts.since);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return get<{ dealings: UsDealing[]; stats: UsDealingsStats }>(
      `/us-dealings${suffix}`,
    );
  },
  /** Trump Media (DJT) insider Form 4 feed — all transaction types (grants,
   *  sales, buys), newest disclosure first. Same UsDealing wire shape as
   *  usDealings, but no view mask / rating / triage (the DJT vertical is a raw
   *  company-insider feed). See ddbx-data /api/djt-dealings. */
  djtDealings: (opts: { limit?: number; reporter?: string } = {}) => {
    const qs = new URLSearchParams();

    if (opts.limit != null) qs.set("limit", String(opts.limit));
    if (opts.reporter) qs.set("reporter", opts.reporter);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return get<{ dealings: UsDealing[] }>(`/djt-dealings${suffix}`);
  },
  euScrape: async (from: string, to: string): Promise<EuScrapeResult> => {
    // Dry-run EU scrape (currently Sweden FI). Returns parsed rows without
    // persistence — kept around for ad-hoc spot-checks of the parser. The
    // /eu page reads from persisted /api/eu-dealings rather than calling
    // this each load.
    const qs = new URLSearchParams({ from, to });
    const res = await fetch(`${WORKER_BASE}/__eu-scrape?${qs.toString()}`, {
      method: "POST",
    });

    if (!res.ok) throw new Error(`/__eu-scrape ${res.status}`);

    return (await res.json()) as EuScrapeResult;
  },
  euDealings: (
    opts: {
      limit?: number;
      since?: string;
      market?: "SE" | "NL";
      /** Curated view. "interesting" = mechanical eligible set (open-market
       *  buy/sell above the per-market noise floor, off-exchange/zero-price/
       *  amendment/programme stripped via is_open_market_buy). "signal" adds a
       *  Haiku triage verdict of maybe/promising. Omit / "all" = raw feed. */
      view?: "interesting" | "signal" | "all";
    } = {},
  ) => {
    const qs = new URLSearchParams();

    if (opts.limit != null) qs.set("limit", String(opts.limit));
    if (opts.since) qs.set("since", opts.since);
    if (opts.market) qs.set("market", opts.market);
    if (opts.view) qs.set("view", opts.view);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return get<{ dealings: EuDealing[]; stats: EuDealingsStats }>(
      `/eu-dealings${suffix}`,
    );
  },
};

export interface EuDealingsStats {
  total: number;
  latest_disclosed_date: string | null;
  by_market: Array<{ market: string; n: number }>;
}

export type {
  BrokerBadge,
  BrokerOffer,
  DailySummaryResponse,
  Dealing,
  DirectorDetail,
  EuDealing,
  EuDirectorDetail,
  GovDealing,
  LatestPrice,
  MonthlySummariesResponse,
  MonthlySummaryResponse,
  Portfolio,
  Rating,
  UkNewsItem,
  UsDealing,
  UsDirectorDetail,
};
