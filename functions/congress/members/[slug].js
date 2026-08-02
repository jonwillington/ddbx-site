// Crawler pre-render for a Congress member page:
// /congress/members/nancy-pelosi-p000197.
//
// Every sentence here comes from shared/congress.js, which is also what the
// React page renders. That is a hard requirement on this family rather than a
// tidiness preference: these are pages about named sitting legislators, and a
// crawler reading a qualification the visitor never sees (or vice versa) is how
// a page ends up making a claim nobody wrote.
//
// ddbx.us only. The Congress market is mounted on the US domain (see
// MARKET_HOST_BY_ID in shared/seo.js), so a request for this path on ddbx.uk or
// ddbx.eu renders but is noindexed — the same posture the glossary uses for an
// entry served off its owning host.

import {
  advisorNote,
  band,
  bioguideFromSlug,
  bulkNote,
  committeePath,
  committeeSlug,
  concentrationNote,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  laneSentence,
  lateNote,
  memberLeadSentence,
  memberMeetsBar,
  memberPath,
  memberSlug,
  MEMBER_ROWS,
  ownerNote,
  shortCommittee,
  unmodelledLaneNote,
} from "../../../shared/congress.js";
import { apexHost, esc, noindex, page, renderInto } from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";

/** Only the US domain publishes Congress pages. */
const OWNING_HOST = "ddbx.us";

const CF = {
  cacheEverything: true,
  cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
};

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { cf: CF });

  if (!res.ok) return null;

  return res.json();
}

/** The detail response flattened into the shape the shared sentences take.
 *  Mirrors `toSummary` in src/pages/congress-member.tsx — same reshape, and if
 *  one changes the other has to. */
function toSummary(d) {
  return {
    id: d.id,
    name: d.reporter.name,
    chamber: d.reporter.chamber,
    party: d.reporter.party,
    state: d.reporter.state,
    district: d.reporter.district,
    photo_url: d.reporter.photo_url,
    committees: (d.reporter.committees ?? []).filter(
      (c) => !/^Subcommittee\b/i.test(c),
    ),
    stats: d.stats,
  };
}

