import type { MarketChoice } from "@/components/market-chooser-modal";
import type { DevicePlatform } from "@/lib/use-device-platform";

import { AU, CA, EU, GB, US } from "country-flag-icons/react/3x2";

/** Market logos pulled from iOS assets.
 *  UK/US use their actual AppIcon assets; other markets use the shared brand
 *  mark until dedicated icons ship. */
export const IOS_APP_LOGO_BY_MARKET: Record<string, string> = {
  uk: "/ios-app-icon-uk.png",
  us: "/ios-app-icon-us.png",
  eu: "/ios-app-logo.svg",
  au: "/ios-app-logo.svg",
  ca: "/ios-app-logo.svg",
};

/** App Store URLs for the markets that ship a live iOS app. Keyed by the
 *  same market id as `MarketConfig` so the hero can look one up directly.
 *  Mirrors the iOS schemes — `uk.ddbx.app` (ddbx-uk) and `us.ddbx.app`
 *  (ddbx-us). Add a market here the moment its listing goes live. */
export const APP_STORE_URLS: Record<string, string> = {
  uk: "https://apps.apple.com/us/app/ddbx-uk/id6762196330",
  us: "https://apps.apple.com/us/app/ddbx-us/id6772091960",
};

/** Google Play URLs for the markets that ship a live Android app. Keyed by the
 *  same market id. Only the UK flavour (`uk.ddbx.app`) is on the Play Store
 *  today; the US flavour is still in Play internal testing, so it is absent
 *  here on purpose — an Android visitor on a market without a native listing
 *  falls back to the UK app (see `storeUrlForMarketId`). Add a market the
 *  moment its Play listing goes live. */
export const PLAY_STORE_URLS: Record<string, string> = {
  uk: "https://play.google.com/store/apps/details?id=uk.ddbx.app",
};

/** Direct App Store URL for the market that owns a route, or undefined when
 *  that market has no live iOS app. Congress (`usg`) ships inside the US app,
 *  so it resolves to the US listing; SE/NL have no app yet (caller falls back
 *  to the market chooser). */
export function appStoreUrlForMarketId(id: string): string | undefined {
  if (id === "usg") return APP_STORE_URLS.us;

  return APP_STORE_URLS[id];
}

/** Direct Google Play URL for the market that *natively* owns a route, or
 *  undefined when that market has no live Android app. Deliberately does NOT
 *  fall back to the UK app — use this for market-branded surfaces (the hero,
 *  the chooser) that must only advertise a Play listing where one genuinely
 *  exists. For the visitor-facing "just get me the app" CTAs, use
 *  `storeUrlForMarketId`, which does apply the UK fallback. */
export function playStoreUrlForMarketId(id: string): string | undefined {
  if (id === "usg") return PLAY_STORE_URLS.us;

  return PLAY_STORE_URLS[id];
}

/** Resolve the single store URL a "download the app" CTA should open, given
 *  the market that owns the route and the visitor's device.
 *  - iOS / desktop: the market's App Store listing (undefined for app-less
 *    SE/NL, so the caller opens the market chooser instead).
 *  - Android: the market's Play listing, falling back to the UK app when that
 *    market isn't on Play yet — every Android visitor gets a real install
 *    target rather than a dead end. */
export function storeUrlForMarketId(
  id: string,
  platform: DevicePlatform | null,
): string | undefined {
  if (platform === "android") {
    // The UK-app fallback is only honest where the UK app actually carries
    // the market's data (uk, and the EU markets it hosts). The US flavour is
    // a separate product with its own data and paywall — a US surface
    // showing "ddbx US" and USD pricing must never install uk.ddbx.app.
    // Undefined here means "no truthful install target": callers fall back
    // to the market's /download page, which says so.
    if (id === "us" || id === "usg") return playStoreUrlForMarketId(id);

    return playStoreUrlForMarketId(id) ?? PLAY_STORE_URLS.uk;
  }

  return appStoreUrlForMarketId(id);
}

/** Where a "get the app" CTA should send this visitor when the market has no
 *  store listing for their platform: the market's own download landing page,
 *  which explains availability honestly, instead of a wrong-product listing. */
export function downloadPagePathForMarketId(id: string): string {
  return id === "us" || id === "usg" ? "/us/download" : "/download";
}

/** Single-CTA resolution that always lands somewhere truthful: the store
 *  listing when one exists for this market + platform, the market's
 *  /download page when it doesn't. */
export function appHrefForMarket(
  id: string,
  platform: DevicePlatform | null,
): string {
  return storeUrlForMarketId(id, platform) ?? downloadPagePathForMarketId(id);
}

