import { useId, useState } from "react";

import { Terminal } from "./terminal";

/** "One issuer, four insiders, ninety days" — the page's one picture.
 *
 *  Everything else on `/api` argues in fields and prose, which is the right
 *  register for a reference but a poor one for the actual pitch: the reason to
 *  buy this feed is that insider buying CLUSTERS, and a cluster is a shape, not
 *  a sentence. So this draws the shape once: a price series falling, four
 *  disclosures landing into the fall, cumulative spend stepping up underneath,
 *  and the recovery after.
 *
 *  ⚠ The series is SYNTHETIC and must stay labelled as such, in the panel
 *  chrome and in the caption. Every other number on this page is a real API
 *  response; this one cannot be, because no single real issuer illustrates the
 *  pattern this cleanly, and quietly implying one did would poison the rows
 *  that ARE real. The `Illustrative` chip is load-bearing, not decoration.
 *
 *  Also deliberately absent: any claim that we ship the price series. We don't
 *  sell price bars (they are Yahoo-sourced and not licensed for
 *  redistribution — see investigations/2026-07-26-api-product-surface.md §1).
 *  The pitch is that the rows carry the disclosures, the sizes and the cluster,
 *  which you plot against a price series you already have.
 *
 *  Hand-drawn SVG rather than lightweight-charts (which the app uses for real
 *  price charts). This needs two stacked panes, drop-lines tying a marker in
 *  one to a step in the other, and full control of the brand palette; the chart
 *  library gives none of those cheaply and costs ~45kB to say so.
 */

/** Closing price, 60 sessions. Falls into a drawdown, chops along the floor
 *  while the insiders buy, then recovers past where it started. */
const PRICES = [
  118, 119, 117, 120, 118, 116, 117, 114, 115, 112, 113, 110, 111, 108, 109,
  104, 99, 101, 95, 92, 94, 89, 86, 88, 85, 83, 84, 81, 79, 82, 80, 78, 81, 83,
  82, 85, 84, 87, 86, 89, 88, 91, 90, 93, 95, 94, 98, 101, 100, 104, 103, 107,
  110, 109, 113, 116, 115, 120, 124, 128,
];

interface Buy {
  /** Index into PRICES. */
  i: number;
  date: string;
  who: string;
  /** Thousands of pounds. */
  value: number;
  cluster?: string;
}

const BUYS: Buy[] = [
  { i: 22, date: "12 Mar", who: "Chief Executive", value: 240 },
  { i: 29, date: "21 Mar", who: "Chief Financial Officer", value: 180 },
  {
    i: 37,
    date: "02 Apr",
    who: "Chair and two non-executives",
    value: 420,
    cluster: "3 insiders, 14 days",
  },
  { i: 50, date: "24 Apr", who: "Chief Executive", value: 150 },
];

const W = 800;
const PRICE_TOP = 16;
const PRICE_BOTTOM = 196;
const SPEND_TOP = 240;
const SPEND_BOTTOM = 316;
const X0 = 46;
const X1 = 788;
const P_MIN = 72;
const P_MAX = 134;

const x = (i: number) => X0 + (i * (X1 - X0)) / (PRICES.length - 1);
const y = (p: number) =>
  PRICE_BOTTOM - ((p - P_MIN) / (P_MAX - P_MIN)) * (PRICE_BOTTOM - PRICE_TOP);

const TOTAL = BUYS.reduce((a, b) => a + b.value, 0);
const spendY = (cum: number) =>
  SPEND_BOTTOM - (cum / TOTAL) * (SPEND_BOTTOM - SPEND_TOP);

/** Running total at each buy, so the step chart and the readout can never
 *  disagree about how much had been spent by a given marker. */
const CUMULATIVE = BUYS.reduce<number[]>(
  (acc, b) => [...acc, (acc[acc.length - 1] ?? 0) + b.value],
  [],
);

