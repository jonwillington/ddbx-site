// Apple Smart App Banner — the system install bar Safari draws at the top of
// the page, offered as a trial alternative to the layout's floating mobile CTA.
//
// Why it might beat the floating button: the banner is the one install surface
// that knows whether the app is ALREADY there. Safari renders "Open" instead of
// "View" for someone who has it, and (where the route is covered by our
// apple-app-site-association) hands the app the URL so the tap lands on the
// deal rather than the home tab. The floating bar says "Start your free trial"
// to a six-month subscriber, forever.
//
// What it costs, and why the modes below exist: it is Apple's chrome, we cannot
// style it, we cannot detect whether Safari drew it, and we get NO click
// signal — taps on it are invisible to GA. So on iOS Safari it stacks with the
// floating bar unless you ask for `solo`, and the only measurement available is
// session segmentation (see `smartBannerMode` in lib/cookie-consent.ts).
//
// Modes:
//   off  — no banner. Today's behaviour.
//   on   — banner + floating bar. Additive; the safe trial setting.
//   solo — banner replaces the floating bar for browsers that render it.
//          The A/B the trial is actually for. Note the eligibility sniff below
//          is a guess, and a wrong guess here removes the ONLY mobile CTA.
//
// Toggle precedence (highest wins) — deliberately the same shape as
// lib/discretion.ts, so one habit covers both:
//   1. URL: `?banner=on|off|solo|reset` (reset clears the override)
//   2. localStorage: `ddbx.smartbanner.override` (written by the URL param)
//   3. Build-time env: VITE_SMART_BANNER in .env.production
//
// Visit `https://ddbx.uk/?banner=solo` once and the override sticks for that
// browser — no redeploy. Changing it for EVERYONE is the env var plus a push.
//
// Injection is client-side, at module load, before React mounts. Safari is
// happiest reading this tag at parse time, so if a device check shows the
// banner failing to appear, the escape hatch is to emit the same tag from
// functions/_middleware.js — but that splits the config across a Vite env file
// and a Cloudflare dashboard variable, which is why it isn't the first move.

import { appStoreUrlForMarketId } from "@/lib/app-store";
import { marketForPath } from "@/lib/markets/registry";

export type SmartBannerMode = "off" | "on" | "solo";

const OVERRIDE_KEY = "ddbx.smartbanner.override";
const META_NAME = "apple-itunes-app";

/** Routes our apple-app-site-association actually claims. Only these get an
 *  `app-argument`: handing the app a URL it has no route for opens it on a
 *  cold start with a payload it will drop. Keep in step with
 *  public/.well-known/apple-app-site-association. */
const DEEP_LINKED = [/^\/t\/[^/]+$/, /^\/us\/t\/[^/]+$/];

function isMode(v: unknown): v is SmartBannerMode {
  return v === "off" || v === "on" || v === "solo";
}

function resolveMode(): SmartBannerMode {
  const fromEnv = import.meta.env.VITE_SMART_BANNER as string | undefined;
  const envDefault: SmartBannerMode = isMode(fromEnv) ? fromEnv : "off";

  if (typeof window === "undefined") return envDefault;

  try {
    const urlMode = new URLSearchParams(window.location.search).get("banner");

    if (isMode(urlMode)) {
      window.localStorage.setItem(OVERRIDE_KEY, urlMode);

      return urlMode;
    }
    if (urlMode === "reset") {
      window.localStorage.removeItem(OVERRIDE_KEY);
    } else {
      const stored = window.localStorage.getItem(OVERRIDE_KEY);

      if (isMode(stored)) return stored;
    }
  } catch {
    // localStorage unavailable (private mode, embedded webview) — env default.
  }

  return envDefault;
}

/** Resolved once per page load, like DISCRETION_ENABLED. A mode that changed
 *  mid-session would leave the meta tag and the floating bar disagreeing. */
export const SMART_BANNER_MODE: SmartBannerMode = resolveMode();

