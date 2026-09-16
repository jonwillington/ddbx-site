// Crawler pre-render for a UK insider page: /directors/dir-hendrik-du-toit.
//
// UK ONLY, and that is not an oversight. /us, /se and /nl director pages exist
// and resolve, but their detail routes return `resolved_count: 0` with four
// null horizons — those markets compute no performance yet — so every one of
// them fails `directorMeetsBar` and would be served a noindex. A Function whose
// only outcome is noindex is worse than no Function: it costs a request to say
// nothing. When those markets grow horizons, copy this file per market and add
// them to the sitemap in the same change.
//
// Every figure and every qualification comes from shared/directors.js, which
// the sitemap also reads. These are pages about named private individuals and
// their trading record; a crawler being shown a hit rate the visitor is not
// shown (or the reverse) is how a page ends up making a claim nobody wrote.

import { cleanCompanyName } from "../../shared/sectors.js";
import {
  companySlug,
  DIRECTOR_ROWS,
  directorLeadSentence,
  directorMeetsBar,
  directorPath,
  directorRateSentence,
} from "../../shared/directors.js";
import { apexHost, esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const OWNING_HOST = "ddbx.uk";

const CF = {
  cacheEverything: true,
  cacheTtlByStatus: { "200-299": 900, "400-499": 60, "500-599": 0 },
};

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { cf: CF });

  if (!res.ok) return null;

  return res.json();
}

/** The detail response reduced to what the shared sentences take. `buys` and
 *  `resolved` are the directory's own field names, so one bar reads both
 *  shapes. */
function toSummary(d) {
  return {
    id: d.id,
    name: d.name,
    role: d.role,
    company: d.company,
    buys: (d.prior_picks ?? []).length,
    resolved: d.resolved_count ?? 0,
  };
}

const money = (n) =>
  n == null
    ? "—"
    : n >= 1_000_000
      ? `£${(n / 1_000_000).toFixed(1)}m`
      : n >= 1000
        ? `£${Math.round(n / 1000)}k`
        : `£${Math.round(n)}`;

function prerender(s, detail, host) {
  const rate = directorRateSentence(s);

  // Spellings pooled into this record, said plainly. A reader (or a crawler)
  // comparing this table against the filings will otherwise see a name that is
  // not the page's title and conclude the page is wrong. Joint filings get
  // their own sentence: "X and Y" is not another way of spelling X.
  const aliases = (detail.aliases ?? []).filter(
    (a) => a.name !== detail.name && a.buys > 0,
  );
  const variants = aliases.filter((a) => !a.joint).map((a) => a.name);
  const joint = aliases.filter((a) => a.joint).map((a) => a.name);

  const rows = (detail.prior_picks ?? [])
    .slice(0, DIRECTOR_ROWS)
    .map(
      (p) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf"><a href="https://${esc(host)}/company/${esc(companySlug(p.ticker))}">${esc(cleanCompanyName(p.company))}</a></td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(p.trade_date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(money(p.value_gbp))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ece1cf">${esc(p.analysis?.rating ?? "not rated")}</td>
    </tr>`,
    )
    .join("");

  return page(`
  <h1 style="font-size:28px;margin:0 0 8px">${esc(detail.name)}</h1>
  <p style="font-size:16px;line-height:1.6;max-width:66ch;margin:0 0 16px">${esc(directorLeadSentence(s))}</p>

  ${
    variants.length
      ? `<p style="font-size:14px;line-height:1.6;color:#6b6154;max-width:66ch">Includes filings made as ${esc(variants.join(" and "))} — the same person, spelled differently by the filer.</p>`
      : ""
  }
  ${
    joint.length
      ? `<p style="font-size:14px;line-height:1.6;color:#6b6154;max-width:66ch">Includes purchases disclosed jointly as ${esc(joint.join(" and "))}, where ${esc(detail.name)} is named alongside another PDMR.</p>`
      : ""
  }

  <h2 style="font-size:15px;margin:32px 0 8px">How their buying has done</h2>
  ${
    rate
      ? `<p style="font-size:14px;line-height:1.6;max-width:66ch">Hit rate ${Math.round(detail.hit_rate_pct)}%. ${esc(rate)}</p>`
      : `<p style="font-size:14px;line-height:1.6;max-width:66ch">Not enough resolved purchases to state a hit rate yet. Returns are measured from the disclosure-day close at 3, 6, 12 and 24 months, so a recent filing has nothing to report until the clock has run.</p>`
  }

  <h2 style="font-size:15px;margin:32px 0 8px">Their filings</h2>
  <table style="border-collapse:collapse;font-size:14px;width:100%;max-width:720px">
    <thead><tr>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Company</th>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Bought</th>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Value</th>
      <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #d8c9b0">Rating</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b6154;max-width:66ch">Only open-market purchases count here: shares bought with the person's own money at the price anyone else could have paid. Grants, option exercises and vestings are excluded, because a director receiving shares has made no decision about the price. Returns are measured from the closing price on the day each filing was disclosed. Past performance is not a reliable indicator of future results.</p>
  <p style="margin-top:24px;font-size:14px"><a href="https://${esc(host)}/directors">Every tracked insider</a> · <a href="https://${esc(host)}/companies">Companies</a> · <a href="https://${esc(host)}/how-it-works">How ddbx rates a filing</a></p>`);
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const host = apexHost(url.hostname);
  const id = decodeURIComponent(String(params.id ?? ""));

  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return noindex(shell);
  // UK insiders belong to ddbx.uk. Served elsewhere the page still renders — a
  // link must not 404 — but must not compete with the owning host's copy.
  if (host !== OWNING_HOST) return noindex(shell);
  if (!id) return noindex(shell);

  const detail = await fetchJson(`/directors/${encodeURIComponent(id)}`);

  if (!detail || !detail.name) return noindex(shell);

  const s = toSummary(detail);

  // Below the bar the page is a stub: it renders for anyone who follows a link
  // and stays out of the index until there is a record to describe. Same
  // threshold the sitemap applies, so a director is never advertised in one
  // place and withheld in another.
  if (!directorMeetsBar(s)) return noindex(shell);

  // CANONICAL IS THE API'S, NOT THE REQUESTED URL.
  //
  // One person owns an id per filed spelling, and since the records were pooled
  // every one of those URLs serves IDENTICAL content — textbook duplicate
  // content the moment a crawler can reach them, which is what this Function
  // makes possible. `canonical_id` is the API's answer to which URL is the
  // person's home (a solo spelling outranks a joint one), so all three of
  // du Toit's URLs render and exactly one is indexed.
  const canonical = `https://${OWNING_HOST}${directorPath(detail.canonical_id ?? detail.id)}`;

  return renderInto(shell, {
    title: brandTitle(`${detail.name} — share purchases and how they performed`),
    description: directorLeadSentence(s),
    canonical,
    breadcrumbs: [
      { name: "Insiders", item: `https://${OWNING_HOST}/directors` },
      { name: detail.name, item: canonical },
    ],
    body: prerender(s, detail, OWNING_HOST),
  });
}
