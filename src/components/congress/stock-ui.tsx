/** Furniture for the Congress-by-stock pages: the roll-call timeline, the
 *  band ladder, the member rows and the purchases table.
 *
 *  Three objects here are specific to a page whose subject is an issuer
 *  rather than a person, and none of them exists on the member pages:
 *
 *  - `RollCall` — one row per member, one mark per purchase on a shared time
 *    axis. It is the picture the page is about: "who bought, and when" read
 *    down a roll rather than across a table. Marks are sized by the FLOOR of
 *    the disclosed band, because that is the only figure a PTR states; a
 *    midpoint-sized mark would be a number we do not have (rule 2 of the
 *    static-page rules, rule 1 of shared/congress.js).
 *  - `BandLadder` — purchases grouped by the band they were disclosed in.
 *    The one chart native to the data: the distribution of bands is a fact,
 *    a histogram of amounts would not be.
 *  - `PurchasesTable` — the filings board with the disclosure lag as a
 *    column, since the lag is one of the page's stated findings.
 *
 *  Both charts sit inside the house panel (rounded, hairline, on the page
 *  ground): the design language's first tenet, contained not blended. No
 *  colour carries meaning here except the site's positive/negative on a
 *  return; the lane is a WORD on the row, because "in lane" has to be
 *  readable as words to mean anything.
 */
import type { ReactNode } from "react";
import type { GovDealing } from "@/types/ddbx";
import type { BandTier, StockMember } from "../../../shared/congress-stocks";

import { useMemo } from "react";
import { Link } from "react-router-dom";

import {
  band,
  bandCompact,
  memberPathFor,
  seat,
} from "../../../shared/congress.js";
import {
  memberLaneLine,
  ROLL_CALL_ROWS,
} from "../../../shared/congress-stocks.js";

import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { dateLabel, useMeasuredWidth } from "@/components/boards/board-model";
import { CompanyLogo } from "@/components/company-logo";
import { MemberPortrait, R } from "@/components/congress/congress-ui";
import { PartyChip } from "@/components/party-chip";
import { MeterBar } from "@/components/seo/meter-bar";

const RULE = "border-hairline dark:border-separator";

/** The house panel, same constant as congress-ui.tsx and filing-ui.tsx. */
export const PANEL =
  "rounded-3xl border border-hairline bg-white/70 dark:border-border/60 dark:bg-surface-secondary/40";

const LOCALE = "en-US";

/* ─── Title ──────────────────────────────────────────────────────────────── */

/** The issuer's logo and name, for the shell's `title` slot. Inline, so it
 *  nests in the h1 legally — see MemberTitle for why it is not its own h1. */
export function StockTitle({
  company,
  ticker,
}: {
  company: string;
  ticker: string;
}) {
  return (
    <span className="flex items-center gap-4 sm:gap-5">
      <CompanyLogo className="shrink-0" size={64} ticker={ticker} />
      <span className="min-w-0">{company}</span>
    </span>
  );
}

/* ─── The roll call ──────────────────────────────────────────────────────── */

const ROW_H = 30;
const AXIS_H = 26;
const PAD_R = 14;
/** Room for the largest mark on the first day, so an opening purchase is a
 *  circle rather than a half-circle against the label column. */
const PAD_L = 12;
const DAY = 864e5;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const utc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

/** Mark radius from the band FLOOR. Six steps for the six bands a PTR
 *  actually uses below $1m; anything above shares the largest. */
function markRadius(floor: number | null): number {
  const v = floor ?? 0;

  if (v >= 500_001) return 8.5;
  if (v >= 250_001) return 7.5;
  if (v >= 100_001) return 6.5;
  if (v >= 50_001) return 5.5;
  if (v >= 15_001) return 4.5;

  return 3.5;
}

interface RollRow {
  key: string;
  label: ReactNode;
  marks: { x: number; r: number; late: boolean; option: boolean; id: string }[];
}

