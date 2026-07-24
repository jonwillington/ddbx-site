import { AndroidGlyph } from "@/components/android-glyph";
import { AppleGlyph } from "@/components/apple-glyph";
import { useDevicePlatform } from "@/lib/use-device-platform";

/** Platform-aware brand mark for a single "Download the app" button: the
 *  Android robot on Android, the Apple wordmark everywhere else (iOS and
 *  desktop, where the App Store is the default we lead with). Use this inside
 *  the compact single-button CTAs (navbar pill, floating mobile bar, in-app
 *  unlock links). Surfaces that show a full dual badge use `StoreBadges`
 *  instead. */
export function StoreGlyph({ className }: { className?: string }) {
  const platform = useDevicePlatform();

  return platform === "android" ? (
    <AndroidGlyph className={className} />
  ) : (
    <AppleGlyph className={className} />
  );
}
