import type { DevicePlatform } from "@/lib/use-device-platform";

import { AndroidGlyph } from "@/components/android-glyph";
import { AppleGlyph } from "@/components/apple-glyph";
import { storeTargetsForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

const LABEL = {
  ios: "Download on the App Store",
  android: "Get it on Google Play",
} as const;

/** A single filled "download the app" button for the visitor's platform:
 *  Google Play on Android, the App Store on iOS and desktop (where there's no
 *  single device to target, so we lead with the App Store). Used by the market
 *  hero and the /download landing pages. Callers pass the anchor styling
 *  (`buttonClassName`) so the button inherits each page's exact CTA treatment.
 *  The footer is where BOTH store badges live — see `StoreBadgeImg`. */
export function StoreButtons({
  marketId,
  buttonClassName,
  glyphClassName = "h-[15px] w-[15px] shrink-0",
  gaEvent,
  gaLabel,
  className = "",
  platform: forcedPlatform,
}: {
  marketId: string;
  buttonClassName: string;
  glyphClassName?: string;
  gaEvent: string;
  gaLabel: string;
  className?: string;
  /** Override the device sniff. The /download/ios and /download/android routes
   *  declare their platform in the URL, and a desktop visitor on
   *  /download/android sniffs as neither — which used to resolve to the App
   *  Store and put an "App Store" button on the Android page. Pass the route's
   *  platform there; leave unset everywhere the device really does decide. */
  platform?: DevicePlatform | null;
}) {
  const detected = useDevicePlatform();
  const platform = forcedPlatform ?? detected;
  // `storeTargetsForMarket` returns [App Store] on iOS/desktop and [Play] on
  // Android (with the UK app as the Android fallback), so the first entry is
  // always the single store this visitor should see.
  const target = storeTargetsForMarket(marketId, platform)[0];

  if (!target) return null;

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <a
        className={buttonClassName}
        data-ga-event={gaEvent}
        data-ga-label={`${gaLabel} · ${target.store}`}
        href={target.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {target.store === "android" ? (
          <AndroidGlyph className={glyphClassName} />
        ) : (
          <AppleGlyph className={glyphClassName} />
        )}
        {LABEL[target.store]}
      </a>
    </div>
  );
}
