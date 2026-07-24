import { useState } from "react";

/** The two mobile app platforms we ship a store listing for. `null` means we
 *  couldn't identify a mobile OS — desktop, an odd UA, or SSR — and callers
 *  should show BOTH store badges rather than guess. */
export type DevicePlatform = "ios" | "android";

/** Best-effort client-side OS sniff, used only to pick which app-store CTA to
 *  lead with. Never gates content — market is still resolved from route +
 *  hostname (see `marketForPath`). Returns "ios" for iPhone/iPad/iPod (and
 *  iPadOS-as-desktop, which reports as a Mac but exposes touch), "android" for
 *  Android, and `null` for everything else (desktop / unknown / SSR). */
export function detectDevicePlatform(): DevicePlatform | null {
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent || "";

  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ masquerades as macOS; a touch-capable "Mac" is really an iPad.
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";

  return null;
}

/** React hook wrapper around {@link detectDevicePlatform}. Resolved lazily on
 *  first render (the app is a client-only SPA, so there's no SSR/hydration
 *  mismatch to guard against) and never changes afterwards — a device doesn't
 *  switch OS mid-session. */
export function useDevicePlatform(): DevicePlatform | null {
  return useState(detectDevicePlatform)[0];
}
