// The global tape — five markets' insider filings on one row shape.
//
// Plain ESM at the root, imported by both the React page (src/pages/tape.tsx)
// and the crawler pre-render (functions/tape.js), for the reason every module
// in this directory gives: Pages Functions cannot resolve "@/" or .tsx, and a
// tape whose crawled order differs from its hydrated order is worse than no
// tape.
//
// Each market ships its own wire format — UK `Dealing`, US `UsDealing`, EU
// `EuDealing` (SE and NL), and the Korea `KrDealingWire` that lives only in
// src/lib/api.ts because Korea is data-side only in ddbx-data. The four
// normalisers below map those onto ONE `TapeRow`. Nothing downstream reads a
// wire field; if a market's shape changes, this is the only file that knows.
//
// ---------------------------------------------------------------------------
// The quirks, per market. Measured against the live API on 2026-09-16.
// ---------------------------------------------------------------------------
//
// TIME OF DAY is the tape's ordering axis and only ONE market actually files
// it. The page sorts on the best instant each row can honestly claim, and
// says which kind it has:
//
//   - SE     `disclosed_date` is a real datetime ("2026-09-16T12:14:28Z"): the
//            moment Finansinspektionen published it. Kind "published".
//   - UK, US `disclosed_date` is a date. `created_at` is when ddbx ingested the
//            row (UTC, "2026-09-16 06:18:18"). UK rows cluster at 06:xx UTC,
//            an hour before the RNS morning wave; US rows land in the New York
//            evening after EDGAR's daily index. It is when WE saw it, not when
//            it was filed, so the row says "seen 07:18". Kind "seen".
//   - NL     `disclosed_date` is a datetime whose time is always 00:00:00Z
//            (200 of 200 sampled). AFM publishes by the day. Kind "day".
//   - KR     `disclosed_date` is "YYYYMMDD". DART records no time, and ddbx
//            reads DART once a day at 11:00 UTC (20:00 Seoul), so a Korean
//            filing appears here the evening it was made. Kind "day".
//
// Day-only rows sort at the START of their day, so within one date the rows
// with a real time come first (newest first) and the day-only ones sit under
// them. The alternative, inventing a filing hour per market, would be stating
// a number we do not have.
//
// SIDE AND POPULATION. No line on the tape is "every filing" except the two
// EU ones, and the page says so market by market (`included` below):
//
//   - UK     /api/dealings: open-market purchases only (250/250 buys sampled
//            on 2026-09-17). The API hides placings, subscriptions and option
//            exercises, quarantined prices, and a filing still waiting on its
//            analysis (for up to two days), so a UK row lands once it is rated
//            or set aside.
//   - US     view=interesting: the mechanical set, not every Form 4. Code P,
//            direct holding, non-derivative, not under a 10b5-1 plan, $50,000
//            or more (250/250 sampled, minimum exactly $50,000).
//   - SE, NL every MAR nature: SE runs ~78% acquisitions, 10% disposals and the
//            rest grants, exercises and pledges; NL is an even split of
//            acquisitions and disposals.
//   - KR     purchases only (reason code 01, shares up), individuals only (the
//            API drops institutional filers), ₩43.75m (about £25,000) or more.
//
// So "buy / sell" on the tape is a per-row fact and a market that only ever
// shows buys is a fact about its FEED, not a claim that nobody in London ever
// sells.
//
// VALUE. Native currency per row, never converted. UK carries `value_gbp`
// and a `currency` that is GBP on ~95% of rows; the rest are London filings
// made in dollars or euros, and those are shown in their own currency from
// `price_native × shares`. US is USD `value`. SE and NL carry no value field
// at all: it is `price × volume`, null when the price is footnoted, and the
// currency is whatever the filing says, which on SE includes CAD (10/200) and
// GBP for cross-listed issuers. Korea is `value_krw`, with the server's own
// `value_gbp` reading kept as a secondary because nobody outside Korea sizes
// ₩4,999,995,000 on sight.
//
// LEGS. The US API already collapses tranche-split rows into one per
// (filing, code, reporter, date) with `leg_count`. The EU feeds do not: one
// notification arrives as one row per transaction. Only legs of the SAME
// notification merge here, because two notifications from one person on one
// day are two decisions and summing them overstates both (see `euLegKey`,
// measured on 500 rows per market on 2026-09-17):
//
//   - NL     AFM's notification id (meldingid) is carried inside the row id,
//            "mar-nl-{meldingid}-{leg}". Griffith at Tetragon is one
//            notification with two purchase legs; Borgions at argenx filed two
//            notifications the same day, and until this key they read as one.
//   - SE     FI publishes no notification id. Every leg of one notification
//            carries the same publication instant to the second, and in 500
//            rows no instant was shared by two (issuer, reporter) pairs, so
//            the instant is the notification. Helmersson at ITAB is one
//            notification covering buys on three days; Arnhult at Corem filed
//            at 17:45 and again at 23:44, which is two rows, not one.
//
// A leg's trade date is NOT in the key: one notification may report several
// days of buying, and that is still one filing.
//
// SUPERSEDED. FI keeps a corrected notification's original on the register
// with status "Reviderad" and publishes the correction as a new row, flagged
// as an amendment. 43 of 500 SE rows were revised originals; summed with
// their corrections they double a Skanska grant. Revised rows are dropped.
// The AFM publishes corrections as new notifications and has no such status.
//
// The /se and /nl dashboards group more loosely (no day, no notification,
// deliberately a person's run of buying); the tape is a list of filings, so
// the two counts differ by design.
//
// RATINGS. The brief assumed UK and US have ratings and the rest do not. The
// data disagreed: of 300 Swedish rows, 41 carried a rating (21 significant,
// 18 noteworthy, 2 minor) and 50 a triage verdict; NL had 82 triage verdicts
// and no rating. So "rated" is decided PER ROW everywhere, and only Korea,
// which has no rating layer at all, gets the market-level "unrated market"
// treatment. See `ratingState`.
//
// IDENTITY. UK tickers carry ".L"; US tickers are bare; SE/NL tickers come
// from an ISIN lookup and are missing on 38/200 SE rows; Korea's "ticker" is
// a six-digit stock code the logo provider cannot resolve, so its logo is
// looked up by the issuer's DART-registered domain instead, with the company
// name as the monogram fallback ("006" is not a mark).
//
// TRADE DATE. Korea's 변동일 is the settlement date for on-market trades, not
// the execution date. It is the closest thing the filing gives and is
// labelled "traded" on the row like every other market; the how-it-works
// page carries the caveat.

