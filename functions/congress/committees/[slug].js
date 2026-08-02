// Crawler pre-render for a committee page:
// /congress/committees/financial-services.
//
// The committee set comes from /api/gov-committees rather than a list here, so
// this Function cannot publish a lane the rating engine does not model. Eleven
// House committees today; anything else is a clean noindex.

import {
  band,
  committeeLeadSentence,
  committeeMeetsBar,
  committeePath,
  committeeSlug,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  listSentence,
  memberPath,
  memberSlug,
  membersOnCommittee,
  seat,
  shortCommittee,
} from "../../../shared/congress.js";
import {
  apexHost,
  esc,
  noindex,
  page,
  renderInto,
} from "../../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
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

function prerender(lane, members, host) {
  const filings = members.reduce((n, m) => n + m.stats.filing_docs, 0);
  const min = members.reduce((n, m) => n + m.stats.total_min, 0);
  const max = members.reduce((n, m) => n + m.stats.total_max, 0);
  const inLane = members.reduce((n, m) => n + m.stats.in_lane_count, 0);

  const rows = members
    .map(
      (m) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}${esc(memberPath(memberSlug(m.name, m.id)))}">${esc(m.name)}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(seat(m))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${m.stats.filing_docs}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(band(m.stats.total_min, m.stats.total_max))}</td>
    </tr>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(shortCommittee(lane.committee))} — members who buy stocks</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">The ${esc(lane.committee)} has jurisdiction over ${esc(listSentence(lane.sectors.map((s) => s.toLowerCase())))}. This page tracks members of it who have disclosed stock purchases, and which of those purchases fall inside that jurisdiction.</p>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(committeeLeadSentence(lane, members))}</p>
  <p style="font-size:14px;color:#6b6154">${members.length} members filing · ${filings} filings · ${esc(band(min, max))} at the disclosed bands · ${inLane} in-lane purchases</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">${esc(CONGRESS_NOTICE)}</p>

  <h2 style="font-size:15px;margin:32px 0 10px">Members with disclosed purchases</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Member</th>
    <th style="text-align:left;padding:8px 12px">Seat</th>
    <th style="text-align:left;padding:8px 12px">Filings</th>
    <th style="text-align:left;padding:8px 12px">Disclosed band</th>
  </tr></thead><tbody>${rows}</tbody></table>

  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)} We map sector jurisdiction for House committees only, so no Senate committee has a page here.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/congress/committees">Every committee</a> · <a href="https://${esc(host)}/congress/members">Every tracked member</a> · <a href="https://${esc(host)}/learn/stock-act">What the STOCK Act requires</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const slug = decodeURIComponent(String(params.slug ?? ""));

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);

  const committees = await fetchJson("/gov-committees");
  const lane = (committees?.committees ?? []).find(
    (c) => committeeSlug(c.committee) === slug,
  );

  if (!lane) return noindex(shell);

  const directory = await fetchJson("/gov-members");
  const members = membersOnCommittee(directory?.members ?? [], lane.committee);

  // Below the bar the page renders (a link must not 404) but says nothing about
  // "the committee" worth indexing. Same threshold as the React page and the
  // sitemap.
  if (!committeeMeetsBar(members)) return noindex(shell);

  const canonical = `https://${OWNING_HOST}${committeePath(slug)}`;

  return renderInto(shell, {
    title: brandTitle(
      `${shortCommittee(lane.committee)} committee — members who buy stocks`,
    ),
    description: committeeLeadSentence(lane, members),
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      {
        name: "Committees",
        item: `https://${OWNING_HOST}/congress/committees`,
      },
      { name: shortCommittee(lane.committee), item: canonical },
    ],
    body: prerender(lane, members, OWNING_HOST),
  });
}