export function RollCall({
  members,
  rows,
  first,
  sector,
}: {
  members: StockMember[];
  rows: GovDealing[];
  first: string;
  sector: string | null;
}) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();

  const drawn = useMemo(() => {
    const t0 = utc(first);
    const today = Date.now();
    const t1 = Math.max(today, ...rows.map((r) => utc(r.disclosed_date)));
    const span = Math.max(t1 - t0, 30 * DAY);
    const plotW = Math.max(0, width - PAD_R - PAD_L);
    const x = (iso: string) =>
      PAD_L + plotW * Math.min(1, Math.max(0, (utc(iso) - t0) / span));

    // Roll order: whoever bought first is first. A rank by count is what the
    // member list below is for; the timeline is about sequence.
    const ordered = [...members].sort((a, b) => (a.first < b.first ? -1 : 1));
    const own = ordered.slice(0, ROLL_CALL_ROWS);
    const rest = ordered.slice(ROLL_CALL_ROWS);
    const restIds = new Set(rest.map((m) => m.id));
    const byMember = new Map<string, RollRow["marks"]>();

    for (const r of rows) {
      const id = restIds.has(r.reporter.id) ? "__rest" : r.reporter.id;
      const list = byMember.get(id) ?? [];

      list.push({
        id: r.id,
        x: x(r.disclosed_date),
        r: markRadius(r.amount_min),
        late: !!r.is_late,
        option: r.asset_type === "option",
      });
      byMember.set(id, list);
    }

    const lines: RollRow[] = own.map((m) => ({
      key: m.id,
      label: (
        <Link
          className="flex min-w-0 items-center gap-2 underline-offset-4 hover:underline"
          to={memberPathFor(m)}
        >
          <MemberPortrait member={m} size={20} />
          <span className="min-w-0 truncate text-[12.5px] text-foreground">
            {m.name}
          </span>
          {m.lane === "in" ? (
            <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-brown dark:text-brand-tan">
              lane
            </span>
          ) : null}
        </Link>
      ),
      marks: byMember.get(m.id) ?? [],
    }));

    if (rest.length > 0) {
      lines.push({
        key: "__rest",
        label: (
          <span className="text-[12.5px] text-foreground/60">
            {rest.length} more {rest.length === 1 ? "member" : "members"}
          </span>
        ),
        marks: byMember.get("__rest") ?? [],
      });
    }

    // Month ticks, thinned to what the width can label.
    const months: { x: number; label: string; year: boolean }[] = [];
    const d = new Date(t0);

    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const spanMonths = span / (30.4 * DAY);
    const every =
      plotW < 360 ? 6 : spanMonths > 18 ? 3 : spanMonths > 8 ? 2 : 1;

    for (; d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) {
      const m = d.getUTCMonth();

      if (m % every !== 0) continue;
      months.push({
        x: x(d.toISOString()),
        label: m === 0 ? String(d.getUTCFullYear()) : MONTH_SHORT[m],
        year: m === 0,
      });
    }

    const inLane = members.filter((m) => m.lane === "in").length;

    return { lines, months, plotW, inLane };
  }, [members, rows, first, width]);

  const h = drawn.lines.length * ROW_H;
  const maxFloor = Math.max(0, ...rows.map((r) => r.amount_min ?? 0));

  return (
    <div className={`mt-4 ${PANEL} p-4 sm:p-5`}>
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <ul aria-hidden className="m-0 list-none p-0">
          {drawn.lines.map((l) => (
            <li
              key={l.key}
              className={`flex items-center border-b ${RULE} last:border-b-0`}
              style={{ height: ROW_H }}
            >
              {l.label}
            </li>
          ))}
        </ul>
        <div ref={ref} className="min-w-0">
          {width > 0 ? (
            <svg
              aria-label="One row per member; one mark per purchase, placed on the day it was disclosed and sized by the floor of the disclosed band."
              height={h + AXIS_H}
              role="img"
              width={width}
            >
              {drawn.lines.map((l, i) => (
                <line
                  key={l.key}
                  className="stroke-hairline dark:stroke-separator"
                  strokeWidth={1}
                  x1={0}
                  x2={width}
                  y1={(i + 1) * ROW_H - 0.5}
                  y2={(i + 1) * ROW_H - 0.5}
                />
              ))}
              {drawn.months.map((m) => (
                <g key={`${m.label}-${m.x}`}>
                  <line
                    className={
                      m.year
                        ? "stroke-foreground/25"
                        : "stroke-hairline dark:stroke-separator"
                    }
                    strokeDasharray={m.year ? undefined : "2 3"}
                    strokeWidth={1}
                    x1={m.x}
                    x2={m.x}
                    y1={0}
                    y2={h}
                  />
                  <text
                    className="fill-foreground/45 font-mono text-[10px]"
                    textAnchor="middle"
                    x={m.x}
                    y={h + 17}
                  >
                    {m.label}
                  </text>
                </g>
              ))}
              {drawn.lines.map((l, i) =>
                l.marks.map((mk) => (
                  <circle
                    key={mk.id}
                    className={
                      mk.option
                        ? "fill-transparent stroke-foreground/80"
                        : "fill-foreground/75 stroke-white dark:stroke-surface-secondary"
                    }
                    cx={mk.x}
                    cy={i * ROW_H + ROW_H / 2}
                    r={mk.r}
                    strokeWidth={mk.option ? 1.5 : 1}
                  />
                )),
              )}
            </svg>
          ) : (
            <div style={{ height: h + AXIS_H }} />
          )}
        </div>
      </div>
      <p className={`mt-3 max-w-[66ch] ${R.label} leading-[1.6]`}>
        Marks sit on the day each purchase was disclosed, sized by the floor of
        its band; the largest here is {band(maxFloor, maxFloor)} and up. Hollow
        marks are options positions.
        {sector && drawn.inLane > 0
          ? ` “Lane” marks a member who sits on a committee that oversees ${sector.toLowerCase()}.`
          : null}
      </p>
    </div>
  );
}

