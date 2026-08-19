// Crawler pre-render for company pages: ddbx.uk/company/mtln, ddbx.us/company/fcnca.
//
// The page itself is a React route (src/pages/company.tsx) so it gets the
// site's navbar, footer and editorial design language for free. That leaves
// one problem: a crawler fetching a SPA route sees an empty <div id="root">.
// This Function fixes that without a second design — it fetches the same API
// bundle React uses, then rewrites the shell:
//
//   1. <title>, description, canonical, OG/Twitter — per company, not the
//      generic route-table copy the middleware would apply
//   2. the facts, as plain semantic HTML, injected INTO #root
//
// React replaces (2) the moment it mounts, so users see the real page and
// non-JS crawlers see the content. Same URL, same facts, no user-agent
// sniffing. The injected markup carries just enough inline styling that a slow
// connection sees a simplified page rather than a broken one.
//
// The market comes from the domain and the LSE ".L" suffix is added back here
// — mirrors tickerToSlug/slugToKey in src/lib/company.ts.
//
// The head/breadcrumb/escape/fetch primitives are shared/prerender.js. This
// Function grew private copies of all of them first, which is how it ended up
// with a `money()` that formatted US dollars in en-GB and a `cleanCompany()`
// that had drifted a fix behind src/lib/company.ts.

import {
  apexHost,
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { brandTitle } from "../../shared/seo.js";
import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { sectorPath, windowStart } from "../../shared/sectors.js";
import {
  cadence,
  cadenceSentence,
  sectorStanding,
  standingSentence,
} from "../../shared/company-context.js";

const API_BASE = "https://api.ddbx.uk/api";

const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const FILING_NOUN = { UK: "director dealings", US: "insider trading" };

const localeFor = (market) => (market === "US" ? "en-US" : "en-GB");

/** "mtln" + UK -> "MTLN.L"; "fcnca" + US -> "FCNCA". */
function slugToKey(slug, market) {
  const bare = String(slug ?? "").toUpperCase();

  if (market !== "UK") return bare;

  return bare.endsWith(".L") ? bare : `${bare}.L`;
}

/** Display name, cleaned of the noise each source appends. Mirrors
 *  `cleanCompanyName` in src/lib/company.ts — including the loop, which the
 *  single-pass copy that used to live here did not have. Names routinely carry
 *  TWO trailing parentheticals ("Jardine Matheson Holdings Ltd (Singapore Reg)
 *  (JAR)"), and one pass stripped only the ticker, so the indexed <title> and
 *  meta description carried a fragment the React page never showed. */
const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    // Never strip the whole name away: a company literally called "(BLANK)"
    // should render as it arrived rather than as an empty string.
    if (next === out || next === "") return out;
    out = next;
  }
};

const displayTicker = (k) => String(k ?? "").replace(/\.L$/i, "");

const SYMBOL = { GBP: "£", USD: "$", EUR: "€" };

function moneyShort(value, currency = "GBP") {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";
  const sym = SYMBOL[currency] ?? "";

  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${sym}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;

  return `${sym}${Math.round(n)}`;
}

/** Grouped figure. The market matters: en-GB and en-US agree on the comma for
 *  thousands today, but this hardcoded "en-GB" for every row on ddbx.us, which
 *  is the sort of thing that silently disagrees with the React page the moment
 *  either locale's rules change. */
function money(value, currency = "GBP", market = "UK") {
  const n = Number(value);

  if (!isFinite(n) || n === 0) return "—";

  return `${SYMBOL[currency] ?? ""}${Math.round(n).toLocaleString(localeFor(market))}`;
}

