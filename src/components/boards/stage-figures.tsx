/** The figures a board states about itself, in the message column beside its
 *  stage.
 *
 *  A copy of the /biggest-buys header dl rather than a refactor of it: that
 *  page is shipped and frozen, and the six boards that followed needed the
 *  same object without the page being reopened to give it to them.
 *
 *  The dev guard is the second static-page rule made mechanical. Every figure
 *  slot here has, at some point on some page, been filled with an em dash, an
 *  "n/a" or a zero computed from an empty set — a number nobody had, stated in
 *  26px type. There is no placeholder to pass: a page with nothing to say in a
 *  slot omits the entry and says "Not enough data yet" in its own words, in
 *  prose, where it can also say when there will be one.
 */
export interface StageFigure {
  k: string;
  v: string;
  /** Colours the figure, for the one pair the panel has: ahead and behind. */
  tone?: "pos" | "neg";
}

/** Values that are not figures. Anything matching is a slot the caller should
 *  have left out. The last branch catches the rounded zero — "£0k", "$0.0m" —
 *  which is a real number formatted into a lie about an empty set. */
const NOT_A_FIGURE = /^\s*(—|–|-|n\/a|na|nan|null|undefined)\s*$/i;
const ROUNDED_ZERO = /^[^\d-]*0(\.0)?\s*(k|m|bn)$/i;

/** The dl reserves its own height while a board is loading, so the header
 *  block does not change shape under the reader when the figures arrive. */
const RESERVED = "mt-7 h-[52px]";

const DL =
  "mt-7 grid grid-cols-2 gap-x-8 gap-y-5 sm:flex sm:flex-wrap sm:gap-x-12";

const DT = "font-mono text-[10px] uppercase tracking-[0.14em] text-white/45";

const DD = "mt-1.5 text-[26px] font-medium leading-none tracking-[-0.02em]";

function toneClass(tone: StageFigure["tone"]): string {
  if (tone === "pos") return "text-[var(--stage-pos)]";
  if (tone === "neg") return "text-[var(--stage-neg)]";

  return "text-white";
}

export function StageFigures({
  items,
  reserve = false,
  className = "",
}: {
  items: StageFigure[];
  reserve?: boolean;
  className?: string;
}) {
  if (import.meta.env.DEV) {
    for (const f of items) {
      if (NOT_A_FIGURE.test(f.v) || f.v === "" || ROUNDED_ZERO.test(f.v)) {
        throw new Error(
          `StageFigures was given "${f.v}" for "${f.k}". A figure slot states a number or the entry is omitted — see the static-page rules.`,
        );
      }
    }
  }

  if (items.length === 0) {
    return reserve ? <div aria-hidden className={RESERVED} /> : null;
  }

  return (
    <dl className={`${DL} ${className}`.trimEnd()}>
      {items.map((f) => (
        <div key={f.k}>
          <dt className={DT}>{f.k}</dt>
          <dd className={`${DD} ${toneClass(f.tone)}`}>{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}