/** The five markets on the tape, in the order the header strip draws them:
 *  east to west, so the day reads left to right.
 *
 *  `open`/`close` are minutes of the local day for the continuous session.
 *  Holidays are NOT here: the React page layers each market's own calendar
 *  from src/lib/markets/* on top; the Function prints hours, which are facts,
 *  rather than an open/closed state that is stale the moment it is cached. */
export const TAPE_MARKETS = [
  {
    id: "KR",
    name: "South Korea",
    city: "Seoul",
    timeZone: "Asia/Seoul",
    open: 9 * 60,
    close: 15 * 60 + 30,
    currency: "KRW",
    noun: "officers and major holders",
    source: "DART, the Financial Supervisory Service's disclosure system",
    filers: "Company officers and major shareholders",
    /** How ratings reach this market. "layer" = the pipeline runs triage and
     *  analysis here, so a row is rated, skipped or still waiting; "none" =
     *  no such layer exists and every row is unrated by construction. */
    ratings: "none",
    /** Which rows the feed carries. Stated on the page, because a tape that
     *  never shows a Korean sale is a fact about this line, not about Korea. */
    included:
      "Purchases of about £25,000 or more by individual officers and major holders, read from DART once a day. No sales, and no filings by institutions",
    cadence: "Read once a day at 20:00 Seoul, after DART's afternoon filings",
    timeKind: "day",
  },
  {
    id: "SE",
    name: "Sweden",
    city: "Stockholm",
    timeZone: "Europe/Stockholm",
    open: 9 * 60,
    close: 17 * 60 + 30,
    currency: "SEK",
    noun: "PDMRs",
    source: "Finansinspektionen's insider register",
    filers: "Persons discharging managerial responsibilities and their close associates",
    ratings: "layer",
    included:
      "Every notification: purchases, sales, grants, exercises. A notification FI has since corrected is shown once, as corrected",
    cadence: "Published with the time of day, as filings arrive",
    timeKind: "published",
  },
  {
    id: "NL",
    name: "Netherlands",
    city: "Amsterdam",
    timeZone: "Europe/Amsterdam",
    open: 9 * 60,
    close: 17 * 60 + 30,
    currency: "EUR",
    noun: "PDMRs",
    source: "The AFM's register of insider transactions",
    filers: "Persons discharging managerial responsibilities and their close associates",
    ratings: "layer",
    included: "Every notification: purchases, sales, grants, exercises",
    cadence: "Published by the day; the AFM records no time",
    timeKind: "day",
  },
  {
    id: "UK",
    name: "United Kingdom",
    city: "London",
    timeZone: "Europe/London",
    open: 8 * 60,
    close: 16 * 60 + 30,
    currency: "GBP",
    noun: "directors",
    source: "RNS notices to the London Stock Exchange",
    filers: "Directors and PDMRs of LSE-listed companies",
    ratings: "layer",
    included:
      "Open-market purchases only. No sales, placings, subscriptions or option exercises, and a filing appears once it has been rated or set aside",
    cadence: "Read through the trading day; the row shows when it was seen",
    timeKind: "seen",
  },
  {
    id: "US",
    name: "United States",
    city: "New York",
    timeZone: "America/New_York",
    open: 9 * 60 + 30,
    close: 16 * 60,
    currency: "USD",
    noun: "insiders",
    source: "SEC EDGAR Form 4 filings",
    filers: "Officers, directors and 10% holders of SEC registrants",
    ratings: "layer",
    included:
      "Open-market purchases of $50,000 or more, held directly and not under a 10b5-1 plan: the US dashboard’s set, not every Form 4. No sales, grants or exercises",
    cadence: "Read as EDGAR indexes them, mostly after the New York close",
    timeKind: "seen",
  },
];

import { isProductionHost, MARKET_HOST_BY_ID } from "./seo.js";
import { recaseIfShouted, usInsiderDisplayName } from "./us-names.js";

/** Rows asked for per market. The Korea endpoint caps a page at 200 whatever
 *  is asked; the UK and US honour up to 1,000, and the EU endpoint returned
 *  500 for 500 on 2026-09-17 (the 200 cap the first build measured is gone).
 *  250 on UK and US is enough that the binding feed covers more than a week,
 *  and Sweden's 200 is what actually cuts the tape today (~25 notifications a
 *  day), which is an open decision rather than an endpoint limit. A feed that
 *  returns exactly what it was asked for is treated as truncated, which is
 *  why the number asked for must never exceed what the endpoint can return. */
