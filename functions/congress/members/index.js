// Crawler pre-render for the member directory: /congress/members.
//
// The hub every member page hangs off, so it carries the full list rather than
// a sample — the whole point of the index is that a crawler reaches 75 member
// pages from one place instead of from a filing row.

import {
  band,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  memberMeetsBar,
  memberPath,
  memberSlug,
  MIN_MEMBER_FILINGS,
  seat,
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

const DESCRIPTION =
  "Every member of Congress with a disclosed stock purchase on record, with the value bands, the companies and the committee jurisdiction behind each one.";

function rows(members, host) {
  return members
    .map(
      (m) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}${esc(memberPath(memberSlug(m.name, m.id)))}">${esc(m.name)}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(seat(m))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${m.stats.filing_docs}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(band(m.stats.total_min, m.stats.total_max))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(m.stats.last_disclosed ?? "")}</td>
    </tr>`,
    )
    .join("");
}

function prerender(members, host) {
  const house = members.filter((m) => m.chamber === "house");
  const senate = members.filter((m) => m.chamber === "senate");
  const filings = members.reduce((n, m) => n + m.stats.filing_docs, 0);
  const published = members.filter(memberMeetsBar).length;

  const table = (label, list, note) =>
    list.length
      ? `<h2 style="font-size:15px;margin:32px 0 8px">${esc(label)}</h2>
  ${note ? `<p style="font-size:13px;color:#6b6154;margin:0 0 8px;max-width:66ch">${esc(note)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Member</th>
    <th style="text-align:left;padding:8px 12px">Seat</th>
    <th style="text-align:left;padding:8px 12px">Filings</th>
    <th style="text-align:left;padding:8px 12px">Disclosed band</th>
    <th style="text-align:left;padding:8px 12px">Last filed</th>
  </tr></thead><tbody>${rows(list, host)}</tbody></table>`
      : "";

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">Members of Congress who file stock purchases</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(DESCRIPTION)}</p>
  <p style="font-size:14px;color:#6b6154">${members.length} members · ${filings} filings · ${published} with a published page</p>
  <p style="font-size:13px;line-height:1.55;color:#6b6154;max-width:66ch">A member gets an indexable page once we hold ${MIN_MEMBER_FILINGS} separate filings for them. ${esc(CONGRESS_NOTICE)}</p>
  ${table("House", house, null)}
  ${table("Senate", senate, "We map committee jurisdiction for House committees only, so Senate pages carry the filings without a lane.")}
  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)}</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/congress/committees">By committee</a> · <a href="https://${esc(host)}/congress">Latest filings</a> · <a href="https://${esc(host)}/learn/stock-act">What the STOCK Act requires</a></p>`);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);

  const res = await fetch(`${API_BASE}/gov-members`, {
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
    },
  });

  if (!res.ok) return noindex(shell);
  const { members } = await res.json();

  // An empty directory is an outage or a cold table, not a page. Advertising a
  // hub with nothing in it is the one thing an index must not do.
  if (!members?.length) return noindex(shell);

  const canonical = `https://${OWNING_HOST}/congress/members`;

  return renderInto(shell, {
    title: brandTitle("Members of Congress who file stock purchases"),
    description: DESCRIPTION,
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      { name: "Members", item: canonical },
    ],
    body: prerender(members, OWNING_HOST),
  });
}
