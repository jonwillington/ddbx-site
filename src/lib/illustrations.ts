// Manifest for the empty-state illustrations.
//
// These are the five Spline scenes the iOS app ships for its market empty
// states (ddbx-ios-app: `Resources/Scenes/*.splineswift`, drawn by
// `DesignSystem/DdbxIllustration.swift`), brought to the web as transparent
// stills rather than as the Spline web runtime — a 3D runtime for a 98px
// decoration on a page that already loads a chart library is the wrong
// trade, and a still is what the app's own fallback rung draws anyway.
//
// Same shape as `app-screenshots.ts`: the files are dropped in by hand and
// the page survives any of them being absent. `Illustration` (in
// `components/illustration.tsx`) falls through to the heroicon each state
// drew before there was any artwork, so a scene lights up the moment its
// file lands, with no code change.
//
//   public/illustrations/<scene>[-<layer>][@2x|@3x].webp
//     scene   see ILLUSTRATION_SCENES below
//     layer   omitted for the base layer; `line` for the scanning scene's
//             moving part (see `layers`)
//     density 1x, 2x and 3x of the same frame — ship all three, because a
//             browser that picks a missing candidate fires `onerror` and the
//             component would drop to the icon on a file that exists.
//
// Every layer of a scene is captured from the SAME camera at the SAME frame,
// so the layers stack pixel-for-pixel and one CSS transform on the line
// layer is the whole animation. Export with the transparent background and
// the subject tight to the frame edges — the wide 338×98 frame the app
// prepares (`scripts/spline-prepare.py --fill 0.75`) is a runtime constraint
// there, not a composition; on the web the box is sized from `aspect` and
// the caller's height, so a wide frame with dead space either side would
// push the text column off the panel.
//
// `scripts/illustrations-webp.py` turns a set of PNG captures into the
// three densities in one go.

import type { MarketStatus } from "./market-status";

import { COFFEE_WINDOW_MS } from "./market-status";

export const ILLUSTRATION_SCENES = [
  /** A coffee cup — the pre-open hour. */
  "market-preopen",
  /** A viewfinder over empty space — a session under way with nothing
   *  disclosed into it yet. Two layers: the brackets, and the scan line
   *  the app drives up and down (`DdbxScene.Drive`). */
  "market-scanning",
  /** A moon and stars — after the close, and the small hours. */
  "market-night",
  /** A sofa and a side table — the weekend. Deliberately indoors so it
   *  reads as a different thing from the holiday deck chair. */
  "market-weekend",
  /** A deck chair and a cocktail — an exchange holiday. */
  "market-holiday",
] as const;

export type IllustrationScene = (typeof ILLUSTRATION_SCENES)[number];

export type IllustrationLayer = "base" | "line";

export interface IllustrationSpec {
  /** width ÷ height of the exported frame. The component reserves a box
   *  of this shape before the image arrives, so nothing shifts when it
   *  does. A file at a different ratio still renders correctly
   *  (`object-fit: contain`), just with a little air on two sides —
   *  update the number here when a re-export changes the framing. */
  aspect: number;
  /** Files that make up the picture, drawn in order. */
  layers: readonly IllustrationLayer[];
  /** For a scene with a `line` layer: how far the line travels either
   *  side of its authored position, as a fraction of the FRAME height.
   *
   *  Derived from the app, which moves "Scan Line" ±74 scene units inside
   *  brackets that frame about ±100 (`DdbxScene.drive`, `travel: 74`):
   *  74 ÷ 200 = 0.37 of the bracket height. In a frame the brackets fill
   *  to fraction F of, that is 0.37 × F of the frame. Set from the
   *  measured bracket height of the export, not by eye. */
  scanTravel?: number;
}

/** The brackets fill this much of the scanning frame's height in the
 *  export (`scripts/illustrations-webp.py` prints the measured figure). */
const SCANNING_BRACKET_FILL = 0.92;

export const ILLUSTRATIONS: Record<IllustrationScene, IllustrationSpec> = {
  "market-preopen": { aspect: 1.4, layers: ["base"] },
  "market-scanning": {
    aspect: 1.4,
    layers: ["base", "line"],
    scanTravel: 0.37 * SCANNING_BRACKET_FILL,
  },
  "market-night": { aspect: 1.4, layers: ["base"] },
  "market-weekend": { aspect: 2.0, layers: ["base"] }, // measured 1.995
  "market-holiday": { aspect: 1.4, layers: ["base"] },
};

/** Seconds for one full there-and-back sweep of the scan line. Matches the
 *  app's `period: 2.8`; the CSS runs each leg as one alternate iteration,
 *  so the keyframe duration is half this (see `.animate-illustration-scan`
 *  in globals.css). */
export const SCAN_PERIOD_S = 2.8;

function fileStem(scene: IllustrationScene, layer: IllustrationLayer): string {
  return layer === "base" ? scene : `${scene}-${layer}`;
}

/** Path to the 1x file. Not verified to exist — see the note at the top. */
export function illustrationSrc(
  scene: IllustrationScene,
  layer: IllustrationLayer = "base",
): string {
  return `/illustrations/${fileStem(scene, layer)}.webp`;
}

/** `srcset` covering the three densities the converter writes. */
export function illustrationSrcSet(
  scene: IllustrationScene,
  layer: IllustrationLayer = "base",
): string {
  const stem = `/illustrations/${fileStem(scene, layer)}`;

  return `${stem}.webp 1x, ${stem}@2x.webp 2x, ${stem}@3x.webp 3x`;
}

/** Which scene a market status is drawn with.
 *
 *  Keyed on the same `MarketStatus` value the copy is written from
 *  (`describeStatus` in market-anchor-card.tsx, `describe` in
 *  today-empty-state.tsx), so the picture and the words can't disagree —
 *  a "Market opens in 40m" headline never sits next to the moon. Mirrors
 *  the app's `noDealsTodayCard` / `noStandoutsCopy` in
 *  `Features/Dashboard/DashboardView.swift`, including its split of the
 *  non-trading hours: after the close is always night; before the open
 *  is night until the coffee window, then the cup. */
export function sceneForStatus(status: MarketStatus): IllustrationScene {
  switch (status.kind) {
    case "open":
      return "market-scanning";
    case "preOpen":
      return status.opensInMs > COFFEE_WINDOW_MS
        ? "market-night"
        : "market-preopen";
    case "closed":
      switch (status.reason.kind) {
        case "weekend":
          return "market-weekend";
        case "holiday":
          return "market-holiday";
        case "afterHours":
          return "market-night";
      }
  }
}
