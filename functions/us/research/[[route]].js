// Crawler pre-render for the US living studies: /us/research and
// /us/research/:slug, on any host (canonical ddbx.us). The implementation is
// shared with the UK edition at functions/research/[[route]].js; see
// shared/research-prerender.js.

import { onResearchRequest } from "../../../shared/research-prerender.js";

export function onRequestGet(context) {
  return onResearchRequest(context, "US");
}