function fmtDate(iso, market) {
  try {
    return new Intl.DateTimeFormat(localeFor(market), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso ?? "—";
  }
}

function monthYear(iso, market) {
  try {
    return new Intl.DateTimeFormat(localeFor(market), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso ?? "";
  }
}

const personName = (deal) => deal.director?.name ?? deal.reporter?.name ?? "—";

function personRole(deal) {
  if (deal.director?.role) return deal.director.role;
  const r = deal.reporter;

  if (!r) return "";
  if (r.officer_title) return r.officer_title;

  return (r.roles ?? [])
    .map((x) => (x === "ten_percent_owner" ? "10% owner" : x))
    .join(", ");
}

const dealValue = (deal, market) =>
  market === "UK" ? deal.value_gbp : deal.value;

/** The lead sentence, plain text — also the meta description. Templated from
 *  real numbers rather than model-written: at this page count the API spend
 *  would be real, and mass-generated prose is what search engines demote. */
function leadSentence(d) {
  const { market, summary } = d;
  const name = cleanCompany(d.company);
  const people = summary.people;
  const noun =
    market === "UK"
      ? people === 1
        ? "director"
        : "directors"
      : people === 1
        ? "insider"
        : "insiders";
  const since = summary.first_trade_date
    ? ` since ${monthYear(summary.first_trade_date, market)}`
    : "";

  let s = `${people} ${noun} ${people === 1 ? "has" : "have"} bought ${moneyShort(summary.total_value, summary.currency)} of ${name} shares across ${summary.deals} ${summary.deals === 1 ? "disclosed dealing" : "disclosed dealings"}${since}.`;

  if (summary.analysed) {
    s += ` ${summary.analysed} of those ${summary.analysed === 1 ? "has been" : "have been"} scored against our six-point signal check.`;
  }
  if (summary.congress_trades) {
    s += ` ${summary.congress_trades} congressional ${summary.congress_trades === 1 ? "trade has" : "trades have"} also been disclosed in this ticker.`;
  }

  return s;
}

/** The page's FAQ, as text.
 *
 *  Mirrors `companyFaq` in src/pages/company.tsx verbatim — that copy is JSX
 *  and this Function is plain ESM outside the Vite graph, so it cannot be
 *  imported. Change one and change the other: the pre-render exists to show a
 *  crawler what the React page shows, and copy that disagrees is worse than
 *  copy that's missing.
 *
 *  Text, NOT FAQPage schema. See the note at the top of shared/prerender.js:
 *  Google restricted FAQ rich results to a narrow set of authoritative sources,
 *  so the markup buys nothing and still has to be maintained. The visible
 *  answers are the part that was actually missing — the React page carries five
 *  paragraphs of on-topic prose that no crawler without JS could see. */
function faq(name, market) {
  const insider = market === "UK" ? "director" : "insider";
  const filing =
    market === "UK"
      ? "a PDMR notification to the LSE"
      : "a Form 4 filing with the SEC";

  return [
    [
      `Where does this ${name} data come from?`,
      `Every row is a public regulatory disclosure — ${filing} — collected within minutes of being published. We don’t take company submissions and we don’t edit the numbers; the only thing we add is the rating and the reasoning behind it.`,
    ],
    [
      `Is a ${insider} buying shares a good signal?`,
      `Sometimes. A ${insider} buying with their own money is one of the few honest signals in the market, but plenty of purchases are routine — small top-ups, scheme allocations, or a well-paid executive rounding out a holding. That’s what our six-point check is for: it separates the conviction buys from the housekeeping, and shows you which is which.`,
    ],
    [
      "How often is this page updated?",
      "The pipeline runs every 15 minutes through the trading day, so a new disclosure appears here shortly after it’s filed. Company stats refresh daily.",
    ],
    [
      "Can I get alerted when someone buys?",
      `Yes — that’s what the app is for. Follow ${name} and you’ll get a push the moment a ${insider} files, with the full analysis attached, plus alerts if the price moves after a buy you’re following.`,
    ],
    [
      "Is this financial advice?",
      "No. ddbx rates the conviction behind insider buys and shows the reasoning. It’s information, never a recommendation, and never a guarantee. What you do with it is your call.",
    ],
  ];
}

/** Semantic pre-render. No classes — React owns the real presentation; these
 *  inline styles only keep the sub-second pre-hydration view legible. */
/** Sector standing, peers and cadence.
 *
 *  The same facts src/pages/company.tsx renders, from the same module, because
 *  a crawler reading a different peer list from the visitor is a page arguing
 *  with itself. Returns "" whenever there is nothing computable — the section
 *  is dropped rather than printed empty, which is the rule the rest of the
 *  static pages follow. */
function contextBlock(d, standing, name) {
  const { market } = d;
  const cadenceLine = cadenceSentence(cadence(d.summary), market);

  if (!standing && !cadenceLine) return "";

  const marketHome = market === "US" ? "https://ddbx.us" : "https://ddbx.uk";
  const parts = [];

  if (cadenceLine) {
    parts.push(
      `<p style="font-size:14px;line-height:1.65;color:#4a4034;max-width:62ch">${esc(cadenceLine)}</p>`,
    );
  }

  if (standing) {
    parts.push(
      `<p style="font-size:14px;line-height:1.65;color:#4a4034;max-width:62ch">${esc(name)} is classed as <a href="${esc(marketHome)}${esc(sectorPath(standing.sector.slug))}">${esc(standing.sector.label.toLowerCase())}</a>. ${esc(standingSentence(standing, market))}</p>`,
    );

    if (standing.peers.length > 0) {
      const label =
        standing.rank == null
          ? "The most active companies in the sector"
          : "Companies with a comparable amount of disclosed buying";
      const links = standing.peers
        .map(
          (peer) =>
            `<a href="${esc(marketHome)}/company/${esc(displayTicker(peer.ticker).toLowerCase())}">${esc(cleanCompany(peer.company) || displayTicker(peer.ticker))}</a>`,
        )
        .join(" · ");

      parts.push(
        `<p style="font-size:13px;color:#6b6154;margin-top:14px">${esc(label)}: ${links}</p>`,
      );
    }
  }

  parts.push(
    `<p style="font-size:13px;color:#6b6154;margin-top:14px">See also <a href="${esc(marketHome)}/biggest-buys">the biggest buys</a>, <a href="${esc(marketHome)}/cluster-buys">cluster buying</a> and <a href="${esc(marketHome)}/most-active-companies">the most-active companies</a>.</p>`,
  );

  return `<h2 style="font-size:15px;margin:32px 0 10px">In context</h2>${parts.join("")}`;
}

function prerender(d, standing) {
  const { market } = d;
  const name = cleanCompany(d.company);
  const ticker = displayTicker(d.key);
  const rows = d.deals
    .map(
      (deal) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(fmtDate(deal.trade_date, market))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(personName(deal))}${personRole(deal) ? ` — ${esc(personRole(deal))}` : ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf;text-align:right">${esc(money(dealValue(deal, market), market === "UK" ? "GBP" : "USD", market))}</td>
    </tr>`,
    )
    .join("");

  const news = (d.news?.items ?? [])
    .slice(0, 6)
    .map(
      (n) => `<li><a href="${esc(n.url)}" rel="nofollow">${esc(n.title)}</a></li>`,
    )
    .join("");

  const questions = faq(name, market)
    .map(
      ([q, a]) =>
        `<h3 style="font-size:14px;margin:20px 0 6px">${esc(q)}</h3><p style="font-size:14px;line-height:1.65;color:#4a4034;max-width:62ch">${esc(a)}</p>`,
    )
    .join("");

  const marketHome = market === "US" ? "https://ddbx.us/" : "https://ddbx.uk/";

  // NOTE — the h1 here ("Metlen Energy & Metals PLC (MTLN) director dealings")
  // is not the h1 React renders (just the company name). Both are defensible:
  // this one carries the query a searcher types, that one is the cleaner
  // document heading. Deliberately left disagreeing rather than settled
  // unilaterally — it's an owner decision, and whichever way it goes both
  // sides have to move together or the pre-render stops matching the page.
  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(name)} (${esc(ticker)}) ${esc(FILING_NOUN[market])}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(leadSentence(d))}</p>
  <h2 style="font-size:15px;margin:32px 0 10px">${market === "UK" ? "Director" : "Insider"} buys</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}</tbody></table>
  ${contextBlock(d, standing, name)}
  ${d.stats?.description ? `<h2 style="font-size:15px;margin:32px 0 10px">About ${esc(name)}</h2><p style="font-size:14px;line-height:1.65;color:#4a4034">${esc(d.stats.description)}</p>` : ""}
  ${news ? `<h2 style="font-size:15px;margin:32px 0 10px">Recent news</h2><ul style="font-size:14px;line-height:1.8">${news}</ul>` : ""}
  <h2 style="font-size:15px;margin:32px 0 10px">Common questions</h2>
  ${questions}
  <p style="margin-top:32px;font-size:14px"><a href="${esc(marketHome)}companies">Browse every company</a> · <a href="${esc(marketHome)}">All ${esc(FILING_NOUN[market])}</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  // Non-production hosts (preview, local) still render the SPA — they just
  // don't get the pre-render, and robots.txt disallows them anyway.
  const market = MARKET_BY_HOST[host] ?? "UK";
  const key = slugToKey(decodeURIComponent(String(params.key ?? "")), market);

  // The SPA shell. React boots from this and takes over whatever we inject.
  const shell = await context.next();

  const data = await fetchJson(
    `${API_BASE}/company/${market}/${encodeURIComponent(key)}/page`,
  );

  // Unknown company: let the SPA render its own "not found" state, but keep it
  // out of the index rather than leaving a bare shell to be crawled.
  if (!data) return noindex(shell);

  // The twelve-month window, for the context block. Edge-cached under the same
  // key every sector hub and board uses, so across 368 company pages this is
  // one cached object rather than 368 fetches. Failure costs the section, not
  // the page — hence the catch rather than a guard.
  let windowDeals = null;

  try {
    ({ dealings: windowDeals } = await fetchDealingsWindow({
      apiBase: API_BASE,
      market,
      since: windowStart(new Date()),
      until: null,
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
      },
    }));
  } catch {
    windowDeals = null;
  }

  const standing = sectorStanding(data.deals, windowDeals, market, data.key);

  const name = cleanCompany(data.company);
  const ticker = displayTicker(data.key);
  const canonical = `https://${host}/company/${encodeURIComponent(String(params.key ?? "").toLowerCase())}`;
  const title = brandTitle(
    `${name} (${ticker}) ${FILING_NOUN[market]} — ${data.summary.deals} insider ${data.summary.deals === 1 ? "buy" : "buys"}`,
  );
  const description = leadSentence(data);

  return renderInto(shell, {
    title,
    description,
    canonical,
    breadcrumbs: [
      { name: `${market} ${FILING_NOUN[market]}`, item: `https://${host}/` },
      { name: "Companies", item: `https://${host}/companies` },
      { name, item: canonical },
    ],
    body: prerender(data, standing),
  });
}
