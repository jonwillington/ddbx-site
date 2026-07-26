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

export const METHOD_CHIP = `${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} bg-[#ad9479]/15 text-[#ad9479]`;

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

export function EndpointTable({ rows }: { rows: Endpoint[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-white/40">
            <th className="w-14 pb-2 text-left font-normal">Method</th>
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
              <td className="py-2.5 pr-4 align-top">
                <Path>{r.path}</Path>
                {r.beta ? (
                  <span
                    className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.sm} ml-2 bg-[#eec584]/15 text-[#eec584]`}
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
 *  DetailField idiom from the market pages. */
export function ParamList({
  params,
}: {
  params: { name: string; desc: string }[];
}) {
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
      {params.map((p) => (
        <div key={p.name} className="contents">
          <dt className="font-mono text-[12px] font-medium text-[#ad9479]">
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
