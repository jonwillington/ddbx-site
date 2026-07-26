/** A proportion bar, three pixels tall.
 *
 *  The SEO list pages state a run of numbers and draw nothing, so a reader has
 *  to compare "£37m" against "£20m" against "£6.2m" arithmetically, in their
 *  head, down a column. That's the work a chart exists to do.
 *
 *  This is deliberately not a chart library. A stack of ruled rows, each
 *  carrying one of these scaled to the largest value on the page, IS a labelled
 *  horizontal bar chart — it just happens to be built from a div. It costs
 *  nothing, it survives dark mode, and it works at the 14px row height these
 *  lists actually use, which a real charting component does not.
 *
 *  `aria-hidden` throughout: the number beside it is the accessible value, and
 *  a screen reader announcing a decorative bar after every figure is noise. */
export function MeterBar({
  value,
  max,
  className = "",
}: {
  value: number;
  /** The largest value on the page — the bar is relative to its own list, not
   *  to some absolute scale. */
  max: number;
  className?: string;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const pct = safeMax === 0 ? 0 : Math.min(100, (safeValue / safeMax) * 100);

  return (
    <div
      aria-hidden
      className={`h-[3px] w-full overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.07] ${className}`}
    >
      <div
        className="h-full rounded-full bg-[#5a4128]/60 dark:bg-[#ad9479]/60"
        // A row worth 0.4% of the leader still gets a visible mark — a bar that
        // renders as nothing reads as missing data rather than as a small
        // number.
        style={{ width: pct === 0 ? 0 : `max(2px, ${pct}%)` }}
      />
    </div>
  );
}
