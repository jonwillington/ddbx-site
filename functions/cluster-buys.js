// Crawler pre-render for the cluster-buying board.
//
// The grouping and the methodology come from shared/boards.js — the same module
// the React page uses. Read the comment above `clusterEpisodes` there before
// touching this: the `cluster` field is a rolling per-row annotation and the
// two obvious ways to group it both overstate the answer.
//
// The insider count printed here is `named` — the buyers actually listed in the
// row — not the pipeline's own count, for the reason set out in boards.js.

import { fetchDealingsWindow } from "../shared/dealings-feed.js";
import {
  countsTowardCluster,
  rankClusters,
  CLUSTER_METHODOLOGY,
  TOP_N,
} from "../shared/boards.js";
import { buyPerson } from "../shared/leaderboard.js";
import { esc, noindex, page, renderInto } from "../shared/prerender.js";
import { windowStart } from "../shared/sectors.js";
import { brandTitle, isProductionHost } from "../shared/seo.js";
import { TRACKING_NOTICE } from "../shared/tracking.js";

const API_BASE = "https://api.ddbx.uk/api";
const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const SYMBOL = { UK: "£", US: "$" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

function money(v, symbol) {
  const n = Number(v);

  if (!isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(1)}bn`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${symbol}${m >= 10 ? Math.round(m) : m.toFixed(1)}m`;
  }

  return `${symbol}${Math.round(n / 1000)}k`;
}

const signedPp = (r) =>
  r == null ? "n/a" : `${r > 0 ? "+" : ""}${(r * 100).toFixed(1)}pp`;

const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

const cleanCompany = (c) => {
  let out = String(c ?? "").trim();

  for (;;) {
    const next = out
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s*\/[A-Z]{2}\/\s*$/, "")
      .trim();

    if (next === out || next === "") return out;
    out = next;
  }
};

