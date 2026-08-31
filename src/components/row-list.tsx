/** Full-width rows for lists that sell — tenet 3 of the 2026-08-30 design
 *  language (the Litebox pattern), built here when its first list converted:
 *  the six checks on /how-it-works.
 *
 *  The shape: hairline rules between rows, glyph + LARGE heading on the left,
 *  a quiet one-paragraph description on the right, generous vertical padding.
 *  It replaces two failure modes at once — the small checkmark bullet stack
 *  (which makes an argument read as a feature list) and the wall of
 *  heading-then-three-paragraphs (which makes it read as documentation).
 *  The heading carries the claim; the description earns it; anything deeper
 *  goes in `more`, folded, so the visible page stays the argument.
 *
 *  Scale: row titles sit one step under the stacked SeoSection h2 (26/34px),
 *  well above body text — the row IS the typography doing the work, so a
 *  15px semibold here would defeat the point of the component.
 */
import type { ReactNode } from "react";

const RULE = "border-hairline dark:border-separator";

/** The container: owns the top rule; rows own their bottom rules, so the
 *  list closes cleanly whatever renders last. Ordered by default because
 *  every list so far has been a sequence; pass `ordered={false}` for one
 *  that isn't. */
export function RowList({
  ordered = true,
  className = "",
  children,
}: {
  ordered?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const Tag = ordered ? "ol" : "ul";

  return <Tag className={`border-t ${RULE} ${className}`}>{children}</Tag>;
}

export function Row({
  glyph,
  title,
  kicker,
  more,
  children,
}: {
  /** Leading mark — a StepNode, an icon. Sized by the caller. */
  glyph?: ReactNode;
  /** The claim, set large. Keep it to a line's worth of words. */
  title: ReactNode;
  /** Quiet mono tag under the title — a label, a key, a count. */
  kicker?: ReactNode;
  /** Depth below the description — typically a folded <details>. Lives in
   *  the right column so open state never reflows the heading beside it. */
  more?: ReactNode;
  /** The one-paragraph description. Bare strings get the quiet paragraph
   *  treatment; pass elements to compose something richer. */
  children: ReactNode;
}) {
  return (
    <li
      className={`grid gap-x-10 gap-y-3 border-b ${RULE} py-7 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:py-9`}
    >
      <div className="flex gap-4">
        {glyph ? <span className="mt-1 shrink-0">{glyph}</span> : null}
        <div className="min-w-0">
          <h3 className="text-balance text-[21px] font-semibold leading-[1.15] tracking-[-0.022em] text-foreground sm:text-[24px]">
            {title}
          </h3>
          {kicker ? (
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/40">
              {kicker}
            </p>
          ) : null}
        </div>
      </div>
      <div className={`min-w-0 sm:pt-1 ${glyph ? "pl-10 sm:pl-0" : ""}`}>
        {typeof children === "string" ? (
          <p className="max-w-[58ch] text-[15px] leading-[1.65] text-foreground/75">
            {children}
          </p>
        ) : (
          children
        )}
        {more}
      </div>
    </li>
  );
}
