/** The hero's proof object: the board's 25 purchases as one picture.
 *
 *  Two arrangements of the same marks. "By amount" packs them as discs whose
 *  area is what was spent — the £53m the board adds up to, drawn to scale and
 *  made of the actual companies. "By outcome" sends the same discs to a
 *  scatter: amount across, performance against the index up, with a stem from
 *  every disc to the zero line so the distance from level is drawn rather
 *  than inferred. The move from one to the other is the hook — "who spent the
 *  most" re-sorts itself into "who was right" — so the page opens on the
 *  first and advances to the second once, unless the reader has already
 *  reached for the toggle or asked for reduced motion.
 *
 *  A dark contained panel (design language, tenet 1): the visual is an object
 *  on the page, not a backdrop, and the message column beside it never sits
 *  on top of it. Colours are fixed for the dark surface rather than read
 *  through the theme, because the panel is dark in both modes.
 */
import type { BoardRow, Linking } from "./board-model";
import type { ReactNode } from "react";

import { useEffect, useMemo, useRef, useState } from "react";

import { moneyPair, moneyDelta } from "../../../shared/leaderboard.js";
import { formatMoney } from "../../../shared/sectors.js";

import {
  dateLabel,
  signedPp,
  summarise,
  useMeasuredWidth,
} from "./board-model";

import { logoUrl } from "@/components/company-logo";

type Mode = "size" | "outcome";

interface Placed {
  row: BoardRow;
  x: number;
  y: number;
  r: number;
}

const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 68;
const PAD_B = 44;

/** Greedy circle packing: each disc goes as close to the centre as it can
 *  without touching a placed one. Deterministic, and 25 discs is nothing. */
function pack(items: Array<{ row: BoardRow; r: number }>): Placed[] {
  const placed: Placed[] = [];
  const sorted = [...items].sort((a, b) => b.r - a.r);

  for (const it of sorted) {
    if (placed.length === 0) {
      placed.push({ ...it, x: 0, y: 0 });
      continue;
    }
    let best: { x: number; y: number; d: number } | null = null;

    for (const p of placed) {
      const dist = p.r + it.r + 3;

      for (let a = 0; a < 360; a += 6) {
        const x = p.x + Math.cos((a * Math.PI) / 180) * dist;
        const y = p.y + Math.sin((a * Math.PI) / 180) * dist;
        const clear = placed.every(
          (q) => Math.hypot(q.x - x, q.y - y) >= q.r + it.r + 2.5,
        );

        if (!clear) continue;
        const d = Math.hypot(x, y);

        if (!best || d < best.d) best = { x, y, d };
      }
    }
    placed.push({ ...it, x: best?.x ?? 0, y: best?.y ?? 0 });
  }

  return placed;
}

