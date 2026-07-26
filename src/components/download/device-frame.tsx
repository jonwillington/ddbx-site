/** An app screenshot, either in a phone or on its own.
 *
 *  Why the phone is drawn rather than a bitmap frame: the download pages need
 *  the *same* screen shown on an iPhone and on an Android handset, in light and
 *  dark mode, at four sizes. Baking the chrome into the exports would mean
 *  2 platforms × 2 themes × N screens of artwork to keep in sync. Here the
 *  export is the screen only (see `@/lib/app-screenshots`) and the hardware is
 *  CSS — restyling every frame on the site is a change to this file alone.
 *
 *  The two platforms are deliberately distinguishable at a glance, because
 *  that's the whole point of a per-platform landing page: an Android visitor
 *  should see an Android phone. iOS gets the rounder corners, thinner bezel and
 *  a Dynamic Island; Android gets a squarer body, a marginally thicker uniform
 *  bezel and a centred punch-hole camera.
 *
 *  `variant="bare"` drops the hardware entirely and presents the screen as its
 *  own object — used in the hero, where a mockup adds a frame the visitor has
 *  to look past to see the product.
 *
 *  Missing artwork is an expected state, not an error — screens are captured
 *  from the simulators over time (recipe in
 *  `investigations/2026-07-26-download-landing-pages.md`). `onError` swaps in a
 *  branded placeholder occupying the exact same box, so the layout never moves
 *  and a half-populated tour still reads as deliberate.
 *
 *  Geometry note: corner radii are in `cqw` (container-query width units), not
 *  percentages. A percentage `border-radius` resolves per-axis — 13.5% of the
 *  width horizontally but 13.5% of the *height* vertically — which on a phone's
 *  ~2.17 aspect ratio draws stretched elliptical corners instead of round ones.
 *  `cqw` is width-relative on both axes, so the corners are true circles. The
 *  percentage is kept as a preceding declaration for browsers without container
 *  units.
 */
import { useEffect, useRef, useState } from "react";

import {
  PLATFORM_LABEL,
  SLOT_LABEL,
  screenAspect,
  type AppPlatform,
  type ShotSlot,
} from "@/lib/app-screenshots";

type LoadState = "loading" | "ready" | "missing";