/* ─── The band ladder ────────────────────────────────────────────────────── */

export function BandLadder({ tiers }: { tiers: BandTier[] }) {
  const max = Math.max(1, ...tiers.map((t) => t.count));

  return (
    <ul className={`mt-4 ${PANEL} px-4 py-2 sm:px-5`}>
      {tiers.map((t) => (
        <li
          key={`${t.min}-${t.max}`}
          className={`grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_4.5rem] items-center gap-x-4 border-b ${RULE} py-2.5 last:border-b-0`}
        >
          <span className="text-[13.5px] tabular-nums text-foreground">
            {band(t.min, t.max)}
          </span>
          <MeterBar max={max} value={t.count} />
          <span className="text-right text-[13px] tabular-nums text-foreground/60">
            {t.count} {t.count === 1 ? "buy" : "buys"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── The members ────────────────────────────────────────────────────────── */

/** Ranked by purchases. The subject is the person, so the row leads with the
 *  portrait and the name at board scale; the lane is the second line, in
 *  words, from the same function the crawler's copy uses. */
export function StockMemberList({
  members,
  sector,
}: {
  members: StockMember[];
  sector: string | null;
}) {
  return (
    <>
      <BoardRowHeader
        className="mt-4"
        facts={["Purchases", "Band", "Last filed"]}
        subject="Member"
      />
      <BoardRowList>
        {members.map((m, i) => (
          <BoardRow
            key={m.id}
            badge={
              <>
                <PartyChip party={m.party} />
                <span className={R.label}>{seat(m)}</span>
              </>
            }
            facts={[
              { label: "Purchases", value: m.rows },
              { label: "Band", value: bandCompact(m.total_min, m.total_max) },
              { label: "Last filed", value: dateLabel(m.last, LOCALE) },
            ]}
            logo={<MemberPortrait member={m} size={56} />}
            name={m.name}
            position={i + 1}
            secondary={memberLaneLine(m, sector as never)}
            to={memberPathFor(m)}
          />
        ))}
      </BoardRowList>
    </>
  );
}

/* ─── The purchases ──────────────────────────────────────────────────────── */

const OWNER_LABEL: Record<string, string> = {
  self: "Own account",
  spouse: "Spouse",
  joint: "Joint",
  child: "Dependent",
};

function lagDays(r: GovDealing): number | null {
  const d = (utc(r.disclosed_date) - utc(r.trade_date)) / DAY;

  return Number.isFinite(d) ? Math.round(d) : null;
}

/** Newest first. Every money cell is a band. The lag column is the page's
 *  finding made visible per row; a late filing says so in words. */
export function PurchasesTable({ rows }: { rows: GovDealing[] }) {
  if (rows.length === 0) {
    return <p className={`mt-4 ${R.body}`}>No purchases to show.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className={`border-b ${RULE}`}>
            <Th>Member</Th>
            <Th>Filed</Th>
            <Th>Lag</Th>
            <Th>Disclosed band</Th>
            <Th>Account</Th>
            <Th className="text-right">Since filing</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const perf = d.live_performance?.return_pct_disclosed ?? null;
            const lag = lagDays(d);

            return (
              <tr key={d.id} className={`border-b ${RULE} align-top`}>
                <Td>
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    to={memberPathFor({
                      id: d.reporter.id,
                      name: d.reporter.name,
                    })}
                  >
                    {d.reporter.name}
                  </Link>
                  {d.asset_type === "option" ? (
                    <span className={`ml-1.5 ${R.label}`}>options</span>
                  ) : null}
                </Td>
                <Td className="tabular-nums">{d.disclosed_date}</Td>
                <Td className="tabular-nums">
                  {lag == null ? (
                    <span className="text-foreground/30">n/a</span>
                  ) : (
                    <>
                      {lag} {lag === 1 ? "day" : "days"}
                      {d.is_late ? (
                        <span className="ml-1.5 text-[11px] text-negative">
                          late
                        </span>
                      ) : null}
                    </>
                  )}
                </Td>
                <Td className="tabular-nums">
                  {band(d.amount_min ?? 0, d.amount_max ?? 0)}
                </Td>
                <Td>
                  <span
                    className={d.owner === "self" ? "" : "text-foreground/60"}
                  >
                    {OWNER_LABEL[d.owner] ?? d.owner}
                  </span>
                </Td>
                <Td className="text-right tabular-nums">
                  {perf == null ? (
                    <span className="text-foreground/30">no mark</span>
                  ) : (
                    <span
                      className={perf >= 0 ? "text-positive" : "text-negative"}
                    >
                      {perf >= 0 ? "+" : ""}
                      {perf.toFixed(1)}%
                    </span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`pb-2 pr-4 text-[11px] font-medium leading-tight text-foreground/45 last:pr-0 ${className}`}
      scope="col"
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-2.5 pr-4 text-[13.5px] last:pr-0 ${className}`}>
      {children}
    </td>
  );
}

/* ─── The lane panel ─────────────────────────────────────────────────────── */

/** The jurisdiction story, as a ruled list under the lane sentence: each
 *  mapped committee whose sectors include the issuer's, with the buyers who
 *  sit on it. Renders the counts of "out" and "not computed" beneath, so a
 *  reader can see that "no lane" has more than one meaning. */
export function StockLanePanel({
  laneLine,
  committees,
  out,
  unmodelled,
  committeeHref,
}: {
  laneLine: string;
  committees: { committee: string; members: StockMember[] }[];
  out: number;
  unmodelled: number;
  committeeHref: (committee: string) => string;
}) {
  return (
    <div className="mt-4">
      <p className={`max-w-[62ch] ${R.body}`}>{laneLine}</p>
      {committees.length > 0 ? (
        <ul className={`mt-4 border-t ${RULE}`}>
          {committees.map((c) => (
            <li
              key={c.committee}
              className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b ${RULE} py-2.5`}
            >
              <Link
                className="text-[14px] font-medium text-foreground underline-offset-4 hover:underline"
                to={committeeHref(c.committee)}
              >
                {c.committee.replace(/^House Committee on /, "")}
              </Link>
              <span className={R.label}>
                {c.members.length === 0
                  ? "none of the buyers sit on it"
                  : c.members.map((m) => m.name).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {out > 0 || unmodelled > 0 ? (
        <p className={`mt-3 max-w-[62ch] ${R.label} leading-[1.6]`}>
          {out > 0
            ? `${out} ${out === 1 ? "buyer sits" : "buyers sit"} on mapped committees that do not oversee this sector. `
            : null}
          {unmodelled > 0
            ? `For ${unmodelled} ${unmodelled === 1 ? "buyer" : "buyers"} no lane is computed at all: we map House committees only, and only eleven of those.`
            : null}
        </p>
      ) : null}
    </div>
  );
}

/* ─── Index rows ─────────────────────────────────────────────────────────── */

/** A compact grid cell for the "every stock with a page" list. */
export function StockCell({
  ticker,
  company,
  members,
  to,
}: {
  ticker: string;
  company: string;
  members: number;
  to: string;
}) {
  return (
    <li className={`border-b ${RULE}`}>
      <Link
        className="flex items-center gap-3 py-2.5 transition-colors hover:bg-foreground/[0.02]"
        to={to}
      >
        <CompanyLogo className="shrink-0" size={28} ticker={ticker} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-foreground">
            {company}
          </span>
          <span className={`block ${R.label}`}>
            {ticker} · {members} members
          </span>
        </span>
      </Link>
    </li>
  );
}
