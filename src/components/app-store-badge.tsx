import { storeTargetsForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

/** Self-hosted store badges (public/*.svg) — Apple's "Download on the App
 *  Store" and Google's "Get it on Google Play" — kept local so we don't depend
 *  on either vendor's marketing-tools endpoint at runtime. Each badge keeps its
 *  own aspect ratio (Apple ≈ 3.0, Google ≈ 2.58) so neither is squashed; we
 *  size by height and derive width from the ratio. */
const STORES = {
  ios: {
    src: "/app-store-badge.svg",
    alt: "Download on the App Store",
    ratio: 3,
    gaEvent: "cta_download_app_store_badge",
  },
  android: {
    src: "/play-store-badge.svg",
    alt: "Get it on Google Play",
    ratio: 646 / 250,
    gaEvent: "cta_download_play_store_badge",
  },
} as const;

type Store = keyof typeof STORES;

const HEIGHTS = { sm: 28, md: 40, lg: 53 } as const;

type BadgeSize = keyof typeof HEIGHTS;

/** Just one badge's artwork. Render this inside whatever element should carry
 *  the action — an `<a>` for a direct link, or a `<button>` for a chooser. */
export function StoreBadgeImg({
  store = "ios",
  size = "sm",
  className = "",
}: {
  store?: Store;
  size?: BadgeSize;
  className?: string;
}) {
  const { src, alt, ratio } = STORES[store];
  const height = HEIGHTS[size];

  return (
    <img
      alt={alt}
      className={className}
      src={src}
      style={{
        width: Math.round(height * ratio),
        height,
        verticalAlign: "middle",
        objectFit: "contain",
      }}
    />
  );
}

/** Back-compat alias — the footer's "open the chooser" button still renders the
 *  bare App Store artwork. New call-sites should prefer `StoreBadges`. */
export function AppStoreBadgeImg(props: {
  size?: BadgeSize;
  className?: string;
}) {
  return <StoreBadgeImg store="ios" {...props} />;
}

function BadgeLink({
  store,
  href,
  size,
  placement,
}: {
  store: Store;
  href: string;
  size: BadgeSize;
  placement?: string;
}) {
  return (
    <a
      aria-label={STORES[store].alt}
      className="inline-block opacity-80 transition-opacity hover:opacity-100"
      data-ga-event={STORES[store].gaEvent}
      data-ga-label={placement ?? STORES[store].alt}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <StoreBadgeImg size={size} store={store} />
    </a>
  );
}

/** Platform-aware store badge(s) for the in-page install nudges (analysis
 *  overlay, monthly recap). Shows the badge matching the visitor's device on
 *  mobile, and BOTH badges on desktop — but only advertises Google Play where
 *  the market natively has a listing (an Android *device* still gets the UK app
 *  as a fallback, so it never dead-ends). Defaults to the UK app when no
 *  `marketId` is given, matching the old hardcoded behaviour. */
export function StoreBadges({
  marketId = "uk",
  size = "md",
  className = "",
  placement,
}: {
  marketId?: string;
  size?: BadgeSize;
  className?: string;
  /** GA label naming where these badges sit ("Analysis overlay", "Monthly
   *  recap"). Separates placements that would otherwise be indistinguishable. */
  placement?: string;
}) {
  const platform = useDevicePlatform();
  const targets = storeTargetsForMarket(marketId, platform);

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {targets.map((t) => (
        <BadgeLink
          key={t.store}
          href={t.href}
          placement={placement}
          size={size}
          store={t.store}
        />
      ))}
    </div>
  );
}