export function DeviceFrame({
  platform,
  src,
  slot,
  alt,
  className = "",
  /** "device" draws the handset; "bare" shows the screen alone with a soft
   *  shadow. */
  variant = "device",
  /** Warm halo behind the phone — on for the hero, off inside the scroll tour
   *  where four stacked frames would compound into a glow. */
  glow = false,
  /** Sets `loading`/`fetchpriority` — true for the one frame above the fold. */
  eager = false,
}: {
  platform: AppPlatform;
  src: string;
  slot: ShotSlot;
  alt: string;
  className?: string;
  variant?: "device" | "bare";
  glow?: boolean;
  eager?: boolean;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Re-arm on src change: the tour swaps `src` between beats, and a frame that
  // stayed "missing" from a previous slot would never show the new screenshot.
  //
  // Then immediately re-check whether the image is ALREADY decoded. A cached
  // image can finish loading before React attaches `onLoad`, in which case the
  // event never fires and the frame sits on its placeholder forever with the
  // real screenshot sitting in cache. That is not a rare race here: the company
  // page's screen roller calls `useAvailableShots`, which probes every src with
  // `new Image()` before rendering — so by the time these <img>s mount, every
  // one of them is guaranteed to be cached and guaranteed to lose the race.
  // That is why the roller rendered seven "iPhone screenshot" placeholders on
  // ddbx.uk/company/* while the PNGs were committed, deployed, and serving 200.
  useEffect(() => {
    const img = imgRef.current;

    if (img?.complete && img.naturalWidth > 0) {
      setState("ready");

      return;
    }
    setState("loading");
  }, [src]);

  const isIos = platform === "ios";
  const bare = variant === "bare";

  const screen = (
    <div
      className="dvf-screen"
      style={{ aspectRatio: String(screenAspect(platform)) }}
    >
      {state !== "missing" ? (
        <img
          ref={imgRef}
          alt={alt}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          loading={eager ? "eager" : "lazy"}
          src={src}
          style={{ opacity: state === "ready" ? 1 : 0 }}
          onError={() => setState("missing")}
          onLoad={() => setState("ready")}
        />
      ) : null}

      {state !== "ready" ? (
        <div aria-hidden className="dvf-ph">
          <img alt="" className="dvf-ph-mark" src="/ios-app-logo.svg" />
          <span className="dvf-ph-slot">{SLOT_LABEL[slot]}</span>
          <span className="dvf-ph-sub">
            {PLATFORM_LABEL[platform]} screenshot
          </span>
        </div>
      ) : null}

      {/* The camera cutout is hardware — a screenshot never contains it, so it
          is drawn over every state, but only when we're drawing a device at
          all. The home indicator is SOFTWARE and a real screen grab already
          has one, so ours only stands in for the placeholder. */}
      {!bare &&
        (isIos ? (
          <span aria-hidden className="dvf-island" />
        ) : (
          <span aria-hidden className="dvf-punch" />
        ))}
      {state !== "ready" ? <span aria-hidden className="dvf-home" /> : null}
    </div>
  );

  return (
    <div
      className={`dvf ${isIos ? "dvf-ios" : "dvf-android"} ${bare ? "dvf-bare" : ""} ${className}`}
    >
      <style>{`
        .dvf {
          position: relative;
          width: 100%;
          container-type: inline-size;
          /* Bezel thickness, bottom chin and screen corner radius, all as a
             share of the device width — measured off the real handsets.
             iPhone: near-symmetrical bezel, very round corners. */
          --dvf-bezel: 2.9cqw;
          --dvf-bezel-top: 3.1cqw;
          --dvf-chin: 3.1cqw;
          --dvf-radius: 13.2cqw;
        }
        /* Pixel-class Android: thicker bezel, a visibly larger chin, and
           noticeably squarer corners. Getting these wrong is what makes a
           "generic phone" read as an iPhone with the wrong cutout.
           The top bezel is thicker again than the sides — a screenshot brings
           its own status bar hard against the top edge, so a thin top rail
           leaves the clock and the punch-hole looking cramped against the
           frame. */
        .dvf-android {
          --dvf-bezel: 3.5cqw;
          --dvf-bezel-top: 4.6cqw;
          --dvf-chin: 4.8cqw;
          --dvf-radius: 9cqw;
        }

        .dvf-body {
          position: relative;
          /* Concentric corners: the outer radius must be the inner radius plus
             the bezel, or the frame's curve fights the screen's. */
          border-radius: calc(var(--dvf-radius) + var(--dvf-bezel));
          padding: var(--dvf-bezel-top) var(--dvf-bezel) var(--dvf-chin);
          /* Brushed-titanium rail: a dark body with lighter edges where the
             chamfer would catch the light, warm-shifted so it belongs in the
             cream palette rather than reading as cold graphite. */
          background:
            linear-gradient(148deg,
              #6b625a 0%,
              #2a2521 7%,
              #17130f 34%,
              #12100d 62%,
              #262019 90%,
              #6b625a 100%);
          box-shadow:
            /* inner hairline where the glass meets the rail */
            0 0 0 1px rgba(0, 0, 0, 0.55) inset,
            /* top chamfer highlight */
            0 1px 2px rgba(255, 255, 255, 0.34) inset,
            /* contact shadow — tight and dark, sells the weight */
            0 6px 12px -6px rgba(28, 20, 12, 0.5),
            /* ambient shadow — broad and soft */
            0 40px 70px -32px rgba(28, 20, 12, 0.5),
            0 16px 32px -18px rgba(28, 20, 12, 0.34);
        }
        :is(.dark) .dvf-body {
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.7) inset,
            0 1px 2px rgba(255, 255, 255, 0.28) inset,
            0 6px 12px -6px rgba(0, 0, 0, 0.7),
            0 40px 70px -32px rgba(0, 0, 0, 0.75),
            0 16px 32px -18px rgba(0, 0, 0, 0.55);
        }

        .dvf-screen {
          position: relative;
          overflow: hidden;
          border-radius: 13%;
          border-radius: var(--dvf-radius);
          background: #f5f0e8;
        }
        :is(.dark) .dvf-screen { background: oklch(22% 0.022 55); }
        .dvf-screen > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Bare variant — the screen as its own object. Slightly softer corners
           than a real handset (nothing is clipping them here) and a shadow that
           reads as "floating card", not "phone on a table". */
        .dvf-bare .dvf-screen {
          border-radius: 8%;
          border-radius: 7.5cqw;
          box-shadow:
            0 0 0 1px rgba(28, 20, 12, 0.08),
            0 2px 6px -2px rgba(28, 20, 12, 0.12),
            0 30px 60px -28px rgba(28, 20, 12, 0.42),
            0 12px 26px -16px rgba(28, 20, 12, 0.26);
        }
        :is(.dark) .dvf-bare .dvf-screen {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 2px 6px -2px rgba(0, 0, 0, 0.5),
            0 30px 60px -28px rgba(0, 0, 0, 0.7),
            0 12px 26px -16px rgba(0, 0, 0, 0.5);
        }

        /* Dynamic Island — a floating pill, not a notch cut into the bezel. */
        .dvf-island {
          position: absolute;
          top: 1.7%;
          left: 50%;
          transform: translateX(-50%);
          width: 29%;
          height: 2.5%;
          min-height: 11px;
          border-radius: 999px;
          background: #0a0908;
          z-index: 2;
        }
        /* Android punch-hole. Emulator captures have no cutout, so this is
           drawn over the screenshot's status bar — which means a flat black
           disc reads as a smudge on the UI rather than a hole in the glass.
           The lens gradient plus a bright rim is what sells it as hardware. */
        .dvf-punch {
          position: absolute;
          top: 1.35%;
          left: 50%;
          transform: translateX(-50%);
          width: 3.1%;
          aspect-ratio: 1;
          border-radius: 999px;
          /* Neutral graphite, not blue — the earlier cool highlight read as a
             tinted dot sitting on the UI rather than a lens under the glass. */
          background:
            radial-gradient(circle at 34% 30%,
              #3a3a3c 0%,
              #17171a 45%,
              #050505 100%);
          box-shadow:
            0 0 0 0.5px rgba(210, 210, 212, 0.34),
            0 0 3px 1px rgba(0, 0, 0, 0.35);
          z-index: 2;
        }
        /* Stand-in home indicator for the placeholder — a real screenshot
           brings its own. */
        .dvf-home {
          position: absolute;
          bottom: 1.1%;
          left: 50%;
          transform: translateX(-50%);
          width: 34%;
          height: 4px;
          border-radius: 999px;
          background: rgba(20, 16, 12, 0.32);
          z-index: 2;
        }
        :is(.dark) .dvf-home { background: rgba(255, 255, 255, 0.34); }

        /* Side hardware. Decorative, but it's most of what tells the two
           platforms apart in silhouette, so the layouts are the real ones:
             iPhone — Action button + volume up/down on the LEFT, power right.
             Pixel  — power AND volume both on the RIGHT, power above.
           An Android frame with buttons on the left is the single clearest
           tell that it's an iPhone wearing a different cutout. */
        .dvf-btn {
          position: absolute;
          background: linear-gradient(90deg, #1b1713 0%, #4a423a 45%, #241f1a 100%);
          border-radius: 1.5px;
        }
        .dvf-android .dvf-btn {
          background: linear-gradient(90deg, #17181b 0%, #454952 45%, #1e2024 100%);
        }
        .dvf-btn-l { left: -2px; width: 3px; }
        .dvf-btn-r { right: -2px; width: 3px; }

        .dvf-glow {
          position: absolute;
          inset: -14% -18%;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(ellipse 50% 45% at 50% 45%,
            rgba(255, 248, 232, 0.85) 0%,
            rgba(255, 244, 222, 0.34) 38%,
            transparent 72%);
        }
        :is(.dark) .dvf-glow {
          background: radial-gradient(ellipse 50% 45% at 50% 45%,
            rgba(196, 168, 130, 0.2) 0%,
            rgba(196, 168, 130, 0.07) 40%,
            transparent 72%);
        }

        /* Placeholder for a screen not yet captured. A warm panel with the
           slot's name and a slow sheen — clearly a "coming" state, never a
           broken-image icon. */
        .dvf-ph {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12%;
          text-align: center;
          background:
            radial-gradient(ellipse 90% 55% at 50% 22%, rgba(255, 248, 232, 0.9) 0%, transparent 62%),
            linear-gradient(175deg, #efe8dc 0%, #e3d9c9 100%);
        }
        :is(.dark) .dvf-ph {
          background:
            radial-gradient(ellipse 90% 55% at 50% 22%, rgba(196, 168, 130, 0.16) 0%, transparent 62%),
            linear-gradient(175deg, oklch(26% 0.024 55) 0%, oklch(22% 0.022 55) 100%);
        }
        .dvf-ph::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.5) 50%, transparent 62%);
          transform: translateX(-100%);
          animation: dvf-sheen 3.4s ease-in-out infinite;
        }
        :is(.dark) .dvf-ph::after {
          background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.07) 50%, transparent 62%);
        }
        @keyframes dvf-sheen {
          0%        { transform: translateX(-100%); }
          55%, 100% { transform: translateX(100%); }
        }
        .dvf-ph-mark { width: 44px; height: 44px; border-radius: 11px; opacity: 0.85; }
        .dvf-ph-slot {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: rgba(26, 20, 13, 0.62);
        }
        :is(.dark) .dvf-ph-slot { color: rgba(255, 255, 255, 0.6); }
        .dvf-ph-sub {
          font-size: 11px;
          line-height: 1.35;
          color: rgba(26, 20, 13, 0.38);
        }
        :is(.dark) .dvf-ph-sub { color: rgba(255, 255, 255, 0.34); }

        @media (prefers-reduced-motion: reduce) {
          .dvf-ph::after { animation: none; opacity: 0; }
        }
      `}</style>

      {glow ? <div aria-hidden className="dvf-glow" /> : null}

      {bare ? (
        screen
      ) : (
        <div className="dvf-body">
          {isIos ? (
            <>
              {/* Action button, volume up, volume down — left rail. */}
              <span
                aria-hidden
                className="dvf-btn dvf-btn-l"
                style={{ top: "16%", height: "4%" }}
              />
              <span
                aria-hidden
                className="dvf-btn dvf-btn-l"
                style={{ top: "23%", height: "7%" }}
              />
              <span
                aria-hidden
                className="dvf-btn dvf-btn-l"
                style={{ top: "32%", height: "7%" }}
              />
              {/* Power — right rail, lower than the volume pair. */}
              <span
                aria-hidden
                className="dvf-btn dvf-btn-r"
                style={{ top: "26%", height: "11%" }}
              />
            </>
          ) : (
            <>
              {/* Pixel layout: power on top, volume rocker below it, both on
                  the right rail. Nothing on the left. */}
              <span
                aria-hidden
                className="dvf-btn dvf-btn-r"
                style={{ top: "19%", height: "6%" }}
              />
              <span
                aria-hidden
                className="dvf-btn dvf-btn-r"
                style={{ top: "28%", height: "10%" }}
              />
            </>
          )}
          {screen}
        </div>
      )}
    </div>
  );
}
