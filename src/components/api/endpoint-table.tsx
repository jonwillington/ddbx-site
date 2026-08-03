import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";

/** Endpoint reference rows.
 *
 *  Table styling follows the Fills table in `src/lib/markets/us.tsx` — the
 *  site's existing data-table idiom: hairline row rules, `font-normal` header
 *  cells in muted small caps, tabular numerics. No card, no zebra striping.
 *
 *  The method badge is a chip in the accent BROWN, not green. Every public
 *  endpoint here is a GET so a per-row colour carries no information, and
 *  green/red are reserved site-wide for money moving — spending them on an
 *  HTTP verb would weaken that read everywhere else. Paths use the TickerPill
 *  treatment (mono, tinted, tabular), which is already the site's inline-code
 *  mark.
 */

export const METHOD_CHIP = `${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} bg-brand-tan/15 text-brand-tan`;

/** Inline-code mark, dark-surface variant of TickerPill. */
export function Path({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-block rounded bg-white/[0.07] px-1.5 font-mono text-[11.5px] font-semibold tabular-nums text-[#f5f0e8]/85">
      {children}
    </code>
  );
}

export interface Endpoint {
  method?: string;
  path: string;
  returns: string;
  /** Renders a BETA chip — used for feeds that exist but no client surfaces. */
  beta?: boolean;
}

/** ONE COLUMN SPEC, SHARED BY EVERY REFERENCE BLOCK.
 *
 *  The reference section stacks three of these grid rows (Dealings, Context,
 *  Quickstart), each holding its own table. Under `table-auto` each table sized
 *  its own columns from its own content, so `Returns` began 170px further right
 *  under Context than under Dealings — two tables in the same column of the
 *  same grid, visibly out of register. A reference block reads as one table
 *  broken into named groups, and it only reads that way if the groups share
 *  their tracks.
 *
 *  So: `table-fixed` plus explicit widths, declared once here. `ParamList`
 *  below hangs its description column off the same figure, which is what puts
 *  the parameter descriptions under `Returns` instead of adrift between the
 *  columns.
 *
 *  `min-w` on the table rather than letting the columns compress: a path is a
 *  string you copy, and wrapping `/api/company/:market/:key/stats` across two
 *  lines to save horizontal space makes it harder to read than scrolling for
 *  it. The wrapper scrolls on phones; the tracks stay honest everywhere.
 */
const COL_METHOD = "5.5rem";
const COL_PATH = "17rem";

/** Where the `Returns` column starts — `COL_METHOD + COL_PATH`. */
export const RETURNS_OFFSET = "22.5rem";

export function EndpointTable({ rows }: { rows: Endpoint[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] table-fixed text-sm">
        <colgroup>
          <col style={{ width: COL_METHOD }} />
          <col style={{ width: COL_PATH }} />
          <col />
        </colgroup>
        <thead>
          <tr className="text-xs text-white/40">
            <th className="pb-2 text-left font-normal">Method</th>
            <th className="pb-2 text-left font-normal">Path</th>
            <th className="pb-2 text-left font-normal">Returns</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-white/[0.08]">
              <td className="py-2.5 pr-3 align-top">
                <span className={METHOD_CHIP}>{r.method ?? "GET"}</span>
              </td>
              <td className="whitespace-nowrap py-2.5 pr-4 align-top">
                <Path>{r.path}</Path>
                {r.beta ? (
                  <span
                    className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} ml-2 bg-brand-amber/15 text-brand-amber`}
                  >
                    Beta
                  </span>
                ) : null}
              </td>
              <td className="py-2.5 align-top text-[13.5px] leading-[1.5] text-white/55">
                {r.returns}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Parameter list under a worked example. `dt` mono, `dd` muted — the
 *  DetailField idiom from the market pages.
 *
 *  Its two columns are the table's, not its own: the name sits in the method +
 *  path span and the description begins exactly where `Returns` does. It ran at
 *  `9rem` before, which put every parameter description in the gutter between
 *  the two columns above it — close enough to look intentional and wrong enough
 *  to make the block read as two unrelated lists. */
export function ParamList({
  params,
}: {
  params: { name: string; desc: string }[];
}) {
  return (
    <dl
      className="mt-4 grid gap-y-2 sm:grid-cols-[var(--param-col)_minmax(0,1fr)]"
      style={{ "--param-col": RETURNS_OFFSET } as React.CSSProperties}
    >
      {params.map((p) => (
        <div key={p.name} className="contents">
          <dt className="pr-4 font-mono text-[12px] font-medium text-brand-tan">
            {p.name}
          </dt>
          <dd className="text-[13.5px] leading-[1.55] text-white/55">
            {p.desc}
          </dd>
        </div>
      ))}
    </dl>
  );
}
