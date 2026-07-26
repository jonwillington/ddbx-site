// Server-rendered <head> for the SPA shell.
//
// The site is one static index.html served on every domain (ddbx.uk / ddbx.us /
// ddbx.eu). Crawlers don't run the SPA's JS, so the per-route tags that
// document-title.tsx sets at runtime never reach them — search engines and
// link-preview bots would otherwise see the static UK homepage title on every
// single route. This middleware rewrites the shell per request:
//
//   - <title>, description, og:title/description/url, twitter:title/description
//     from the shared route table (shared/seo.js — the same module the SPA
//     uses, so the tab and the SERP can't disagree)
//   - og:image / twitter:image swapped to the dark (US) wordmark on ddbx.us
//   - rel=canonical, which folds the cross-domain duplicates together
//     (ddbx.uk/us and ddbx.us/ are the same page)
//   - robots noindex on preview/local hosts and the handful of utility routes
//
// Per-trade share links (/t/{id}) render their own full <head> in
// functions/t/[id].js, so we leave those untouched.

import {
  canonicalUrlFor,
  isIndexable,
  seoForPath,
} from "../shared/seo.js";

function ogImageFor(origin, host) {
  // US market → dark wordmark; everything else → light. Same-origin so the image
  // resolves on whichever domain served the page.
  const dark = host.endsWith("ddbx.us");

  return `${origin}/${dark ? "og-us.png" : "og-uk.png"}`;
}

// Attribute values land inside double-quoted HTML attributes; company and
// broker names reach these strings, so escape rather than trust them.
function attr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Text nodes (the <title> body) need the same treatment minus the quotes.
function text(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Rewrite an existing <meta content="…"> in place. */
const setContent = (value) => ({
  element(el) {
    el.setAttribute("content", value);
  },
});

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const res = await next();

  // Only the HTML shell needs rewriting; assets pass straight through.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;
  // /t/{id}, /company/{market}/{key} and the /companies hub are server-rendered
  // by their own Functions and own their entire <head>. Rewriting them here
  // would replace a per-trade or per-company title with the generic
  // route-table one.
  if (
    url.pathname.startsWith("/t/") ||
    url.pathname.startsWith("/company/") ||
    url.pathname === "/companies"
  ) {
    return res;
  }

  const host = url.hostname.toLowerCase();
  const { title, description } = seoForPath(url.pathname, host);
  const image = ogImageFor(url.origin, host);
  // Query strings are view state (?view=signal, filters), not distinct pages —
  // the canonical is always the bare path.
  const canonical = canonicalUrlFor(url.pathname, host);
  const indexable = isIndexable(url.pathname, host);

  const setImage = setContent(image);

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(text(title), { html: true });
      },
    })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:image"]', setImage)
    .on('meta[name="twitter:image"]', setImage)
    // og:url, twitter:* and rel=canonical have no static tag in index.html —
    // append them once, at the end of <head>.
    .on("head", {
      element(el) {
        // og:type, twitter:card, twitter:site and the image tags are already
        // static in index.html — only what's missing or per-route goes here.
        const tags = [
          `<meta property="og:url" content="${attr(canonical ?? url.origin + url.pathname)}">`,
          `<meta property="og:site_name" content="ddbx">`,
          `<meta name="twitter:title" content="${attr(title)}">`,
          `<meta name="twitter:description" content="${attr(description)}">`,
        ];

        if (canonical) {
          tags.push(`<link rel="canonical" href="${attr(canonical)}">`);
        }
        if (!indexable) {
          tags.push(`<meta name="robots" content="noindex, follow">`);
        }
        el.append(tags.join("\n"), { html: true });
      },
    })
    .transform(res);
}
