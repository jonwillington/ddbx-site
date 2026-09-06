/** The columns: the hero on /roles.
 *
 *  One column per published role, one dot per qualifying purchase. Height is
 *  count, because every column shares one lattice pitch and one baseline, so
 *  a taller column is a column with more purchases in it and nothing else.
 *
 *  The picture exists to make two facts about this page unmissable, both of
 *  which a single shape would hide:
 *
 *    - THE GROUPS DO NOT SUM. A non-executive chair is counted under Chair and
 *      under Non-executive director. Drawn as a pie, a treemap or a stacked
 *      bar, those 88 purchases would have to be given to one group or split in
 *      half, and either is a lie. Drawn as separate columns they are simply in
 *      both, as hollow rings at the top of each stack, joined by a ribbon that
 *      says how many. Nothing here is ever a part of one whole.
 *    - THE MARKETS PUBLISH DIFFERENT GROUPS. Four columns on the UK, two on
 *      the US. A group we do not publish is absent rather than drawn empty:
 *      an empty Chair column on a US page would read as "no chairs bought".
 *
 *  Two arrangements. "By how many" stacks the dots from a shared baseline;
 *  "By outcome" sends the same dots to their alpha on a shared signed scale,
 *  with each column's median ticked, and the columns keep their positions so
 *  the inversion between the two is read off the ticks rather than off a
 *  re-ordering nobody can follow.
 *
 *  The frame, the toggle, the tooltip shell and the caption strip are
 *  `BoardStagePanel`'s; the marks are `stage-marks`'. What is here is what only
 *  this board does: the placement pass, the lattice, the ribbons and the words
 *  the picture is allowed to state.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";
import type { RoleEntry } from "../../../../shared/roles";
import type { StageContext, StageMode, StagePad } from "../stage-panel";
import type { Linking } from "../board-model";
import type { StageFigure } from "../stage-figures";
import type { ReactNode } from "react";

import { memo, useMemo } from "react";

import { median, summarise } from "../../../../shared/boards.js";
import {
  buyAlpha,
  buyValue,
  isEligibleBuy,
} from "../../../../shared/leaderboard.js";
import {
  classifyRole,
  filedRole,
  rolePath,
  rolesForMarket,
  MIN_FILINGS,
} from "../../../../shared/roles.js";
import { direction, signedPp } from "../board-model";
import { BoardStagePanel } from "../stage-panel";
import {
  DotField,
  LogoDisc,
  StageAxis,
  StageLabel,
  StageMark,
  SignedAxis,
  alphaTicks,
  stageTone,
} from "../stage-marks";

import { money } from "@/components/sector-ui";
import { cleanCompanyName } from "@/lib/company";

type Buy = Dealing | UsDealing;
type Mode = "count" | "outcome";

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

interface RoleMember {
  key: string;
  value: number;
  alpha: number | null;
  ticker: string;
  company: string;
}

export interface RoleColumn {
  role: RoleEntry;
  slug: string;
  /** The bucket's eligible purchases, largest first — the same rows, in the
   *  same order, as the cards under the stage list. */
  filings: Buy[];
  members: RoleMember[];
  n: number;
  companies: number;
  value: number;
  medianAlpha: number | null;
  alphaCount: number;
  ahead: number;
  behind: number;
  unmarked: number;
  /** The other DRAWN columns this one shares purchases with, biggest share
   *  first. Never a share of the market: only of the two groups named. */
  partners: Array<{
    slug: string;
    label: string;
    plural: string;
    count: number;
  }>;
  summary: ReturnType<typeof summarise>;
}

export interface RolesModel {
  /** Every group published on this market, before the floor. */
  columns: RoleColumn[];
  /** The ones we publish a group from, and therefore draw. */
  published: RoleColumn[];
  /** Published on this market but under the floor. Named in the caption
   *  strip with its real count; never drawn as a short column. */
  heldBack: RoleColumn[];
  /** DISTINCT purchases on the drawn columns. The placement count is larger
   *  and is never stated as a number of purchases. */
  distinct: number;
  companies: number;
  /** Distinct purchases drawn in more than one column. */
  overlap: number;
  medianAlpha: number | null;
  alphaCount: number;
  /** Purchase key → the drawn columns it belongs to. */
  memberships: Map<string, string[]>;
}

/** A purchase's identity across the two columns it may land in. The feed's own
 *  id where there is one; otherwise the same fallback the boards use. */
function filingKey(d: Buy, i: number): string {
  return d.id ?? `${d.ticker ?? ""}-${d.trade_date ?? ""}-${i}`;
}

/** One pass over the eligible purchases, placing each into every published
 *  group its filed title matches. A purchase in two groups is one purchase in
 *  two places, so the placements outnumber the purchases and the distinct set
 *  is derived once, here, rather than by each figure that needs it. */
