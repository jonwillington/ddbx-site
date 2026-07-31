/** The family's one section shell — replaces the three private `Section`
 *  copies (sector.tsx, report.tsx, plus the inline versions on biggest-buys
 *  and learn) and absorbs the broker pages' `PageSection`, which now
 *  re-exports from here.
 *
 *  Two variants, one grammar:
 *  - "stacked" — ruled section on a document page: `border-t pt-7 mt-10`,
 *    h2 at 17px, optional aside line under the title. What the SEO pages'
 *    private Sections already were, so migration is mechanical.
 *  - "rail" — the broker/company two-column composition: heading in a 10rem
 *    left rail, content at measure on the right. Methodology-as-document is
 *    this variant's whole job.
 *
 *  Optional numbering (`index` / `total`) sets a mono `03 / 07` counter at the
 *  right end of the rule. It is the /developers page's section device
 *  (components/download/section-header.tsx) at document scale rather than
 *  display scale, and it earns its place for the same reason it does there: a
 *  long read with no counter gives a reader no sense of how much is left, and
 *  a numbered rule is the cheapest possible fix. Purely additive — every
 *  existing caller omits both props and renders exactly as before.
 */
import type { ReactNode } from "react";

const RULE = "border-hairline dark:border-separator";

/** The house eyebrow spec, here carrying a figure rather than a word. */
const COUNTER =
  "shrink-0 font-mono text-[11px] font-semibold tabular-nums tracking-[0.16em] text-foreground/35";

export function SeoSection({
  id,
  title,
  aside,
  index,
  total,
  variant = "stacked",
  className = "",
  children,
}: {
  id?: string;
  title: string;
  /** Quiet qualifier under the title — "Ranked by value bought",
   *  "Top 20 by value", an entry count — instead of cluttering the h2. */
  aside?: ReactNode;
  /** 1-based position in a numbered run. Both must be set to render the
   *  counter; sections outside the run (a trailing "Read next") omit them. */
  index?: number;
  total?: number;
  variant?: "stacked" | "rail";
  className?: string;
  children: ReactNode;
}) {
  const counter =
    index != null && total != null ? (
      <p className={COUNTER}>
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
    ) : null;

  if (variant === "rail") {
    return (
      <section
        className={`grid scroll-mt-24 gap-x-10 gap-y-4 border-t ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9 ${className}`}
        id={id}
      >
        <div>
          {/* In the rail the counter sits above the title rather than beside
              it: the left column is 10rem wide, and a heading and a figure
              competing for that measure wraps the heading every time. */}
          {counter ? <div className="mb-2">{counter}</div> : null}
          <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
            {title}
          </h2>
          {aside ? <div className="mt-3">{aside}</div> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={`mt-10 scroll-mt-24 border-t ${RULE} pt-7 ${className}`}
      id={id}
    >
      <div className="flex items-baseline justify-between gap-6">
        {/* min-w-0: a flex child defaults to min-width:auto, which would let a
            long unbroken title push past the container instead of wrapping. */}
        <h2 className="min-w-0 text-[17px] font-semibold tracking-[-0.015em] text-foreground">
          {title}
        </h2>
        {counter}
      </div>
      {aside ? (
        <div className="mt-1 text-[12px] leading-[1.5] text-foreground/45">
          {aside}
        </div>
      ) : null}
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
