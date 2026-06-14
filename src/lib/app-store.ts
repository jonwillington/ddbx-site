import { AU, CA, EU, GB, US } from "country-flag-icons/react/3x2";

import type { MarketChoice } from "@/components/market-chooser-modal";

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

/** Direct App Store URL for the market that owns a route, or undefined when
 *  that market has no live app. Congress (`usg`) ships inside the US app, so
 *  it resolves to the US listing; SE/NL have no app yet (caller falls back to
 *  the market chooser). */
export function appStoreUrlForMarketId(id: string): string | undefined {
  if (id === "usg") return APP_STORE_URLS.us;

  return APP_STORE_URLS[id];
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
