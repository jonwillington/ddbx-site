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
import { weekFromPath, weekLabel } from "./weeks.js";

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
  // Korea has no domain of its own. It rides the primary host at /kr rather
  // than waiting on one; this map is the only place that assumption lives, so
  // pointing it at a Korean domain later is a one-line change.
  kr: "ddbx.uk",
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

// ---- Language editions ----------------------------------------------------
//
// The site is English everywhere except one family: /zh-hk/download{,/ios,
// /android}, a Traditional Chinese edition of the UK install pages written for
// a Hong Kong audience. The prefix is the only language selector — there is no
// Accept-Language negotiation, so every URL is stable for crawlers and
// shareable by the reader.
//
// The mirror of this lives in src/lib/download/copy.tsx (the page's own
// dictionary and its `ZH_HK_PREFIX`). Change the prefix and you change it in
// three places: here, there, and the routes in src/App.tsx.

export const ZH_HK_PREFIX = "/zh-hk";

export const isZhHkPath = (path) =>
  path === ZH_HK_PREFIX || String(path).startsWith(`${ZH_HK_PREFIX}/`);

/** BCP 47 tag for `<html lang>`. */
export function langForPath(pathname) {
  return isZhHkPath(String(pathname ?? "/")) ? "zh-HK" : "en-GB";
}

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

/** Research surfaces that only exist for UK and US.
 *
 *  The sector rollups, the biggest-buys leaderboard, the company index and the
 *  monthly report archive are all built on the UK and US feeds. SE and NL are
 *  data-side markets: no company pages, no sector rollups, no reports. Served
 *  on ddbx.eu these routes fell through to the UK data AND the UK copy, so a
 *  visitor who had switched to SE was shown "Every UK company with director
 *  dealings" and "The biggest UK insider buys" under a Swedish flag — wrong
 *  data, wrong wording, and a third indexable copy of pages that already exist
 *  on ddbx.uk, which is precisely the duplicate-content split the glossary's
 *  one-owner rule was written to avoid.
 *
 *  Matching is by prefix so year and slug variants (/biggest-buys/2026,
 *  /sectors/technology, /reports/2026-05) are covered.
 *
 *  `/company/:key` is deliberately NOT in the list. An individual issuer page
 *  is owned by whichever market lists that ticker, so a blanket redirect to
 *  ddbx.uk would send US issuers to the wrong host; those pages already carry
 *  their own canonical from functions/company/[key].js.
 */
const UK_US_ONLY_PREFIXES = [
  "/sectors",
  "/biggest-buys",
  "/companies",
  "/reports",
  // /how-it-works describes six checks, four ratings and a written analysis.
  // SE and NL run no analysis layer (their triage tables are empty and their
  // rows carry no checklist), so served on ddbx.eu the page would be a careful
  // description of something those markets don't do — the one failure mode a
  // methodology page cannot have. Send it to the host that does it.
  "/how-it-works",
];

/** True when `pathname` is a UK/US-only research page being served on a host
 *  that owns neither market. Callers redirect to the same path on ddbx.uk. */
