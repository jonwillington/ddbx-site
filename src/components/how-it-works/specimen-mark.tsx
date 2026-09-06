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
 *    VerdictDisc       a check's result. Filled ink disc = cleared, hollow
 *                      ring = not cleared. Verdict is carried by FILL, never
 *                      by colour: on this page green and red are reserved for
 *                      measured market outcomes, and a pass is not one. Used
 *                      by the checks scorecard, the verdict pairs under each
 *                      check and the ratings ladder's gauge, so the reader
 *                      learns the code once.
 */

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

/** One check's verdict. Deliberately not a tick and a cross — a tick is
 *  legible only if you already know which way round the page is arguing. */
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
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full align-middle ${
        delayMs == null ? "" : "board-dot"
      } ${
        cleared
          ? "bg-foreground/85"
          : "border-2 border-foreground/35 bg-transparent"
      }`}
      style={{
        height: size,
        width: size,
        ...(delayMs == null ? null : { animationDelay: `${delayMs}ms` }),
      }}
    />
  );
}
