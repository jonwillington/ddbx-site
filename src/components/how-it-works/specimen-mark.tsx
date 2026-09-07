/** The two marks /how-it-works draws with, defined once.
 *
 *  Page grammar 2 and 3 give this page an exclusive mark vocabulary, and
 *  before this file existed the specimen mark alone was drawn five times in
 *  five files with five slightly different radii (r4/r7, r4.5/r6.5, an
 *  `outline`, a `ring-offset`, two nested spans). Identical geometry here, in
 *  the two forms the page needs:
 *
 *    SpecimenMark      HTML, 16px box. A filled brand disc (8px) inside a 2px
 *                      ring of the same colour at 30%, with 2px of whatever
 *                      ground it sits on showing between. Nothing is painted
 *                      in the gap, so it drops onto the sheet, the cream page
 *                      or a tinted band unchanged.
 *    SpecimenMarkSvg   the same shape for the hero's SVG: disc r4, ring r7 at
 *                      stroke 2 (inner edge 6, gap 2, disc 4 — identical to
 *                      the HTML box's 8/6/4).
 *
 *    VerdictDisc       a check's result. A ticked GREEN disc = cleared, a
 *                      crossed RED ring = not cleared. Until 2026-09-07 the
 *                      verdict was carried by fill and glyph alone, with green
 *                      and red reserved for measured market outcomes; Jon's
 *                      review asked for "a green check and red x" on the
 *                      verdict pairs, and one code page-wide beats two, so the
 *                      scorecard strip and the ratings gauge follow. Colour
 *                      reads as pass/fail here and as ahead/behind on the
 *                      measured section — the glyph (tick vs cross) is what
 *                      keeps the two apart. Used by the checks scorecard, the
 *                      verdict pairs under each check and the ratings ladder's
 *                      gauge, so the reader learns the code once.
 *
 *                      The tick is knocked out of the disc with a mask rather
 *                      than painted white over it, for the same reason the
 *                      specimen mark leaves its gap unpainted: the mark then
 *                      drops onto the sheet, the cream page or a tinted band
 *                      without a second colour to keep in step with the
 *                      theme. Stroke weights are computed from the rendered
 *                      size so the glyph stays crisp from the 10px inline
 *                      mark in a sentence to the 30px disc on the scorecard
 *                      strip — a fixed viewBox weight would either dissolve at
 *                      the small end or read as a blob at the large one.
 */

import { useId } from "react";

/** The verdict marks are drawn in a 24-unit box and scaled to `size`. */
const VIEW = 24;
/** The tick, sized to sit well inside r12 with room for a round cap. */
const TICK = "M6.4 12.4 L10 16 L17.6 7.9";
/** The cross, deliberately small inside its ring. */
const CROSS = "M8.4 8.4 L15.6 15.6 M15.6 8.4 L8.4 15.6";

/** The worked example. Nothing else on the page uses this mark. */
export function SpecimenMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center ${className}`}
    >
      <span className="absolute inset-0 rounded-full border-2 border-brand-brown/30 dark:border-brand-tan/30" />
      <span className="h-2 w-2 rounded-full bg-brand-brown dark:bg-brand-tan" />
    </span>
  );
}

/** The same mark inside an SVG. `color` is a CSS colour; the hero passes the
 *  brand tan because its panel is dark in both themes. */
export function SpecimenMarkSvg({
  cx,
  cy,
  color,
}: {
  cx: number;
  cy: number;
  color: string;
}) {
  return (
    <g aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        fill="none"
        r={7}
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} fill={color} r={4} />
    </g>
  );
}

/** One check's verdict, drawn at any size.
 *
 *  Geometry lives in a 24-unit box; `size` is the rendered edge in px. Stroke
 *  weights are specified in RENDERED pixels and converted back into user units
 *  (`* 24 / size`), with a floor so the 10px inline form still has a tick you
 *  can see. */
export function VerdictDisc({
  cleared,
  size = 10,
  delayMs,
}: {
  cleared: boolean;
  size?: number;
  /** Mount-in stagger (`.board-dot`) for a strip of them. Omitted for marks
   *  that arrive with their text. */
  delayMs?: number;
}) {
  /* Unique per instance: two discs sharing a mask id would knock the tick out
   * of whichever one the browser resolved first. React's useId comes back as
   * `:r7:`, and a colon inside a url(#…) fragment is legal but not worth
   * betting a silently-blank mark on, so it is stripped. */
  const maskId = `verdict-tick-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  /** px of stroke, expressed in the 24-unit viewBox. */
  const user = (px: number) => (px * VIEW) / size;

  const tick = user(Math.max(1.6, size * 0.12));
  const ring = user(Math.max(1.5, size * 0.095));
  const cross = user(Math.max(1.4, size * 0.09));

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 align-middle ${
        delayMs == null ? "" : "board-dot"
      } ${cleared ? "text-positive" : "text-negative"}`}
      style={{
        height: size,
        width: size,
        ...(delayMs == null ? null : { animationDelay: `${delayMs}ms` }),
      }}
    >
      <svg
        fill="none"
        height={size}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {cleared ? (
          <>
            <mask
              height={VIEW}
              id={maskId}
              maskUnits="userSpaceOnUse"
              width={VIEW}
              x={0}
              y={0}
            >
              <circle cx={12} cy={12} fill="#fff" r={12} />
              <path
                d={TICK}
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={tick}
              />
            </mask>
            <rect
              fill="currentColor"
              height={VIEW}
              mask={`url(#${maskId})`}
              width={VIEW}
            />
          </>
        ) : (
          <>
            <circle
              cx={12}
              cy={12}
              r={12 - ring / 2}
              stroke="currentColor"
              strokeWidth={ring}
            />
            <path
              d={CROSS}
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={cross}
            />
          </>
        )}
      </svg>
    </span>
  );
}