export function toRoleColumns(
  rows: Buy[] | null,
  market: "UK" | "US",
): RolesModel {
  const roles = rolesForMarket(market);
  const published = new Set(roles.map((r) => r.slug));
  const placed: Array<{
    key: string;
    d: Buy;
    value: number;
    alpha: number | null;
    buckets: string[];
  }> = [];

  (rows ?? []).forEach((d, i) => {
    if (!isEligibleBuy(d, market)) return;
    const buckets = classifyRole(filedRole(d, market)).buckets.filter((s) =>
      published.has(s),
    );

    if (buckets.length === 0) return;
    placed.push({
      key: filingKey(d, i),
      d,
      value: buyValue(d),
      alpha: buyAlpha(d),
      buckets,
    });
  });
  placed.sort((a, b) => b.value - a.value);

  const columns: RoleColumn[] = roles.map((role) => {
    const mine = placed.filter((p) => p.buckets.includes(role.slug));
    const filings = mine.map((p) => p.d);
    const summary = summarise(filings);

    return {
      role,
      slug: role.slug,
      filings,
      members: mine.map((p) => ({
        key: p.key,
        value: p.value,
        alpha: p.alpha,
        ticker: p.d.ticker ?? "",
        company: cleanCompanyName(p.d.company ?? "") || (p.d.ticker ?? ""),
      })),
      n: mine.length,
      companies: summary.companies,
      value: summary.value,
      medianAlpha: summary.medianAlpha,
      alphaCount: summary.alphaCount,
      ahead: mine.filter((p) => p.alpha != null && p.alpha > 0.0005).length,
      behind: mine.filter((p) => p.alpha != null && p.alpha < -0.0005).length,
      unmarked: mine.filter((p) => p.alpha == null).length,
      partners: [],
      summary,
    };
  });

  const drawnCols = columns.filter((c) => c.n >= MIN_FILINGS);
  const heldBack = columns.filter((c) => c.n < MIN_FILINGS);
  const drawn = new Set(drawnCols.map((c) => c.slug));
  const memberships = new Map<string, string[]>();
  const distinct: RoleMember[] = [];

  for (const p of placed) {
    const inDrawn = p.buckets.filter((s) => drawn.has(s));

    if (inDrawn.length === 0) continue;
    memberships.set(p.key, inDrawn);
    distinct.push({
      key: p.key,
      value: p.value,
      alpha: p.alpha,
      ticker: p.d.ticker ?? "",
      company: cleanCompanyName(p.d.company ?? "") || (p.d.ticker ?? ""),
    });
  }

  for (const c of drawnCols) {
    const counts = new Map<string, number>();

    for (const m of c.members) {
      for (const other of memberships.get(m.key) ?? []) {
        if (other === c.slug) continue;
        counts.set(other, (counts.get(other) ?? 0) + 1);
      }
    }
    c.partners = [...counts.entries()]
      .map(([slug, count]) => {
        const role = drawnCols.find((x) => x.slug === slug)!.role;

        return { slug, label: role.label, plural: role.plural, count };
      })
      .sort((a, b) => b.count - a.count);
  }

  const alphas = distinct
    .map((m) => m.alpha)
    .filter((a): a is number => a != null);

  return {
    columns,
    published: drawnCols,
    heldBack,
    distinct: distinct.length,
    companies: new Set(distinct.map((m) => m.ticker)).size,
    overlap: [...memberships.values()].filter((v) => v.length > 1).length,
    medianAlpha: median(alphas),
    alphaCount: alphas.length,
    memberships,
  };
}

/** The figures beside the stage, over the DISTINCT set. An entry with nothing
 *  behind it is omitted rather than filled: `StageFigures` throws on a
 *  placeholder, which is the second static-page rule made mechanical. */
