// Crawler pre-render for the living studies — /research and /research/:slug.
//
// A catch-all, as /roles is: the index and a study read the same fetch and
// differ in what they print from it. The questions, the cells, the thresholds
// and every sentence that states a number come from shared/studies.js, the
// module the React page renders from, so a crawler and a reader are shown one
// verdict. That matters more here than on a board: the page exists to be
// cited, and a citation of a verdict the reader cannot reproduce is worse
// than no page.
//
// Indexability: a study always exists. Under the floor its content IS the
// not-yet state — what is missing and when it should exist — which is the
// page's design rather than an absence of one, so it is never noindexed for
// being under threshold. An unknown slug is noindexed; a failed fetch serves
// the plain shell so an API blip cannot cost an indexed URL.

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import {
  citation,
  computeStudy,
  datasetSentence,
  longDate,
  pct,
  signedPp,
  stateLabel,
  studyBySlug,
  studyPath,
  verdictDetail,
  verdictHeadline,
  METHODOLOGY,
  MIN_CELL,
  MIN_HORIZON_DAYS,
  STUDIES,
  STUDY_FLOOR,
} from "../../shared/studies.js";
import { esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { windowStart } from "../../shared/sectors.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import { trackingNotice } from "../../shared/tracking.js";

const API_BASE = "https://api.ddbx.uk/api";
const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const SYMBOL = { UK: "£", US: "$" };

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";
const CELL = "padding:8px 12px;border-bottom:1px solid #ece1cf";
const NUM = `${CELL};text-align:right`;
const QUIET = "font-size:13px;color:#6b6154;max-width:64ch";
const BODY = "font-size:15px;line-height:1.6;color:#4a4034;max-width:66ch";

const list = (lines) =>
  lines.map((l) => `<li style="margin-bottom:8px">${esc(l)}</li>`).join("");

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

function indexPrerender(results, market, host, complete) {
  const items = STUDIES.map((study) => {
    const r = results.find((x) => x.slug === study.slug);

    return `<li style="margin-bottom:20px">
      <a href="https://${esc(host)}${studyPath(study.slug)}"><strong>${esc(study.title)}</strong></a>
      <span style="display:block;font-size:12px;color:#5a4128;letter-spacing:1px;text-transform:uppercase;margin-top:4px">${esc(stateLabel(r))}</span>
      <span style="display:block;${QUIET};margin-top:4px">${esc(study.summary)}</span>
      <span style="display:block;font-size:14px;color:#1E1506;margin-top:6px">${esc(verdictHeadline(r))}</span>
      <span style="display:block;font-size:12px;color:#6b6154;margin-top:2px">Computed ${esc(longDate(r.computedOn))}${r.asOf ? `, prices to ${esc(longDate(r.asOf))}` : ""}</span>
    </li>`;
  }).join("");

  const widest = results.find((r) => r.slug === "does-size-matter");

  return page(`<p style="${EYEBROW}">Living studies</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">What ${esc(market)} insider buying says, once there is enough of it</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">Three questions people ask about ${market === "US" ? "insiders" : "directors"} buying their own shares, answered from the disclosures themselves and recomputed on every load. Each is published only once there are enough marked purchases to carry it; until then the page says what is missing and when it should exist.</p>
  <p style="${QUIET}">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="${QUIET}">We couldn’t load the whole period, so today’s counts may be missing older purchases.</p>`}
  <ul style="list-style:none;padding:0;margin:24px 0">${items}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">How a living study works</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${list([
    `A purchase counts once it has a performance mark and at least ${MIN_HORIZON_DAYS} days between the close it is measured from and the latest close on file.`,
    `A cell states its beat rate, the share of its purchases that beat the index, only once it holds ${MIN_CELL} of them. Below that it shows its count and the date it should reach the floor.`,
    "The two cells are compared with a standard test for two proportions. When the gap is one that chance would produce at this sample, the page says so rather than picking a winner.",
  ])}</ul>
  ${widest ? `<h2 style="font-size:15px;margin:32px 0 10px">The dataset</h2><p style="${BODY}">${esc(datasetSentence(widest, market))}</p>` : ""}
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/how-it-works">How the rating works</a> · <a href="https://${esc(host)}/best-performing-buys">The best-performing buys</a> · <a href="https://${esc(host)}/roles">Buying by role</a> · <a href="https://${esc(host)}/cluster-buys">Cluster buying</a></p>`);
}

// ---------------------------------------------------------------------------
// One study
// ---------------------------------------------------------------------------

