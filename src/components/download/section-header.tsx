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
  align = "left",
  className = "",
}: {
  kicker: string;
  /** 1-based position. Omit on sections outside the numbered run. */
  index?: number;
  total?: number;
  title: ReactNode;
  sub?: ReactNode;
  tone?: "light" | "dark";
  /** Left-set is the page's default and the reason it doesn't read as a
   *  template. The closing band is the one exception: it's a single CTA with
   *  nothing to its right, and left-set it left two-thirds of a full-bleed
   *  dark band empty. The ruled kicker/number row stays put either way, so
   *  the section still belongs to the same family. */
  align?: "left" | "center";
  className?: string;
}) {
  const rule = tone === "dark" ? "border-rule-stage" : "border-rule";
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
          <p className={`eyebrow ${kickerTone}`}>{kicker}</p>
          {index != null && total != null ? (
            <p className={`eyebrow tabular-nums ${numTone}`}>
              {String(index).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </p>
          ) : null}
        </div>

        {/* Display scale, left-set: a section opener on a page this long has
            to carry the weight of a headline, not a subheading. The document
            display step (34/44) since 2026-09-19 — it ran to 58 at lg, which
            put every section opener above the page's own h1. */}
        <h2
          className={`mt-5 max-w-[18ch] text-balance font-semibold display-doc ${
            align === "center" ? "mx-auto text-center" : ""
          }`}
        >
          {title}
        </h2>
        {sub ? (
          <p
            className={`mt-4 max-w-[52ch] text-lede ${subTone} ${
              align === "center" ? "mx-auto text-center" : ""
            }`}
          >
            {sub}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}
