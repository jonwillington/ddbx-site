// Crawler pre-render for the UK living studies: /research and /research/:slug,
// on any host (canonical ddbx.uk). The implementation is shared with the US
// edition at functions/us/research/[[route]].js; see
// shared/research-prerender.js.

import { onResearchRequest } from "../../shared/research-prerender.js";

export function onRequestGet(context) {
  return onResearchRequest(context, "UK");
}