function prerender(member, detail, lanes, host) {
  const s = member.stats;
  const lane = laneSentence(member) ?? unmodelledLaneNote(member);

  // The qualifications, in the same order and above the same figures as the
  // hydrated page. A crawler that reads the numbers without them is being told
  // something different from the reader.
  const notes = [
    advisorNote(detail.reporter.profile),
    bulkNote(member),
    concentrationNote(member),
    ownerNote(member),
    lateNote(member),
  ].filter(Boolean);

  const laneRows = member.committees
    .filter((c) => lanes.has(c))
    .map(
      (c) =>
        `<li style="margin:0 0 6px"><a href="https://${esc(host)}${esc(committeePath(committeeSlug(c)))}">${esc(shortCommittee(c))}</a> — oversees ${esc((lanes.get(c) ?? []).join(", ").toLowerCase())}</li>`,
    )
    .join("");

  const unmapped = member.committees.filter((c) => !lanes.has(c));

  const filings = (detail.dealings ?? [])
    .slice(0, MEMBER_ROWS)
    .map(
      (d) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.ticker ? d.ticker : d.company)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.disclosed_date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(band(d.amount_min ?? 0, d.amount_max ?? 0))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(d.owner)}</td>
    </tr>`,
    )
    .join("");

  const issuers = (detail.top_tickers ?? [])
    .slice(0, 15)
    .map(
      (t) =>
        `<li style="margin:0 0 4px"><a href="https://${esc(host)}/company/${esc(String(t.ticker).toLowerCase())}">${esc(t.company || t.ticker)}</a> — ${t.count} ${t.count === 1 ? "filing" : "filings"}${s.jurisdiction_modelled && t.in_lane ? " (in lane)" : ""}</li>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(member.name)} — disclosed stock purchases</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(memberLeadSentence(member))}</p>
  ${
    notes.length
      ? `<h2 style="font-size:15px;margin:24px 0 8px">How to read this</h2>
  <ul style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:66ch;padding-left:18px">${notes.map((n) => `<li style="margin:0 0 6px">${esc(n)}</li>`).join("")}</ul>`
      : ""
  }
  <p style="font-size:14px;color:#6b6154">${s.filing_docs} ${s.filing_docs === 1 ? "filing" : "filings"} · ${s.filings} ${s.filings === 1 ? "purchase" : "purchases"} · ${s.issuers} ${s.issuers === 1 ? "company" : "companies"} · ${esc(band(s.total_min, s.total_max))} at the disclosed bands</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">${esc(CONGRESS_NOTICE)}</p>

  <h2 style="font-size:15px;margin:32px 0 8px">Committees and jurisdiction</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(lane)}</p>
  ${laneRows ? `<ul style="font-size:14px;line-height:1.6;padding-left:18px">${laneRows}</ul>` : ""}
  ${
    unmapped.length
      ? `<p style="font-size:13px;color:#6b6154;max-width:62ch">Also sits on ${esc(unmapped.map(shortCommittee).join(", "))}. We do not map a sector jurisdiction for ${unmapped.length === 1 ? "it" : "these"}.</p>`
      : ""
  }

  ${
    filings
      ? `<h2 style="font-size:15px;margin:32px 0 10px">Disclosed purchases</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Company</th>
    <th style="text-align:left;padding:8px 12px">Disclosed</th>
    <th style="text-align:left;padding:8px 12px">Band</th>
    <th style="text-align:left;padding:8px 12px">Account</th>
  </tr></thead><tbody>${filings}</tbody></table>`
      : ""
  }
  ${issuers ? `<h2 style="font-size:15px;margin:32px 0 8px">Companies filed on</h2><ul style="font-size:14px;line-height:1.6;padding-left:18px">${issuers}</ul>` : ""}

  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)} Returns shown on the site are measured from the closing price on the day each filing was published and marked to the latest cached close. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/congress/members">Every tracked member</a> · <a href="https://${esc(host)}/congress/committees">By committee</a> · <a href="https://${esc(host)}/learn/stock-act">What the STOCK Act requires</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const slug = decodeURIComponent(String(params.slug ?? ""));
  const bioguide = bioguideFromSlug(slug);

  const shell = await context.next();

  // On the middleware's skip list, so the preview-host noindex is applied here.
  if (!isProductionHost(url.hostname)) return noindex(shell);
  // Congress belongs to ddbx.us. Served elsewhere it renders (a link must not
  // 404) but must not compete with the owning host's copy.
  if (host !== OWNING_HOST) return noindex(shell);
  if (!bioguide) return noindex(shell);

  const detail = await fetchJson(`/directors/usg/${bioguide}`);

  if (!detail || !detail.reporter) return noindex(shell);

  const member = toSummary(detail);

  // Below the publishing bar the page is a stub: it renders for anyone who
  // follows a link, and stays out of the index until there is enough on record
  // to describe. Same threshold the React page and the sitemap apply, so a
  // member is never advertised in one place and withheld in another.
  if (!memberMeetsBar(member)) return noindex(shell);

  // The canonical slug is derived from the CURRENT name. A request carrying a
  // stale name with the right bioguide still resolves, and canonicalises here
  // rather than indexing a second URL for the same member.
  const canonicalSlug = memberSlug(member.name, member.id);
  const canonical = `https://${OWNING_HOST}${memberPath(canonicalSlug)}`;

  const committees = await fetchJson("/gov-committees");
  const lanes = new Map(
    (committees?.committees ?? []).map((c) => [c.committee, c.sectors]),
  );

  return renderInto(shell, {
    title: brandTitle(`${member.name} stock trades — filings and committees`),
    description: memberLeadSentence(member),
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      { name: "Members", item: `https://${OWNING_HOST}/congress/members` },
      { name: member.name, item: canonical },
    ],
    body: prerender(member, detail, lanes, OWNING_HOST),
  });
}
