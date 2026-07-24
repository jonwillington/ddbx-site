import { AndroidGlyph } from "@/components/android-glyph";
import { AppleGlyph } from "@/components/apple-glyph";
import { storeTargetsForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

const LABEL = {
  ios: "Download on the App Store",
  android: "Get it on Google Play",
} as const;

/** Filled "download the app" button(s), platform-aware. On mobile it renders
 *  the single store matching the visitor's device; on desktop it renders BOTH
 *  where the market ships on both (App Store first). Used by the market hero
 *  and the /download landing pages so both surfaces read as the same product.
 *  Callers pass the anchor styling (`buttonClassName`) so the buttons inherit
 *  each page's exact CTA treatment. */
export function StoreButtons({
  marketId,
  buttonClassName,
  glyphClassName = "h-[15px] w-[15px] shrink-0",
  gaEvent,
  gaLabel,
  className = "",
}: {
  marketId: string;
  buttonClassName: string;
  glyphClassName?: string;
  gaEvent: string;
  gaLabel: string;
  className?: string;
}) {
  const platform = useDevicePlatform();
  const targets = storeTargetsForMarket(marketId, platform);

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {targets.map((t) => (
        <a
          key={t.store}
          className={buttonClassName}
          data-ga-event={gaEvent}
          data-ga-label={`${gaLabel} · ${t.store}`}
          href={t.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.store === "android" ? (
            <AndroidGlyph className={glyphClassName} />
          ) : (
            <AppleGlyph className={glyphClassName} />
          )}
          {LABEL[t.store]}
        </a>
      ))}
    </div>
  );
}