export function isForeignResearchPath(pathname, hostname) {
  const market = HOST_DEFAULT_MARKET[normaliseHost(hostname)];

  if (market !== "se" && market !== "nl") return false;
  const path = String(pathname ?? "/");

  return UK_US_ONLY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
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

  // The Traditional Chinese install pages sell the UK app, wherever they're
  // served from. Before the host default deliberately: on ddbx.us the fallback
  // would resolve them to the US market, and there is no Chinese US edition —
  // the page would render English copy inside a zh-HK document.
  if (isZhHkPath(path)) return "uk";
  if (path.startsWith("/us-preview")) return "us";
  if (path.startsWith("/se-preview") || path.startsWith("/eu")) return "se";
  if (path.startsWith("/nl-preview")) return "nl";
  if (path.startsWith("/kr-preview")) return "kr";
  if (path === "/us" || path.startsWith("/us/")) return "us";
  if (path === "/se" || path.startsWith("/se/")) return "se";
  if (path === "/nl" || path.startsWith("/nl/")) return "nl";
  if (path === "/kr" || path.startsWith("/kr/")) return "kr";
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

const isDirectorProfilePath = (path) => /\/directors\//.test(path);

/** The developer API product page. Market-blind: it is one cross-market
 *  product served identically on every host, so it also folds onto a single
 *  canonical host (see canonicalUrlFor) rather than competing with itself.
 *
 *  Canonical path is /developers. /api is an alias that 301s to it at the edge
 *  (public/_redirects) but is matched here too, so a client-side navigation to
 *  the alias still gets the right title and description. */
const isApiPath = (path) => path === "/developers" || path === "/api";

const API_CANONICAL_PATH = "/developers";

/** Service status. Cross-market like /developers — one API, one page, folded
 *  onto ddbx.uk so the three hosts don't publish three copies of it. */
const isStatusPath = (path) => path === "/status";

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

const isHowItWorksPath = (path) => path === "/how-it-works";

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

/** Congress directory shapes.
 *
 *  All four live under /congress/, which `marketIdForPath` already resolves to
 *  the "usg" market, so they canonicalise to ddbx.us without another branch.
 *
 *  The member and committee titles here are the SPA's FALLBACK only. The
 *  pre-render Functions replace the head with the real name and rollup, exactly
 *  as functions/company/[key].js does — but a Function cannot run on a
 *  client-side navigation, so these have to say something better than the
 *  Congress dashboard's title. The slug carries enough to do that. */
/** "/dealings/d-abc123" -> the id, or null. The SPA fallback only: the
 *  pre-render Function at functions/dealings/[id].js replaces the head with the
 *  company, the role and the consideration, but it cannot run on a client-side
 *  navigation. There is nothing in the URL to describe the filing with, so the
 *  fallback says what KIND of page it is rather than inventing a subject. */
const isWeeklyIndexPath = (path) => path === "/weekly";

/** "/weekly/2026-07-27" -> the week start, or null. Validated through
 *  shared/weeks.js so a mid-week date never resolves. */
const weekFromSeoPath = (path) => weekFromPath(path);

const isFilingPath = (path) => /^\/dealings\/[A-Za-z0-9_-]{4,64}$/.test(path);

const isCongressMembersIndexPath = (path) => path === "/congress/members";

const isCongressCommitteesIndexPath = (path) =>
  path === "/congress/committees";

/** "/congress/members/nancy-pelosi-p000197" -> "Nancy Pelosi".
 *
 *  Title-cased from the slug with the bioguide dropped. Imperfect on names the
 *  slug flattened (a hyphenated surname, "Jr."), which is acceptable for a
 *  fallback the crawler never sees and a reader sees for one paint. */
const congressMemberNameFromPath = (path) => {
  if (!path.startsWith("/congress/members/")) return null;
  const slug = decodeURIComponent(path.slice("/congress/members/".length));

  if (!slug || slug.includes("/")) return null;

  const parts = slug.split("-").filter(Boolean);
  // Drop the trailing bioguide when it is one.
  if (parts.length > 1 && /^[a-z]\d{6}$/i.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length === 0) return null;

  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

/** "/congress/committees/financial-services" -> "Financial Services". */
const congressCommitteeNameFromPath = (path) => {
  if (!path.startsWith("/congress/committees/")) return null;
  const slug = decodeURIComponent(path.slice("/congress/committees/".length));

  if (!slug || slug.includes("/")) return null;

  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

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
  const weekStart = weekFromSeoPath(path);
  const congressMember = congressMemberNameFromPath(path);
  const congressCommittee = congressCommitteeNameFromPath(path);
  const period = leaderboard?.year
    ? `in ${leaderboard.year}`
    : "of the last twelve months";
  const insiderNoun = id === "us" ? "insider buying" : "director buying";

  const title = (() => {
    if (STATIC_PAGE_TITLES[path]) return brandTitle(STATIC_PAGE_TITLES[path]);
    // Cross-market product page — deliberately market-blind, unlike every
    // other branch here. Same title on ddbx.uk, ddbx.us and ddbx.eu.
    if (isApiPath(path))
      return brandTitle(
        "Insider dealing data API — UK, US & EU filings, scored",
      );
    // Also market-blind, and for the same reason: one API behind every host.
    if (isStatusPath(path)) return brandTitle("Service status");
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
    // Congress, before the generic branches: these are /congress/* paths and
    // nothing else here claims them, but the ordering keeps them next to the
    // descriptions that pair with them.
    if (weekStart)
      return brandTitle(
        `${market.label} insider buying, week of ${weekLabel(weekStart)}`,
      );
    if (isWeeklyIndexPath(path))
      return brandTitle(`${market.label} insider buying, week by week`);
    if (isFilingPath(path))
      return brandTitle(`${market.label} insider purchase — the filing in full`);
    if (congressMember)
      return brandTitle(`${congressMember} stock trades — filings and committees`);
    if (isCongressMembersIndexPath(path))
      return brandTitle("Members of Congress who file stock purchases");
    if (congressCommittee)
      return brandTitle(
        `${congressCommittee} committee — members who buy stocks`,
      );
    if (isCongressCommitteesIndexPath(path))
      return brandTitle("Congressional committees and the sectors they oversee");
    // Market-specific, unlike /developers: the regulator, the exchange and the
    // noun for the filer all change, so ddbx.uk and ddbx.us publish genuinely
    // different documents rather than one page twice. ddbx.eu 301s to ddbx.uk.
    if (isHowItWorksPath(path))
      return brandTitle(
        id === "us"
          ? "How we rate US insider stock purchases — our method"
          : "How we rate UK director share purchases — our method",
      );
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
      // Traditional Chinese edition (Hong Kong). UK app only — see
      // marketIdForPath, which pins these paths to the UK market on every host.
      if (isZhHkPath(path)) {
        // "下載 App" rather than "下載 ddbx App": brandTitle already prefixes
        // the brand, and the Chinese title is long enough without saying it
        // twice. Latin runs keep a space either side, as Hong Kong house
        // typography does — 「iPhone 版」, not 「iPhone版」.
        const on = deviceNoun ? `${deviceNoun} 版 ` : "";

        return brandTitle(
          `下載 ${on}App — 追蹤英國董事增持自己公司股份 · 免費試用 7 天`,
        );
      }
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
    if (isApiPath(path))
      return "One REST API for director and insider share purchases across the UK, US, Sweden and the Netherlands: screened, rated with a written rationale, and benchmarked against the index. Access and pricing on request.";
    if (isStatusPath(path))
      return "Live availability of the ddbx API and the UK, US, Sweden and Netherlands disclosure feeds, measured in your browser as you read, with the ingest schedule and incident history.";
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
    if (isHowItWorksPath(path))
      return id === "us"
        ? "How a Form 4 becomes a rating: the six checks every US insider purchase is scored against, what each rating means, where the filings come from, and where the method stops."
        : "How an RNS disclosure becomes a rating: the six checks every UK director share purchase is scored against, what each rating means, where the filings come from, and where the method stops.";
    if (isLearnIndexPath(path))
      return "What insider filings mean, which disclosures are actually purchases, and how much a director buying their own shares really tells you.";
    if (weekStart)
      return `What ${market.label} insiders bought in the week of ${weekLabel(weekStart)}: how much in total, the biggest single purchase, where the money went by sector, and which buys cleared the rating bar.`;
    if (isWeeklyIndexPath(path))
      return `A short read on each week of disclosed ${market.label} insider buying: the totals, the biggest cheque, the sectors it went into and the buys that cleared the bar.`;
    if (isFilingPath(path))
      return `One disclosed insider purchase in full: who bought, how many shares, at what price, how long the disclosure took, and how the shares have done against the market since.`;
    if (congressMember)
      return `Every stock purchase ${congressMember} has disclosed under the STOCK Act — the value bands, the companies, the accounts they were filed for, and which of their committees oversee the sectors involved.`;
    if (isCongressMembersIndexPath(path))
      return "Every member of Congress with a disclosed stock purchase on record, with the value bands, the companies and the committee jurisdiction behind each one.";
    if (congressCommittee)
      return `Members of the House ${congressCommittee} committee who have disclosed stock purchases, the sectors the committee oversees, and which of those purchases fall inside its jurisdiction.`;
    if (isCongressCommitteesIndexPath(path))
      return "Which House committees oversee which sectors, and which members of each have disclosed stock purchases in the industries they legislate on.";
    if (isSectorsIndexPath(path))
      return `Where ${market.label} insiders are buying, broken down by sector — disclosed volume and value, and the median performance of each sector's buys against the market.`;
    if (isReportsIndexPath(path))
      return `Monthly ${market.label} ${insiderNoun} reports — what insiders bought, which sectors they favoured, and how earlier picks actually performed.`;
    if (isBrokerDetailPath(path))
      return `${brokerFromPath(path)} review: our verdict on its fees, ISA and SIPP accounts, investment range, features and FSCS protection.`;
    if (isBrokerIndexPath(path))
      return "Compare the UK’s main trading and investing platforms side by side — fees, ISAs, SIPPs, fractional shares and FSCS protection.";
    if (isDownloadPath(path)) {
      if (isZhHkPath(path)) {
        const zhApp =
          deviceNoun === "Android"
            ? "Android 版 ddbx"
            : deviceNoun === "iPhone"
              ? "iPhone 版 ddbx"
              : "ddbx App";

        return `看看哪些英國上市公司的董事，正在買入自己公司的股份 — 附買入之後的實時表現追蹤。在 ${zhApp} 上開始 7 天免費試用。`;
      }
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
  // The API page is one cross-market product rendered identically on every
  // host, so without this ddbx.uk/api, ddbx.us/api and ddbx.eu/api would be
  // three duplicates competing with each other — the same trap the glossary
  // entries below already avoid. It folds onto ddbx.uk, and only that URL is
  // in the sitemap (see functions/sitemap.xml.js).
  const marketHost =
    isBrokerPath || isApiPath(path) || isStatusPath(path)
      ? "ddbx.uk"
      : (MARKET_HOST_BY_ID[id] ?? "ddbx.uk");

  const canonicalPath = (() => {
    // /api and /developers are the same page; fold the alias onto the canonical.
    if (isApiPath(path)) return API_CANONICAL_PATH;
    if (DASHBOARD_ALIASES.has(path)) return canonicalDashboardPath(id);
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

/** `rel=alternate hreflang` pairs for a route, or an empty array where the
 *  route has only one language edition.
 *
 *  Without these the English and Chinese install pages are two URLs carrying
 *  the same offer, and a search engine has to guess whether they're duplicates
 *  competing for one slot or genuine alternates. Each page declares the pair
 *  AND itself (the reflexive tag is required — a set of hreflang annotations
 *  that doesn't include the page it's on is ignored wholesale), plus
 *  `x-default` pointing at English as the fallback for everyone else.
 *
 *  Only the UK install pages are bilingual, so this returns nothing anywhere
 *  else — including /us/download, which has no Chinese edition. */
export function alternatesFor(pathname, hostname) {
  const path = String(pathname ?? "/");

  if (!isDownloadPath(path)) return [];
  if (!isProductionHost(normaliseHost(hostname))) return [];
  // Only the UK install pages are bilingual. This has to be a MARKET check and
  // not a path check: on ddbx.us the bare /download is the US page, and
  // announcing a Chinese alternate for it would point Hong Kong searchers at a
  // page selling a different app.
  if (marketIdForPath(path, hostname) !== "uk") return [];

  const enPath = isZhHkPath(path) ? path.slice(ZH_HK_PREFIX.length) : path;
  const en = `https://ddbx.uk${enPath}`;
  const zh = `https://ddbx.uk${ZH_HK_PREFIX}${enPath}`;

  return [
    { hreflang: "en-GB", href: en },
    { hreflang: "zh-HK", href: zh },
    { hreflang: "x-default", href: en },
  ];
}

/** Whether a route may be indexed at all. Non-production hosts are excluded
 *  wholesale so preview deployments never compete with the live domains. */
export function isIndexable(pathname, hostname) {
  if (!isProductionHost(hostname)) return false;

  return !NOINDEX_PATHS.includes(String(pathname ?? "/"));
}
