/** Per-archetype loading skeletons for the SEO page family.
 *
 *  Before this existed every page hand-rolled its own `animate-pulse` blocks —
 *  four different fill tints, three tempos, and shapes that bore no relation
 *  to what replaced them (a single 160px box standing in for ~1,700px of
 *  sector detail was the worst case). The rule here: a skeleton mirrors the
 *  loaded layout's structure — same rules, same row heights, same row count
 *  where it's knowable — so data fills the page in rather than redrawing it.
 *
 *  Fill and tempo come from the house `Skeleton` primitive (`.skeleton` in
 *  globals.css) so the whole site pulses in step. The wrapper owns
 *  `aria-busy` and one screen-reader label; every bar inside is decorative.
 */
import { Skeleton } from "@/components/skeleton";

const RULE = "border-hairline dark:border-separator";

export type SeoSkeletonVariant =
  | "ruled-list" // sectors index, reports index, learn examples, sector's lists
  | "ranked-board" // biggest-buys: rank gutter + logo + lines + meter + value
  | "sheet-stack" // broker category ranking, comparison pair columns
  | "doc-sections" // report page / PageSection 10rem-rail ruled sections
  | "stat-tiles"; // figures grids

const DEFAULT_ROWS: Record<SeoSkeletonVariant, number> = {
  "ruled-list": 8,
  "ranked-board": 10,
  "sheet-stack": 4,
  "doc-sections": 3,
  "stat-tiles": 4,
};

export function SeoSkeleton({
  variant,
  rows,
  className = "",
}: {
  variant: SeoSkeletonVariant;
  /** Row/section/tile count. Pass the real count when it's knowable without
   *  the fetch (a static editorial list, a hard cap) — an 8-row stand-in for
   *  a 25-row board is a layout shift, not a skeleton. */
  rows?: number;
  className?: string;
}) {
  const n = rows ?? DEFAULT_ROWS[variant];
  const keys = Array.from({ length: n }, (_, i) => i);

  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>

      {variant === "ruled-list" ? (
        <ul className={`mt-10 border-t ${RULE}`}>
          {keys.map((i) => (
            <li key={i} className={`border-b ${RULE} py-4`}>
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-[16px] w-2/5 max-w-[220px]" />
                  <Skeleton className="mt-2 h-[11px] w-3/5 max-w-[280px]" />
                  <Skeleton className="mt-2.5 h-[3px] w-full" />
                </div>
                <Skeleton className="h-[15px] w-16 shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {variant === "ranked-board" ? (
        <ol className={`mt-8 border-t ${RULE}`}>
          {keys.map((i) => (
            <li key={i} className={`border-b ${RULE} py-3.5`}>
              <div className="flex items-start gap-3">
                <Skeleton className="mt-1 h-[15px] w-6 shrink-0" />
                <Skeleton circle className="shrink-0" h={28} w={28} />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-[14px] w-1/2 max-w-[240px]" />
                  <Skeleton className="mt-2 h-[11px] w-2/3 max-w-[300px]" />
                  <Skeleton className="mt-2.5 h-[3px] w-full" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Skeleton className="h-[18px] w-14" />
                  <Skeleton className="h-[12px] w-10" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {variant === "sheet-stack" ? (
        <div className="mt-8 space-y-3">
          {keys.map((i) => (
            <Skeleton key={i} className="w-full rounded-2xl" h={116} />
          ))}
        </div>
      ) : null}

      {variant === "doc-sections" ? (
        <div className="mt-4">
          {keys.map((i) => (
            <div
              key={i}
              className={`grid gap-x-10 gap-y-4 border-t ${RULE} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
            >
              <Skeleton className="h-[17px] w-24" />
              <div className="min-w-0">
                <Skeleton className="h-[14px] w-full max-w-[560px]" />
                <Skeleton className="mt-2.5 h-[14px] w-11/12 max-w-[520px]" />
                <Skeleton className="mt-2.5 h-[14px] w-4/5 max-w-[440px]" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {variant === "stat-tiles" ? (
        <div
          className={`mt-6 grid grid-cols-2 gap-2 ${
            n >= 5
              ? "sm:grid-cols-5"
              : n === 3
                ? "sm:grid-cols-3"
                : "sm:grid-cols-4"
          }`}
        >
          {keys.map((i) => (
            <Skeleton key={i} className="w-full rounded-xl" h={64} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