export const TAPE_LIMITS = { UK: 250, US: 250, SE: 200, NL: 200, KR: 200 };
export const TAPE_LIMIT = 250;

/** ~£25,000 at ~1,750 KRW/GBP: the same floor the /kr dashboard applies, so
 *  the two surfaces show the same Korea. */
const KR_MIN_KRW = 43_750_000;

export function tapeFeedUrl(apiBase, marketId, limit = TAPE_LIMITS[marketId]) {
  switch (marketId) {
    case "UK":
      return `${apiBase}/dealings?limit=${limit}&fields=lite`;
    case "US":
      return `${apiBase}/us-dealings?limit=${limit}&view=interesting&fields=lite`;
    case "SE":
    case "NL":
      return `${apiBase}/eu-dealings?market=${marketId}&limit=${limit}`;
    case "KR":
      return `${apiBase}/kr-dealings?limit=${limit}&min_krw=${KR_MIN_KRW}`;
    default:
      return null;
  }
}

export function tapeMarket(id) {
  return TAPE_MARKETS.find((m) => m.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isoDay = (s) => {
  const v = String(s ?? "");

  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`;

  return v.slice(0, 10);
};

/** "2026-09-16 06:18:18" (UTC, space-separated) or ISO → ms, or null. */
const parseInstant = (s) => {
  if (!s) return null;
  const v = String(s).trim();
  const t = Date.parse(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? `${v.replace(" ", "T")}Z` : v,
  );

  return Number.isFinite(t) ? t : null;
};

const dayStart = (isoDate) => {
  const t = Date.parse(`${isoDate}T00:00:00Z`);

  return Number.isFinite(t) ? t : 0;
};

const cleanName = (s) => {
  let out = String(s ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
};

// ---------------------------------------------------------------------------
// UK
// ---------------------------------------------------------------------------

function fromUk(d) {
  const currency = d.currency || "GBP";
  const native =
    currency === "GBP"
      ? Number(d.value_gbp)
      : Number(d.price_native) * Number(d.shares);
  const seen = parseInstant(d.created_at);
  const disclosedDate = isoDay(d.disclosed_date);
  const side = d.tx_type === "sell" ? "sell" : "buy";

  return finish({
    key: `UK|${d.id}`,
    market: "UK",
    company: cleanName(d.company) || String(d.ticker ?? ""),
    ticker: String(d.ticker ?? "").replace(/\.L$/i, "") || null,
    logoTicker: d.ticker ?? null,
    logoDomain: null,
    insider: {
      name: cleanName(d.director?.name),
      role: d.director?.role?.trim() || null,
      pca: /closely associated/i.test(String(d.director?.role ?? "")),
    },
    side,
    action: side === "buy" ? "Bought" : "Sold",
    shares: Number.isFinite(Number(d.shares)) ? Number(d.shares) : null,
    price: Number.isFinite(Number(d.price_native)) ? Number(d.price_native) : null,
    value: Number.isFinite(native) && native > 0 ? native : null,
    currency,
    gbp: null,
    tradeDate: isoDay(d.trade_date) || null,
    disclosedDate,
    at: seen ?? dayStart(disclosedDate),
    atKind: seen ? "seen" : "day",
    rating: d.analysis?.rating ?? null,
    triage: d.triage?.verdict ?? null,
    cluster: d.cluster?.count ? { count: Number(d.cluster.count), windowDays: Number(d.cluster.window_days) } : null,
    flags: [
      ...(d.is_open_market_buy === false ? ["Not at market price"] : []),
      ...(d.accumulation_run && Number(d.accumulation_run.seq) > 1
        ? [`${ordinal(Number(d.accumulation_run.seq))} buy in a run`]
        : []),
    ],
    href: d.id ? `/dealings/${encodeURIComponent(d.id)}` : null,
    legs: 1,
    hasRatingLayer: true,
  });
}

// ---------------------------------------------------------------------------
// US
// ---------------------------------------------------------------------------

const US_CODES = {
  P: ["buy", "Bought"],
  S: ["sell", "Sold"],
  A: ["other", "Grant"],
  M: ["other", "Exercise"],
  F: ["other", "Tax withholding"],
  G: ["other", "Gift"],
  J: ["other", "Other"],
};

function usRole(r) {
  if (!r) return null;
  if (r.officer_title) return r.officer_title;
  const roles = r.roles ?? [];

  if (roles.includes("director") && roles.includes("ten_percent_owner"))
    return "Director and 10% owner";
  if (roles.includes("director")) return "Director";
  if (roles.includes("officer")) return "Officer";
  if (roles.includes("ten_percent_owner")) return "10% owner";

  return null;
}

function fromUs(d) {
  const [side, action] = US_CODES[d.transaction_code] ??
    (d.acquired_disposed === "D" ? ["sell", "Sold"] : ["other", "Other"]);
  const seen = parseInstant(d.created_at);
  const disclosedDate = isoDay(d.disclosed_date);
  const value = Number(d.value);

  return finish({
    key: `US|${d.id}`,
    market: "US",
    // EDGAR issuer names arrive shouted ("TERAWULF INC."); recased the way
    // the US directory and its pre-render recase them.
    company: recaseIfShouted(cleanName(d.company)) || String(d.ticker ?? ""),
    ticker: d.ticker && d.ticker !== "NONE" ? d.ticker : null,
    logoTicker: d.ticker && d.ticker !== "NONE" ? d.ticker : null,
    logoDomain: null,
    insider: {
      name: usInsiderDisplayName(d.reporter?.name),
      role: usRole(d.reporter),
      pca: false,
    },
    side,
    action,
    shares: Number.isFinite(Number(d.shares)) ? Number(d.shares) : null,
    price: d.price != null && Number.isFinite(Number(d.price)) ? Number(d.price) : null,
    value: Number.isFinite(value) && value > 0 ? value : null,
    currency: "USD",
    gbp: null,
    tradeDate: isoDay(d.trade_date) || null,
    disclosedDate,
    at: seen ?? dayStart(disclosedDate),
    atKind: seen ? "seen" : "day",
    rating: d.analysis?.rating ?? null,
    triage: d.triage?.verdict ?? null,
    cluster: d.cluster?.count ? { count: Number(d.cluster.count), windowDays: Number(d.cluster.window_days) } : null,
    flags: [
      ...(d.aff_10b5_one ? ["10b5-1 plan"] : []),
      ...(d.direct_indirect === "I" ? ["Indirect"] : []),
      ...(d.is_amendment ? ["Amendment"] : []),
      ...(d.is_late ? ["Filed late"] : []),
      ...(Number(d.leg_count) > 1 ? [`${d.leg_count} fills`] : []),
    ],
    href: d.id ? `/us/dealings/${encodeURIComponent(d.id)}` : null,
    legs: Number(d.leg_count) > 1 ? Number(d.leg_count) : 1,
    hasRatingLayer: true,
  });
}

// ---------------------------------------------------------------------------
// EU (SE, NL)
// ---------------------------------------------------------------------------

/** MAR natures, localised by each regulator. Longest prefix first. Mirrors
 *  the tables in src/lib/markets/sweden.tsx and netherlands.tsx, which the
 *  Function cannot import. */
const NATURES = {
  SE: [
    ["förvärv", "buy", "Bought"],
    ["teckning", "buy", "Subscribed"],
    ["avyttring", "sell", "Sold"],
    ["tilldelning", "other", "Grant"],
    ["lösen", "other", "Exercise"],
    ["konvertering", "other", "Conversion"],
    ["inlösen", "other", "Redemption"],
    ["pantsättning", "other", "Pledge"],
    ["utdelning", "other", "Dividend"],
    ["utbyte", "other", "Exchange"],
    ["fusion", "other", "Merger"],
    ["lån", "other", "Loan"],
    ["gåva", "other", "Gift"],
    ["arv", "other", "Inheritance"],
  ],
  NL: [
    ["verwerving", "buy", "Bought"],
    ["inschrijving", "buy", "Subscribed"],
    ["vervreemding", "sell", "Sold"],
    ["uitoefening", "other", "Exercise"],
    ["schenking", "other", "Gift"],
    ["erfenis", "other", "Inheritance"],
    ["uitgifte", "other", "Issuance"],
    ["overdracht", "other", "Transfer"],
    ["inkoop", "other", "Buy-back"],
    ["ruil", "other", "Exchange"],
    ["pandrecht", "other", "Pledge"],
    ["lening", "other", "Loan"],
  ],
};

const norm = (s) =>
  String(s ?? "")
    .replace(/ /g, " ")
    .trim()
    .toLowerCase();

function euNature(market, nature) {
  const n = norm(nature);

  for (const [prefix, side, label] of NATURES[market] ?? []) {
    if (n.startsWith(prefix)) return [side, label];
  }

  return ["other", nature ? String(nature) : "Transaction"];
}

const ROLES = {
  SE: {
    styrelseledamot: "Board member",
    styrelseordförande: "Board chair",
    styrelsesuppleant: "Deputy board member",
    vd: "CEO",
    "verkställande direktör": "CEO",
    "verkställande direktör (vd)": "CEO",
    "vice vd": "Deputy CEO",
    "annan ledande befattningshavare": "Senior officer",
    "annan medlem i bolagets administrations-, lednings- eller kontrollorgan":
      "Other governance member",
    "arbetstagarrepresentant i styrelsen eller arbetstagarsuppleant":
      "Employee representative",
    ekonomichef: "CFO",
    "ekonomichef/finanschef/finansdirektör": "CFO",
    revisor: "Auditor",
  },
  NL: {
    "lid van de raad van bestuur": "Board member",
    "lid raad van bestuur": "Board member",
    "voorzitter raad van bestuur": "Board chair (CEO)",
    "voorzitter van de raad van bestuur": "Board chair (CEO)",
    bestuurder: "Director",
    "uitvoerend bestuurder": "Executive director",
    "niet-uitvoerend bestuurder": "Non-executive director",
    "lid van de raad van commissarissen": "Supervisory board member",
    "lid raad van commissarissen": "Supervisory board member",
    "voorzitter raad van commissarissen": "Supervisory chair",
    "voorzitter van de raad van commissarissen": "Supervisory chair",
    commissaris: "Supervisory board member",
    ceo: "CEO",
    "chief executive officer": "CEO",
    cfo: "CFO",
    "chief financial officer": "CFO",
    "chief financnial officer": "CFO",
    coo: "COO",
    "chief operating officer": "COO",
    cio: "CIO",
    "chief information officer": "CIO",
    "general counsel": "General counsel",
    "member board of directors": "Board member",
    "chair board of directors": "Board chair",
    "naaste verwant": "Close relation",
    echtgenoot: "Spouse",
    echtgenote: "Spouse",
  },
};

/** Whole string first, then comma parts: the most common Swedish role
 *  contains a comma and would shred under a naive split. Untranslated parts
 *  pass through verbatim, and "‑" (U+2011) in AFM's "Non‑Executive Director"
 *  is left alone: it is a hyphen the reader can read. */
function euRole(market, role) {
  if (!role) return null;
  const table = ROLES[market] ?? {};
  const direct = table[norm(role)];

  if (direct) return direct;
  const parts = String(role)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return String(role).trim();

  return parts.map((p) => table[norm(p)] ?? p).join(" · ");
}

/** The notification a leg belongs to (see LEGS in the header). Where the
 *  row carries no proof of one, the row is its own notification: two rows
 *  that cannot be shown to be one filing are never summed. */
function euNotification(market, d) {
  if (market === "NL") {
    const m = /^mar-nl-(.+)-\d+$/.exec(String(d.id ?? ""));

    if (m) return m[1];
  }
  if (market === "SE" && /T\d{2}:\d{2}:\d{2}/.test(String(d.disclosed_date ?? ""))) {
    return String(d.disclosed_date);
  }

  return `row:${d.id}`;
}

/** One notification, split by what cannot be summed inside it: a security, a
 *  direction, and the PCA / programme / amendment flags that change what the
 *  filing means. An AFM exchange pair (a sale of one leg, a purchase of the
 *  other) is one notification and two rows. */
function euLegKey(market, d) {
  return [
    market,
    euNotification(market, d),
    d.lei ?? "",
    d.reporter?.name ?? "",
    d.isin ?? "",
    norm(d.nature),
    d.reporter?.is_closely_associated ? "pca" : "self",
    d.is_share_programme ? "prg" : "outright",
    d.is_amendment ? "amd" : "ok",
  ].join("|");
}

/** FI's status for an original that a later correction replaced. */
const SUPERSEDED = /^reviderad$/i;

/** Group the market's raw rows into one tape row per notification leg-set. */
function fromEu(market, rows) {
  const groups = new Map();

  for (const d of rows ?? []) {
    if (!d || !d.reporter) continue;
    if (SUPERSEDED.test(String(d.status ?? "").trim())) continue;
    const key = euLegKey(market, d);
    let g = groups.get(key);

    if (!g) {
      g = { key, legs: [] };
      groups.set(key, g);
    }
    g.legs.push(d);
  }

  const out = [];

  for (const g of groups.values()) {
    // Every leg shares the notification's publication; the latest trade names
    // the row, and the id breaks ties so both renderers pick the same leg.
    g.legs.sort(
      (a, b) =>
        String(b.trade_date).localeCompare(String(a.trade_date)) ||
        String(a.id).localeCompare(String(b.id)),
    );
    const p = g.legs[0];
    const [side, action] = euNature(market, p.nature);
    let volume = 0;
    let value = 0;
    let priced = 0;

    for (const leg of g.legs) {
      const v = Number(leg.volume);
      const pr = leg.price == null ? null : Number(leg.price);

      if (Number.isFinite(v)) volume += v;
      if (pr != null && Number.isFinite(pr) && Number.isFinite(v)) {
        value += pr * v;
        priced += v;
      }
    }

    const published = parseInstant(p.disclosed_date);
    const disclosedDate = isoDay(p.disclosed_date);
    // NL stamps every publication at midnight; a "time" of 00:00:00 is the
    // absence of one, not a filing made at midnight.
    const hasTime = published != null && published !== dayStart(disclosedDate);
    const flags = [];

    if (p.reporter?.is_closely_associated) flags.push("Closely associated");
    if (p.is_share_programme) flags.push("Share programme");
    if (p.is_amendment) flags.push("Amendment");
    if (p.is_first_time_report) flags.push("First report");
    if (g.legs.length > 1) flags.push(`${g.legs.length} legs`);
    if (p.venue && /OTC|utanför|outside/i.test(p.venue)) flags.push("Off exchange");

    out.push(
      finish({
        key: `${market}|${g.key}`,
        market,
        company: cleanName(p.company) || String(p.ticker ?? p.isin ?? ""),
        ticker: p.ticker || null,
        logoTicker: p.ticker || null,
        logoDomain: null,
        insider: {
          name: String(p.reporter?.name ?? "").trim(),
          role: euRole(market, p.reporter?.role),
          pca: !!p.reporter?.is_closely_associated,
        },
        side,
        action,
        shares: volume > 0 ? volume : null,
        price: priced > 0 ? value / priced : null,
        value: priced > 0 && value > 0 ? value : null,
        currency: p.currency || (market === "SE" ? "SEK" : "EUR"),
        gbp: null,
        tradeDate: isoDay(p.trade_date) || null,
        disclosedDate,
        at: hasTime ? published : dayStart(disclosedDate),
        atKind: hasTime ? "published" : "day",
        rating: p.analysis?.rating ?? null,
        triage: p.triage?.verdict ?? null,
        cluster: p.cluster?.count ? { count: Number(p.cluster.count), windowDays: Number(p.cluster.window_days) } : null,
        flags,
        href: p.reporter?.name
          ? `/${market.toLowerCase()}/directors/${encodeURIComponent(p.reporter.name)}`
          : null,
        legs: g.legs.length,
        hasRatingLayer: true,
      }),
    );
  }

  return out;
}

// ---------------------------------------------------------------------------
// KR
// ---------------------------------------------------------------------------

const hangul = /[ᄀ-ᇿ㄰-㆏가-힯]/;

function krRole(w) {
  const label = w.role?.label?.trim();

  if (label) return label;
  const p = w.position?.trim();

  if (p && p !== "-" && !hangul.test(p)) return p;

  return null;
}

function fromKr(w) {
  const change = Number(w.shares_change);
  const side = change > 0 ? "buy" : change < 0 ? "sell" : "other";
  const disclosedDate = isoDay(w.disclosed_date);
  const value = Number(w.value_krw);
  const gbp = Number(w.value_gbp);
  const company = w.company_en?.trim() || w.company;

  return finish({
    key: `KR|${w.id}`,
    market: "KR",
    company,
    ticker: w.stock_code || null,
    // The ticker provider cannot resolve a KRX code; the domain can.
    logoTicker: null,
    logoDomain: w.website || null,
    insider: {
      name: w.reporter_name_en?.trim() || w.reporter_name,
      role: krRole(w),
      pca: false,
    },
    side,
    action: side === "buy" ? "Bought" : side === "sell" ? "Sold" : w.reason || "Transaction",
    shares: Number.isFinite(change) ? Math.abs(change) : null,
    price: w.price_krw != null && Number.isFinite(Number(w.price_krw)) ? Number(w.price_krw) : null,
    value: Number.isFinite(value) && value > 0 ? value : null,
    currency: "KRW",
    gbp: Number.isFinite(gbp) && gbp > 0 ? gbp : null,
    tradeDate: isoDay(w.trade_date) || null,
    disclosedDate,
    at: dayStart(disclosedDate),
    atKind: "day",
    rating: null,
    triage: null,
    cluster: null,
    flags: [
      ...(w.venue && w.venue !== "OTHER" ? [w.venue] : []),
      ...(w.plan_report_date ? ["Pre-declared"] : []),
      ...(w.price_suspect ? ["Price looks wrong"] : []),
    ],
    // Korea's filings have no page of their own; the dashboard lists the same
    // filing, which is the nearest real destination.
    href: "/kr",
    legs: 1,
    hasRatingLayer: false,
  });
}

// ---------------------------------------------------------------------------
// The shared shape
// ---------------------------------------------------------------------------

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** Fill the derived fields every row carries, so no consumer computes them. */
function finish(row) {
  return { ...row, ratingState: ratingState(row) };
}

/** How the verdict slot should read. The states are distinct on purpose:
 *  "rated" carries a rating; "skipped" was triaged and set aside; "reviewing"
 *  cleared triage and is waiting on analysis; "unrated" has not been triaged;
 *  "no-layer" is a market with no rating pipeline at all, which is a fact
 *  about the market rather than about the row. */
export function ratingState(row) {
  if (row.rating) return "rated";
  if (!row.hasRatingLayer) return "no-layer";
  if (row.triage === "skip") return "skipped";
  if (row.triage === "maybe" || row.triage === "promising") return "reviewing";

  return "unrated";
}

/** Normalise one market's raw payload. */
export function normaliseFeed(marketId, payload) {
  const rows = payload?.dealings ?? [];

  switch (marketId) {
    case "UK":
      return rows.map(fromUk);
    case "US":
      return rows.map(fromUs);
    case "SE":
    case "NL":
      return fromEu(marketId, rows);
    case "KR":
      return rows.map(fromKr);
    default:
      return [];
  }
}

/** Newest first: instant, then date, then market order, then key. Stable
 *  across renderers, which is what lets the crawled order match the
 *  hydrated one. */
export function compareTapeRows(a, b) {
  if (a.disclosedDate !== b.disclosedDate) return a.disclosedDate < b.disclosedDate ? 1 : -1;
  if (a.at !== b.at) return b.at - a.at;
  const ma = TAPE_MARKETS.findIndex((m) => m.id === a.market);
  const mb = TAPE_MARKETS.findIndex((m) => m.id === b.market);

  if (ma !== mb) return ma - mb;

  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** Merge the five feeds into one tape.
 *
 *  THE FLOOR is what keeps the merge honest. Each feed is a fixed page of its
 *  newest rows, and the pages reach back different distances: 250 US rows
 *  are about ten days, 250 NL rows about three weeks. Merged naively, the
 *  tape's older days would show Dutch filings and no American ones, which
 *  reads as "the US was quiet", a claim no feed made. So the tape is cut at
 *  the oldest day every FULL page still covers: a feed that came back with
 *  fewer rows than asked for has no more to give and does not bind. Feeds
 *  that failed do not bind either; the page names them as missing. */
export function mergeTape(feeds) {
  let floor = null;
  const binding = [];

  for (const m of TAPE_MARKETS) {
    const f = feeds?.[m.id];

    // `raw` is the row count the endpoint returned BEFORE leg-merging; a page
    // that came back full may have more behind it, so it binds.
    if (!f || f.status !== "ok" || (f.raw ?? f.rows.length) < (f.requested ?? TAPE_LIMITS[m.id])) continue;
    const oldest = f.rows.reduce(
      (min, r) => (min == null || r.disclosedDate < min ? r.disclosedDate : min),
      null,
    );

    if (oldest == null) continue;
    // Rows ON the oldest day may be cut mid-day; the day above it is the
    // first one this feed holds in full.
    const first = addDays(oldest, 1);

    if (floor == null || first > floor) {
      floor = first;
      binding.length = 0;
      binding.push(m.id);
    } else if (first === floor) binding.push(m.id);
  }

  const rows = [];

  for (const m of TAPE_MARKETS) {
    const f = feeds?.[m.id];

    if (!f || f.status !== "ok") continue;
    for (const r of f.rows) if (floor == null || r.disclosedDate >= floor) rows.push(r);
  }

  rows.sort(compareTapeRows);

  return { rows, floor, binding };
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

/** Fetch every feed, each on its own fate. Returns one entry per market with
 *  `status: "ok" | "failed"`, so a page can say "Sweden did not load" rather
 *  than either hiding the gap or blanking the whole tape. */
export async function fetchTapeFeeds({ apiBase, fetchImpl = fetch, cf = null }) {
  const results = await Promise.allSettled(
    TAPE_MARKETS.map(async (m) => {
      const requested = TAPE_LIMITS[m.id];
      const res = await fetchImpl(tapeFeedUrl(apiBase, m.id, requested), {
        headers: { accept: "application/json" },
        ...(cf ? { cf } : {}),
      });

      if (!res.ok) throw new Error(`${m.id} ${res.status}`);
      const payload = await res.json();

      return {
        rows: normaliseFeed(m.id, payload),
        raw: (payload?.dealings ?? []).length,
        requested,
      };
    }),
  );

  const feeds = {};

  TAPE_MARKETS.forEach((m, i) => {
    const r = results[i];

    feeds[m.id] =
      r.status === "fulfilled"
        ? { status: "ok", ...r.value, fetchedAt: Date.now() }
        : {
            status: "failed",
            rows: [],
            raw: 0,
            requested: TAPE_LIMITS[m.id],
            fetchedAt: Date.now(),
          };
  });

  return feeds;
}

// ---------------------------------------------------------------------------
// Formatting, shared by both renderers so a crawler's "£98.9k" is the
// reader's "£98.9k".
// ---------------------------------------------------------------------------

const SYMBOL = { GBP: "£", USD: "$", EUR: "€", KRW: "₩", JPY: "¥" };

/** Native money, compact. Currencies without a one-glyph symbol carry their
 *  ISO code: "SEK 1.4m", "CAD 20k". Null when the value is not held: the
 *  caller writes the words, never a dash. */
export function formatNative(value, currency) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return null;
  const prefix = SYMBOL[currency] ?? `${currency} `;

  if (n >= 999_500_000) return `${prefix}${(n / 1e9).toFixed(1)}bn`;
  if (n >= 999_500) {
    const m = n / 1e6;

    return `${prefix}${m >= 9.95 ? Math.round(m) : m.toFixed(1)}m`;
  }
  if (n >= 999.5) return `${prefix}${Math.round(n / 1000)}k`;

  return `${prefix}${Math.round(n)}`;
}

export function formatGbpApprox(gbp) {
  const s = formatNative(gbp, "GBP");

  return s ? `≈ ${s}` : null;
}

export function formatShares(n) {
  const v = Number(n);

  if (!Number.isFinite(v) || v <= 0) return null;

  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(v);
}

/** "07:18" in the market's own zone. The city is the zone's name on the row,
 *  because "GMT+9" says less to a reader than "Seoul". */
export function formatLocalClock(ms, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

/** "Tuesday 16 September". */
export function formatDayLong(isoDate) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/** "16 Sep". */
export function formatDayShort(isoDate) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/** "09:00–15:30". */
export function formatSessionHours(m) {
  const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  return `${hm(m.open)}–${hm(m.close)}`;
}

/** Today's date in a zone, as ISO. */
export function todayIn(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Where a row links, read from a page served on `hostname`.
 *
 *  `row.href` is the site path ("/us/dealings/…"), and one SPA answers every
 *  path on every domain: ddbx.uk/us/dealings/… renders, but it is a noindexed
 *  copy of the page ddbx.us owns. So a row goes to its market's owning domain
 *  from MARKET_HOST_BY_ID, the map `marketHref` in src/lib/markets/registry.ts
 *  reads for the same job (that one is .ts and cannot be imported by the
 *  Function), and stays relative only when that domain is the one serving
 *  the tape. Local and preview hosts have no domain routing and keep the
 *  path, as marketHref does.
 *
 *  Keyed on the ROW's market, not the path: "/dealings/…" carries no market
 *  prefix, and on ddbx.us a path-based lookup would resolve it to the US. */
export function tapeRowHref(row, hostname) {
  if (!row?.href) return null;
  if (!isProductionHost(hostname)) return row.href;
  const owner = MARKET_HOST_BY_ID[String(row.market).toLowerCase()];
  const host = String(hostname).toLowerCase().replace(/^www\./, "");

  return !owner || owner === host ? row.href : `https://${owner}${row.href}`;
}

/** The time-of-day line for a row: "12:14 Stockholm", "seen 07:18 London",
 *  or null for a row that carries only a date. */
export function rowClock(row) {
  if (row.atKind === "day") return null;
  const m = tapeMarket(row.market);
  const clock = formatLocalClock(row.at, m.timeZone);

  return row.atKind === "seen" ? `seen ${clock} ${m.city}` : `${clock} ${m.city}`;
}

// ---------------------------------------------------------------------------
// Where each market stands on the tape, said the same way by both renderers
// ---------------------------------------------------------------------------

/** Market names as they sit inside a sentence. */
export const TAPE_MARKET_NAMES = {
  KR: "Korea",
  SE: "Sweden",
  NL: "the Netherlands",
  UK: "the UK",
  US: "the US",
};

/** "Sweden", "Sweden and the UK", "Korea, Sweden and the UK". */
export function joinMarketNames(ids) {
  const names = ids.map((id) => TAPE_MARKET_NAMES[id] ?? id);

  if (names.length <= 1) return names.join("");

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const sentenceCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Each market, in strip order, as the tape stands: "on" with a count of the
 *  rows it has on the tape, "quiet" when its feed answered but nothing it
 *  holds reaches the tape's span (the Netherlands on 17 September: newest
 *  filing the 7th, floor the 12th), or "failed". `latest` is the newest day
 *  the feed holds, read from the data, so a quiet market can say since when.
 *
 *  `rows` is what is on the page: the merged rows for the pre-render, the
 *  held rows for the React page, which may reach below today's floor. */
export function tapeMarketStates(feeds, rows) {
  return TAPE_MARKETS.map((m) => {
    const feed = feeds?.[m.id];
    const count = (rows ?? []).filter((r) => r.market === m.id).length;
    const latest =
      feed?.status === "ok"
        ? feed.rows.reduce(
            (max, r) => (max == null || r.disclosedDate > max ? r.disclosedDate : max),
            null,
          )
        : null;
    const state = feed?.status !== "ok" ? "failed" : count > 0 ? "on" : "quiet";

    return { id: m.id, name: TAPE_MARKET_NAMES[m.id], state, count, latest };
  });
}

/** The count line above the tape and the head of the pre-render's meta
 *  description. The total is followed by its per-market parts, so a round
 *  number reads as the count it is rather than as a cap, and every covered
 *  market is accounted for: a quiet one is named with the date of its newest
 *  filing. A failed one is left to the failure notice, which names it. */
export function tapeSummary(rows, states, floor) {
  const total = rows.length;
  const on = states.filter((s) => s.state === "on").sort((a, b) => b.count - a.count);
  const since = floor ?? rows.reduce((min, r) => (min == null || r.disclosedDate < min ? r.disclosedDate : min), null);
  const parts = on.map((s) => `${s.count} from ${s.name}`);
  const head = `${total} ${total === 1 ? "filing" : "filings"} from ${on.length} of ${states.length} markets${since ? ` since ${formatDayShort(since)}` : ""}, newest first`;
  const breakdown =
    parts.length > 1
      ? `: ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
      : "";
  const quiet = states
    .filter((s) => s.state === "quiet")
    .map((s) =>
      s.latest
        ? `${sentenceCase(s.name)} has had no filings since ${formatDayShort(s.latest)}, so it has no rows in this span.`
        : `${sentenceCase(s.name)} has no filings on its feed.`,
    );

  return [`${head}${breakdown}.`, ...quiet].join(" ");
}

/** One market's line in the coverage section: where it stands right now. */
export function tapeCoverageNow(state, floor) {
  if (state.state === "failed") return "The feed did not load, so this market is missing from the tape";
  if (state.state === "quiet") {
    return state.latest
      ? `No filings since ${formatDayShort(state.latest)}, so none in the tape’s span${floor ? `, which starts ${formatDayShort(floor)}` : ""}`
      : "No filings on the feed";
  }

  return `${state.count} ${state.count === 1 ? "filing" : "filings"} on the tape${floor ? ` since ${formatDayShort(floor)}` : ""}`;
}

/** What the page publishes about how the tape is put together. Rendered by
 *  both the React page and the pre-render. */
export const TAPE_METHODOLOGY = [
  "Each market is read from its own regulator's feed and mapped onto one row shape: company, insider, role, side, size, and a verdict where one exists. No field is invented for a market that does not file it.",
  "Rows are ordered by the best instant each filing can honestly claim. Sweden publishes the time of day. For the UK and US the row shows when ddbx first saw it, marked \"seen\". The Netherlands and Korea record only the day, and those rows sit under the timed ones on the same date.",
  "Values are in the currency the filing was made in and are never converted. A London filing made in dollars is shown in dollars. Korean rows carry an approximate sterling reading beside the won because the server already computes it.",
  "The tape is cut at the oldest day every market's page of filings still covers in full. Older days would show only the markets whose feeds reach further back, which reads as quiet where it is only unread.",
  "The tape is not every insider filing in five countries. The UK line carries open-market purchases only, once each has been rated or set aside. The US line is the set the US dashboard shows: open-market purchases of $50,000 or more, held directly and outside a 10b5-1 plan. Korea carries purchases of about £25,000 or more by individuals, read once a day. Sweden and the Netherlands carry every notification, sales and grants included.",
  "A European notification often reports several transactions. Those are one row, with the legs counted on it; two notifications from the same person on the same day are two rows. When Sweden’s regulator corrects a notification, only the corrected version is shown.",
  "A verdict is shown only where the rating layer has reached the filing. Korea has no rating layer, so every Korean row is marked as an unrated market rather than as an unrated filing.",
  "The page refreshes its feeds every minute. New filings are counted at the top and merged only when you ask, so the list never moves under you.",
];
