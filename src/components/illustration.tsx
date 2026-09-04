import type { ComponentType, CSSProperties, SVGProps } from "react";
import type { IllustrationScene } from "@/lib/illustrations";

import { useEffect, useState } from "react";

import {
  ILLUSTRATIONS,
  illustrationSrc,
  illustrationSrcSet,
} from "@/lib/illustrations";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Ambient motion for a still. `float` is the app's slow vertical drift —
 *  3px either side of centre over 4s. A scene with a moving layer of its
 *  own (the scanning viewfinder) never floats as well: drifting the whole
 *  frame reads as the object bobbing, which none of this artwork is meant
 *  to do. `none` for states where nothing on the card is live. */
export type IllustrationMotion = "float" | "none";

interface IllustrationProps {
  scene: IllustrationScene;
  /** The heroicon this state drew before there was any artwork. Required —
   *  it is the floor, drawn whenever a file is missing, not a fallback that
   *  never renders. */
  icon: IconComponent;
  /** Frame height in CSS px; the width follows from the scene's aspect. */
  height?: number;
  motion?: IllustrationMotion;
  className?: string;
  /** Size and colour for the icon floor. */
  iconClassName?: string;
}

type LoadState = "loading" | "ready" | "missing";

/**
 * The artwork at the top of an empty state — the web seam of the app's
 * `DdbxIllustration`. Two rungs, resolved at render time:
 *
 * 1. the transparent still of the Spline scene (`public/illustrations`),
 *    with its ambient motion as a CSS keyframe;
 * 2. the heroicon the state had before, when the file isn't there.
 *
 * The box is sized up front from the manifest's aspect ratio, so the layout
 * is the same whichever rung draws, and nothing moves when the image lands.
 * Decorative throughout: the words next to it carry the meaning, so this is
 * `aria-hidden` with empty alt text. Motion is turned off under
 * `prefers-reduced-motion` in the stylesheet, not here — the keyframes are
 * the only moving part.
 */
export function Illustration({
  scene,
  icon: Icon,
  height = 98,
  motion = "float",
  className = "",
  iconClassName = "h-6 w-6 text-muted",
}: IllustrationProps) {
  const spec = ILLUSTRATIONS[scene];
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    setState("loading");
  }, [scene]);

  const hasOwnMotion = spec.layers.includes("line");
  const floats = motion === "float" && !hasOwnMotion;
  const sweeps = motion === "float" && hasOwnMotion;

  return (
    <div
      aria-hidden
      className={`relative shrink-0 ${floats ? "animate-illustration-float" : ""} ${className}`}
      style={{ height, aspectRatio: String(spec.aspect) }}
    >
      {state !== "missing"
        ? spec.layers.map((layer) => {
            const isLine = layer === "line";
            const style: CSSProperties = {
              opacity: state === "ready" ? 1 : 0,
            };

            if (isLine && spec.scanTravel != null) {
              (style as Record<string, string | number>)[
                "--illustration-scan"
              ] = `${(spec.scanTravel * 100).toFixed(2)}%`;
            }

            return (
              <img
                key={layer}
                alt=""
                className={`absolute inset-0 h-full w-full select-none object-contain ${
                  isLine && sweeps ? "animate-illustration-scan" : ""
                }`}
                decoding="async"
                draggable={false}
                src={illustrationSrc(scene, layer)}
                srcSet={illustrationSrcSet(scene, layer)}
                style={style}
                onError={() => setState("missing")}
                onLoad={
                  layer === "base"
                    ? () => setState((s) => (s === "missing" ? s : "ready"))
                    : undefined
                }
              />
            );
          })
        : null}

      {state === "missing" ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Icon className={iconClassName} />
        </span>
      ) : null}
    </div>
  );
}
