/** The page's one section-header device.
 *
 *  Every section on this page used to open the same way: a centred `max-w-2xl`
 *  stack of heading-over-subheading. That centred stack is the single loudest
 *  tell of a templated landing page — it's what every generated marketing site
 *  ships, and six of them down one page is what made this one read as stock.
 *
 *  This replaces it with newspaper grammar the site already speaks in
 *  fragments: a full-width hairline, then a row carrying a mono uppercase
 *  kicker on the left and a section number on the right, then the headline set
 *  LEFT at display scale with the standfirst under it at a real measure.
 *  Ruled, numbered and left-set is how a paper is composed; it costs nothing
 *  but class changes and it can't be mistaken for the kit.
 *
 *  The numbering is deliberate — it tells a visitor how much page is left,
 *  which a centred heading never does.
 */
import type { ReactNode } from "react";

import { Reveal } from "./reveal";

export function SectionHeader({
  kicker,
  index,
  total,
  title,
  sub,
  /** Inverted for the dark closing band. */
  tone = "light",
  className = "",
}: {
  kicker: string;
  /** 1-based position. Omit on sections outside the numbered run. */
  index?: number;
  total?: number;
  title: ReactNode;
  sub?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const rule =
    tone === "dark"
      ? "border-white/15"
      : "border-hairline dark:border-border/50";
  const kickerTone =
    tone === "dark"
      ? "text-brand-amber"
      : "text-brand-brown dark:text-brand-tan";
  const numTone = tone === "dark" ? "text-white/35" : "text-foreground/35";
  const subTone = tone === "dark" ? "text-white/60" : "text-foreground/60";

  return (
    <Reveal className={className}>
      <div className={`border-t ${rule} pt-5`}>
        <div className="flex items-baseline justify-between gap-6">
          <p
            className={`font-mono text-[11px] font-semibold uppercase tracking-[0.16em] ${kickerTone}`}
          >
            {kicker}
          </p>
          {index != null && total != null ? (
            <p
              className={`font-mono text-[11px] font-semibold tabular-nums tracking-[0.16em] ${numTone}`}
            >
              {String(index).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </p>
          ) : null}
        </div>

        {/* Display scale, left-set. The old centred h2 topped out at 42px; a
            section opener on a page this long has to carry the weight of a
            headline, not a subheading. */}
        <h2 className="mt-5 max-w-[18ch] text-balance text-[34px] font-semibold leading-[1.03] tracking-[-0.028em] sm:text-[46px] lg:text-[58px]">
          {title}
        </h2>
        {sub ? (
          <p
            className={`mt-4 max-w-[52ch] text-[16.5px] leading-[1.55] ${subTone}`}
          >
            {sub}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}