/** Per-market app links for the footer download chooser — same shape and
 *  ordering as the social `FOLLOW_CHOICES` so the breadth of markets is
 *  always one tap away. Live markets carry an `href`; the rest are
 *  `comingSoon` placeholders. */
export const APP_CHOICES: MarketChoice[] = [
  {
    id: "uk",
    Flag: GB,
    logoSrc: IOS_APP_LOGO_BY_MARKET.uk,
    label: "ddbx.uk",
    description: "UK director dealings",
    href: APP_STORE_URLS.uk,
  },
  {
    id: "us",
    Flag: US,
    logoSrc: IOS_APP_LOGO_BY_MARKET.us,
    label: "ddbx.us",
    description: "US insiders & Congress",
    href: APP_STORE_URLS.us,
  },
  {
    id: "eu",
    Flag: EU,
    logoSrc: IOS_APP_LOGO_BY_MARKET.eu,
    label: "ddbx.eu",
    description: "Europe",
    comingSoon: true,
  },
  {
    id: "au",
    Flag: AU,
    logoSrc: IOS_APP_LOGO_BY_MARKET.au,
    label: "ddbx.au",
    description: "Australia",
    comingSoon: true,
  },
  {
    id: "ca",
    Flag: CA,
    logoSrc: IOS_APP_LOGO_BY_MARKET.ca,
    label: "ddbx.ca",
    description: "Canada",
    comingSoon: true,
  },
];

/** One resolved store destination — which badge/glyph to render and where it
 *  points. */
export interface StoreTarget {
  store: DevicePlatform;
  href: string;
}

/** The store button(s) a market-branded install surface (hero, download page,
 *  in-page badges) should render for this visitor:
 *  - Android device → one Play button (native listing, or the UK app as a
 *    fallback so the tap always lands somewhere real).
 *  - iOS device → one App Store button.
 *  - Desktop / unknown → BOTH, but Google Play only where the market genuinely
 *    ships an Android app (no UK-app fallback on a market-branded desktop page).
 *  App-less iOS markets (SE/NL) still resolve to the UK App Store here, matching
 *  the long-standing badge fallback; callers that want the chooser instead use
 *  `appStoreUrlForMarketId` directly. */
export function storeTargetsForMarket(
  id: string,
  platform: DevicePlatform | null,
): StoreTarget[] {
  const iosUrl = appStoreUrlForMarketId(id) ?? APP_STORE_URLS.uk;
  const nativePlay = playStoreUrlForMarketId(id);

  if (platform === "android") {
    // Same honesty rule as storeUrlForMarketId: no UK-app fallback for the
    // US product. An empty list means "no badge to show" — callers render
    // their availability copy instead of a wrong-product button.
    if (id === "us" || id === "usg") {
      return nativePlay ? [{ store: "android", href: nativePlay }] : [];
    }

    return [{ store: "android", href: nativePlay ?? PLAY_STORE_URLS.uk }];
  }
  if (platform === "ios") {
    return [{ store: "ios", href: iosUrl }];
  }

  const targets: StoreTarget[] = [{ store: "ios", href: iosUrl }];

  if (nativePlay) targets.push({ store: "android", href: nativePlay });

  return targets;
}

/** The download chooser, resolved for the store the visitor asked for — or for
 *  their device when they didn't ask.
 *
 *  `store` is what the visitor clicked: the footer has a Google Play badge and
 *  an App Store badge, and both used to open this chooser with nothing but the
 *  device sniff to go on. On desktop that sniff yields neither platform, so the
 *  Play badge opened a list of five App Store links — a Google Play button that
 *  sent you to Apple. Pass the badge's own store and the rows follow it.
 *
 *  `null` keeps the device-derived behaviour, for entry points that aren't
 *  store-specific (the floating mobile CTA).
 *
 *  Either way a row is only tappable where that market has a live listing in
 *  the resolved store (Play: UK only today) — every other market shows the
 *  "Coming soon" state rather than sending an Android user to an iOS-only
 *  listing. The chooser is explicit market selection, so it stays honest; the
 *  UK-app fallback lives only in the single-tap CTAs (`storeUrlForMarketId`). */
export function buildAppChoices(
  platform: DevicePlatform | null,
  store: DevicePlatform | null = null,
): MarketChoice[] {
  if ((store ?? platform) !== "android") return APP_CHOICES;

  return APP_CHOICES.map((choice) => {
    const play = PLAY_STORE_URLS[choice.id];

    return play
      ? { ...choice, href: play, comingSoon: false }
      : { ...choice, href: undefined, comingSoon: true };
  });
}
