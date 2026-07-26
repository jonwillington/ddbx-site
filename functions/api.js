// 301 /api -> /developers.
//
// This lives in a Function rather than in public/_redirects because Pages runs
// Functions BEFORE static asset serving, and functions/_middleware.js matches
// every route — so it handled /api, called next(), and the SPA shell was
// returned before the _redirects rule was ever consulted. The rule was there
// and simply never fired: /api answered 200 in production.
//
// The page still renders either way (App.tsx routes both paths, and seo.js
// emits a canonical pointing at /developers from both), so this is about
// having ONE URL rather than a folded duplicate — belt and braces, cheaply.
//
// Scope note: this file matches the exact path /api only. Sub-paths would need
// functions/api/[[path]].js, which deliberately does not exist — nothing on the
// site calls a same-origin /api/* (VITE_API_BASE is absolute in production),
// and catching them here would break it if anything ever did.

export function onRequest({ request }) {
  const url = new URL(request.url);

  url.pathname = "/developers";

  return Response.redirect(url.toString(), 301);
}
