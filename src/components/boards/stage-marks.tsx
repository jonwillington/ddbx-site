/** The material a board stage is drawn from: the marks, the furniture and the
 *  arithmetic that places them.
 *
 *  Extracted from the /biggest-buys stage (2026-09-05) with one rule about
 *  what came out. A helper is here if a second board would otherwise write it
 *  again; the packing and the signed scatter that only /biggest-buys performs
 *  stayed in that page's own stage file. So `packCircles` is here because
 *  three boards pack something, and `sizeLayout` is not, because one board
 *  packs money.
 *
 *  Nothing here fetches, reads a Dealing, or decides what a colour means. The
 *  one colour rule it does carry is `stageTone`, and it is a translation of a
 *  direction a page has already decided.
 */
import type { ReactNode } from "react";
import type { Direction } from "./board-model";
import type { TipAnchor } from "./stage-panel";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useStage } from "./stage-panel";

import { logoUrl } from "@/components/company-logo";

export type Side = "right" | "left" | "above";

export type HitShape =
  | { shape: "circle"; r: number }
  | { shape: "rect"; x: number; y: number; w: number; h: number };

/** The dark panel's two semantic colours, plus the neutral for a mark with no
 *  result to state. Fixed values rather than theme tokens because the panel is
 *  dark in both themes; direction is never carried by colour alone on a
 *  stage, so every caller pairs this with a shape or a label. */
export function stageTone(dir: Direction): string {
  if (dir === "pos") return "var(--stage-pos)";
  if (dir === "neg") return "var(--stage-neg)";

  return "rgba(255,255,255,0.35)";
}

/** 1, 2 and 5 in every decade the domain touches, filtered to it.
 *
 *  `decades` pins the range instead of deriving it, for a scale whose domain
 *  moves with the data but whose ticks should not — /biggest-buys prices its
 *  x axis from £100k to £100m however small this month's smallest purchase
 *  happens to be. */
export function moneyTicks(
  vmin: number,
  vmax: number,
  opts: { decades?: [number, number] } = {},
): number[] {
  const from = opts.decades
    ? Math.round(Math.log10(opts.decades[0]))
    : Math.floor(Math.log10(vmin));
  const to = opts.decades
    ? Math.round(Math.log10(opts.decades[1]))
    : Math.ceil(Math.log10(vmax));
  const out: number[] = [];

  if (!isFinite(from) || !isFinite(to)) return out;

  for (let e = from; e <= to; e++) {
    const base = Math.pow(10, e);

    for (const m of [1, 2, 5]) {
      const v = base * m;

      if (v >= vmin && v <= vmax) out.push(v);
    }
  }

  return out;
}

/** Signed ratio ticks, at whatever step keeps the axis to a handful of rules. */
export function alphaTicks(amin: number, amax: number): number[] {
  const span = amax - amin;
  const step = span > 1.2 ? 0.4 : span > 0.6 ? 0.2 : 0.1;
  const out: number[] = [];

  for (let a = Math.ceil(amin / step) * step; a <= amax + 1e-9; a += step) {
    out.push(Math.round(a * 100) / 100);
  }

  return out;
}

/** The figure in full: "£50,000", not "£50k".
 *
 *  For the places where the rounded form is wrong rather than merely coarse —
 *  a published floor a reader is meant to check, and any amount under £1,000,
 *  which `formatMoney` renders as "£0k". */
export function exactMoney(v: number, symbol: string, locale: string): string {
  return `${symbol}${Math.round(v).toLocaleString(locale, {
    maximumFractionDigits: 0,
  })}`;
}

/** Greedy circle packing: each disc goes as close to the centre as it can
 *  without touching a placed one. Deterministic, and a board is 25 discs. */
