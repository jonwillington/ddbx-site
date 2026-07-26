/** A phone, drawn in markup, with an app screenshot inside it.
 *
 *  Why drawn rather than a bitmap frame: the download pages need the *same*
 *  screen shown on an iPhone and on an Android handset, in light and dark mode,
 *  at four sizes. Baking the chrome into the exports would mean 2 platforms ×
 *  2 themes × N screens of artwork to keep in sync. Here the export is the
 *  screen only (see `@/lib/app-screenshots`) and the bezel is CSS — restyling
 *  the frame is a change to this file and nothing else.
 *
 *  The two platforms are deliberately distinguishable at a glance, because
 *  that's the whole point of having a per-platform landing page: an Android
 *  visitor should see an Android phone. iOS gets the tighter corner radius and
 *  a Dynamic Island pill; Android gets a squarer body, a thinner uniform bezel
 *  and a centred punch-hole camera.
 *
 *  Missing artwork is the expected state, not an error — the mockups land
 *  after the page ships. `onError` swaps in a branded placeholder that keeps
 *  the exact same box, so the layout never moves and a half-populated tour
 *  still reads as deliberate.
 */
import { useEffect, useState } from "react";

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
  glow?: boolean;
  eager?: boolean;
}) {
  const [state, setState] = useState<LoadState>("loading");

  // Re-arm on src change: the tour swaps `src` between beats, and a frame that
  // stayed "missing" from a previous slot would never show the new screenshot.
  useEffect(() => setState("loading"), [src]);

  const isIos = platform === "ios";

  return (
    <div className={`dvf ${isIos ? "dvf-ios" : "dvf-android"} ${className}`}>
      <style>{`
        .dvf {
          position: relative;
          width: 100%;
          /* The bezel's own aspect ratio: the screen ratio, opened up by the
             bezel thickness on all four sides. Computed rather than hardcoded
             so the two platforms' different bezels can't drift out of sync
             with their screens. */
          --dvf-bezel: 3.1%;
          --dvf-radius: 13.5%;
        }
        .dvf-android { --dvf-bezel: 2.6%; --dvf-radius: 11%; }

        .dvf-body {
          position: relative;
          border-radius: calc(var(--dvf-radius) * 1.06 / 1);
          padding: var(--dvf-bezel);
          background: linear-gradient(158deg, #2b2622 0%, #14110e 42%, #241f1a 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.09) inset,
            0 2px 3px rgba(255, 255, 255, 0.12) inset,
            0 34px 60px -28px rgba(28, 20, 12, 0.55),
            0 12px 24px -14px rgba(28, 20, 12, 0.4);
        }
        :is(.dark) .dvf-body {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.12) inset,
            0 2px 3px rgba(255, 255, 255, 0.1) inset,
            0 34px 60px -28px rgba(0, 0, 0, 0.7),
            0 12px 24px -14px rgba(0, 0, 0, 0.5);
        }

        .dvf-screen {
          position: relative;
          overflow: hidden;
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

        /* Dynamic Island — a floating pill, not a notch cut into the bezel. */
        .dvf-island {
          position: absolute;
          top: 1.9%;
          left: 50%;
          transform: translateX(-50%);
          width: 30%;
          height: 2.6%;
          min-height: 12px;
          border-radius: 999px;
          background: #0b0908;
          z-index: 2;
        }
        /* Android punch-hole — a small centred dot near the top edge. */
        .dvf-punch {
          position: absolute;
          top: 1.5%;
          left: 50%;
          transform: translateX(-50%);
          width: 3.4%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: #0b0908;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
          z-index: 2;
        }
        /* Home indicator (iOS) / gesture pill (Android) — same object, and it
           sells "this is a running app" more than anything else in the frame. */
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

        /* Side hardware. Purely decorative, but a slab with no buttons reads as
           a mockup of a phone rather than a phone. */
        .dvf-btn {
          position: absolute;
          background: linear-gradient(90deg, #26211c, #3a332c);
          border-radius: 2px;
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

        /* Placeholder for a screenshot that hasn't been exported yet. A warm
           panel with the slot's name and a slow sheen — clearly a "coming"
           state, never a broken-image icon. */
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

      <div className="dvf-body">
        {/* Volume rocker + power button. */}
        <span
          aria-hidden
          className="dvf-btn dvf-btn-l"
          style={{ top: "17%", height: "6%" }}
        />
        <span
          aria-hidden
          className="dvf-btn dvf-btn-l"
          style={{ top: "25%", height: "9%" }}
        />
        <span
          aria-hidden
          className="dvf-btn dvf-btn-r"
          style={{ top: "22%", height: "11%" }}
        />

        <div
          className="dvf-screen"
          style={{ aspectRatio: String(screenAspect(platform)) }}
        >
          {state !== "missing" ? (
            <img
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

          {isIos ? (
            <span aria-hidden className="dvf-island" />
          ) : (
            <span aria-hidden className="dvf-punch" />
          )}
          <span aria-hidden className="dvf-home" />
        </div>
      </div>
    </div>
  );
}
