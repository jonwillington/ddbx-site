// Crawler pre-render for the living studies: /research and /us/research, the
// index and each /:slug.
//
// One implementation, two thin Function files (functions/research/[[route]].js
// for UK, functions/us/research/[[route]].js for US), because the studies are
// path-based: the market comes from the path, never the host, and the
// canonical is always the owning domain (ddbx.uk / ddbx.us).
//
// The questions, the cells, the thresholds and every sentence that states a
// number come from shared/studies.js, the module the React page renders from,
// so a crawler and a reader are shown one verdict.
//
// Indexability (review round, 17 September 2026): a study that is WAITING, one
// whose compared cells are still under the floors, is rendered in full for
// the reader and marked noindex, and the sitemap leaves it out. Its content is
// a promise about a result, and a search result for a promise is a thin page.
// It becomes indexable on the load it gets one. The index follows its
// studies: noindexed while none has a result. An unknown slug is noindexed; a
// failed fetch serves the plain shell so an API blip cannot cost an indexed
// URL.

import { fetchDealingsWindow } from "./dealings-feed.js";
import {
  citation,
  computeStudy,
  datasetSentence,
  fetchOutcomes,
  floorLine,
  indexRules,
  longDate,
  measurementLine,
  parseResearchPath,
  pct,
  signedPp,
  stateLabel,
  studyCanonical,
  studyWindow,
  verdictDetail,
  verdictHeadline,
  HORIZON_DAYS,
  METHODOLOGY,
  MIN_CELL,
  MIN_COMPANIES,
  RESEARCH_HOST,
  SHARED_LIMITS,
  STUDIES,
  STUDY_FLOOR,
} from "./studies.js";
import { esc, noindex, page, renderInto } from "./prerender.js";
import { brandTitle, isProductionHost } from "./seo.js";
import { trackingNotice } from "./tracking.js";

const API_BASE = "https://api.ddbx.uk/api";
const CF = {
  cacheEverything: true,
  cacheTtlByStatus: { "200-299": 1800, "400-499": 60, "500-599": 0 },
};

const EYEBROW =
  "font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#5a4128;margin:0 0 8px";
const CELL = "padding:8px 12px;border-bottom:1px solid #ece1cf";
const NUM = `${CELL};text-align:right`;
const QUIET = "font-size:13px;color:#6b6154;max-width:64ch";
const BODY = "font-size:15px;line-height:1.6;color:#4a4034;max-width:66ch";

const list = (lines) =>
  lines.map((l) => `<li style="margin-bottom:8px">${esc(l)}</li>`).join("");

/** A board or explainer on the market's own domain. Boards are host-based, so
 *  a US study links to ddbx.us whichever host served it. */
const onHost = (market, path) => `https://${RESEARCH_HOST[market]}${path}`;

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

