// Crawler pre-render for the committee index: /congress/committees.

import {
  committeePath,
  committeeSlug,
  CONGRESS_SOURCE,
  listSentence,
  membersOnCommittee,
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

const DESCRIPTION =
  "Which House committees oversee which sectors, and which members of each have disclosed stock purchases in the industries they legislate on.";

const CF = {
  cacheEverything: true,
  cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
};

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { cf: CF });

  if (!res.ok) return null;

  return res.json();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  if (host !== OWNING_HOST) return noindex(shell);

  const committees = await fetchJson("/gov-committees");
  const directory = await fetchJson("/gov-members");
  const lanes = committees?.committees ?? [];

  if (!lanes.length) return noindex(shell);

  const members = directory?.members ?? [];
  const senators = members.filter((m) => m.chamber === "senate").length;

  const ranked = lanes
    .map((c) => ({ ...c, n: membersOnCommittee(members, c.committee).length }))
    .sort((a, b) => b.n - a.n);

  const rows = ranked
    .map(
      (c) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(OWNING_HOST)}${esc(committeePath(committeeSlug(c.committee)))}">${esc(shortCommittee(c.committee))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(listSentence(c.sectors.map((s) => s.toLowerCase())))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${c.n}</td>
    </tr>`,
    )
    .join("");

  const canonical = `https://${OWNING_HOST}/congress/committees`;

  return renderInto(shell, {
    title: brandTitle("Congressional committees and the sectors they oversee"),
    description: DESCRIPTION,
    canonical,
    breadcrumbs: [
      { name: "Congress", item: `https://${OWNING_HOST}/congress` },
      { name: "Committees", item: canonical },
    ],
    body: page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">Congressional committees and the sectors they oversee</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(DESCRIPTION)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
    <th style="text-align:left;padding:8px 12px">Committee</th>
    <th style="text-align:left;padding:8px 12px">Oversees</th>
    <th style="text-align:left;padding:8px 12px">Members filing</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <h2 style="font-size:15px;margin:32px 0 8px">What this list leaves out</h2>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:66ch">Our jurisdiction map covers House committees only, so no Senate committee has a page here. That is a gap in what we model, not a statement about the Senate: ${senators} of the members whose filings we hold sit in it, and their purchases are recorded in full on their own pages. The same applies to subcommittees, which we do not map a jurisdiction for and therefore do not publish.</p>
  <p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:66ch">A member sitting on a committee that oversees a sector is a matter of public record. It is not evidence that any purchase was informed by it.</p>
  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">${esc(CONGRESS_SOURCE)}</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(OWNING_HOST)}/congress/members">Every tracked member</a> · <a href="https://${esc(OWNING_HOST)}/congress">Latest filings</a></p>`),
  });
}