export function roleFigures(model: RolesModel): StageFigure[] {
  const items: StageFigure[] = [
    { k: "Purchases", v: String(model.distinct) },
    { k: "Companies", v: String(model.companies) },
  ];

  if (model.overlap > 0) {
    items.push({ k: "In two groups", v: String(model.overlap) });
  }
  if (model.alphaCount > 0 && model.medianAlpha != null) {
    items.push({
      k: "Median alpha",
      v: signedPp(model.medianAlpha),
      tone:
        model.medianAlpha > 0
          ? "pos"
          : model.medianAlpha < 0
            ? "neg"
            : undefined,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const AXIS_GUTTER = 48;
const RIGHT_GUTTER = 24;

/** A column narrower than this gets no named purchase above it — two names
 *  that wide would sit on each other — and its footer wraps to three lines
 *  rather than one. */
const NAMED_MIN_COL = 150;
const NARROW_COL = 110;

/** Where the named purchase sits: one row across the top of the stage, at a
 *  constant height, so four names cannot stagger into each other and a short
 *  column's name is not left floating in the middle of the plot. */
const NAMED_ROW_LIFT = 38;

function colWidth(W: number, cols: number): number {
  return (W - AXIS_GUTTER - RIGHT_GUTTER) / Math.max(1, cols);
}

/** The top gutter carries the named-purchase row and the bottom one carries
 *  the column footer, so both are sized from the column width rather than
 *  fixed: a phone draws neither a name nor a one-line footer, and reserving
 *  space for them there is 100px of black. */
function stagePad(W: number, cols: number): StagePad {
  const cw = colWidth(W, cols);

  return {
    l: AXIS_GUTTER,
    r: RIGHT_GUTTER,
    t: cw >= NAMED_MIN_COL ? 96 : 44,
    b: cw < NARROW_COL ? 96 : 68,
  };
}

/** Taller than the default: the footer takes a chunk off the bottom, and the
 *  stack has to keep its height meaning something after that. */
function stageHeight(W: number): number {
  return Math.round(Math.min(700, Math.max(480, W * 0.6)));
}

/** Row pitch of a hexagonal lattice, as a fraction of the column pitch. */
const ROW_RATIO = 0.866;

/** Alpha beyond this is drawn at the edge and labelled as such, rather than
 *  stretching the scale for one purchase and flattening the rest. */
const CLIP = 0.5;

/** The count arrangement is monochrome: the dots ARE the picture, so they are
 *  drawn at a weight that survives four hundred of them on a dark panel. A
 *  purchase in two groups is the same dot hollowed, and a ring reads lighter
 *  than the disc it was cut from, so it is stroked brighter to hold the same
 *  presence. Colour on this page belongs to the outcome arrangement alone. */
const SOLID = "rgba(255,255,255,0.6)";
const RING = "rgba(255,255,255,0.95)";

/** The overlap ribbon. Bright enough to read as a connection between two
 *  bands of rings rather than as a smudge behind the dots, and hairlined so
 *  its edges say where it starts and stops. */
const RIBBON_FILL = "rgba(255,255,255,0.1)";
const RIBBON_EDGE = "rgba(255,255,255,0.22)";

/** The hairline tying a named purchase in the top row back to its column. */
const STEM = "rgba(255,255,255,0.18)";

interface Entry {
  key: string;
  alpha: number | null;
  hollow: boolean;
  partner: string | null;
  /** x is COLUMN-LOCAL — every dot is drawn inside its column's `StageMark`,
   *  which is already translated to the column centre. y is stage
   *  coordinates, because that mark is translated to y=0. Mixing the two
   *  frames is what put the columns over their neighbours' labels. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

interface ColGeom {
  col: RoleColumn;
  cx: number;
  left: number;
  entries: Entry[];
  stackTop: number;
  medianY: number | null;
  /** Where each partner's rings sit in this stack, so a ribbon can join the
   *  two bands rather than the two columns. */
  bands: Map<string, { top: number; bottom: number; count: number }>;
  name: string[];
  nameSize: number;
  monoSize: number;
}

/** The largest pitch whose tallest stack still fits the drawing height. Every
 *  column then shares it, and every column shares `perRow` with it, which is
 *  the whole claim: two columns differ in height by exactly the ratio of
 *  their counts. The moment a column picked its own width, height would stop
 *  meaning anything and the picture would be making a claim it cannot keep. */
function solveLattice(nMax: number, innerW: number, h: number) {
  for (let p = 26; p >= 2.2; p -= 0.1) {
    const perRow = Math.max(1, Math.floor(innerW / p));
    const rows = Math.ceil(nMax / perRow);

    if ((rows - 1) * p * ROW_RATIO + p <= h) {
      return {
        pitch: p,
        perRow,
        // Nearly touching, so a stack reads as one mass rather than as a
        // scatter that happens to be on a grid.
        r: Math.max(1.2, Math.min(6.5, p * 0.42)),
      };
    }
  }
  const p = 2.2;

  return { pitch: p, perRow: Math.max(1, Math.floor(innerW / p)), r: 1.2 };
}

/** Greedy word wrap on an estimated advance width. Long enough for a column
 *  label and no longer: nothing here needs to measure a font.
 *
 *  A hyphen is a break opportunity, because on a phone the column is 64px
 *  wide and “Non-executive” does not fit on one line at any size the footer
 *  can carry. The hyphen stays on the line it broke. */
function wrapWords(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/(?<=-)|\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const next = line
      ? line.endsWith("-")
        ? `${line}${w}`
        : `${line} ${w}`
      : w;

    if (line && next.length > maxChars && lines.length < maxLines - 1) {
      lines.push(line);
      line = w;
      continue;
    }
    line = next;
  }
  if (line) lines.push(line);

  return lines.slice(0, maxLines);
}

/** The ribbon's words, in the longest form the space beside it can hold.
 *  Never a bare number: the picture's one hard fact is that these purchases
 *  are in both groups rather than split between them, and a numeral on its
 *  own does not say it — the caller passes the room it has, and gets nothing
 *  back rather than a form that would overrun a neighbouring stack. */
function ribbonLines(k: number, width: number): string[] {
  // Mono advance is 0.6em at 10px.
  const room = width / 6;
  const forms = [
    [`the same ${k} purchases, in both`],
    [`${k} purchases`, `in both groups`],
    [`${k} in both`],
  ];

  return forms.find((f) => Math.max(...f.map((l) => l.length)) <= room) ?? [];
}

function buildGeometry(model: RolesModel, W: number, H: number, pad: StagePad) {
  const cols = model.published;
  const plot = { x0: pad.l, x1: W - pad.r, y0: pad.t, y1: H - pad.b };
  const colW = (plot.x1 - plot.x0) / Math.max(1, cols.length);
  // The gutter between two stacks is where the overlap ribbon and its words
  // go, so it is a column of space rather than a hairline: a ribbon whose
  // count nobody can read is decoration.
  const gutter = Math.min(76, Math.max(14, colW * 0.26));
  const innerW = Math.max(16, colW - gutter);
  const nMax = Math.max(1, ...cols.map((c) => c.n));
  const { pitch, perRow, r } = solveLattice(
    nMax,
    innerW,
    plot.y1 - plot.y0 - 8,
  );
  const rowH = pitch * ROW_RATIO;
  const baseline = plot.y1 - 2;
  const countY = (c: number) => baseline - (c / perRow) * rowH;

  const parked = cols.reduce((s, c) => s + c.unmarked, 0);
  const aTop = plot.y0 + 8;
  const aBot = plot.y1 - (parked > 0 ? 34 : 8);
  const parkY = plot.y1 - 10;
  const yAlpha = (a: number) =>
    aTop +
    ((CLIP - Math.max(-CLIP, Math.min(CLIP, a))) / (2 * CLIP)) * (aBot - aTop);

  const step = 2 * r + 1.4;
  const perLane = Math.max(1, Math.floor(innerW / step));
  const laneH = step * ROW_RATIO;
  const order = new Map(cols.map((c, i) => [c.slug, i] as const));

  const geoms: ColGeom[] = cols.map((col, i) => {
    const left = plot.x0 + i * colW;
    const cx = left + colW / 2;

    // Counted only here at the bottom, shared at the top, and the shared ones
    // grouped by partner so each pair's rings form one band a ribbon can join.
    const solo: Entry[] = [];
    const shared = new Map<string, Entry[]>();

    for (const m of col.members) {
      const others = (model.memberships.get(m.key) ?? []).filter(
        (s) => s !== col.slug,
      );
      const entry: Entry = {
        key: m.key,
        alpha: m.alpha,
        hollow: others.length > 0,
        partner: others[0] ?? null,
        ax: cx,
        ay: baseline,
        bx: cx,
        by: baseline,
      };

      if (others.length === 0) {
        solo.push(entry);
        continue;
      }
      const list = shared.get(entry.partner!) ?? [];

      list.push(entry);
      shared.set(entry.partner!, list);
    }

    const entries = [
      ...solo,
      ...[...shared.entries()]
        .sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
        .flatMap(([, list]) => list),
    ];

    entries.forEach((e, idx) => {
      const j = Math.floor(idx / perRow);
      const start = j * perRow;
      const cnt = Math.min(perRow, entries.length - start);
      const k = idx - start;

      e.ax = (k - (cnt - 1) / 2) * pitch + (j % 2 ? pitch / 4 : -pitch / 4);
      e.ay = baseline - r - j * rowH;
    });

    const bands = new Map<
      string,
      { top: number; bottom: number; count: number }
    >();

    for (const e of entries) {
      if (!e.partner) continue;
      const band = bands.get(e.partner) ?? {
        top: e.ay,
        bottom: e.ay,
        count: 0,
      };

      band.top = Math.min(band.top, e.ay);
      band.bottom = Math.max(band.bottom, e.ay);
      band.count += 1;
      bands.set(e.partner, band);
    }

    // By outcome: the same dots at their alpha, spread across the column so
    // they never cross into another group's.
    const lanes = new Map<number, Entry[]>();

    for (const e of entries) {
      if (e.alpha == null) continue;
      const lane = Math.round((yAlpha(e.alpha) - aTop) / laneH);
      const list = lanes.get(lane) ?? [];

      list.push(e);
      lanes.set(lane, list);
    }
    for (const [lane, list] of lanes) {
      list.forEach((e, idx) => {
        const j = Math.floor(idx / perLane);
        const start = j * perLane;
        const cnt = Math.min(perLane, list.length - start);
        const k = idx - start;
        // Overflow spills alternately above and below the lane, so a crowded
        // alpha bulges symmetrically instead of drifting one way.
        const dy = j === 0 ? 0 : (j % 2 ? 1 : -1) * Math.ceil(j / 2) * laneH;

        e.bx = (k - (cnt - 1) / 2) * step;
        e.by = aTop + lane * laneH + dy;
      });
    }

    const unmarked = entries.filter((e) => e.alpha == null);

    unmarked.forEach((e, idx) => {
      const j = Math.floor(idx / perLane);
      const start = j * perLane;
      const cnt = Math.min(perLane, unmarked.length - start);
      const k = idx - start;

      e.bx = (k - (cnt - 1) / 2) * step;
      e.by = parkY - j * laneH;
    });

    const nameSize = Math.max(9, Math.min(12.5, colW / 8.5));
    const monoSize = Math.max(8, Math.min(10.5, colW / 9));
    const name = wrapWords(
      col.role.plural,
      Math.max(5, Math.floor((colW - 6) / (nameSize * 0.55))),
      colW < NARROW_COL ? 3 : 2,
    );

    if (colW >= 120) name[name.length - 1] = `${name[name.length - 1]} →`;

    return {
      col,
      cx,
      left,
      entries,
      stackTop: baseline - r - (Math.ceil(entries.length / perRow) - 1) * rowH,
      medianY: col.medianAlpha == null ? null : yAlpha(col.medianAlpha),
      bands,
      name,
      nameSize,
      monoSize,
    };
  });

  return {
    plot,
    colW,
    innerW,
    gutter,
    // One footer geometry for the whole strip. "Chairs" is one line and
    // "Non-executive directors" is three, and letting each column start its
    // count where its own name ended drew four different footers.
    nameLines: Math.max(1, ...geoms.map((cg) => cg.name.length)),
    pitch,
    perRow,
    r,
    rowH,
    baseline,
    countY,
    nMax,
    parked,
    parkY,
    aTop,
    aBot,
    yAlpha,
    geoms,
  };
}

// ---------------------------------------------------------------------------
// The marks
// ---------------------------------------------------------------------------

/** One column's dots. Memoised on the array identity so a pointer crossing
 *  another column doesn't reconcile several hundred nodes that didn't move. */
const ColumnDots = memo(function ColumnDots({
  dots,
  r,
  move,
}: {
  dots: Array<{
    id: string;
    x: number;
    y: number;
    fill: string;
    hollow: boolean;
  }>;
  r: number;
  move: boolean;
}) {
  return <DotField dots={dots} move={move} r={r} />;
});

function haloText(size: number, weight: number) {
  return {
    fontSize: size,
    fontWeight: weight,
    paintOrder: "stroke" as const,
    stroke: "var(--stage-bg)",
    strokeLinejoin: "round" as const,
    strokeWidth: 4,
  };
}

function RolesBody({
  ctx,
  model,
  symbol,
}: {
  ctx: StageContext<Mode>;
  model: RolesModel;
  symbol: string;
}) {
  const { W, H, pad, mode, reduced } = ctx;
  const g = useMemo(() => buildGeometry(model, W, H, pad), [model, W, H, pad]);
  const { plot, colW, r, geoms } = g;

  const dots = useMemo(
    () =>
      geoms.map((cg) =>
        cg.entries.map((e) => ({
          id: e.key,
          x: mode === "count" ? e.ax : e.bx,
          y: mode === "count" ? e.ay : e.by,
          fill:
            mode === "count"
              ? e.hollow
                ? RING
                : SOLID
              : stageTone(direction(e.alpha)),
          hollow: e.hollow,
        })),
      ),
    [geoms, mode],
  );

  // Every 50, or every 100 once a column runs past 300 — a rule per 50 dots
  // at that height is a grid, not an axis.
  const countTicks = useMemo(() => {
    const stepC = g.nMax > 300 ? 100 : 50;
    const out: Array<{ at: number; label: string }> = [];

    for (let c = stepC; c <= g.nMax; c += stepC) {
      if (g.countY(c) < plot.y0 + 4) break;
      out.push({ at: g.countY(c), label: String(c) });
    }

    return out;
  }, [g, plot.y0]);

  // One ribbon per overlapping pair, drawn behind everything: the purchases in
  // both groups, joined where they sit in each stack.
  const ribbons = useMemo(() => {
    const out: Array<{
      key: string;
      d: string;
      lines: string[];
      anchor: "middle" | "start";
      lx: number;
      ly: number;
    }> = [];

    for (let i = 0; i < geoms.length; i++) {
      for (let j = i + 1; j < geoms.length; j++) {
        const a = geoms[i];
        const b = geoms[j];
        const ba = a.bands.get(b.col.slug);
        const bb = b.bands.get(a.col.slug);

        if (!ba || !bb) continue;
        const k = Math.min(ba.count, bb.count);
        const xr = a.cx + g.innerW / 2;
        const xl = b.cx - g.innerW / 2;
        const dx = Math.max(8, xl - xr);
        const t = dx * 0.4;
        const [aTopY, aBotY] = [ba.top - r, ba.bottom + r];
        const [bTopY, bBotY] = [bb.top - r, bb.bottom + r];

        // Two neighbours: the words go in the gutter the ribbon crosses.
        // Two columns with another one between them: centring would park the
        // words over a group they say nothing about, so they leave from the
        // ribbon's own end instead.
        const adjacent = j === i + 1;

        out.push({
          key: `${a.col.slug}-${b.col.slug}`,
          d: `M ${xr} ${aTopY} C ${xr + t} ${aTopY} ${xl - t} ${bTopY} ${xl} ${bTopY} L ${xl} ${bBotY} C ${xl - t} ${bBotY} ${xr + t} ${aBotY} ${xr} ${aBotY} Z`,
          // Centred in the gutter, a label may spill a little either way and
          // the halo carries it. Leaving one end, all of the spill lands on
          // the stack it is running towards, so it gets the gap and no more.
          lines: ribbonLines(k, adjacent ? dx + 34 : dx - 16),
          anchor: adjacent ? ("middle" as const) : ("start" as const),
          lx: adjacent ? (xr + xl) / 2 : xr + 10,
          ly: adjacent
            ? (aTopY + aBotY + bTopY + bBotY) / 4 + 3.5
            : (aTopY + aBotY) / 2 + 3.5,
        });
      }
    }

    return out;
  }, [geoms, g.innerW, r]);

  const showLogos = colW >= NAMED_MIN_COL;
  const narrow = colW < NARROW_COL;
  // The named-purchase row, one constant height for every column.
  const namedY = plot.y0 - NAMED_ROW_LIFT;
  const move = !reduced;

  return (
    <>
      {/* By how many: the ribbons, the count rules and the biggest purchase in
        each group. Faded rather than unmounted so the dots travel over it. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: mode === "count" ? 1 : 0 }}
      >
        {ribbons.map((rb) => (
          <g key={rb.key}>
            <path
              d={rb.d}
              fill={RIBBON_FILL}
              stroke={RIBBON_EDGE}
              strokeWidth={1}
            />
            {rb.lines.map((line, li) => (
              <text
                key={line}
                className="font-mono"
                fill="rgba(255,255,255,0.82)"
                textAnchor={rb.anchor}
                x={rb.lx}
                y={rb.ly + (li - (rb.lines.length - 1) / 2) * 12}
                {...haloText(10, 400)}
              >
                {line}
              </text>
            ))}
          </g>
        ))}
        <StageAxis plot={plot} y={countTicks} />
      </g>

      {/* By outcome: the signed scale, its clip labels and the parked strip. */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: mode === "outcome" ? 1 : 0 }}
      >
        <SignedAxis
          labelGutter={plot.x0 - 10}
          plot={{ x0: plot.x0, x1: plot.x1, y0: g.aTop, y1: g.aBot }}
          scale={g.yAlpha}
          ticks={alphaTicks(-CLIP, CLIP)}
        />
        <text
          className="font-mono"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          x={plot.x0 + 4}
          y={g.aTop - 5}
        >
          +50pp and above
        </text>
        <text
          className="font-mono"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          x={plot.x0 + 4}
          y={g.aBot + 13}
        >
          −50pp and below
        </text>
        {g.parked > 0 ? (
          <text
            className="font-mono"
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
            textAnchor="end"
            x={plot.x1}
            y={g.parkY - 12}
          >
            no mark yet · {g.parked}
          </text>
        ) : null}
      </g>

      {geoms.map((cg, ci) => {
        const col = cg.col;
        const anchorY =
          mode === "count" ? cg.stackTop : (cg.medianY ?? g.aTop + 20);
        const nameTop = plot.y1 + 16;
        const nameH = cg.nameSize * 1.2;
        const metaY = nameTop + g.nameLines * nameH + 4;
        // A phone's column is under sixty pixels wide, which one line of this
        // does not fit inside — four of them ran together into a single strip
        // of text with no gaps where the columns are.
        const meta =
          mode === "count"
            ? narrow
              ? [String(col.n), "purchases"]
              : [`${col.n} purchases`]
            : narrow
              ? [`${col.ahead} ahead`, `${col.behind} behind`]
              : [`${col.ahead} ahead · ${col.behind} behind`];
        // Reserved rather than measured, so the money below it does not jump
        // between the two arrangements.
        const valueY = metaY + (narrow ? 12 : 0) + 15;
        const medianY = cg.medianY;
        // Every group's median sits within a few points of level, so on a
        // narrow column four of these labels would be one line of overstruck
        // text. Stacked, not abbreviated: the word is what makes the number a
        // median rather than a mark.
        const medianLines =
          col.medianAlpha == null
            ? []
            : narrow
              ? ["median", signedPp(col.medianAlpha)]
              : [`median ${signedPp(col.medianAlpha)}`];

        return (
          <StageMark
            key={col.slug}
            anchor={{ x: cg.cx, y: anchorY, r: 12 }}
            ariaLabel={columnLabel(col, symbol)}
            hit={{
              shape: "rect",
              x: -colW / 2,
              y: namedY - 26,
              w: colW,
              h: plot.y1 + 84 - (namedY - 26),
            }}
            href={rolePath(col.slug)}
            id={col.slug}
            move={false}
            x={cg.cx}
            y={0}
          >
            <ColumnDots dots={dots[ci]} move={move} r={r} />

            {/* The biggest purchase in the group, named. The only logos on the
              stage: a mark per dot would be 765 of them. A neutral ring: this
              logo shows in the count picture, where nothing is coloured.

              Pinned to one row across the top of the stage rather than riding
              its own stack: four names at four heights land on each other and
              on the ribbon's words, which is exactly what they did. A
              hairline ties each one back down to the column it names. */}
            {showLogos && col.members[0] ? (
              <g
                className="transition-opacity duration-500"
                style={{ opacity: mode === "count" ? 1 : 0 }}
              >
                <line
                  stroke={STEM}
                  strokeWidth={1}
                  x1={0}
                  x2={0}
                  y1={namedY + 12}
                  y2={Math.max(namedY + 12, cg.stackTop - r - 5)}
                />
                <g transform={`translate(0, ${namedY})`}>
                  <LogoDisc
                    clipId={`rl-${col.slug}`}
                    edge={RING}
                    r={9}
                    ticker={col.members[0].ticker}
                  />
                  <StageLabel
                    r={9}
                    side="above"
                    sub={money(col.members[0].value, symbol)}
                    text={clip(
                      col.members[0].company,
                      Math.floor((colW - 14) / 6.4),
                    )}
                  />
                </g>
              </g>
            ) : null}

            {/* The group's median, ticked across its own column only. */}
            {medianY != null && medianLines.length > 0 ? (
              <g
                className="transition-opacity duration-500"
                style={{ opacity: mode === "outcome" ? 1 : 0 }}
              >
                <line
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth={2}
                  x1={-g.innerW / 2}
                  x2={g.innerW / 2}
                  y1={medianY}
                  y2={medianY}
                />
                {medianLines.map((line, li) => (
                  <text
                    key={line}
                    className="font-mono"
                    fill="rgba(255,255,255,0.9)"
                    textAnchor="middle"
                    y={medianY - 7 - (medianLines.length - 1 - li) * 12}
                    {...haloText(10.5, 500)}
                  >
                    {line}
                  </text>
                ))}
              </g>
            ) : null}

            {/* The column's own footer: what it is, how many, and what it
              cost. Stated, not barred: a bar scaled to the richest group
              would encode rank within the four and nothing else, which is
              the meter the rest of the family just took out. */}
            {cg.name.map((line, li) => (
              <text
                key={line}
                className="underline decoration-white/25 underline-offset-[3px]"
                fill="rgba(255,255,255,0.92)"
                textAnchor="middle"
                y={nameTop + li * nameH}
                {...haloText(cg.nameSize, 600)}
              >
                {line}
              </text>
            ))}
            {meta.map((line, li) => (
              <text
                key={line}
                className="font-mono"
                fill="rgba(255,255,255,0.55)"
                fontSize={cg.monoSize}
                textAnchor="middle"
                y={metaY + li * 12}
              >
                {line}
              </text>
            ))}
            <text
              className="font-mono"
              fill="rgba(255,255,255,0.72)"
              fontSize={cg.monoSize + 0.5}
              textAnchor="middle"
              y={valueY}
            >
              {money(col.value, symbol)}
            </text>
          </StageMark>
        );
      })}
    </>
  );
}

/** Truncate a company name to fit beside its own figure. */
function clip(name: string, max: number): string {
  if (max < 6 || name.length <= max) return name;

  return `${name.slice(0, max - 1).trimEnd()}…`;
}

function columnLabel(col: RoleColumn, symbol: string): string {
  const parts = [
    `${col.role.plural}, ${col.n} purchases across ${col.companies} companies, ${money(col.value, symbol)}`,
  ];

  if (col.medianAlpha != null) {
    parts.push(`median ${signedPp(col.medianAlpha)}`);
  }
  for (const p of col.partners) {
    parts.push(`${p.count} also counted under ${p.label}`);
  }

  return `${parts.join(", ")}.`;
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

const BOTH: ReadonlyArray<StageMode<Mode>> = [
  { id: "count", label: "By how many" },
  { id: "outcome", label: "By outcome" },
];
const COUNT_ONLY: ReadonlyArray<StageMode<Mode>> = [BOTH[0]];

export function RolesStage({
  model,
  symbol,
  benchmark,
  linking,
  header,
  loading,
}: {
  model: RolesModel;
  symbol: string;
  /** "the FTSE All-Share" / "the S&P 500". */
  benchmark: string;
  linking: Linking;
  /** The page's message layer — eyebrow, h1, standfirst, figures. */
  header: ReactNode;
  loading: boolean;
}) {
  const cols = model.published;
  const drawn = !loading && cols.length > 0;
  // No mark anywhere in the window means there is no second arrangement to
  // offer, so the panel shows one and never advances.
  const modes = model.alphaCount > 0 ? BOTH : COUNT_ONLY;

  const most = [...cols].sort((a, b) => b.n - a.n)[0];
  const least = [...cols].sort((a, b) => a.n - b.n)[0];
  const richest = [...cols].sort((a, b) => b.value - a.value)[0];
  const marked = cols.filter((c) => c.medianAlpha != null);
  const highest = [...marked].sort(
    (a, b) => (b.medianAlpha ?? 0) - (a.medianAlpha ?? 0),
  )[0];
  const lowest = [...marked].sort(
    (a, b) => (a.medianAlpha ?? 0) - (b.medianAlpha ?? 0),
  )[0];

  return (
    <BoardStagePanel<Mode>
      caption={(ctx) =>
        drawn ? (
          <div>
            {ctx.mode === "count" ? (
              <p>
                <span className="font-semibold text-white">
                  {model.distinct} purchases across {cols.length}{" "}
                  {cols.length === 1 ? "group" : "groups"}, one dot each
                </span>
                {model.overlap > 0 ? (
                  <>
                    ; the groups overlap, so {model.overlap} are drawn twice, as
                    rings
                  </>
                ) : null}
                .{" "}
                {cols.length === 1 ? (
                  <>
                    {most.role.plural} are the only group over the floor this
                    period, {most.n} purchases, {money(most.value, symbol)}.
                  </>
                ) : most === richest ? (
                  <>
                    {most.role.plural} filed most, {most.n}, and spent most,{" "}
                    {money(most.value, symbol)}.
                  </>
                ) : (
                  <>
                    {most.role.plural} filed most, {most.n};{" "}
                    {richest.role.plural.toLowerCase()} spent most,{" "}
                    {money(richest.value, symbol)}.
                  </>
                )}
                {modes.length > 1 ? (
                  <>
                    {" "}
                    <button
                      className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                      type="button"
                      onClick={() => ctx.choose("outcome")}
                    >
                      See how each group did →
                    </button>
                  </>
                ) : null}
              </p>
            ) : (
              <p>
                {cols.length === 1 ? (
                  <>
                    <span className="font-semibold text-white">
                      {most.role.plural} have a median mark of{" "}
                      {signedPp(highest.medianAlpha)}
                    </span>
                    , over the {most.alphaCount} of their purchases that carry
                    one.
                  </>
                ) : most.medianAlpha != null &&
                  most === lowest &&
                  least === highest ? (
                  <>
                    <span className="font-semibold text-white">
                      {most.role.plural} filed most and have the lowest median
                      mark, {signedPp(most.medianAlpha)}
                    </span>
                    ; {highest.role.plural.toLowerCase()} filed least and have
                    the highest, {signedPp(highest.medianAlpha)}.
                  </>
                ) : most.medianAlpha != null ? (
                  <>
                    <span className="font-semibold text-white">
                      {most.role.plural} filed most, with a median mark of{" "}
                      {signedPp(most.medianAlpha)}
                    </span>
                    ; the highest median is {highest.role.plural.toLowerCase()}
                    ’, at {signedPp(highest.medianAlpha)}, and the lowest{" "}
                    {lowest.role.plural.toLowerCase()}’, at{" "}
                    {signedPp(lowest.medianAlpha)}.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-white">
                      The highest median mark is{" "}
                      {highest.role.plural.toLowerCase()}’, at{" "}
                      {signedPp(highest.medianAlpha)}
                    </span>
                    ; the lowest is {lowest.role.plural.toLowerCase()}’, at{" "}
                    {signedPp(lowest.medianAlpha)}.
                  </>
                )}{" "}
                Median alpha is measured from the disclosure-day close against{" "}
                {benchmark}, over holding periods that differ.
              </p>
            )}

            {/* A group we publish but held back this period, named with its
              real count. The floor is a number we apply, so it is a number we
              state. */}
            {model.heldBack.length > 0 ? (
              <p className="mt-1 font-mono text-[11px] leading-[1.5] text-white/40">
                {model.heldBack.map((c) => (
                  <span key={c.slug}>
                    {c.role.plural}: {c.n} purchases this period, below the{" "}
                    {MIN_FILINGS} we publish a group from.{" "}
                  </span>
                ))}
              </p>
            ) : null}

            {modes.length === 1 ? (
              <p className="mt-1 font-mono text-[11px] leading-[1.5] text-white/40">
                No performance marks in this window yet; a purchase gets one
                once there is a close after the day it was disclosed.
              </p>
            ) : null}
          </div>
        ) : null
      }
      header={header}
      height={stageHeight}
      // The outcome view is the one that draws a finding; "by how many"
      // restates the figures band above it. Safe to name unconditionally: in
      // the no-alpha window `modes` shrinks to COUNT_ONLY and the panel's
      // guard falls back to the only mode there is.
      initialMode="outcome"
      linking={linking}
      loading={loading || cols.length === 0}
      modes={modes}
      pad={(W) => stagePad(W, cols.length)}
      renderTip={(id) => {
        const col = cols.find((c) => c.slug === id);

        if (!col) return null;

        return (
          <>
            <div className="font-semibold">{col.role.plural}</div>
            <div className="mt-1 tabular-nums text-[11px] text-white/70">
              {col.n} purchases · {col.companies}{" "}
              {col.companies === 1 ? "company" : "companies"} ·{" "}
              {money(col.value, symbol)}
            </div>
            {col.alphaCount > 0 && col.medianAlpha != null ? (
              <div className="mt-1 text-[11px] text-white/55">
                median {signedPp(col.medianAlpha)} vs {benchmark}, from{" "}
                {col.alphaCount} with a mark
              </div>
            ) : null}
            {col.partners.map((p) => (
              <div key={p.slug} className="mt-1 text-[11px] text-white/45">
                {p.count} also counted under {p.label}
              </div>
            ))}
          </>
        );
      }}
      svgLabel={(mode) =>
        mode === "count"
          ? `${model.distinct} purchases stacked by the role the buyer filed under, one dot each, with purchases in two groups drawn as rings in both`
          : `The same purchases placed by their alpha against ${benchmark} since disclosure, with each group’s median marked`
      }
    >
      {(ctx) =>
        drawn ? <RolesBody ctx={ctx} model={model} symbol={symbol} /> : null
      }
    </BoardStagePanel>
  );
}