/** The numeric App Store id behind a market's listing, read back out of the
 *  canonical URL table rather than written down a second time — a banner
 *  advertising an id that has drifted from `APP_STORE_URLS` would install the
 *  wrong market's app, which is the one failure worth designing out. */
function appIdForMarket(marketId: string): string | null {
  const url = appStoreUrlForMarketId(marketId) ?? "";
  const match = /\/id(\d+)/.exec(url);

  return match ? match[1] : null;
}

/** Whether THIS browser is one that draws the banner. Only consulted by `solo`
 *  mode, where a false positive removes the floating bar from someone who will
 *  never see a replacement.
 *
 *  Safari on iOS only: Chrome/Firefox/Edge on iOS render nothing (they carry
 *  CriOS/FxiOS/EdgiOS), and neither does a WKWebView — which is what the
 *  in-app browsers in X, Facebook, Instagram and LinkedIn are, i.e. a large
 *  slice of social traffic. Real Safari always says "Safari/" and none of the
 *  in-app markers; the webviews are excluded by both halves of that test. */
export function rendersSmartBanner(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";

  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as a Mac; a touch-capable "Mac" is an iPad.
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  if (!isIos) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  if (/FBAN|FBAV|Instagram|LinkedInApp|Twitter|Line\//.test(ua)) return false;

  return /Safari\//.test(ua);
}

/** The banner is only honest where the route's market has a live iOS listing.
 *  SE/NL/KR have no app, so they get no banner — never the UK app under a
 *  Swedish page, which is the fallback `storeUrlForMarketId` is allowed to make
 *  for a button the visitor chose to press but not for chrome we inject. */
function appIdForCurrentRoute(): string | null {
  if (typeof window === "undefined") return null;

  return appIdForMarket(
    marketForPath(window.location.pathname, window.location.hostname).id,
  );
}

/** Write (or remove) the tag to match the current route. Idempotent: one node,
 *  reused, so a market change rewrites rather than stacks. */
function syncTag(): void {
  if (typeof document === "undefined") return;

  const existing = document.querySelector<HTMLMetaElement>(
    `meta[name="${META_NAME}"]`,
  );
  const appId = SMART_BANNER_MODE === "off" ? null : appIdForCurrentRoute();

  if (!appId) {
    existing?.remove();

    return;
  }

  const path = window.location.pathname;
  const parts = [`app-id=${appId}`];

  if (DEEP_LINKED.some((re) => re.test(path))) {
    parts.push(`app-argument=${window.location.origin}${path}`);
  }

  const meta = existing ?? document.createElement("meta");

  meta.name = META_NAME;
  meta.content = parts.join(", ");
  if (!existing) document.head.appendChild(meta);
}

/** Install the banner and keep it pointed at the right market's app.
 *  Called from main.tsx before React mounts, so the tag is in the document as
 *  early as a client-only SPA can put it there. */
export function bootstrapSmartBanner(): void {
  if (typeof window === "undefined") return;
  if (SMART_BANNER_MODE === "off") return;

  syncTag();

  // A market change is a client-side navigation (/ → /us), and Safari has
  // already drawn whatever it drew for this document. Rewriting the tag is
  // best-effort — it fixes the id for a subsequent reload or share, and costs
  // nothing if Safari ignores it. What it must NOT do is leave a UK app-id
  // advertised on a US page.
  window.addEventListener("popstate", syncTag);
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];

    history[method] = function patched(this: History, ...args) {
      const result = original.apply(this, args);

      syncTag();

      return result;
    } as typeof original;
  }
}

/** True when the floating mobile CTA should stand down for the banner. Only in
 *  `solo` mode, and only on a browser that actually draws one. */
export function smartBannerReplacesFloatingCta(): boolean {
  return SMART_BANNER_MODE === "solo" && rendersSmartBanner();
}

/** Whether this session has a live App Store listing to advertise — used to
 *  label the GA session so the trial can be read as banner vs no-banner
 *  rather than iOS vs everything. */
export function smartBannerActive(): boolean {
  return (
    SMART_BANNER_MODE !== "off" &&
    rendersSmartBanner() &&
    appIdForCurrentRoute() !== null
  );
}
