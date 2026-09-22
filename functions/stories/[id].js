// Story pages: /stories/{id}.
//
// A story link is what our story tweets point at, so this Function exists for
// the unfurl. Before it, every story previewed as the flat site wordmark with
// the homepage title in X's caption bar ("ddbx · Director Dealings — UK Insider
// Transactions"), which told a reader scrolling past nothing about the story.
//
// Now:
//   - og:image is the Worker's per-story card (ddbx-data
//     worker/pipeline/story-og-image.ts): the company's logo and name, one
//     figure, one line, and a Read article button. The card leaves the headline
//     out on purpose, because X prints og:title across the foot of the image.
//   - og:title / twitter:title is the story headline, which is what that
//     caption bar then shows.
//   - #root carries the article text for crawlers, as the other pre-renders
//     here do. React replaces it on mount.
//
// This owns the whole <head>, so /stories/{id} is on _middleware.js's skip
// list: running both passes would put the wordmark image back and add a second
// canonical.

import {
  apexHost,
  esc,
  fetchJson,
  noindex,
  page,
  renderInto,
} from "../../shared/prerender.js";
import { isProductionHost } from "../../shared/seo.js";

const API_BASE = "https://api.ddbx.uk/api";
const CARD_W = "1200";
const CARD_H = "630";

const storyCardImage = (id) =>
  `${API_BASE}/stories/${encodeURIComponent(id)}/og.png`;

// The article body is markdown with ddbx:// links. Crawlers get the words, not
// the links: headings, paragraphs and quotes, with every link reduced to its
// text. Anything fancier belongs to the React page.
function bodyHtml(md) {
  const inline = (s) =>
    esc(
      s
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1"),
    );

  return String(md ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const h = block.match(/^#{1,3}\s+(.*)$/);

      if (h)
        return `<h2 style="font-size:19px;margin:28px 0 8px">${inline(h[1])}</h2>`;
      if (block.startsWith(">")) {
        return `<blockquote style="margin:12px 0;padding-left:14px;border-left:3px solid #e8e0d5;color:#4a4034">${inline(block.replace(/^>\s?/gm, ""))}</blockquote>`;
      }

      return `<p style="font-size:16px;line-height:1.65;color:#4a4034;max-width:64ch">${inline(block)}</p>`;
    })
    .join("");
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const url = new URL(request.url);
  const id = String(params.id ?? "");
  const shell = await context.next();

  if (!isProductionHost(url.hostname)) return shell;
  if (!/^[a-z0-9_-]{4,120}$/i.test(id)) return noindex(shell);

  // Published stories only; the API never serves a draft.
  const s = await fetchJson(
    `${API_BASE}/stories/${encodeURIComponent(id)}`,
    900,
  );

  if (!s?.id) return noindex(shell);

  const host = apexHost(url.hostname);
  const canonical = `https://${host}/stories/${encodeURIComponent(s.id)}`;
  const title = s.headline;
  const description = s.standfirst || s.headline;

  const rendered = renderInto(shell, {
    title,
    description,
    canonical,
    breadcrumbs: [
      { name: "Stories", item: `https://${host}/stories` },
      { name: title, item: canonical },
    ],
    body: page(`<h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.4px;margin:0 0 12px">${esc(title)}</h1>
  ${s.standfirst ? `<p style="font-size:17px;line-height:1.55;color:#1E1506;max-width:64ch">${esc(s.standfirst)}</p>` : ""}
  ${bodyHtml(s.body_md)}
  <p style="margin-top:32px;font-size:14px"><a href="https://${esc(host)}/stories">Every story</a></p>
  <p style="margin-top:16px;font-size:13px;color:#6b6154;max-width:62ch">Information only, not investment advice.</p>`),
  });

  // Rewrites, not appends: index.html already ships the wordmark's og:image set
  // at 1200×675, and two images leave a crawler to choose.
  return new HTMLRewriter()
    .on('meta[property="og:image"], meta[name="twitter:image"]', {
      element(el) {
        el.setAttribute("content", storyCardImage(s.id));
      },
    })
    .on('meta[property="og:image:width"]', {
      element(el) {
        el.setAttribute("content", CARD_W);
      },
    })
    .on('meta[property="og:image:height"]', {
      element(el) {
        el.setAttribute("content", CARD_H);
      },
    })
    .on('meta[property="og:image:alt"]', {
      element(el) {
        el.setAttribute("content", title);
      },
    })
    .on('meta[property="og:type"]', {
      element(el) {
        el.setAttribute("content", "article");
      },
    })
    .on("head", {
      element(el) {
        el.append(`<meta name="twitter:image:alt" content="${esc(title)}">`, {
          html: true,
        });
      },
    })
    .transform(rendered);
}
