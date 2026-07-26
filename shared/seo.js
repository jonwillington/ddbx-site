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
//
// The two broker-page modules are imported rather than duplicated: their titles
// and descriptions are editorial copy that belongs next to the rest of each
// page's content, and re-stating it here is how a SERP snippet ends up
// disagreeing with the H1 it points at. Neither imports this module, so there's
// no cycle.

import { categoryBySlug } from "./broker-categories.js";
import { comparisonBySlug } from "./broker-comparisons.js";
import { monthLabel, reportPath, slugToMonth } from "./months.js";
import { canonicalUrlForEntry, entryBySlug } from "./glossary.js";
import { yearBounds } from "./leaderboard.js";
import { sectorBySlug } from "./sectors.js";

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

/** "/brokers/best-for/isa" -> the category, or null. */
const brokerCategoryFromPath = (path) =>
  path.startsWith("/brokers/best-for/")
    ? categoryBySlug(path.slice("/brokers/best-for/".length))
    : null;

/** "/brokers/compare/freetrade-vs-trading-212" -> the comparison, or null. */
const brokerComparisonFromPath = (path) =>
  path.startsWith("/brokers/compare/")
    ? comparisonBySlug(path.slice("/brokers/compare/".length))
    : null;

/** A review of one platform — NOT the best-for/* or compare/* landing pages,
 *  which live one level deeper under the same prefix. Without excluding them
 *  every category page would be titled "Best For review — fees, accounts &
 *  verdict", since brokerFromPath() just title-cases the last segment. */
const isBrokerDetailPath = (path) =>
  path.startsWith("/brokers/") &&
  path.length > "/brokers/".length &&
  !path.startsWith("/brokers/best-for/") &&
  !path.startsWith("/brokers/compare/");

function downloadPlatform(path) {
  if (/\/download\/ios$/.test(path)) return "ios";
  if (/\/download\/android$/.test(path)) return "android";

  return null;
}

const isDownloadPath = (path) =>
  path.endsWith("/download") || downloadPlatform(path) !== null;

const isReportsIndexPath = (path) => path === "/reports";

/** Both report URL shapes. `/reports/<slug>` is the canonical archive page;
 *  `/report/<slug>` (singular) is the older deep-link that opens the recap as
 *  a modal over the market home — still live because shared links point at it,
 *  and folded onto the archive page by canonicalUrlFor so the two don't
 *  compete for the same content. */
const reportSlugFromPath = (path) => {
  const match = String(path).match(/^\/reports?\/([^/]+)$/);

  return match ? slugToMonth(decodeURIComponent(match[1])) : null;
};

/** "/biggest-buys" -> {year:null}; "/biggest-buys/2026" -> {year:"2026"}.
 *  Returns null for anything else, including a year segment that isn't one. */
const leaderboardFromPath = (path) => {
  if (path === "/biggest-buys") return { year: null };
  const match = String(path).match(/^\/biggest-buys\/([^/]+)$/);

  if (!match) return null;

  return yearBounds(match[1]) ? { year: match[1] } : null;
};

const isLearnIndexPath = (path) => path === "/learn";

const learnEntryFromPath = (path) =>
  path.startsWith("/learn/")
    ? entryBySlug(decodeURIComponent(path.slice("/learn/".length)))
    : null;

const isSectorsIndexPath = (path) => path === "/sectors";

const sectorFromPath = (path) =>
  path.startsWith("/sectors/")
    ? sectorBySlug(decodeURIComponent(path.slice("/sectors/".length)))
    : null;

const isCompaniesIndexPath = (path) => path === "/companies";

const isCompanyDetailPath = (path) =>
  path.startsWith("/company/") && path.length > "/company/".length;

/** Legal + account pages, which are routes on the SPA but render as drawers
 *  over the market home. Without an entry each of these served the market's
 *  generic dashboard title, so /privacy and /terms were indistinguishable from
 *  the homepage in a tab strip, a bookmark list or a SERP. */
const STATIC_PAGE_TITLES = {
  "/contact": "Contact",
  "/privacy": "Privacy Policy",
  "/cookies": "Cookie Policy",
  "/terms": "Terms & Conditions",
  "/account-deletion": "Delete your account",
};

/** Every title on the site is `ddbx · <what this page is>`.
 *
 *  It wasn't: market pages led with the brand, broker and download pages led
 *  with their subject and trailed the site name, and the two edge-rendered
 *  routes (functions/companies.js, functions/company/[key].js) suffixed
 *  `· ddbx` instead. Four conventions across one site, which shows up wherever
 *  titles are listed side by side — tab strips, history, bookmarks, SERPs.
 *  Those two Functions build their titles from data this module never sees, so
 *  they format their own; they call the same shape. */
export function brandTitle(rest) {
  return `${BRAND} · ${rest}`;
}

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

/** "/company/mtln" -> "MTLN". Mirrors tickerToSlug() in src/lib/company.ts,
 *  which strips the LSE `.L` suffix on the way out; the suffix isn't in the
 *  URL, so it isn't in the title either. */
