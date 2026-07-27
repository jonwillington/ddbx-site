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
 */
import type { ReactNode } from "react";

const RULE = "border-hairline dark:border-separator";

export function SeoSection({
  id,
  title,
  aside,
  variant = "stacked",
  className = "",
  children,
}: {
  id?: string;
  title: string;
  /** Quiet qualifier under the title — "Ranked by value bought",
   *  "Top 20 by value", an entry count — instead of cluttering the h2. */
  aside?: ReactNode;
  variant?: "stacked" | "rail";
  className?: string;
  children: ReactNode;
}) {
  if (variant === "rail") {
    return (
      <section
        className={`grid scroll-mt-24 gap-x-10 gap-y-4 border-t ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9 ${className}`}
        id={id}
      >
        <div>
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
      <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      {aside ? (
        <div className="mt-1 text-[12px] leading-[1.5] text-foreground/45">
          {aside}
        </div>
      ) : null}
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