export function packCircles<T>(
  items: Array<T & { r: number }>,
): Array<T & { r: number; x: number; y: number }> {
  const placed: Array<T & { r: number; x: number; y: number }> = [];
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

/** Scale a packed set to the plot and centre it there. The defaults are the
 *  /biggest-buys geometry: a 20px margin either side, room for the caption
 *  under it, and eight pixels low so the picture sits under the header rather
 *  than in the middle of the panel. */
export function fitPacked<T extends { x: number; y: number; r: number }>(
  packed: T[],
  W: number,
  H: number,
  opts: { insetX?: number; insetY?: number; dy?: number } = {},
): T[] {
  const { insetX = 40, insetY = 84, dy = 8 } = opts;

  if (packed.length === 0) return [];
  const minX = Math.min(...packed.map((p) => p.x - p.r));
  const maxX = Math.max(...packed.map((p) => p.x + p.r));
  const minY = Math.min(...packed.map((p) => p.y - p.r));
  const maxY = Math.max(...packed.map((p) => p.y + p.r));
  const s = Math.min(
    (W - insetX) / (maxX - minX),
    (H - insetY) / (maxY - minY),
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return packed.map((p) => ({
    ...p,
    x: W / 2 + (p.x - cx) * s,
    y: H / 2 + dy + (p.y - cy) * s,
    r: p.r * s,
  }));
}

/** A click that navigates without reloading the app. Only mounted when a mark
 *  is given an href, so a stage never needs a router unless one of its marks
 *  is a link. */
function MarkLink({ href, children }: { href: string; children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

/** One interactive mark: a disc, a lane, a row, a column, a constellation.
 *
 *  Position lives on the outer group as a CSS transform so a mark travels
 *  between arrangements rather than being unmounted and drawn again somewhere
 *  else — the move from one mode to the other is the argument these stages
 *  make, and a cut is not a move. Identity, the label and the hit target sit
 *  inside it.
 *
 *  The hit target is transparent, larger than the mark, and wired to focus as
 *  well as hover: a keyboard reader gets the same tooltip and the same
 *  highlight in the rows below. */
export function StageMark({
  id,
  x,
  y,
  hit,
  ariaLabel,
  href,
  anchor,
  move = true,
  dimmed,
  className,
  children,
}: {
  id: string;
  x: number;
  y: number;
  hit: HitShape;
  ariaLabel: string;
  href?: string;
  /** Stage coordinates. Defaults to the mark's own centre for a circle and to
   *  its right edge for a rect. */
  anchor?: TipAnchor;
  /** False for a mark that must not animate into place. */
  move?: boolean;
  /** Override the dim rule, for a page whose marks dim on an id space of
   *  their own (a sector, a role) rather than on the active mark. */
  dimmed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { active, setActive, showTip, hideTip, reduced } = useStage();
  const dim = dimmed ?? (active != null && active !== id);
  // Under reduced motion a mark is placed, never travelled: the panel already
  // opens on the last arrangement, and a toggle must not start the journey.
  const travel = move && !reduced;
  const tip: TipAnchor =
    anchor ??
    (hit.shape === "circle"
      ? { x, y, r: hit.r }
      : { x: x + hit.x + hit.w, y: y + hit.y + hit.h / 2, r: 0 });
  const enter = () => {
    setActive(id);
    showTip(id, tip);
  };
  const leave = () => {
    setActive(null);
    hideTip();
  };
  const cls = [travel ? "board-stage-move" : null, className]
    .filter(Boolean)
    .join(" ");

  const target =
    hit.shape === "circle" ? (
      <circle
        aria-label={ariaLabel}
        className="cursor-pointer"
        fill="transparent"
        r={hit.r}
        role="img"
        onBlur={leave}
        onFocus={enter}
        onMouseEnter={enter}
        onMouseLeave={leave}
      />
    ) : (
      <rect
        aria-label={ariaLabel}
        className="cursor-pointer"
        fill="transparent"
        height={hit.h}
        role="img"
        width={hit.w}
        x={hit.x}
        y={hit.y}
        onBlur={leave}
        onFocus={enter}
        onMouseEnter={enter}
        onMouseLeave={leave}
      />
    );

  return (
    <g
      className={cls}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        opacity: dim ? 0.3 : 1,
        transition: travel
          ? "transform 900ms cubic-bezier(.2,.8,.2,1), opacity 180ms"
          : "opacity 180ms",
      }}
    >
      {children}
      {href ? <MarkLink href={href}>{target}</MarkLink> : target}
    </g>
  );
}

/** A company's logo as the mark itself: a backing ring that punches the
 *  drawing out from behind it, an edge ring carrying the direction, and the
 *  logo clipped into the middle.
 *
 *  The radius is whatever the caller passes — nothing here assumes it was
 *  derived from an amount, because on four of the boards it wasn't.
 *
 *  `clipId` must be unique per mark: two marks sharing a clip path share a
 *  radius, and the second one drawn wins. */
export function LogoDisc({
  ticker,
  r,
  edge,
  clipId,
  active = false,
  ringClassName = "board-stage-r",
}: {
  ticker: string;
  r: number;
  edge: string;
  clipId: string;
  active?: boolean;
  ringClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const inner = Math.max(4, r - 2.5);
  const src = logoUrl(ticker);

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

  return (
    <>
      <circle className={ringClassName} fill="var(--stage-bg)" r={r + 2.5} />
      <circle
        className={ringClassName}
        fill="none"
        r={r}
        stroke={edge}
        strokeWidth={active ? 3 : 2}
      />
      {failed ? (
        <text
          className="fill-white/80 font-semibold"
          dy="0.35em"
          fontSize={Math.max(8, Math.round(r * 0.6))}
          textAnchor="middle"
        >
          {ticker.replace(/\.[A-Z]+$/, "").slice(0, 3)}
        </text>
      ) : (
        <>
          <clipPath id={clipId}>
            <circle r={inner} />
          </clipPath>
          <circle fill="#f1ebe2" r={inner} />
          <image
            clipPath={`url(#${clipId})`}
            height={inner * 2}
            href={src}
            preserveAspectRatio="xMidYMid slice"
            width={inner * 2}
            x={-inner}
            y={-inner}
          />
        </>
      )}
    </>
  );
}

/** A name beside a mark, with a figure under it.
 *
 *  Both lines are painted stroke-first in the panel's own background, so a
 *  label crossing a rule or another mark stays readable without a box behind
 *  it — the design language forbids the scrim that would otherwise do this. */
export function StageLabel({
  text,
  sub,
  side,
  r,
  visible = true,
}: {
  text: string;
  sub?: string;
  side: Side;
  r: number;
  visible?: boolean;
}) {
  const anchor =
    side === "right" ? "start" : side === "left" ? "end" : "middle";
  const lx = side === "right" ? r + 8 : side === "left" ? -(r + 8) : 0;
  const ly = side === "above" ? -(r + 22) : 0;

  return (
    <g
      className="transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
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
        {text}
      </text>
      {sub == null ? null : (
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
          {sub}
        </text>
      )}
    </g>
  );
}

/** Which marks get a name, and on which side.
 *
 *  Candidates are tried in the order they are given, which is the page's
 *  priority order, and each takes the first side where its box lands on
 *  neither another label nor a mark. A label that cannot be placed is not
 *  placed: a picture with three names on it reads, and the same picture with
 *  fourteen overlapping ones does not. `key` dedupes, so a company appearing
 *  twice is named once. */
export function placeLabels<
  T extends { id: string; x: number; y: number; r: number; key?: string },
>(
  cands: T[],
  opts: {
    obstacles: Array<{ x: number; y: number; r: number }>;
    xMin: number;
    xMax: number;
    cap: number;
    width: (c: T) => number;
    height?: number;
    sides?: Side[];
  },
): Map<string, Side> {
  const {
    obstacles,
    xMin,
    xMax,
    cap,
    width,
    height = 28,
    sides = ["right", "left", "above"],
  } = opts;
  const out = new Map<string, Side>();
  const seen = new Set<string>();
  const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
  const overlaps = (a: { x: number; y: number; w: number; h: number }) =>
    boxes.some(
      (b) =>
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y,
    ) ||
    obstacles.some(
      (p) =>
        p.x + p.r > a.x &&
        p.x - p.r < a.x + a.w &&
        p.y + p.r > a.y &&
        p.y - p.r < a.y + a.h,
    );

  for (const c of cands) {
    if (out.size >= cap) break;
    const key = c.key ?? c.id;

    if (seen.has(key)) continue;
    const w = width(c);
    const h = height;

    for (const side of sides) {
      const x =
        side === "right"
          ? c.x + c.r + 8
          : side === "left"
            ? c.x - c.r - 8 - w
            : c.x - w / 2;
      const y = side === "above" ? c.y - c.r - 34 : c.y - 12;
      const box = { x, y, w, h };

      if (x < xMin || x + w > xMax) continue;
      if (overlaps(box)) continue;
      boxes.push(box);
      out.set(c.id, side);
      seen.add(key);
      break;
    }
  }

  return out;
}

/** The furniture for a scale with a level line in it: two tinted bands, the
 *  rules and their labels, the level line itself, and whatever the other axis
 *  needs.
 *
 *  It derives no counts. `posLabel` and `negLabel` are the page's own words,
 *  because the number of marks above the line is a fact about the page's data
 *  and this component has never seen it. */
export function SignedAxis({
  orientation = "horizontal",
  scale,
  ticks,
  tickLabel = (v: number) =>
    v === 0 ? "level" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}pp`,
  plot,
  bands,
  posLabel,
  negLabel,
  crossTicks,
  crossLabel,
  labelGutter,
}: {
  orientation?: "horizontal" | "vertical";
  /** Signed value to a pixel on the signed axis. */
  scale: (v: number) => number;
  ticks: number[];
  tickLabel?: (v: number) => string;
  plot: { x0: number; x1: number; y0: number; y1: number };
  /** A narrower extent for the tinted bands only, for a stage that confines
   *  them to one rail of the plot. Defaults to the whole plot. */
  bands?: { from: number; to: number };
  /** A node rather than a string only so a page can keep its count in its own
   *  text run; the component still never computes one. */
  posLabel?: ReactNode;
  negLabel?: ReactNode;
  crossTicks?: Array<{ at: number; label: string }>;
  crossLabel?: string;
  /** Where the tick labels sit on the other axis. Defaults to ten pixels
   *  outside the plot. */
  labelGutter?: number;
}) {
  const level = scale(0);
  const horizontal = orientation === "horizontal";
  const from = bands ? bands.from : horizontal ? plot.x0 : plot.y0;
  const to = bands ? bands.to : horizontal ? plot.x1 : plot.y1;
  const gutter = labelGutter ?? (horizontal ? plot.x0 - 10 : plot.y1 + 18);

  return (
    <>
      <rect
        fill="var(--stage-pos)"
        fillOpacity={0.07}
        height={horizontal ? Math.max(0, level - plot.y0) : to - from}
        width={horizontal ? to - from : Math.max(0, plot.x1 - level)}
        x={horizontal ? from : level}
        y={horizontal ? plot.y0 : from}
      />
      <rect
        fill="var(--stage-neg)"
        fillOpacity={0.08}
        height={horizontal ? Math.max(0, plot.y1 - level) : to - from}
        width={horizontal ? to - from : Math.max(0, level - plot.x0)}
        x={horizontal ? from : plot.x0}
        y={horizontal ? level : from}
      />
      {ticks.map((t) => (
        <g key={t}>
          <line
            stroke="rgba(255,255,255,0.08)"
            x1={horizontal ? plot.x0 : scale(t)}
            x2={horizontal ? plot.x1 : scale(t)}
            y1={horizontal ? scale(t) : plot.y0}
            y2={horizontal ? scale(t) : plot.y1}
          />
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.5)"
            fontSize={10.5}
            textAnchor={horizontal ? "end" : "middle"}
            x={horizontal ? gutter : scale(t)}
            y={horizontal ? scale(t) + 3.5 : gutter}
          >
            {tickLabel(t)}
          </text>
        </g>
      ))}
      {(crossTicks ?? []).map((c) => (
        <g key={c.at}>
          <line
            stroke="rgba(255,255,255,0.08)"
            x1={horizontal ? c.at : plot.x0}
            x2={horizontal ? c.at : plot.x1}
            y1={horizontal ? plot.y0 : c.at}
            y2={horizontal ? plot.y1 : c.at}
          />
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.5)"
            fontSize={10.5}
            textAnchor={horizontal ? "middle" : "end"}
            x={horizontal ? c.at : plot.x0 - 10}
            y={horizontal ? plot.y1 + 18 : c.at + 3.5}
          >
            {c.label}
          </text>
        </g>
      ))}
      <line
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        x1={horizontal ? plot.x0 : level}
        x2={horizontal ? plot.x1 : level}
        y1={horizontal ? level : plot.y0}
        y2={horizontal ? level : plot.y1}
      />
      {posLabel ? (
        <text
          className="font-mono uppercase"
          fill="var(--stage-pos)"
          fontSize={10}
          letterSpacing="0.12em"
          textAnchor={horizontal ? undefined : "middle"}
          x={horizontal ? plot.x0 : (level + plot.x1) / 2}
          y={plot.y0 - 10}
        >
          {posLabel}
        </text>
      ) : null}
      {negLabel ? (
        <text
          className="font-mono uppercase"
          fill="var(--stage-neg)"
          fontSize={10}
          letterSpacing="0.12em"
          textAnchor={horizontal ? undefined : "middle"}
          x={horizontal ? plot.x0 : (plot.x0 + level) / 2}
          y={horizontal ? plot.y1 - 8 : plot.y0 - 10}
        >
          {negLabel}
        </text>
      ) : null}
      {crossLabel ? (
        <text
          className="font-mono uppercase"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          letterSpacing="0.12em"
          textAnchor="end"
          x={plot.x1}
          y={plot.y0 - 10}
        >
          {crossLabel}
        </text>
      ) : null}
    </>
  );
}

/** The same furniture without a level in it: rules and labels, no bands, no
 *  colour. A count, a date and a market capitalisation have no positive and
 *  negative side, and drawing one as though it did is a claim. */
export function StageAxis({
  plot,
  x = [],
  y = [],
  xLabel,
  yLabel,
  xLabelsAt = "bottom",
  emphasise = [],
}: {
  plot: { x0: number; x1: number; y0: number; y1: number };
  x?: Array<{ at: number; label: string; sub?: string }>;
  y?: Array<{ at: number; label: string }>;
  xLabel?: string;
  yLabel?: string;
  xLabelsAt?: "bottom" | "top";
  /** Positions drawn at twice the weight — a threshold the page's words refer
   *  to, rather than one more rule. */
  emphasise?: number[];
}) {
  const strong = new Set(emphasise);

  return (
    <>
      {y.map((t) => (
        <g key={t.at}>
          <line
            stroke={
              strong.has(t.at)
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.08)"
            }
            x1={plot.x0}
            x2={plot.x1}
            y1={t.at}
            y2={t.at}
          />
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.5)"
            fontSize={10.5}
            textAnchor="end"
            x={plot.x0 - 10}
            y={t.at + 3.5}
          >
            {t.label}
          </text>
        </g>
      ))}
      {x.map((t) => (
        <g key={t.at}>
          <line
            stroke={
              strong.has(t.at)
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.08)"
            }
            x1={t.at}
            x2={t.at}
            y1={plot.y0}
            y2={plot.y1}
          />
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.5)"
            fontSize={10.5}
            textAnchor="middle"
            x={t.at}
            y={xLabelsAt === "top" ? plot.y0 - 10 : plot.y1 + 18}
          >
            {t.label}
          </text>
          {t.sub ? (
            <text
              className="font-mono"
              fill="rgba(255,255,255,0.35)"
              fontSize={10}
              textAnchor="middle"
              x={t.at}
              y={xLabelsAt === "top" ? plot.y0 - 23 : plot.y1 + 31}
            >
              {t.sub}
            </text>
          ) : null}
        </g>
      ))}
      {xLabel ? (
        <text
          className="font-mono uppercase"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          letterSpacing="0.12em"
          textAnchor="end"
          x={plot.x1}
          y={plot.y0 - 10}
        >
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          className="font-mono uppercase"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          letterSpacing="0.12em"
          x={plot.x0}
          y={plot.y0 - 10}
        >
          {yLabel}
        </text>
      ) : null}
    </>
  );
}

/** A threshold, drawn: a full-height rule with its own caption above the
 *  plot. For a boundary the page states in words and the reader should be
 *  able to see — a floor, a band edge, the point the board starts at. */
export function RuleWithLabel({
  x,
  y0,
  y1,
  label,
  sublabel,
  dashed = false,
  opacity = 1,
  anchor = "start",
}: {
  x: number;
  y0: number;
  y1: number;
  label: string;
  sublabel?: string;
  dashed?: boolean;
  opacity?: number;
  anchor?: "start" | "end";
}) {
  return (
    <g opacity={opacity}>
      <line
        stroke="rgba(255,255,255,0.28)"
        strokeDasharray={dashed ? "3 4" : undefined}
        x1={x}
        x2={x}
        y1={y0}
        y2={y1}
      />
      <text
        className="font-mono uppercase"
        fill="rgba(255,255,255,0.45)"
        fontSize={10}
        letterSpacing="0.12em"
        textAnchor={anchor}
        x={anchor === "end" ? x - 6 : x + 6}
        y={y0 - 10}
      >
        {label}
      </text>
      {sublabel ? (
        <text
          className="font-mono"
          fill="rgba(255,255,255,0.35)"
          fontSize={10}
          textAnchor={anchor}
          x={anchor === "end" ? x - 6 : x + 6}
          y={y0 - 24}
        >
          {sublabel}
        </text>
      ) : null}
    </g>
  );
}

/** The population a board's marks are drawn from: hundreds of plain circles,
 *  one fill, no listeners and no labels.
 *
 *  It is the answer to "and the ones you didn't list?", which a board of 25
 *  cannot otherwise give. Deliberately not interactive — a thousand hit
 *  targets would make the marks that matter harder to reach, and there is
 *  nothing to say about any single dot in it. */
export function DotField({
  dots,
  r = 2.6,
  fill = "rgba(255,255,255,0.32)",
  opacity,
  move = true,
}: {
  dots: Array<{
    id: string;
    x: number;
    y: number;
    r?: number;
    fill?: string;
    hollow?: boolean;
  }>;
  r?: number;
  fill?: string;
  opacity?: number;
  move?: boolean;
}) {
  const { reduced } = useStage();
  const travel = move && !reduced;

  return (
    <g opacity={opacity}>
      {dots.map((d) => (
        <g
          key={d.id}
          className={travel ? "board-stage-move" : undefined}
          style={{
            transform: `translate(${d.x}px, ${d.y}px)`,
            transition: travel
              ? "transform 900ms cubic-bezier(.2,.8,.2,1)"
              : undefined,
          }}
        >
          <circle
            fill={d.hollow ? "none" : (d.fill ?? fill)}
            r={d.r ?? r}
            stroke={d.hollow ? (d.fill ?? fill) : undefined}
            strokeWidth={d.hollow ? 1.2 : undefined}
          />
        </g>
      ))}
    </g>
  );
}
