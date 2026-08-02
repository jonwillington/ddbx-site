// Crawler pre-render for one weekly digest: /weekly/2026-07-27.
//
// The cards carry their own authored copy, so this Function renders that copy
// and writes none of its own — the same rule the React page follows. A
// pre-render that paraphrased the digest would put a second voice on the page
// and give the crawler prose no visitor sees.

import {
  apexHost,
  esc,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";
import {
  isWeekSlug,
  weekLabel,
  weekLeadSentence,
  weekMeetsBar,
  weekPath,
} from "../../shared/weeks.js";
import { filingPath, money } from "../../shared/filings.js";

const API_BASE = "https://api.ddbx.uk/api";
const MARKET_BY_HOST = { "ddbx.uk": "UK", "ddbx.us": "US" };
const CURRENCY = { UK: "GBP", US: "USD" };

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const slug = decodeURIComponent(String(params.week ?? ""));

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  const market = MARKET_BY_HOST[host];

  if (!market) return noindex(shell);
  // A mid-week date resolves to a different week server-side, which would
  // publish the same digest at seven URLs. Mondays only.
  if (!isWeekSlug(slug)) return noindex(shell);

  const res = await fetch(
    `${API_BASE}/weekly-digest?market=${market}&week_start=${slug}`,
    {
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
      },
    },
  );

  if (!res.ok) return noindex(shell);
  const { digest } = await res.json();

  if (!weekMeetsBar(digest)) return noindex(shell);

  const currency = CURRENCY[market];
  const label = weekLabel(digest.week_start, digest.week_end);
  const lead = weekLeadSentence(digest, market);
  const canonical = `https://${host}${weekPath(digest.week_start)}`;

  const cards = digest.cards
    .map((c) => {
      const rows = [c.subject, ...(c.related ?? [])].filter(Boolean);
      const list = rows.length
        ? `<ul style="font-size:14px;line-height:1.6;padding-left:18px">${rows
            .map(
              (r) =>
                `<li style="margin:0 0 6px"><a href="https://${esc(host)}${esc(filingPath(r.dealing_id))}">${esc(r.insider_name)}${r.insider_role ? `, ${esc(r.insider_role)}` : ""}</a> at ${esc(r.company)} — ${esc(money(r.value ?? 0, currency))}, disclosed ${esc(r.disclosed_date)}</li>`,
            )
            .join("")}</ul>`
        : "";

      return `<h2 style="font-size:15px;margin:32px 0 6px">${esc(c.copy.headline)}</h2>
  ${c.copy.subhead ? `<p style="font-size:14px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(c.copy.subhead)}</p>` : ""}
  ${list}`;
    })
    .join("");

  return renderInto(shell, {
    title: brandTitle(`${market} insider buying, week of ${label}`),
    description: lead,
    canonical,
    breadcrumbs: [
      { name: "Weekly", item: `https://${host}/weekly` },
      { name: label, item: canonical },
    ],
    body: page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(market)} insider buying, ${esc(label)}</h1>
  <p style="font-size:16px;line-height:1.6;color:#5a4d3a;max-width:62ch">${esc(lead)}</p>
  ${cards}
  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">Totals cover disclosed open-market purchases in the ${esc(market)} market for this week only. Values are as filed. Nothing here is advice.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/weekly">Every week</a> · <a href="https://${esc(host)}/reports">Monthly reports</a></p>`),
  });
}
