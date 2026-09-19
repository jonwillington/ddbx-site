import { STORE_BADGES, StoreCta, type StoreCtaSize } from "@/components/store-cta";
import { storeTargetsForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

/** The badge artwork itself now lives with `StoreCta` (variant="badge");
 *  re-exported here so existing imports keep working. */
export { StoreBadgeImg } from "@/components/store-cta";

/** Platform-aware store badge(s) for the in-page install nudges (analysis
 *  overlay, monthly recap). Shows the badge matching the visitor's device on
 *  mobile, and BOTH badges on desktop — but only advertises Google Play where
 *  the market natively has a listing (an Android *device* still gets the UK app
 *  as a fallback, so it never dead-ends). Defaults to the UK app when no
 *  `marketId` is given, matching the old hardcoded behaviour.
 *
 *  A thin wrapper over `<StoreCta variant="badge">`. */
export function StoreBadges({
  marketId = "uk",
  size = "md",
  className = "",
  placement,
}: {
  marketId?: string;
  size?: StoreCtaSize;
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
        <StoreCta
          key={t.store}
          className="opacity-80 hover:opacity-100"
          data-ga-event={STORE_BADGES[t.store].gaEvent}
          data-ga-label={placement ?? STORE_BADGES[t.store].alt}
          href={t.href}
          size={size}
          store={t.store}
          variant="badge"
        />
      ))}
    </div>
  );
}