function cellRows(result) {
  return result.cells
    .map((c) => {
      const stated = c.beatRate != null;
      const name = `${c.nested ? "&nbsp;&nbsp;&nbsp;" : ""}${esc(c.label)}${
        result.compareIds.includes(c.id)
          ? ` <span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#5a4128">compared</span>`
          : ""
      }`;

      return `<tr>
      <td style="${CELL}">${name}</td>
      <td style="${NUM}">${esc(c.n)}</td>
      <td style="${NUM}">${esc(c.companies)}</td>
      ${
        stated
          ? `<td style="${NUM}"><strong>${esc(pct(c.beatRate))}</strong></td>
      <td style="${NUM}">${esc(pct(c.interval.lo))} to ${esc(pct(c.interval.hi))}</td>
      <td style="${NUM}">${esc(signedPp(c.medianAlpha))}</td>
      <td style="${NUM}">${esc(signedPp(c.meanAlpha))}</td>`
          : `<td style="${NUM};color:#6b6154" colspan="4">Not enough yet. Rates appear at ${MIN_CELL}${
              c.clearance?.clearsOn
                ? `; expected ${esc(longDate(c.clearance.clearsOn))}`
                : ""
            }.</td>`
      }
    </tr>`;
    })
    .join("");
}

function studyPrerender(study, result, market, host, complete, today) {
  const cite = citation(study, result, host, today);
  const floor = study.floor ? STUDY_FLOOR[market] : null;
  const method = [
    ...(floor != null
      ? [
          `Purchases under ${SYMBOL[market]}${floor.toLocaleString("en-GB")} are left out. That is the pipeline’s own co-buyer floor, the line under which a purchase does not count toward a cluster anywhere on the site.`,
        ]
      : []),
    ...study.method,
    ...METHODOLOGY,
  ];
  const others = STUDIES.filter((s) => s.slug !== study.slug)
    .map(
      (s) =>
        `<a href="https://${esc(host)}${studyPath(s.slug)}">${esc(s.short)}</a>`,
    )
    .join(" · ");
  const boards = study.boards
    .map((b) => `<a href="https://${esc(host)}${esc(b.to)}">${esc(b.title)}</a>`)
    .join(" · ");

  return page(`<p style="${EYEBROW}">Living study · ${esc(market)}</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(study.title)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(study.standfirst)}</p>
  <p style="${QUIET}">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="${QUIET}">We couldn’t load the whole period, so today’s cells may be missing older purchases.</p>`}
  <section style="border:1px solid #ece1cf;border-radius:16px;padding:20px 24px;margin:24px 0">
    <p style="${EYEBROW}">${esc(stateLabel(result))}</p>
    <h2 style="font-size:24px;line-height:1.15;margin:0 0 12px">${esc(verdictHeadline(result))}</h2>
    <p style="${BODY}">${esc(verdictDetail(result, market))}</p>
    <p style="font-size:12px;color:#6b6154;margin:12px 0 0">Computed ${esc(longDate(result.computedOn))}${result.asOf ? ` · prices to ${esc(longDate(result.asOf))}` : ""} · at least ${MIN_HORIZON_DAYS} days on the clock · rates from ${MIN_CELL} purchases</p>
  </section>
  <h2 style="font-size:15px;margin:32px 0 10px">The cells</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Cell</th>
    <th style="text-align:right;padding:8px 12px">Purchases</th>
    <th style="text-align:right;padding:8px 12px">Companies</th>
    <th style="text-align:right;padding:8px 12px">Beat the index</th>
    <th style="text-align:right;padding:8px 12px">95% interval</th>
    <th style="text-align:right;padding:8px 12px">Median alpha</th>
    <th style="text-align:right;padding:8px 12px">Mean alpha</th>
  </tr></thead><tbody>${cellRows(result)}</tbody></table>
  <p style="${QUIET};margin-top:10px">All purchases in scope: ${esc(pct(result.universe.beatRate))} beat the index. The purchases behind these cells are listed on ${boards}.</p>
  <h2 style="font-size:15px;margin:32px 0 10px">How it is measured</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${list(method)}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">What this cannot tell you</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${list(study.caveats)}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">The dataset</h2>
  <p style="${BODY}">${esc(datasetSentence(result, market))}</p>
  <h2 style="font-size:15px;margin:32px 0 10px">Cite this page</h2>
  <p style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;color:#4a4034;max-width:70ch">${esc(cite.line)}</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/research">All living studies</a> · ${others} · <a href="https://${esc(host)}/how-it-works">How the rating works</a></p>`);
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);

  const rest = url.pathname.replace(/^\/research\/?/, "").replace(/\/+$/, "");
  const study = rest ? studyBySlug(decodeURIComponent(rest)) : null;

  if (rest && !study) return noindex(shell);

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
    // A pre-render failing should cost the injected content, not the page.
    return shell;
  }

  // The same shape as a failed fetch, and the page's own fetch will retry.
  if (dealings.length === 0 && !complete) return shell;

  const today = new Date();
  const results = STUDIES.map((s) => computeStudy(s, dealings, market, today));

  if (!study) {
    const canonical = `https://${host}/research`;

    return renderInto(shell, {
      title: brandTitle(
        `What ${market} insider buying says, once there is enough of it`,
      ),
      description: `Three research questions about ${market} insider buying, recomputed from the live disclosures on every load and each published only once the sample can carry it: CEO against CFO, purchase size, and the cluster effect.`,
      canonical,
      breadcrumbs: [{ name: "Research", item: canonical }],
      body: indexPrerender(results, market, host, complete),
    });
  }

  const result = results.find((r) => r.slug === study.slug);
  const canonical = `https://${host}${studyPath(study.slug)}`;

  return renderInto(shell, {
    title: brandTitle(`${study.title} (${market})`),
    description: `${study.summary} ${verdictHeadline(result)}. Computed ${longDate(result.computedOn)} from ${market} disclosures.`,
    canonical,
    breadcrumbs: [
      { name: "Research", item: `https://${host}/research` },
      { name: study.short, item: canonical },
    ],
    body: studyPrerender(study, result, market, host, complete, today),
  });
}
