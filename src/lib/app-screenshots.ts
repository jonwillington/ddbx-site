// Manifest for the app screenshots the download landing pages render inside
// `DeviceFrame`.
//
// The files are dropped in by hand (design exports) rather than imported, so
// the page must survive every one of them being absent — `DeviceFrame` falls
// back to a styled placeholder per slot, and the layout is identical either
// way. That means the tour can ship before the mockups exist and light up
// file-by-file as they land, with no code change.
//
// Export SCREEN-ONLY images (no device chrome, no rounded corners, no drop
// shadow): the bezel is drawn in code, so the frame can be restyled — or the
// dark-mode treatment changed — without re-exporting a single asset.
//
//   public/app-shots/<market>/<platform>/<slot>.png
//     market   uk | us
//     platform ios | android
//     slot     see SHOT_SLOTS below
//
// Sizes: iOS 1290×2796 (iPhone 15/16 Pro), Android 1080×2400 (Pixel 8). Any
// image at the right aspect ratio works — these are just the native densities.

export type AppPlatform = "ios" | "android";

export const SHOT_SLOTS = [
  "today",
  "alert",
  "analysis",
  "cluster",
  "performance",
  "lockscreen",
] as const;

export type ShotSlot = (typeof SHOT_SLOTS)[number];

/** Short human label per slot — used by the placeholder so an un-supplied
 *  screen still says which screen it is, and by the mobile carousel captions. */
export const SLOT_LABEL: Record<ShotSlot, string> = {
  today: "Today",
  alert: "Alerts",
  analysis: "Analysis",
  cluster: "Cluster",
  performance: "Performance",
  lockscreen: "Lock screen",
};

/** Reference dimensions per platform, matching what the simulators actually
 *  produce: `xcrun simctl io booted screenshot` on an iPhone 17 Pro, and
 *  `adb exec-out screencap` on a Medium Phone / Pixel-class AVD.
 *
 *  Only the RATIO is used at render time — `DeviceFrame` sizes the screen with
 *  `aspect-ratio` and the image is `object-fit: cover`. So a shot from a
 *  different handset still works; anything within ~1% of these ratios crops
 *  invisibly. (iPhone 15/16 Pro at 1290×2796 is 2.168 vs the 17 Pro's 2.174 —
 *  interchangeable in practice.) */
export const SCREEN_PX: Record<AppPlatform, { w: number; h: number }> = {
  ios: { w: 1206, h: 2622 },
  android: { w: 1080, h: 2400 },
};

export function screenAspect(platform: AppPlatform): number {
  const { w, h } = SCREEN_PX[platform];

  return w / h;
}

/** Path to a screenshot. Not verified to exist — see the note at the top. */
export function appShotSrc(
  marketId: string,
  platform: AppPlatform,
  slot: ShotSlot,
): string {
  return `/app-shots/${marketId}/${platform}/${slot}.png`;
}

export const PLATFORM_LABEL: Record<AppPlatform, string> = {
  ios: "iPhone",
  android: "Android",
};

/** Store names. The badge ARTWORK is not duplicated here — render
 *  `StoreBadgeImg` from `@/components/app-store-badge`, which owns both
 *  vendors' marks and their required aspect ratios. */
export const STORE_LABEL: Record<AppPlatform, string> = {
  ios: "App Store",
  android: "Google Play",
};
