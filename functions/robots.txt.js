// robots.txt, served per domain.
//
// Before this existed the SPA fallback in public/_redirects answered /robots.txt
// with index.html — a 200 of HTML where crawlers expect text, and no sitemap
// pointer anywhere on the site.
//
// It's host-aware because the Sitemap directive must name the same host that
// served the file (a cross-host sitemap needs separate Search Console
// verification to be honoured), and because preview deployments should be
// disallowed outright rather than left to compete with the live domains.
//
// NOT disallowed: /t/{id}. Those share links exist to be unfurled, and
// Twitterbot honours robots.txt — blocking them would break the preview cards
// that shared trades depend on.
//
// AI crawlers are split into two groups on purpose, because they are not one
// thing (see TRAINING_ONLY_AGENTS below). The distinction that matters is
// whether the crawler sends anything back: a citation crawler earns its fetch
// by putting ddbx in front of a reader, a training scraper does not.
//
// Note this file only *states* the policy. Enforcement is a Cloudflare WAF
// concern on the ddbx.uk zone, and the two can disagree — as of 2026-07-27 the
// edge blocked every AI crawler by user-agent, citation crawlers included,
// while this file said `Allow: /` to all of them. Keep them in sync; if a
// crawler is being 403'd at the edge, changing this file will not unblock it.

import { HOST_DEFAULT_MARKET } from "../shared/seo.js";

// Crawlers that take content for model training and return nothing — no
// citation, no referral, no traffic. Disallowed outright.
//
// Deliberately NOT listed, i.e. still allowed by the `*` group below:
//   - OAI-SearchBot, PerplexityBot, ClaudeBot — AI *citation* crawlers. These
//     are how ddbx gets surfaced and linked in AI answers; blocking them costs
//     visibility and buys nothing.
//   - Google-Extended, Applebot-Extended — the AI-training opt-out tokens for
//     Google and Apple. Blocking either is coupled to classic search ranking
//     on those engines, so it is not a free choice like the list below.
const TRAINING_ONLY_AGENTS = [
  "GPTBot",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "cohere-ai",
];

function apexHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  return host.startsWith("www.") ? host.slice(4) : host;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const host = apexHost(url.hostname);
  const isProduction = host in HOST_DEFAULT_MARKET;

  // One group per RFC 9309: consecutive User-agent lines share the rules that
  // follow. A named crawler takes its most specific matching group and ignores
  // `*` entirely, so the block below wins for those agents without needing to
  // repeat the `*` rules.
  const trainingGroup = TRAINING_ONLY_AGENTS.map((ua) => `User-agent: ${ua}`).join("\n");

  const body = isProduction
    ? `${trainingGroup}
Disallow: /

User-agent: *
Allow: /
Disallow: /account-deletion

Sitemap: https://${host}/sitemap.xml
`
    : `User-agent: *
Disallow: /
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=3600, max-age=600",
    },
  });
}
