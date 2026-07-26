// Single source of truth for route → title / description / canonical.
//
// Two very different consumers read this file:
//   1. the SPA, via src/components/document-title.tsx (runtime, after hydration)
//   2. the edge, via functions/_middleware.js (before the HTML leaves Cloudflare)
//
// (2) is the one search engines and link-preview crawlers actually see — they
// don't run the SPA's JS, so without the edge pass every route would serve the
// static index.html title. Both must agree, hence one module.
//
// Why plain JS at the repo root: Pages Functions are bundled separately from the
// Vite app and can't resolve the "@/" alias or .tsx; the app can't import from
// functions/. A dependency-free ESM module is the one shape both pipelines
// accept. Types live alongside in seo.d.ts so the TS side stays checked.

export const BRAND = "ddbx";
export const SITE_NAME = "Director Dealings";

/** Domain that owns each market. Mirrors MARKET_HOST_BY_ID in
 *  src/lib/markets/registry.ts, which imports it from here. */
export const MARKET_HOST_BY_ID = {
  uk: "ddbx.uk",
  us: "ddbx.us",
  // Congress lives on the US domain at /congress (the US Form 4 market owns
  // the ddbx.us root). Clicking it from any other domain crosses over.
  usg: "ddbx.us",
  // Trump Media insiders ride the US domain at /djt (like Congress).
  djt: "ddbx.us",
  se: "ddbx.eu",
  nl: "ddbx.eu",
};

/** Market a bare domain root resolves to. A host absent from this map is a
 *  non-production origin (localhost, *.pages.dev) — see isProductionHost. */
export const HOST_DEFAULT_MARKET = {
  "ddbx.uk": "uk",
  "www.ddbx.uk": "uk",
  "ddbx.us": "us",
  "www.ddbx.us": "us",
  "ddbx.eu": "se",
  "www.ddbx.eu": "se",
};

/** Route prefix each non-root market is mounted at, for the fallback match. */
const MARKET_ROUTES = {
  us: "/us",
  usg: "/congress",
  djt: "/djt",
  se: "/se",
  nl: "/nl",
};

/** Per-market page copy. Market configs (src/lib/markets/*.tsx) source their
 *  MarketConfig.documentTitle from here so the SPA, the edge and the market
 *  registry can't drift apart. */
export const MARKET_SEO = {
  uk: {
    label: "UK",
    documentTitle: "ddbx · Director Dealings — UK Insider Transactions",
  },
  us: {
    label: "US",
    documentTitle: "ddbx · Director Dealings — US Form 4 Filings",
  },
  usg: {
    label: "Congress",
    documentTitle:
      "ddbx · Congressional Trading — US Congress STOCK Act Filings",
  },
  djt: {
    label: "Trump Media",
    documentTitle: "ddbx · Trump Media (DJT) — insider trades",
  },
  se: {
    label: "SE",
    documentTitle: "ddbx · Director Dealings — Swedish PDMR Disclosures",
  },
  nl: {
    label: "NL",
    documentTitle: "ddbx · Director Dealings — Dutch PDMR Disclosures",
  },
};

/** Routes that render real content but should never be indexed. Deliberately
 *  short: /t/{id} is NOT here — those share links are served by their own
 *  Function and Twitterbot honours robots.txt, so blocking them would break
 *  unfurls. */
const NOINDEX_PATHS = ["/account-deletion"];

/** True for the three live domains (and their www forms). Anything else is a
 *  preview or local build, which we noindex rather than let compete. */
export function isProductionHost(hostname) {
  return normaliseHost(hostname) in HOST_DEFAULT_MARKET;
}

function normaliseHost(hostname) {
  return String(hostname ?? "")
    .toLowerCase()
    .trim();
}

/** Resolve a route to its owning market id. Ported rule-for-rule from
 *  marketForPath() in src/lib/markets/registry.ts, which now delegates here —
 *  the check ORDER is load-bearing (see the comments on each branch there). */
