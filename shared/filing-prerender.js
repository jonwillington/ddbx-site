// The crawler view of one disclosure, shared by the two Functions that serve
// it: /dealings/{id} (the canonical, indexable filing page) and /t/{id} (the
// share link a tweet points at).
//
// It lives here rather than inside functions/dealings/[id].js because those two
// URLs must never disagree about what a filing says. They did before: the share
// link had its own hand-written page, built from a different subset of the same
// row, and the two drifted for months without anything failing.
//
// The publishing boundary this markup respects is decided in shared/filings.js
// — read that header before adding a field. Nothing here may show a crawler
// something the hydrated React page (src/pages/filing.tsx) withholds from a
// visitor, because that is cloaking rather than a clever workaround.
//
// Plain ESM at the repo root, same reason as shared/filings.js: Pages Functions
// and the Vite app are bundled separately, and a dependency-free module here is
// the one shape both accept.

import {
  analysisShape,
  awaitingOutcome,
  checkContext,
  citedSources,
  cleanName,
  clusterSentence,
  disclosureLagDays,
  FILING_NOTICE,
  filingLeadSentence,
  money,
  outcomeSentence,
  sharePrice,
  shares,
  styleSentence,
} from "./filings.js";
import { CHECKS } from "./methodology.js";
import { sectorByLabel, sectorPath } from "./sectors.js";
import { esc, page } from "./prerender.js";

/** "STAF.L" -> "STAF". */
export const displayTicker = (t) => String(t ?? "").replace(/\.L$/i, "");

/** Pre-hydration markup for one filing.
 *
 *  React replaces all of it the moment it mounts; this exists so a crawler
 *  without JS, and a visitor on a slow connection, read the same facts. */
export function filingPrerender(d, host) {
  const name = cleanName(d.company) || displayTicker(d.ticker);
  const lag = disclosureLagDays(d);
  const sector = d.sector_normalized ? sectorByLabel(d.sector_normalized) : null;
  const sources = citedSources(d);

  const context = [clusterSentence(d), styleSentence(d)].filter(Boolean);

  // The checklist carries the same three things the hydrated page shows: the
  // question, the verdict, and — where it passed — what we found for THIS
  // filing. Parity is not optional here: a crawler reading six bare labels
  // while a visitor reads six explanations is two different pages.
  const ctx = checkContext(d);
  const checklist = d.analysis?.checklist
    ? CHECKS.map((c) => {
        const ok = !!d.analysis.checklist[c.key];

        return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(c.question)}<br><span style="color:#6b6154;font-size:13px">${esc(ok ? c.passLine(ctx) : c.body)}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf;white-space:nowrap">${ok ? "Met" : "Not met"}</td>
    </tr>`;
      }).join("")
    : "";

  const shape = analysisShape(d);
  const met = d.analysis?.checklist
    ? CHECKS.filter((c) => d.analysis.checklist[c.key]).length
    : 0;

  const outcome = awaitingOutcome(d)
    ? `This filing was disclosed on ${esc(d.disclosed_date)} and the latest close we hold is the same day, so there is no return to report yet.`
    : (outcomeSentence(d) ??
      "We don’t hold a price mark for this filing yet, so there is no return to report.");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(name)} — insider purchase disclosed ${esc(d.disclosed_date)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(filingLeadSentence(d))}</p>
  <p style="font-size:14px;color:#6b6154">${esc(money(d.value_gbp))} · ${esc(shares(d.shares))} shares at ${esc(sharePrice(d))}${lag == null ? "" : ` · disclosed ${lag === 0 ? "the same day" : `${lag} ${lag === 1 ? "day" : "days"} later`}`}${d.analysis?.rating ? ` · rated ${esc(d.analysis.rating)}` : ""}</p>

  <h2 style="font-size:15px;margin:32px 0 10px">What was bought</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>
    <tr><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">Insider</td><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.director?.name ?? "")}</td></tr>
    <tr><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">Role</td><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.director?.role ?? "")}</td></tr>
    <tr><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">Company</td><td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}/company/${esc(displayTicker(d.ticker).toLowerCase())}">${esc(name)}</a></td></tr>
    <tr><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">Traded</td><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.trade_date)}</td></tr>
    <tr><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">Disclosed</td><td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.disclosed_date)}</td></tr>
  </tbody></table>

  <h2 style="font-size:15px;margin:32px 0 8px">What happened next</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(outcome)}</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">${esc(FILING_NOTICE)}</p>

  ${
    context.length
      ? `<h2 style="font-size:15px;margin:32px 0 8px">Context</h2>
  <ul style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:66ch;padding-left:18px">${context.map((c) => `<li style="margin:0 0 6px">${esc(c)}</li>`).join("")}</ul>`
      : ""
  }

  ${
    checklist
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Why this was rated ${esc(d.analysis.rating)}</h2>
  <p style="font-size:13px;color:#6b6154;margin:0 0 8px">${met} of ${CHECKS.length} checks met. <a href="https://${esc(host)}/how-it-works">How the checks work</a>.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${checklist}</tbody></table>`
      : ""
  }
  ${
    shape
      ? `<h2 style="font-size:15px;margin:32px 0 8px">The case, in full</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:62ch">The written case for and against this buy runs to ${shape.thesis} ${shape.thesis === 1 ? "point" : "points"}, ${shape.for} ${shape.for === 1 ? "piece" : "pieces"} of evidence for and ${shape.against} against, and ${shape.risks} key ${shape.risks === 1 ? "risk" : "risks"}${shape.confidence != null ? `, written with ${shape.confidence}% stated confidence` : ""}${shape.window ? ` over a ${esc(shape.window)} catalyst window` : ""}. It is in the app.</p>`
      : ""
  }

  ${
    sources.length
      ? `<h2 style="font-size:15px;margin:32px 0 8px">Sources used</h2>
  <ul style="font-size:14px;line-height:1.6;padding-left:18px">${sources
    .map(
      (s) =>
        `<li style="margin:0 0 6px"><a href="${esc(s.url)}" rel="nofollow noopener">${esc(s.headline)}</a> — ${esc(s.label)}</li>`,
    )
    .join("")}</ul>`
      : ""
  }

  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/company/${esc(displayTicker(d.ticker).toLowerCase())}">Every filing at ${esc(name)}</a>${sector ? ` · <a href="https://${esc(host)}${esc(sectorPath(sector.slug))}">${esc(sector.label)} insider buying</a>` : ""} · <a href="https://${esc(host)}/biggest-buys">Biggest buys</a></p>`);
}