const tickerFromCompanyPath = (path) =>
  String(path.split("/").filter(Boolean).at(-1) ?? "").toUpperCase();

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

  const brokerCategory = brokerCategoryFromPath(path);
  const brokerComparison = brokerComparisonFromPath(path);
  const reportMonth = reportSlugFromPath(path);
  const sector = sectorFromPath(path);
  const leaderboard = leaderboardFromPath(path);
  const learnEntry = learnEntryFromPath(path);
  const period = leaderboard?.year
    ? `in ${leaderboard.year}`
    : "of the last twelve months";
  const insiderNoun = id === "us" ? "insider buying" : "director buying";

  const title = (() => {
    if (STATIC_PAGE_TITLES[path]) return brandTitle(STATIC_PAGE_TITLES[path]);
    if (isPerformancePath(path))
      return brandTitle(`Portfolio (${market.label}) — ${SITE_NAME}`);
    if (isDirectorProfilePath(path))
      return brandTitle(`Director (${market.label}) — ${SITE_NAME}`);
    // Both of these sit under /brokers/ and so must be tested before the
    // detail-page branch, which would otherwise claim them.
    if (brokerCategory) return brandTitle(brokerCategory.title);
    if (brokerComparison)
      return brandTitle(`${brokerComparison.title} — which should you pick?`);
    if (reportMonth)
      return brandTitle(
        `${monthLabel(reportMonth)} ${insiderNoun} report (${market.label})`,
      );
    if (isReportsIndexPath(path))
      return brandTitle(`${market.label} ${insiderNoun} reports`);
    if (sector)
      return brandTitle(
        `${sector.label} — ${market.label} insider buying (last 12 months)`,
      );
    if (isSectorsIndexPath(path))
      return brandTitle(`${market.label} insider buying by sector`);
    if (leaderboard)
      return brandTitle(
        `The biggest ${market.label} insider buys ${period}`,
      );
    if (learnEntry) return brandTitle(learnEntry.title);
    if (isLearnIndexPath(path))
      return brandTitle("Understanding insider dealing");
    if (isBrokerDetailPath(path))
      return brandTitle(
        `${brokerFromPath(path)} review — fees, accounts & verdict`,
      );
    if (isBrokerIndexPath(path))
      return brandTitle("Compare UK trading platforms — fees, ISAs & SIPPs");
    if (isCompaniesIndexPath(path))
      return brandTitle(
        `Every ${market.label} company with ${id === "us" ? "insider trading" : "director dealings"}`,
      );
    // The SPA's fallback only. functions/company/[key].js replaces this at the
    // edge with the company's real name and buy count — but that Function
    // can't run on a client-side navigation, so this has to say something more
    // useful than the market dashboard's title. The ticker is in the URL.
    if (isCompanyDetailPath(path))
      return brandTitle(
        `${tickerFromCompanyPath(path)} — ${id === "us" ? "insider trading" : "director dealings"}`,
      );
    if (isDownloadPath(path)) {
      const on = deviceNoun ? ` for ${deviceNoun}` : "";

      return brandTitle(
        id === "us"
          ? `Get the app${on} — follow US insider stock buys · 7-day free trial`
          : `Get the app${on} — follow UK director share buys · 7-day free trial`,
      );
    }

    return market.documentTitle;
  })();

  const description = (() => {
    if (isPerformancePath(path))
      return `Track ${market.label} insider performance versus benchmark indices on ddbx.`;
    if (isDirectorProfilePath(path))
      return `${market.label} director profile with dealing history and signal context on ddbx.`;
    if (brokerCategory) return brokerCategory.description;
    if (brokerComparison) return brokerComparison.description;
    if (reportMonth)
      return `What ${market.label} insiders bought in ${monthLabel(reportMonth)} — total value, the sectors they concentrated in, the month's clusters, and how the previous month's featured buys have performed since.`;
    if (sector)
      return `Which ${market.label} ${sector.label.toLowerCase()} companies insiders have been buying over the last twelve months — volume, value, breadth and how those buys have performed against the market since disclosure.`;
    if (leaderboard)
      return `The largest open-market share purchases ${market.label} insiders made in their own companies ${period}, ranked by value, with how each has performed against the market since it was disclosed.`;
    if (learnEntry) return learnEntry.description;
    if (isLearnIndexPath(path))
      return "What insider filings mean, which disclosures are actually purchases, and how much a director buying their own shares really tells you.";
    if (isSectorsIndexPath(path))
      return `Where ${market.label} insiders are buying, broken down by sector — disclosed volume and value, and the median performance of each sector's buys against the market.`;
    if (isReportsIndexPath(path))
      return `Monthly ${market.label} ${insiderNoun} reports — what insiders bought, which sectors they favoured, and how earlier picks actually performed.`;
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
    // /report/<slug> (singular) opens the recap as a modal over the market
    // home; /reports/<slug> is the same report as a standalone page. Same
    // content under two URLs, so the deep-link folds onto the archive page —
    // which is also the one in the sitemap.
    const reportMonth = reportSlugFromPath(path);

    if (reportMonth) return reportPath(reportMonth);

    return path;
  })();

  // A glossary entry belongs to exactly one domain, so its canonical is
  // absolute and ignores the host that served it. Without this the same
  // explainer would compete with itself across ddbx.uk, ddbx.us and ddbx.eu —
  // the duplicate-content trap this page family is most exposed to.
  const learnEntry = learnEntryFromPath(path);

  if (learnEntry) return canonicalUrlForEntry(learnEntry);

  return `https://${marketHost}${canonicalPath}`;
}

/** Whether a route may be indexed at all. Non-production hosts are excluded
 *  wholesale so preview deployments never compete with the live domains. */
export function isIndexable(pathname, hostname) {
  if (!isProductionHost(hostname)) return false;

  return !NOINDEX_PATHS.includes(String(pathname ?? "/"));
}