export function marketIdForPath(pathname, hostname) {
  const path = String(pathname ?? "/");
  const host = normaliseHost(hostname);

  if (path.startsWith("/us-preview")) return "us";
  if (path.startsWith("/se-preview") || path.startsWith("/eu")) return "se";
  if (path.startsWith("/nl-preview")) return "nl";
  if (path === "/us" || path.startsWith("/us/")) return "us";
  if (path === "/se" || path.startsWith("/se/")) return "se";
  if (path === "/nl" || path.startsWith("/nl/")) return "nl";
  // Congress: canonical /congress plus the legacy exact /directors path.
  // `/directors/:id` is a UK director profile, so only the bare /directors
  // maps here. Before the host default so it wins on ddbx.us.
  if (
    path === "/congress" ||
    path.startsWith("/congress/") ||
    path === "/directors"
  )
    return "usg";
  if (path === "/djt" || path.startsWith("/djt/")) return "djt";

  if (host && HOST_DEFAULT_MARKET[host]) return HOST_DEFAULT_MARKET[host];

  const match = Object.entries(MARKET_ROUTES)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, route]) => path === route || path.startsWith(`${route}/`));

  return match ? match[0] : "uk";
}

// ---- Route shapes ---------------------------------------------------------

const isPerformancePath = (path) =>
  path === "/portfolio" || path.endsWith("/performance");

const isDirectorProfilePath = (path) => /\/directors\//.test(path);

const isBrokerIndexPath = (path) => path === "/brokers" || path === "/compare";

const isBrokerDetailPath = (path) =>
  path.startsWith("/brokers/") && path.length > "/brokers/".length;

function downloadPlatform(path) {
  if (/\/download\/ios$/.test(path)) return "ios";
  if (/\/download\/android$/.test(path)) return "android";

  return null;
}

const isDownloadPath = (path) =>
  path.endsWith("/download") || downloadPlatform(path) !== null;