function sizeLayout(rows: BoardRow[], W: number, H: number): Placed[] {
  const packed = pack(rows.map((row) => ({ row, r: Math.sqrt(row.value) })));
  const minX = Math.min(...packed.map((p) => p.x - p.r));
  const maxX = Math.max(...packed.map((p) => p.x + p.r));
  const minY = Math.min(...packed.map((p) => p.y - p.r));
  const maxY = Math.max(...packed.map((p) => p.y + p.r));
  const s = Math.min((W - 40) / (maxX - minX), (H - 84) / (maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return packed.map((p) => ({
    row: p.row,
    x: W / 2 + (p.x - cx) * s,
    y: H / 2 + 8 + (p.y - cy) * s,
    r: p.r * s,
  }));
}

interface Scales {
  x: (v: number) => number;
  y: (a: number) => number;
  vmin: number;
  vmax: number;
  amin: number;
  amax: number;
  zeroY: number;
}

function outcomeScales(rows: BoardRow[], W: number, H: number): Scales {
  const values = rows.map((r) => r.value);
  const alphas = rows.map((r) => r.alpha).filter((a): a is number => a != null);
  const vmin = Math.min(...values) * 0.82;
  const vmax = Math.max(...values) * 1.25;
  const lo = Math.min(-0.1, ...alphas);
  const hi = Math.max(0.1, ...alphas);
  const span = hi - lo;
  const amin = lo - span * 0.14;
  const amax = hi + span * 0.14;
  const x = (v: number) =>
    PAD_L +
    ((Math.log(v) - Math.log(vmin)) / (Math.log(vmax) - Math.log(vmin))) *
      (W - PAD_L - PAD_R);
  const y = (a: number) =>
    PAD_T + ((amax - a) / (amax - amin)) * (H - PAD_T - PAD_B);

  return { x, y, vmin, vmax, amin, amax, zeroY: y(0) };
}

function outcomeLayout(
  rows: BoardRow[],
  W: number,
  H: number,
  sc: Scales,
): Placed[] {
  const rmax = Math.max(...rows.map((r) => Math.sqrt(r.value)));
  const marked = rows.filter((r) => r.alpha != null);
  const unmarked = rows.filter((r) => r.alpha == null);
  const pts: Placed[] = marked.map((row) => ({
    row,
    x: sc.x(row.value),
    y: sc.y(row.alpha ?? 0),
    r: (W < 520 ? 7 : 9) + (W < 520 ? 8 : 11) * (Math.sqrt(row.value) / rmax),
  }));

  // Two identical purchases (same company, same day, same size) would draw
  // as one disc. Ease overlapping discs apart by at most a few pixels — the
  // reader must still be able to trust the alpha they sit on.
  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r + 2;

        if (d >= min) continue;
        if (d < 0.01) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (min - d) / 2;

        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
  pts.forEach((p) => {
    const ox = sc.x(p.row.value);
    const oy = sc.y(p.row.alpha ?? 0);

    p.x = Math.max(ox - 12, Math.min(ox + 12, p.x));
    p.y = Math.max(oy - 8, Math.min(oy + 8, p.y));
  });

  // No mark yet: a quiet row along the bottom edge, so a purchase disclosed
  // this week is still on the picture without asserting a result.
  unmarked.forEach((row, i) => {
    pts.push({ row, x: W - PAD_R - 18 - i * 30, y: H - PAD_B + 16, r: 9 });
  });

  return pts;
}

function tickValues(vmin: number, vmax: number): number[] {
  const out: number[] = [];

  for (const base of [1e5, 1e6, 1e7, 1e8]) {
    for (const m of [1, 2, 5]) {
      const v = base * m;

      if (v >= vmin && v <= vmax) out.push(v);
    }
  }

  return out;
}

function alphaTicks(amin: number, amax: number): number[] {
  const span = amax - amin;
  const step = span > 1.2 ? 0.4 : span > 0.6 ? 0.2 : 0.1;
  const out: number[] = [];

  for (let a = Math.ceil(amin / step) * step; a <= amax + 1e-9; a += step) {
    out.push(Math.round(a * 100) / 100);
  }

  return out;
}

function Logo({ row, r }: { row: BoardRow; r: number }) {
  const [failed, setFailed] = useState(false);
  const inner = Math.max(4, r - 2.5);
  const src = logoUrl(row.ticker);

  // SVG <image> has no usable error event in React, so probe the URL with an
  // HTMLImageElement; the browser cache means the <image> then lands warm.
  useEffect(() => {
    let live = true;
    const probe = new Image();

    probe.onerror = () => live && setFailed(true);
    probe.src = src;

    return () => {
      live = false;
    };
  }, [src]);

  if (failed) {
    return (
      <text
        className="fill-white/80 font-semibold"
        dy="0.35em"
        fontSize={Math.max(8, Math.round(r * 0.6))}
        textAnchor="middle"
      >
        {row.ticker.replace(/\.[A-Z]+$/, "").slice(0, 3)}
      </text>
    );
  }

  return (
    <>
      <clipPath id={`bs-${row.id}`}>
        <circle r={inner} />
      </clipPath>
      <circle fill="#f1ebe2" r={inner} />
      <image
        clipPath={`url(#bs-${row.id})`}
        height={inner * 2}
        href={src}
        preserveAspectRatio="xMidYMid slice"
        width={inner * 2}
        x={-inner}
        y={-inner}
      />
    </>
  );
}

function Toggle({
  mode,
  onChoose,
}: {
  mode: Mode;
  onChoose: (m: Mode) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/12 bg-white/[0.06] p-0.5 backdrop-blur-md">
      {(
        [
          ["size", "By amount"],
          ["outcome", "By outcome"],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          aria-pressed={mode === m}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-[-0.005em] transition-colors ${
            mode === m
              ? "bg-white text-[#1a140d]"
              : "text-white/65 hover:text-white"
          }`}
          type="button"
          onClick={() => onChoose(m)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function BoardStage({
  rows,
  symbol,
  benchmark,
  locale,
  linking,
  header,
}: {
  /** Null while the board is loading. */
  rows: BoardRow[] | null;
  /** The page's message layer — eyebrow, h1, standfirst, figures — set
   *  inside the object above the chart. The toggle joins its row. */
  header?: ReactNode;
  symbol: string;
  /** "the FTSE All-Share" / "the S&P 500". */
  benchmark: string;
  locale: string;
  linking: Linking;
}) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [mode, setMode] = useState<Mode>(reduced ? "outcome" : "size");
  const touched = useRef(false);
  const [tip, setTip] = useState<BoardRow | null>(null);

  // Open on the packed picture, then advance to the answer once.
  useEffect(() => {
    if (!rows || reduced) return;
    const t = window.setTimeout(() => {
      if (!touched.current) setMode("outcome");
    }, 2600);

    return () => window.clearTimeout(t);
  }, [rows, reduced]);

  const W = Math.max(300, width);
  const H = Math.round(
    header
      ? Math.min(660, Math.max(440, W * 0.56))
      : Math.min(640, Math.max(460, W * 0.82)),
  );

  const scales = useMemo(
    () => (rows && rows.length ? outcomeScales(rows, W, H) : null),
    [rows, W, H],
  );
  const layout = useMemo(() => {
    if (!rows || !rows.length || !scales) return [];

    return mode === "size"
      ? sizeLayout(rows, W, H)
      : outcomeLayout(rows, W, H, scales);
  }, [rows, W, H, mode, scales]);

  const summary = useMemo(() => (rows ? summarise(rows) : null), [rows]);

  // Which discs get a name in the outcome view: the biggest purchase, then
  // the largest moves either way, one label per company, as many as fit
  // without a label landing on another label or another disc. Narrow stages
  // stop at three so the picture stays a picture.
  const labelled = useMemo(() => {
    const out = new Map<string, "right" | "left" | "above">();

    if (mode !== "outcome" || !rows || !layout.length) return out;
    const byId = new Map(layout.map((p) => [p.row.id, p] as const));
    const seen = new Set<string>();
    const order = [
      rows[0],
      ...[...rows]
        .filter((r) => r.alpha != null)
        .sort((a, b) => Math.abs(b.alpha ?? 0) - Math.abs(a.alpha ?? 0)),
    ].filter((r) => r && r.alpha != null && Math.abs(r.alpha) >= 0.08);
    const cap = W < 520 ? 3 : W < 760 ? 6 : W < 1000 ? 9 : 12;
    const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    const overlaps = (a: { x: number; y: number; w: number; h: number }) =>
      boxes.some(
        (b) =>
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y,
      ) ||
      layout.some(
        (p) =>
          p.x + p.r > a.x &&
          p.x - p.r < a.x + a.w &&
          p.y + p.r > a.y &&
          p.y - p.r < a.y + a.h,
      );

    for (const r of order) {
      if (out.size >= cap) break;
      if (seen.has(r.ticker)) continue;
      const p = byId.get(r.id);

      if (!p) continue;
      const w = Math.max(r.company.length, 12) * 6.6 + 4;
      const h = 28;

      for (const side of ["right", "left", "above"] as const) {
        const x =
          side === "right"
            ? p.x + p.r + 8
            : side === "left"
              ? p.x - p.r - 8 - w
              : p.x - w / 2;
        const y = side === "above" ? p.y - p.r - 34 : p.y - 12;
        const box = { x, y, w, h };

        if (x < PAD_L - 40 || x + w > W + 6) continue;
        if (overlaps(box)) continue;
        boxes.push(box);
        out.set(r.id, side);
        seen.add(r.ticker);
        break;
      }
    }

    return out;
  }, [mode, rows, layout, W]);

  const active = linking.activeId;
  const zeroY = scales?.zeroY ?? 0;

  const choose = (m: Mode) => {
    touched.current = true;
    setMode(m);
  };

  const tipPlaced = tip ? layout.find((p) => p.row.id === tip.id) : null;

  return (
    <div
      ref={ref}
      className={`board-stage relative overflow-hidden border border-white/10 text-white shadow-[0_24px_60px_-30px_rgba(40,25,10,0.55)] ${header ? "rounded-[28px]" : "rounded-[24px]"}`}
    >
      {header ? (
        <div className="grid gap-x-12 gap-y-6 px-6 pt-7 sm:px-8 sm:pt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div className="min-w-0">{header}</div>
          <div className="flex lg:justify-end">
            <Toggle mode={mode} onChoose={choose} />
          </div>
        </div>
      ) : (
        <div className="absolute left-4 top-4 z-10">
          <Toggle mode={mode} onChoose={choose} />
        </div>
      )}

      {rows === null || !scales || !summary ? (
        <div className="animate-pulse" style={{ height: H }} />
      ) : (
        <svg
          aria-label={
            mode === "size"
              ? `${rows.length} purchases drawn to scale, ${formatMoney(summary.total, symbol)} in total`
              : `Each purchase by amount spent and performance against ${benchmark} since disclosure`
          }
          className="block"
          height={H}
          role="img"
          width={W}
        >
          {/* Outcome-only furniture, faded rather than mounted so the
              discs travel over it as it arrives. */}
          <g
            className="transition-opacity duration-700"
            style={{ opacity: mode === "outcome" ? 1 : 0 }}
          >
            <rect
              fill="var(--stage-pos)"
              fillOpacity={0.07}
              height={Math.max(0, zeroY - PAD_T)}
              width={W - PAD_L - PAD_R}
              x={PAD_L}
              y={PAD_T}
            />
            <rect
              fill="var(--stage-neg)"
              fillOpacity={0.08}
              height={Math.max(0, H - PAD_B - zeroY)}
              width={W - PAD_L - PAD_R}
              x={PAD_L}
              y={zeroY}
            />
            {alphaTicks(scales.amin, scales.amax).map((a) => (
              <g key={a}>
                <line
                  stroke="rgba(255,255,255,0.08)"
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={scales.y(a)}
                  y2={scales.y(a)}
                />
                <text
                  className="font-mono"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={10.5}
                  textAnchor="end"
                  x={PAD_L - 10}
                  y={scales.y(a) + 3.5}
                >
                  {a === 0
                    ? "level"
                    : `${a > 0 ? "+" : ""}${Math.round(a * 100)}pp`}
                </text>
              </g>
            ))}
            {tickValues(scales.vmin, scales.vmax).map((v) => (
              <g key={v}>
                <line
                  stroke="rgba(255,255,255,0.08)"
                  x1={scales.x(v)}
                  x2={scales.x(v)}
                  y1={PAD_T}
                  y2={H - PAD_B}
                />
                <text
                  className="font-mono"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={10.5}
                  textAnchor="middle"
                  x={scales.x(v)}
                  y={H - PAD_B + 18}
                >
                  {formatMoney(v, symbol)}
                </text>
              </g>
            ))}
            <line
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.5}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={zeroY}
              y2={zeroY}
            />
            <text
              className="font-mono uppercase"
              fill="var(--stage-pos)"
              fontSize={10}
              letterSpacing="0.12em"
              x={PAD_L}
              y={PAD_T - 10}
            >
              beat the market · {summary.ahead}
            </text>
            <text
              className="font-mono uppercase"
              fill="var(--stage-neg)"
              fontSize={10}
              letterSpacing="0.12em"
              x={PAD_L}
              y={H - PAD_B - 8}
            >
              trailed it · {summary.behind}
            </text>
            <text
              className="font-mono uppercase"
              fill="rgba(255,255,255,0.4)"
              fontSize={10}
              letterSpacing="0.12em"
              textAnchor="end"
              x={W - PAD_R}
              y={PAD_T - 10}
            >
              amount spent →
            </text>
          </g>

          {/* Stems: one per disc, from the disc to the zero line. */}
          <g
            className="transition-opacity duration-500"
            style={{ opacity: mode === "outcome" ? 1 : 0 }}
          >
            {layout
              .filter((p) => p.row.alpha != null)
              .map((p) => (
                <g
                  key={p.row.id}
                  className="board-stage-move"
                  style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
                >
                  <line
                    stroke={
                      p.row.dir === "pos"
                        ? "var(--stage-pos)"
                        : p.row.dir === "neg"
                          ? "var(--stage-neg)"
                          : "rgba(255,255,255,0.35)"
                    }
                    strokeOpacity={active && active !== p.row.id ? 0.25 : 0.7}
                    strokeWidth={2}
                    y2={zeroY - p.y}
                  />
                </g>
              ))}
          </g>

          {/* The discs. Position on the outer group (CSS transform, so it
              transitions), identity and hit target inside. */}
          <g>
            {layout.map((p) => {
              const dim = active != null && active !== p.row.id;
              const edge =
                p.row.dir === "pos"
                  ? "var(--stage-pos)"
                  : p.row.dir === "neg"
                    ? "var(--stage-neg)"
                    : "rgba(255,255,255,0.35)";
              const side = labelled.get(p.row.id) ?? "right";
              const anchor =
                side === "right" ? "start" : side === "left" ? "end" : "middle";
              const lx =
                side === "right" ? p.r + 8 : side === "left" ? -(p.r + 8) : 0;
              const ly = side === "above" ? -(p.r + 22) : 0;

              return (
                <g
                  key={p.row.id}
                  className="board-stage-move"
                  style={{
                    transform: `translate(${p.x}px, ${p.y}px)`,
                    opacity: dim ? 0.3 : 1,
                    transition:
                      "transform 900ms cubic-bezier(.2,.8,.2,1), opacity 180ms",
                  }}
                >
                  <circle
                    className="board-stage-r"
                    fill="var(--stage-bg)"
                    r={p.r + 2.5}
                  />
                  <circle
                    className="board-stage-r"
                    fill="none"
                    r={p.r}
                    stroke={edge}
                    strokeWidth={active === p.row.id ? 3 : 2}
                  />
                  <Logo r={p.r} row={p.row} />
                  {labelled.has(p.row.id) ? (
                    <g
                      className="transition-opacity duration-500"
                      style={{ opacity: mode === "outcome" ? 1 : 0 }}
                    >
                      <text
                        fill="rgba(255,255,255,0.92)"
                        fontSize={12}
                        fontWeight={600}
                        paintOrder="stroke"
                        stroke="var(--stage-bg)"
                        strokeLinejoin="round"
                        strokeWidth={4}
                        textAnchor={anchor}
                        x={lx}
                        y={ly - 1}
                      >
                        {p.row.company}
                      </text>
                      <text
                        fill="rgba(255,255,255,0.6)"
                        fontSize={11}
                        paintOrder="stroke"
                        stroke="var(--stage-bg)"
                        strokeLinejoin="round"
                        strokeWidth={4}
                        textAnchor={anchor}
                        x={lx}
                        y={ly + 13}
                      >
                        {p.row.worthNow != null
                          ? moneyPair(p.row.value, p.row.worthNow, symbol).join(
                              " → ",
                            )
                          : formatMoney(p.row.value, symbol)}
                      </text>
                    </g>
                  ) : null}
                  <circle
                    className="cursor-pointer"
                    fill="transparent"
                    r={p.r + 8}
                    onBlur={() => {
                      linking.setActiveId(null);
                      setTip(null);
                    }}
                    onFocus={() => {
                      linking.setActiveId(p.row.id);
                      setTip(p.row);
                    }}
                    onMouseEnter={() => {
                      linking.setActiveId(p.row.id);
                      setTip(p.row);
                    }}
                    onMouseLeave={() => {
                      linking.setActiveId(null);
                      setTip(null);
                    }}
                  >
                    <title>{`${p.row.company}, ${formatMoney(p.row.value, symbol)}, ${signedPp(p.row.alpha)} vs ${benchmark}`}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Caption: the finding, in words, inside the object. */}
      {summary && rows ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-white/10 px-5 py-3.5 text-[12.5px] leading-[1.5] text-white/65">
          {mode === "size" ? (
            <p>
              <span className="font-semibold text-white">
                {formatMoney(summary.total, symbol)} across {rows.length}{" "}
                purchases
              </span>
              , drawn to scale.{" "}
              <button
                className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                type="button"
                onClick={() => choose("outcome")}
              >
                See who was right →
              </button>
            </p>
          ) : (
            <p>
              <span className="font-semibold text-white">
                {summary.ahead} of {rows.length} are ahead of {benchmark}
              </span>{" "}
              since they were disclosed.
              {summary.best && summary.worst ? (
                <>
                  {" "}
                  {summary.best.company} is the standout at{" "}
                  {signedPp(summary.best.alpha)}; {summary.worst.company} is the
                  one that hurt, at {signedPp(summary.worst.alpha)}.
                </>
              ) : null}
            </p>
          )}
        </div>
      ) : null}

      {/* Tooltip, HTML over the SVG, never under the pointer. */}
      {tip && tipPlaced ? (
        <div
          className="pointer-events-none absolute z-20 min-w-[190px] rounded-xl border border-white/12 bg-[#241b12]/95 px-3 py-2 text-[12px] leading-[1.45] text-white shadow-xl backdrop-blur-md"
          style={{
            left: Math.min(
              W - 210,
              Math.max(8, tipPlaced.x + tipPlaced.r + 12),
            ),
            top: Math.max(8, tipPlaced.y - 30),
          }}
        >
          <div className="font-semibold">
            {tip.company}{" "}
            <span className="font-mono text-[10px] font-normal text-white/50">
              {tip.ticker.replace(/\.[A-Z]+$/, "")}
            </span>
          </div>
          <div className="text-[11px] text-white/55">
            {tip.person ?? "Undisclosed"}
            {tip.role ? ` · ${tip.role}` : ""} ·{" "}
            {dateLabel(tip.tradeDate, locale)}
          </div>
          <div className="mt-1 tabular-nums">
            {tip.worthNow != null ? (
              <>
                {moneyPair(tip.value, tip.worthNow, symbol).join(" → ")}{" "}
                <span
                  style={{
                    color:
                      tip.dir === "pos"
                        ? "var(--stage-pos)"
                        : tip.dir === "neg"
                          ? "var(--stage-neg)"
                          : "rgba(255,255,255,0.6)",
                  }}
                >
                  {moneyDelta(tip.value, tip.worthNow, symbol)} ·{" "}
                  {signedPp(tip.alpha)} vs index
                </span>
              </>
            ) : (
              <>{formatMoney(tip.value, symbol)} · no mark yet</>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