const cleanInsider = (n) => {
  const out = String(n ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  return out || String(n ?? "").trim();
};

/** Same wording the hydrated row uses — "on one day" rather than "over 0
 *  days", which is both the strongest version of the signal and the one a
 *  naive template gets wrong. */
function spanLabel(days) {
  if (days <= 0) return "on one day";
  if (days === 1) return "over two days";

  return `over ${days} days`;
}

/** Only the buyers the headline counts — see the same note on the hydrated
 *  row. `episode.rows` holds every purchase in the window including those below
 *  the market's co-buyer floor, and listing all of them puts more names on the
 *  row than the count above them. */
function buyerNames(episode, market) {
  const seen = [];

  for (const d of episode.rows) {
    if (!countsTowardCluster(d, market)) continue;
    const name = cleanInsider(buyPerson(d) ?? "");

    if (name && !seen.includes(name)) seen.push(name);
  }

  return seen;
}

function leadSentence(rows, market) {
  const noun = market === "US" ? "insiders" : "directors";
  const top = rows[0];

  if (!top)
    return `Where several ${market} ${noun} bought the same company within a fortnight of each other.`;

  return `The ${rows.length} clearest cases of several ${market} ${noun} buying the same company within a fortnight of each other over the last twelve months, led by ${cleanCompany(top.company) || displayTicker(top.ticker)} with ${top.named} insiders ${spanLabel(top.spanDays)}.`;
}

function prerender(rows, market, host, complete, counts) {
  const symbol = SYMBOL[market];

  const cell = "padding:8px 12px;border-bottom:1px solid #ece1cf";
  const quiet = "display:block;font-size:12px;color:#6b6154;margin-top:2px";

  const body = rows
    .map((e, i) => {
      const names = buyerNames(e, market);

      return `<tr>
      <td style="${cell}">${i + 1}</td>
      <td style="${cell}"><a href="https://${esc(host)}/company/${esc(displayTicker(e.ticker).toLowerCase())}">${esc(cleanCompany(e.company) || displayTicker(e.ticker))}</a>${
        names.length > 0
          ? `<span style="${quiet}">${esc(names.join(", "))}</span>`
          : ""
      }</td>
      <td style="${cell}">${esc(e.named)}</td>
      <td style="${cell}">${esc(e.filings)} ${esc(spanLabel(e.spanDays))}${
        e.firstDate ? `<span style="${quiet}">from ${esc(e.firstDate)}</span>` : ""
      }</td>
      <td style="${cell}">${esc(money(e.value, symbol))}</td>
      <td style="${cell}">${esc(e.alphaCount > 0 ? signedPp(e.medianAlpha) : "n/a")}</td>
    </tr>`;
    })
    .join("");

  const method = CLUSTER_METHODOLOGY.map(
    (line) => `<li style="margin-bottom:8px">${esc(line)}</li>`,
  ).join("");

  const eyebrow =
    "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";

  const held = [
    counts.soft > 0
      ? `${counts.soft} further ${counts.soft === 1 ? "episode" : "episodes"} met only the softer thirty-day tier and ${counts.soft === 1 ? "is" : "are"} not listed.`
      : "",
    counts.partial > 0
      ? `${counts.partial} more ${counts.partial === 1 ? "cluster" : "clusters"} had buyers whose purchases fall outside the twelve months this page covers, so ${counts.partial === 1 ? "it is" : "they are"} left off rather than shown with fewer buyers than ${counts.partial === 1 ? "it claims" : "they claim"}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return page(`<p style="${eyebrow}">Leaderboard</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">Cluster buying, where several ${esc(market)} insiders bought at once</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">Where several ${market === "US" ? "insiders" : "directors"} bought the same company within a fortnight of each other. One insider buying is a person's opinion; <a href="https://${esc(host)}/learn/cluster-buying">a cluster</a> is a board agreeing with itself, which is a different and rarer thing.</p>
  <p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(TRACKING_NOTICE)}</p>
  ${complete ? "" : `<p style="font-size:13px;color:#6b6154">We couldn’t load the whole period, so this ranking may be missing older clusters.</p>`}
  <p style="font-size:14px;color:#4a4034;max-width:62ch">${esc(counts.qualifying)} clusters in the last twelve months can be shown in full; the ${rows.length} largest are listed here.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">#</th>
    <th style="text-align:left;padding:8px 12px">Company and who bought</th>
    <th style="text-align:left;padding:8px 12px">Insiders</th>
    <th style="text-align:left;padding:8px 12px">Purchases</th>
    <th style="text-align:left;padding:8px 12px">Combined value</th>
    <th style="text-align:left;padding:8px 12px">Median alpha since</th>
  </tr></thead><tbody>${body}</tbody></table>
  ${held ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">${esc(held)}</p>` : ""}
  <h2 style="font-size:15px;margin:32px 0 10px">How this is put together</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${method}</ul>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/learn/cluster-buying">What a cluster means</a> · <a href="https://${esc(host)}/biggest-buys">The biggest buys</a> · <a href="https://${esc(host)}/best-performing-buys">Best-performing buys</a> · <a href="https://${esc(host)}/most-active-companies">Most-active companies</a></p>`);
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  let dealings;
  let complete;

  try {
    ({ dealings, complete } = await fetchDealingsWindow({
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
    return shell;
  }

  const { rows, qualifying, soft, partial } = rankClusters(
    dealings,
    market,
    TOP_N,
  );

  if (rows.length === 0) return complete ? noindex(shell) : shell;

  const canonical = `https://${host}/cluster-buys`;

  return renderInto(shell, {
    title: brandTitle(
      `Cluster buying — where several ${market} insiders bought at once`,
    ),
    description: leadSentence(rows, market),
    canonical,
    breadcrumbs: [{ name: "Cluster buying", item: canonical }],
    body: prerender(rows, market, host, complete, {
      qualifying,
      soft,
      partial,
    }),
  });
}