/** "trading-212" -> "Trading 212" */
function titleCase(slug) {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

const brokerFromPath = (path) =>
  titleCase(path.split("/").filter(Boolean).at(-1) ?? "");

// ---- Title + description --------------------------------------------------

/** Title and meta description for a route. The SPA and the edge both render
 *  from this, so a change here lands in the tab, the OG card and the SERP at
 *  the same time. */
export function seoForPath(pathname, hostname) {
  const path = String(pathname ?? "/");
  const id = marketIdForPath(path, hostname);
  const market = MARKET_SEO[id] ?? MARKET_SEO.uk;
  const platform = downloadPlatform(path);
  // The device noun is part of the title because these are the URLs that
  // store-specific ad campaigns and "ddbx android app" searches land on — one
  // shared title would have the three variants competing with each other.
  const deviceNoun =
    platform === "android" ? "Android" : platform === "ios" ? "iPhone" : null;

  const title = (() => {
    if (isPerformancePath(path))
      return `${BRAND} · Portfolio (${market.label}) — ${SITE_NAME}`;
    if (isDirectorProfilePath(path))
      return `${BRAND} · Director (${market.label}) — ${SITE_NAME}`;
    if (isBrokerDetailPath(path))
      return `${brokerFromPath(path)} review — fees, accounts & verdict — ${SITE_NAME}`;
    if (isBrokerIndexPath(path))
      return `Compare UK trading platforms — fees, ISAs & SIPPs — ${SITE_NAME}`;
    if (isDownloadPath(path)) {
      const on = deviceNoun ? ` for ${deviceNoun}` : "";

      return id === "us"
        ? `Get ddbx${on} — follow US insider stock buys · 7-day free trial`
        : `Get ddbx${on} — follow UK director share buys · 7-day free trial`;
    }

    return market.documentTitle;
  })();

  const description = (() => {
    if (isPerformancePath(path))
      return `Track ${market.label} insider performance versus benchmark indices on ddbx.`;
    if (isDirectorProfilePath(path))
      return `${market.label} director profile with dealing history and signal context on ddbx.`;
    if (isBrokerDetailPath(path))
      return `${brokerFromPath(path)} review: our verdict on its fees, ISA and SIPP accounts, investment range, features and FSCS protection.`;
    if (isBrokerIndexPath(path))
      return "Compare the UK’s main trading and investing platforms side by side — fees, ISAs, SIPPs, fractional shares and FSCS protection.";
    if (isDownloadPath(path)) {
      const app =
        deviceNoun === "Android"
          ? "the ddbx Android app"
          : deviceNoun === "iPhone"
            ? "the ddbx iPhone app"
            : "the ddbx app";

      return id === "us"
        ? `See which US insiders are buying their own stock — with live performance tracking. Start your 7-day free trial on ${app}.`
        : `See which UK directors are buying shares in their own companies — with live performance tracking. Start your 7-day free trial on ${app}.`;
    }

    return `Analysed ${market.label} insider dealings and director transactions, updated throughout the trading day.`;
  })();

  return { title, description, marketId: id };
}

// ---- Canonical ------------------------------------------------------------

/** Canonical path for a market's performance page on its own domain. Mirrors
 *  marketPerformancePath() in the registry. */
function canonicalPerformancePath(id) {
  if (id === "uk") return "/portfolio";
  if (id === "nl") return "/nl/performance";

  return "/performance";
}

/** Canonical path for a market's dashboard on its own domain. Mirrors each
 *  registry entry's canonicalRoute. */
function canonicalDashboardPath(id) {
  if (id === "usg") return "/congress";
  if (id === "djt") return "/djt";
  if (id === "nl") return "/nl";

  return "/";
}

/** Every route that renders a market dashboard, including the -preview aliases
 *  and the cross-domain mounts. These are the same page under several URLs, so
 *  they all fold onto the owning market's canonical dashboard. */
const DASHBOARD_ALIASES = new Set([
  "/",
  "/uk-preview",
  "/us",
  "/us-preview",
  "/se",
  "/se-preview",
  "/nl",
  "/nl-preview",
  "/congress",
  "/directors",
  "/djt",
]);

/** Absolute canonical URL for a route, or null on non-production hosts (where
 *  we emit a noindex instead of pointing preview builds at production).
 *
 *  This is the cross-domain dedupe: ddbx.uk/us and ddbx.us/ are the same page,
 *  so both canonicalise to https://ddbx.us/. Getting this in before the company
 *  pages ship is much cheaper than unpicking it after they're indexed. */
export function canonicalUrlFor(pathname, hostname) {
  const host = normaliseHost(hostname);

  if (!isProductionHost(host)) return null;

  const path = String(pathname ?? "/");
  const id = marketIdForPath(path, host);
  // Broker reviews are UK-only editorial ("Compare UK trading platforms"), so
  // they belong to ddbx.uk whichever domain served them.
  const isBrokerPath =
    path === "/compare" || path === "/brokers" || path.startsWith("/brokers/");
  const marketHost = isBrokerPath
    ? "ddbx.uk"
    : (MARKET_HOST_BY_ID[id] ?? "ddbx.uk");

  const canonicalPath = (() => {
    if (DASHBOARD_ALIASES.has(path)) return canonicalDashboardPath(id);
    if (isPerformancePath(path)) return canonicalPerformancePath(id);
    // /compare is the legacy mount of the broker comparison page.
    if (path === "/compare") return "/brokers";

    return path;
  })();

  return `https://${marketHost}${canonicalPath}`;
}

/** Whether a route may be indexed at all. Non-production hosts are excluded
 *  wholesale so preview deployments never compete with the live domains. */
export function isIndexable(pathname, hostname) {
  if (!isProductionHost(hostname)) return false;

  return !NOINDEX_PATHS.includes(String(pathname ?? "/"));
}
