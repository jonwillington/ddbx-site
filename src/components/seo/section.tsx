/** The family's one section shell — replaces the three private `Section`
 *  copies (sector.tsx, report.tsx, plus the inline versions on biggest-buys
 *  and learn) and absorbs the broker pages' `PageSection`, which now
 *  re-exports from here.
 *
 *  BOTH VARIANTS ARE LEVELLED OFF /api, off different devices on it, which is
 *  why their headings are nowhere near the same size and neither is wrong:
 *
 *    "stacked" mirrors the page's SectionHeader — a ruled opener with a mono
 *    counter and a DISPLAY-scale title (34/46/58 there, 26/34 here for the
 *    narrower document measure).
 *    "rail" mirrors the page's reference section, which composes at
 *    `sm:grid-cols-[10rem_minmax(0,1fr)]` with a 17px h3 in the rail. A
 *    display-scale heading in a 10rem column would wrap every title to four
 *    words a line.
 *
 *  So do not "fix" the rail variant to match the stacked one. They are the same
 *  system answering two different column widths.
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

  // Stacked: the /api section opener, at document scale.
  //
  // This shipped as a 17px heading with a 12px grey aside beside a counter —
  // a subheading, in a family whose sections are the page's structure. The
  // /api page's own SectionHeader carries the argument in a comment worth
  // repeating: "a section opener on a page this long has to carry the weight
  // of a headline, not a subheading". It runs 34/46/58px there.
  //
  // Matched here in structure and stepped down in scale, because the target is
  // a different column: /api composes at max-w-6xl full width, these pages at
  // the 860px document measure with a rail beside them, where 58px would give
  // a section title four words a line. 26/34px is the same gesture at the
  // measure it has to live in.
  //
  // The counter moves onto its own row above the title rather than sitting
  // beside it. On the API page it pairs with a mono kicker on the left; here
  // there is no kicker, and keeping a small mono figure baseline-aligned
  // against a 34px heading pinned the heading's size to the counter's.
  return (
    <section
      className={`mt-12 scroll-mt-24 border-t ${RULE} pt-5 ${className}`}
      id={id}
    >
      {counter ? <div className="flex justify-end">{counter}</div> : null}
      {/* min-w-0: a flex child defaults to min-width:auto, which would let a
          long unbroken title push past the container instead of wrapping. */}
      <h2
        className={`min-w-0 max-w-[24ch] text-balance text-[26px] font-semibold leading-[1.08] tracking-[-0.025em] text-foreground sm:text-[34px] ${
          counter ? "mt-2" : ""
        }`}
      >
        {title}
      </h2>
      {aside ? (
        <div className="mt-3 max-w-[54ch] text-[15px] leading-[1.55] text-foreground/60">
          {aside}
        </div>
      ) : null}
      <div className="mt-6 min-w-0">{children}</div>
    </section>
  );
}
