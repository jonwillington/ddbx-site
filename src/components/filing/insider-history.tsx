/** The same insider's earlier buys of the same stock, and where each landed
 *  against the 90-day high.
 *
 *  `insider_history` is computed by ddbx-data at read time (UK only, open-market
 *  buys, prior buys within `window_days`). The `summary` is the whole story in
 *  one sentence and leads; the panel under it is a dot plot, one row per buy in
 *  date order, the mark placed by how far below the 90-day high the price was
 *  (right edge = at the high). It answers the question the sentence raises —
 *  "is this person buying dips, or chasing?" — at a glance, and every earlier
 *  row is a door to its own filing.
 *
 *  Derived context, like buy style and the cluster, so it is published on the
 *  public page (see shared/filings.js, "What these pages publish"). Renders
 *  nothing without the field.
 */
import type { InsiderHistory, InsiderHistoryPoint } from "@/types/ddbx";

import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { money, filingPath } from "../../../shared/filings.js";

import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { panel } from "@/components/ui/panel";

/** "18 May", UTC: a trade date is a calendar date with no time. */
function shortDate(iso: string) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Depth below the high, as a positive whole percent. */
const depth = (p: InsiderHistoryPoint) =>
  Math.max(0, Math.round(-(p.drawdown_from_high_pct || 0) * 100));

export function InsiderHistoryPanel({
  history,
}: {
  history: InsiderHistory | null | undefined;
}) {
  if (!history || !history.prior?.length) return null;

  const points = [
    ...history.prior.map((p) => ({ p, isThis: false })),
    ...(history.current ? [{ p: history.current, isThis: true }] : []),
  ];

  // The scale's left edge: the deepest buy, rounded up to the next 10%, so
  // the deepest mark never sits on the edge and a shallow set is not
  // stretched into looking dramatic.
  const deepest = Math.max(...points.map(({ p }) => depth(p)));
  const scale = Math.max(10, Math.ceil(deepest / 10) * 10);

  return (
    <div className="mt-10">
      <Eyebrow>Earlier buys</Eyebrow>
      <p className="mt-3 max-w-measure text-body text-foreground/70">
        {history.summary}
      </p>

      <div className={`mt-5 overflow-hidden ${panel()}`}>
        <ul className="divide-y divide-rule">
          {points.map(({ p, isThis }) => (
            <HistoryRow
              key={p.dealing_id}
              isThis={isThis}
              p={p}
              scale={scale}
            />
          ))}
        </ul>

        {/* The axis, in the same three columns as the rows so its two ends
            sit under the track's two ends. */}
        <div className="flex items-center gap-4 border-t border-rule px-5 py-3">
          <span className="w-20 shrink-0" />
          <span className="micro flex min-w-0 flex-1 justify-between text-foreground/45">
            <span>{scale}% below</span>
            <span>90-day high</span>
          </span>
          <span className="w-20 shrink-0 sm:w-24" />
          <span className="w-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}

function HistoryRow({
  p,
  isThis,
  scale,
}: {
  p: InsiderHistoryPoint;
  isThis: boolean;
  scale: number;
}) {
  const d = depth(p);
  // 0% below = right edge. Clamped: `scale` is at least the deepest point.
  const x = 100 - Math.min(100, (d / scale) * 100);

  const body = (
    <>
      <span className="w-20 shrink-0">
        <span className="block text-body font-semibold tabular-nums text-foreground/80">
          {shortDate(p.trade_date)}
        </span>
        <span className="mt-0.5 block text-small tabular-nums text-foreground/55">
          {money(p.value_gbp)}
        </span>
      </span>

      {/* The track: a hairline with the buy's mark on it. The inner inset
          keeps a mark at either end wholly inside the track. */}
      <span aria-hidden className="relative min-w-0 flex-1 px-1.5">
        <span className="relative block h-4">
          <span className="absolute inset-x-0 top-1/2 border-t border-rule" />
          <span
            className={
              isThis
                ? "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-brown ring-2 ring-brand-brown/20 dark:bg-brand-tan dark:ring-brand-tan/25"
                : "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/35"
            }
            style={{ left: `${x}%` }}
          />
        </span>
      </span>

      <span className="w-20 shrink-0 text-right sm:w-24">
        <span className="block text-small tabular-nums text-foreground/70">
          {d === 0 ? "At the high" : `${d}% below`}
        </span>
        {isThis ? (
          <span
            className={`mt-1 ${CHIP_BASE} ${CHIP_SIZE.sm} ${CHIP_HAIRLINE} bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan`}
          >
            This buy
          </span>
        ) : null}
      </span>

      <span className="flex w-4 shrink-0 justify-end">
        {isThis ? null : (
          <ArrowRightIcon
            aria-hidden
            className="h-4 w-4 text-foreground/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground/60"
          />
        )}
      </span>
    </>
  );

  const label = `${shortDate(p.trade_date)}, ${money(p.value_gbp)}, ${
    d === 0 ? "at the 90-day high" : `${d}% below the 90-day high`
  }`;

  return (
    <li
      className={isThis ? "bg-brand-brown/10 dark:bg-brand-tan/15" : undefined}
    >
      {isThis ? (
        <div className="flex items-center gap-4 px-5 py-3.5">{body}</div>
      ) : (
        <Link
          aria-label={label}
          className="group flex items-center gap-4 px-5 py-3.5 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40"
          to={filingPath(p.dealing_id)}
        >
          {body}
        </Link>
      )}
    </li>
  );
}
