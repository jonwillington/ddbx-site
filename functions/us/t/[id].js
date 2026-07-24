// UA-based store redirect for US shared-trade links: /us/t/{id}.
//
// Unlike the UK route (functions/t/[id].js), US share links don't yet render a
// server-side conversion funnel — this simply sends an app-less visitor to the
// right store for their device. Visitors WITH the app never reach here: iOS
// intercepts the Universal Link via /.well-known/apple-app-site-association and
// Android via /.well-known/assetlinks.json, opening the app directly.
//
// iOS / desktop → the US App Store listing (ddbx-us). Android → the UK app on
// Google Play: the US flavour isn't on Play yet, so the UK listing is the only
// live ddbx Android target (matches the site's Android fallback everywhere).
const US_APP_STORE_URL = "https://apps.apple.com/us/app/ddbx-us/id6772091960";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=uk.ddbx.app";

export async function onRequestGet(context) {
  const { request } = context;
  const isAndroid = /android/i.test(request.headers.get("user-agent") || "");
  const target = isAndroid ? PLAY_STORE_URL : US_APP_STORE_URL;

  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      // Vary on UA so the CDN can't hand an Android tap the iOS redirect.
      "cache-control": "public, s-maxage=3600",
      vary: "User-Agent",
    },
  });
}
