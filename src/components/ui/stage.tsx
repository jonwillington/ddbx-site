/** The dark stage — the contained, fixed-dark panel every board, record page
 *  and methodology hero draws its object in (design language tenet 1).
 *
 *  Its class string was pasted verbatim into nine files before 2026-09-19.
 *  One component now owns it, plus the two pieces that sit on it everywhere:
 *  the caption strip along its foot (`StageFooter`) and the tooltip that
 *  hangs over its chart (`StageTooltip`).
 *
 *  The literal `board-stage` class is load-bearing, not decoration:
 *  styles/globals.css keys the stage ground (#1a140d in both themes), the
 *  --stage-pos/--stage-neg pair, the fixed-dark skeleton and the sidebar
 *  shell's edge-to-edge breakout on it. A story's stage adds `story-stage`
 *  through `className` for the same reason.
 *
 *  Grounds:
 *    board    the board-stage material (default)
 *    surface  the site's own dark theme scoped onto the panel (`dark` +
 *             bg-surface) — /reports' lead sheet, whose contents are written
 *             with dark-theme forms rather than stage whites
 *
 *  Spec: investigations/2026-09-19-ui-standardisation.md §3.
 */
import type { ComponentPropsWithRef, HTMLAttributes } from "react";

import clsx from "clsx";

import { glass } from "./glass";

export type StageGround = "board" | "surface";

const GROUND: Record<StageGround, string> = {
  board: "board-stage relative overflow-hidden text-white",
  surface: "dark bg-surface text-foreground",
};

/** The stage's class string, for a caller that can't render the component
 *  (a skeleton that must match it exactly, a third-party root). */
export function stage({
  ground = "board",
  shadow = true,
}: { ground?: StageGround; shadow?: boolean } = {}): string {
  return clsx(
    GROUND[ground],
    "rounded-stage border border-rule-stage",
    shadow && "shadow-stage",
  );
}

/** `ref` is a plain prop in React 19 and reaches the root through `rest` —
 *  the board panel measures its width off it. */
export interface StageProps extends ComponentPropsWithRef<"div"> {
  ground?: StageGround;
  /** The warm drop under the panel. Off for a stage embedded inside another
   *  document block (the how-it-works specimen preview). */
  shadow?: boolean;
  as?: "div" | "section";
}

export function Stage({
  ground = "board",
  shadow = true,
  as: Tag = "div",
  className,
  ...rest
}: StageProps) {
  return (
    <Tag className={clsx(stage({ ground, shadow }), className)} {...rest} />
  );
}

/** The caption strip along the stage's foot: the finding in words on the
 *  left, provenance on the right. Ruled off the object above it. Pages whose
 *  header sits at `sm:px-8` pass `sm:px-8` so the strip lines up with it. */
export const STAGE_FOOTER =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-rule-stage px-5 py-3.5 text-small text-white/65";

export function StageFooter({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(STAGE_FOOTER, className)} {...rest} />;
}

/** The tooltip surface over a stage's chart: stage glass, never under the
 *  pointer. Position (left/top) comes in through `style`; the minimum width
 *  through `className`, since it depends on what the tip says. */
export const STAGE_TIP = `pointer-events-none absolute z-20 rounded-xl px-3 py-2 text-small ${glass("stage")}`;

export function StageTooltip({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(STAGE_TIP, className)} {...rest} />;
}