function indexPrerender(results, market, complete) {
  const items = STUDIES.map((study) => {
    const r = results.find((x) => x.slug === study.slug);

    return `<li style="margin-bottom:20px">
      <a href="${esc(studyCanonical(study.slug, market))}"><strong>${esc(study.title)}</strong></a>
      <span style="display:block;font-size:12px;color:#5a4128;letter-spacing:1px;text-transform:uppercase;margin-top:4px">${esc(stateLabel(r))}</span>
      <span style="display:block;${QUIET};margin-top:4px">${esc(study.summary)}</span>
      <span style="display:block;font-size:14px;color:#1E1506;margin-top:6px">${esc(verdictHeadline(r))}</span>
      <span style="display:block;font-size:12px;color:#6b6154;margin-top:2px">${esc(measurementLine(r))}</span>
    </li>`;
  }).join("");

  const widest = results.find((r) => r.slug === "does-size-matter");

  return page(`<p style="${EYEBROW}">Living studies</p>
  <h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">What ${esc(market)} insider buying says, once there is enough of it</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">Three questions people ask about ${market === "US" ? "insiders" : "directors"} buying their own shares, answered from the disclosures themselves and recomputed on every load. Each is published only once there are enough resolved purchases, from enough companies, to carry it; until then the page says what is missing and when it should exist.</p>
  <p style="${QUIET}">${esc(trackingNotice(market))}</p>
  ${complete ? "" : `<p style="${QUIET}">We couldn’t load the whole period, so today’s counts may be missing older purchases.</p>`}
  <ul style="list-style:none;padding:0;margin:24px 0">${items}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">How a living study works</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${list(
    indexRules(),
  )}</ul>
  ${widest ? `<h2 style="font-size:15px;margin:32px 0 10px">The dataset</h2><p style="${BODY}">${esc(datasetSentence(widest, market))}</p>` : ""}
  <p style="margin-top:24px;font-size:14px"><a href="${onHost(market, "/how-it-works")}">How the rating works</a> · <a href="${onHost(market, "/best-performing-buys")}">The best-performing buys</a> · <a href="${onHost(market, "/roles")}">Buying by role</a> · <a href="${onHost(market, "/cluster-buys")}">Cluster buying</a></p>`);
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
          ? ` <span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#5a4128">tested</span>`
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
          : `<td style="${NUM};color:#6b6154" colspan="4">Not enough yet. Rates appear at ${MIN_CELL} purchases across ${MIN_COMPANIES} companies${
              c.clearance?.clearsOn
                ? `; expected ${esc(longDate(c.clearance.clearsOn))}`
                : ""
            }.</td>`
      }
    </tr>`;
    })
    .join("");
}

function studyPrerender(study, result, market, complete, today) {
  const cite = citation(study, result, today);
  const floor = study.floor ? STUDY_FLOOR[market] : null;
  const method = [
    ...(floor != null ? [floorLine(market, floor)] : []),
    ...study.method,
    ...METHODOLOGY,
  ];
  const others = STUDIES.filter((s) => s.slug !== study.slug)
    .map(
      (s) =>
        `<a href="${esc(studyCanonical(s.slug, market))}">${esc(s.short)}</a>`,
    )
    .join(" · ");
  const boards = study.boards
    .map((b) => `<a href="${esc(onHost(market, b.to))}">${esc(b.title)}</a>`)
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
    <p style="font-size:12px;color:#6b6154;margin:12px 0 0">${esc(measurementLine(result))}</p>
  </section>
  <h2 style="font-size:15px;margin:32px 0 10px">The cells</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Cell</th>
    <th style="text-align:right;padding:8px 12px">Purchases</th>
    <th style="text-align:right;padding:8px 12px">Companies</th>
    <th style="text-align:right;padding:8px 12px">Beat the index</th>
    <th style="text-align:right;padding:8px 12px">95% interval</th>
    <th style="text-align:right;padding:8px 12px">Median abnormal</th>
    <th style="text-align:right;padding:8px 12px">Mean abnormal</th>
  </tr></thead><tbody>${cellRows(result)}</tbody></table>
  <p style="${QUIET};margin-top:10px">All purchases in scope: ${esc(pct(result.universe.beatRate))} beat the index over ${HORIZON_DAYS} days. The purchases behind these cells are listed on ${boards}.</p>
  <h2 style="font-size:15px;margin:32px 0 10px">How it is measured</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${list(method)}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">What this cannot tell you</h2>
  <ul style="font-size:14px;line-height:1.7;color:#4a4034;max-width:64ch">${list([...study.caveats, ...SHARED_LIMITS])}</ul>
  <h2 style="font-size:15px;margin:32px 0 10px">The dataset</h2>
  <p style="${BODY}">${esc(datasetSentence(result, market))}</p>
  <h2 style="font-size:15px;margin:32px 0 10px">Cite this page</h2>
  <p style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;color:#4a4034;max-width:70ch">${esc(cite.line)}</p>
  <p style="margin-top:24px;font-size:14px"><a href="${esc(studyCanonical(null, market))}">All living studies</a> · ${others} · <a href="${onHost(market, "/how-it-works")}">How the rating works</a></p>`);
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function onResearchRequest(context, market) {
  const { request } = context;
  const url = new URL(request.url);
  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);

  const parsed = parseResearchPath(url.pathname);

  if (!parsed || parsed.market !== market || parsed.study === undefined) {
    return noindex(shell);
  }
  const { study } = parsed;

  let dealings;
  let complete;
  let outcomes;

  try {
    const [feed, out] = await Promise.all([
      fetchDealingsWindow({
        apiBase: API_BASE,
        ...studyWindow(market),
        until: null,
        cf: CF,
      }),
      fetchOutcomes({ apiBase: API_BASE, market, cf: CF }),
    ]);

    ({ dealings, complete } = feed);
    if (!out.ok) return shell;
    outcomes = out.body.outcomes;
  } catch {
    // A pre-render failing should cost the injected content, not the page.
    return shell;
  }

  // The same shape as a failed fetch, and the page's own fetch will retry.
  if (dealings.length === 0 && !complete) return shell;

  const today = new Date();
  const results = STUDIES.map((s) =>
    computeStudy(s, dealings, outcomes, market, today),
  );

  if (!study) {
    const canonical = studyCanonical(null, market);
    const res = renderInto(shell, {
      title: brandTitle(
        `What ${market} insider buying says, once there is enough of it`,
      ),
      description: `Three research questions about ${market} insider buying, recomputed from the disclosures on every load and each published only once the sample can carry it: CEO against CFO, purchase size, and the cluster effect.`,
      canonical,
      breadcrumbs: [{ name: "Research", item: canonical }],
      body: indexPrerender(results, market, complete),
    });

    return results.some((r) => r.indexable) ? res : noindex(res);
  }

  const result = results.find((r) => r.slug === study.slug);
  const canonical = studyCanonical(study.slug, market);
  const res = renderInto(shell, {
    title: brandTitle(`${study.title} (${market})`),
    description: `${study.summary} ${verdictHeadline(result)}. Computed ${longDate(result.computedOn)} from ${market} disclosures.`,
    canonical,
    breadcrumbs: [
      { name: "Research", item: studyCanonical(null, market) },
      { name: study.short, item: canonical },
    ],
    body: studyPrerender(study, result, market, complete, today),
  });

  return result.indexable ? res : noindex(res);
}