const LINE = PRICES.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p)}`).join(
  " ",
);
const AREA = `${LINE} L${X1} ${PRICE_BOTTOM} L${X0} ${PRICE_BOTTOM} Z`;

/** Stepped cumulative-spend outline: flat until a disclosure lands, then up. */
const STEPS = (() => {
  let d = `M${X0} ${SPEND_BOTTOM}`;

  BUYS.forEach((b, k) => {
    d += ` L${x(b.i)} ${spendY(CUMULATIVE[k] - b.value)} L${x(b.i)} ${spendY(CUMULATIVE[k])}`;
  });

  return `${d} L${X1} ${spendY(TOTAL)}`;
})();

const LAST = PRICES[PRICES.length - 1];

const money = (k: number) =>
  k >= 1000 ? `£${(k / 1000).toFixed(2)}m` : `£${k}k`;

export function AccumulationChart() {
  const [sel, setSel] = useState(2);
  const gid = useId();
  const active = BUYS[sel];
  const paid = PRICES[active.i];
  const since = ((LAST - paid) / paid) * 100;

  return (
    <Terminal
      meta={money(TOTAL)}
      title={
        // Chip FIRST. The title truncates, and on a phone it truncates hard;
        // "Illustrative" is the one word in this panel that cannot be allowed
        // to fall off the end, so it goes where clipping starts last.
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] tracking-[0.12em] text-white/50">
            Illustrative
          </span>
          One issuer · 90 days
        </span>
      }
      variant="bare"
    >
      {/* Scrolls horizontally below ~800px rather than scaling down with the
          viewport. A uniformly scaled SVG takes its 10px axis labels down with
          it, and at phone width they land near 5px, which is not a chart any
          more. Pinning the minimum to the viewBox width keeps every mark at
          its designed size and costs a swipe. */}
      <div className="relative">
        {/* Right-edge fade, phones only. Without it the chart looks like it
            simply stops mid-recovery; the soft edge is the standard "there is
            more this way" cue and costs nothing on desktop, where the SVG
            already fits and the fade is hidden. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[oklch(15%_0.018_55)] to-transparent sm:hidden"
        />
        <div className="overflow-x-auto">
          <svg
            aria-label="Illustrative price series with four insider purchases and their cumulative value"
            className="block w-full min-w-[800px]"
            role="img"
            viewBox={`0 0 ${W} 340`}
          >
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#eec584" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#eec584" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Price gridlines. Labelled left so the drawdown has a magnitude. */}
            {[80, 100, 120].map((p) => (
              <g key={p}>
                <line
                  stroke="rgba(255,255,255,0.07)"
                  x1={X0}
                  x2={X1}
                  y1={y(p)}
                  y2={y(p)}
                />
                <text
                  fill="rgba(255,255,255,0.3)"
                  fontFamily="ui-monospace, monospace"
                  fontSize="10"
                  x={8}
                  y={y(p) + 3.5}
                >
                  {p}p
                </text>
              </g>
            ))}

            <path d={AREA} fill={`url(#${gid}-fill)`} />
            <path
              d={LINE}
              fill="none"
              stroke="#eec584"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />

            {/* Drop-lines. The single most important mark on the chart: they are
            what ties "an insider bought here" to "the money on the books went
            up by this much", which is the entire argument for the feed. */}
            {BUYS.map((b, k) => (
              <line
                key={`drop-${b.i}`}
                stroke={
                  k === sel ? "rgba(238,197,132,0.5)" : "rgba(255,255,255,0.1)"
                }
                strokeDasharray="2 4"
                x1={x(b.i)}
                x2={x(b.i)}
                y1={y(PRICES[b.i])}
                y2={SPEND_BOTTOM}
              />
            ))}

            {/* Cumulative spend, stepped. */}
            <path
              d={`${STEPS} L${X1} ${SPEND_BOTTOM} L${X0} ${SPEND_BOTTOM} Z`}
              fill="rgba(173,148,121,0.16)"
            />
            <path d={STEPS} fill="none" stroke="#ad9479" strokeWidth="1.5" />
            <line
              stroke="rgba(255,255,255,0.12)"
              x1={X0}
              x2={X1}
              y1={SPEND_BOTTOM}
              y2={SPEND_BOTTOM}
            />
            <text
              fill="rgba(255,255,255,0.3)"
              fontFamily="ui-monospace, monospace"
              fontSize="10"
              x={X0}
              y={SPEND_TOP - 8}
            >
              CUMULATIVE INSIDER SPEND
            </text>

            {/* Markers last so they sit above every line. Radius carries the size
            of the buy, which is why the cluster reads as the loud one. */}
            {BUYS.map((b, k) => {
              const on = k === sel;
              const r = 4 + (b.value / TOTAL) * 9;

              return (
                <g
                  key={b.i}
                  className="cursor-pointer"
                  onMouseEnter={() => setSel(k)}
                >
                  {/* Generous invisible hit area — the drawn dot is too small to
                  chase with a pointer, and touch needs ~24px either way. */}
                  <circle
                    cx={x(b.i)}
                    cy={y(PRICES[b.i])}
                    fill="transparent"
                    r={18}
                  />
                  {on ? (
                    <circle
                      cx={x(b.i)}
                      cy={y(PRICES[b.i])}
                      fill="none"
                      r={r + 5}
                      stroke="rgba(238,197,132,0.35)"
                    />
                  ) : null}
                  <circle
                    cx={x(b.i)}
                    cy={y(PRICES[b.i])}
                    fill={on ? "#eec584" : "rgba(238,197,132,0.35)"}
                    r={r}
                    stroke="oklch(15% 0.018 55)"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Readout. Doubles as the keyboard and touch control for the markers:
          the SVG circles are hover-only, so without these the chart would be
          unreachable without a mouse. */}
      <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
        {BUYS.map((b, k) => {
          const on = k === sel;

          return (
            <button
              key={b.i}
              aria-pressed={on}
              className={`border-white/10 px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#eec584]/50 ${
                // Two columns on mobile, so the first pair needs a rule under
                // it as well as beside it; four across from sm up, where only
                // the vertical rules apply.
                k % 2 === 0 ? "border-r" : ""
              } ${k < 2 ? "border-b sm:border-b-0" : ""} sm:border-r sm:last:border-r-0 ${
                on ? "bg-[#eec584]/[0.09]" : "hover:bg-white/[0.04]"
              }`}
              type="button"
              onClick={() => setSel(k)}
              onFocus={() => setSel(k)}
            >
              <span
                className={`block text-[10.5px] uppercase tracking-[0.12em] ${on ? "text-[#eec584]" : "text-white/35"}`}
              >
                {b.date}
              </span>
              <span
                className={`mt-0.5 block text-[13px] font-semibold tabular-nums ${on ? "text-white" : "text-white/55"}`}
              >
                {money(b.value)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 border-t border-white/10 px-4 py-3 text-[12.5px]">
        <span className="text-white/70">{active.who}</span>
        <span className="text-white/40">
          paid {paid}p, {money(CUMULATIVE[sel])} on the books by this point
        </span>
        {active.cluster ? (
          <span className="rounded-full bg-[#eec584]/15 px-2 py-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[#eec584]">
            Cluster · {active.cluster}
          </span>
        ) : null}
        <span className="ml-auto tabular-nums text-[#5cd84a]">
          +{since.toFixed(1)}% since disclosure
        </span>
      </div>
    </Terminal>
  );
}
