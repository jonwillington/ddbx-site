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

/** The `ranked-board` geometry, for the boards that have moved to `BoardRow`.
 *
 *  Rule 9 asks a skeleton to stand at the shape that arrives, and BoardRow
 *  arrives with a 56px logo, aligned fact cells and usually no meter — while
 *  the pages that have not migrated yet still arrive at 28px with a bar under
 *  every row. Both are the truth for their own page, so the geometry is a
 *  parameter and the default is the old one: a page opts in when its rows do,
 *  not when this file changes. */
export interface SeoSkeletonBoard {
  /** Logo diameter. BoardRow's is 56. */
  logo?: number;
  /** Aligned fact cells between the subject and the figure. */
  facts?: number;
  /** The 3px proportion bar under the subject. */
  meter?: boolean;
  /** Quantity columns to the right of the facts BESIDES the headline one —
   *  /cluster-buys puts a value and a median mark there. They arrive with the
   *  widest arrangement, so they stand from `xl` like the row's own do. */
  trailing?: number;
  /** The picture column: /biggest-buys' price line, /most-active's tally. */
  visual?: boolean;
  /** How tall that picture actually is. The default suits a price line;
   *  /most-active's tally is a 7px run of pips, and standing a 44px bar in
   *  its place makes the loading row 37px taller than the one that arrives —
   *  a redraw wearing a loading state, which is the thing rule 6 is about. */
  visualHeight?: number;
}

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
  board,
  className = "",
}: {
  variant: SeoSkeletonVariant;
  /** Row/section/tile count. Pass the real count when it's knowable without
   *  the fetch (a static editorial list, a hard cap) — an 8-row stand-in for
   *  a 25-row board is a layout shift, not a skeleton. */
  rows?: number;
  /** `ranked-board` only. Omit for the pre-BoardRow geometry. */
  board?: SeoSkeletonBoard;
  className?: string;
}) {
  const n = rows ?? DEFAULT_ROWS[variant];
  const keys = Array.from({ length: n }, (_, i) => i);
  const logoPx = board?.logo ?? 28;
  const factCells = Array.from({ length: board?.facts ?? 0 }, (_, i) => i);
  const trailingCells = Array.from(
    { length: board?.trailing ?? 0 },
    (_, i) => i,
  );
  const showMeter = board?.meter ?? true;

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
              <div
                className={`flex items-start gap-3 ${board ? "sm:gap-4" : ""}`}
              >
                <Skeleton
                  className={`mt-1 h-[15px] shrink-0 ${board ? "w-7 sm:w-10" : "w-6"}`}
                />
                <Skeleton circle className="shrink-0" h={logoPx} w={logoPx} />
                <div className="min-w-0 flex-1">
                  <Skeleton
                    className={`w-1/2 max-w-[240px] ${board ? "h-[18px]" : "h-[14px]"}`}
                  />
                  <Skeleton className="mt-2 h-[11px] w-2/3 max-w-[300px]" />
                  {showMeter ? (
                    <Skeleton className="mt-2.5 h-[3px] w-full" />
                  ) : null}
                </div>
                {factCells.map((f) => (
                  <Skeleton
                    key={f}
                    className={`mt-1 h-[13px] w-[5rem] shrink-0 ${
                      f < 2 ? "hidden sm:block" : "hidden xl:block"
                    }`}
                  />
                ))}
                {board?.visual ? (
                  <Skeleton
                    className="mt-1 hidden w-[12rem] shrink-0 xl:block"
                    h={board.visualHeight ?? 44}
                  />
                ) : null}
                {trailingCells.map((t) => (
                  <Skeleton
                    key={`trailing-${t}`}
                    className="mt-1 hidden h-[13px] w-[5.5rem] shrink-0 xl:block"
                  />
                ))}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Skeleton
                    className={board ? "h-[19px] w-12" : "h-[18px] w-14"}
                  />
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
