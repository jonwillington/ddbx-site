// Per-market Open Graph image for the SPA shell.
//
// The site is one static index.html served on every domain (ddbx.uk / ddbx.us /
// ddbx.eu). Link-preview crawlers don't run the SPA's JS, so the per-route OG
// tags set in document-title.tsx never reach them — every share unfurls with the
// static index.html meta. That static shell ships the light (UK) wordmark as the
// default og:image; here we rewrite it to the dark (US) wordmark on ddbx.us so US
// shares get the right brand image.
//
// Per-trade share links (/t/{id}) render their own OG tags in functions/t/[id].js
// (including their own wordmark by host), so we leave those untouched.

function ogImageFor(origin, host) {
  // US market → dark wordmark; everything else → light. Same-origin so the image
  // resolves on whichever domain served the page.
  const dark = host.endsWith("ddbx.us");

  return `${origin}/${dark ? "og-us.png" : "og-uk.png"}`;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const res = await next();

  // Only the HTML shell needs rewriting; assets pass straight through.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;
  // /t/{id} owns its own OG tags — don't double-handle.
  if (url.pathname.startsWith("/t/")) return res;

  const image = ogImageFor(url.origin, url.hostname.toLowerCase());
  const setImage = {
    element(el) {
      el.setAttribute("content", image);
    },
  };

  return new HTMLRewriter()
    .on('meta[property="og:image"]', setImage)
    .on('meta[name="twitter:image"]', setImage)
    .transform(res);
}
