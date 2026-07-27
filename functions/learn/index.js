// Crawler pre-render for the glossary index: ddbx.uk/learn, ddbx.us/learn.
//
// /learn is on the middleware's skip list — it has to be, because that module
// appends <head> tags rather than rewriting them, and running both passes would
// emit two rel=canonical tags for one page, which gets both ignored. The
// consequence is that this Function owns the entire <head> for this URL: title,
// description, canonical, the preview-host noindex. Nothing else sets them.
//
// The links are the point of the body. /learn is the hub for ten entry pages,
// and until this existed a crawler that doesn't run JS found an empty #root at
// a URL sitting in both sitemaps — the hub in hub-and-spoke, with no spokes.
//
// Ownership is the same rule the entry Function enforces: a host renders the
// entries it owns and nothing else, so ddbx.uk/learn and ddbx.us/learn are
// genuinely different pages rather than one page published twice.

import {
  entriesForHost,
  groupEntries,
  learnPath,
  ownerForHost,
} from "../../shared/glossary.js";
import { apexHost, esc, noindex, page, renderInto } from "../../shared/prerender.js";
import { brandTitle, isProductionHost } from "../../shared/seo.js";

const NOUN = { uk: "director dealings", us: "insider trading" };

const STANDFIRST =
  "What the filings mean, which disclosures are actually purchases, and how much a director buying their own shares really tells you.";

function prerender(entries) {
  const groups = groupEntries(entries)
    .map(
      (g) =>
        `<h2 style="font-size:15px;margin:32px 0 10px">${esc(g.label)}</h2>
      <ul style="font-size:14px;line-height:1.7;padding-left:18px">${g.entries
        .map(
          (e) =>
            `<li style="margin-bottom:10px"><a href="${esc(learnPath(e.slug))}">${esc(e.title)}</a><br><span style="color:#6b6154">${esc(e.description)}</span></li>`,
        )
        .join("")}</ul>`,
    )
    .join("");

  return page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 16px">Understanding insider dealing</h1>
  <p style="font-size:16px;line-height:1.6;color:#4a4034;max-width:62ch">${esc(STANDFIRST)}</p>
  ${groups}
  <p style="margin-top:32px;font-size:13px;color:#6b6154;max-width:62ch">Information only, not investment advice.</p>`);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const owner = ownerForHost(host);
  const entries = entriesForHost(host);

  const shell = await context.next();

  // On the middleware's skip list, so the preview-host noindex lands here.
  if (!isProductionHost(url.hostname)) return noindex(shell);

  // ddbx.eu owns no glossary entries. The SPA renders its own fallback for a
  // reader who arrives; there is nothing here worth indexing on this host.
  if (!owner || entries.length === 0) return noindex(shell);

  const canonical = `https://${host}/learn`;
  const title = brandTitle(
    `${owner === "uk" ? "UK" : "US"} ${NOUN[owner]}: the terms explained`,
  );

  return renderInto(shell, {
    title,
    description: STANDFIRST,
    canonical,
    breadcrumbs: [{ name: "Learn", item: canonical }],
    body: prerender(entries),
  });
}
