/** One ranked row, as every board list draws it.
 *
 *  The same three-column grid string was copied verbatim into six places —
 *  filing-row.tsx, cluster-buys.tsx, most-active-companies.tsx, market-cap.tsx
 *  and two hand-typed header rows on best-performing-buys.tsx and roles.tsx —
 *  along with ROW_LINK, the padded rank numeral and the logo-plus-name head.
 *  Static-page rule 7 asks sibling tables to share one column spec; six copies
 *  of a string is not that, it is six chances to drift.
 *
 *  The copies were also the wrong shape. `1.5rem · minmax(0,1fr) · 5.5rem`
 *  gives the middle track everything, then fills it with a truncated name and
 *  an 11px dot-string at 50% ink, so the 1fr column is air on a 1,440px screen
 *  and the row's facts are the least legible thing on the page. The load-
 *  bearing move here is `facts`: two or three quantities promoted out of the
 *  dot-string into labelled, aligned, tabular tracks. Aligned columns are what
 *  make a list scannable down rather than readable across, and they restore
 *  rule 5's weighting — the ranked figure is never larger than the company
 *  name it belongs to.
 *
 *  Not an extension of `src/components/row-list.tsx`. That is the design
 *  language's prose selling row (24px title plus a paragraph, on /how-it-works
 *  and its neighbours). This is a data row. Two components, named apart, so
 *  neither grows props for the other's job.
 *
 *  The grid is built rather than written, because the slots a board uses vary
 *  and Tailwind cannot see a class string assembled at runtime. `BOARD_ROW_GRID`
 *  returns three template strings as custom properties, and one static class
 *  list reads them at the three widths — so the header and the rows genuinely
 *  share a spec instead of agreeing by inspection.
 */
import type { CSSProperties, ReactNode } from "react";
import type { Linking } from "./board-model";

import { Link } from "react-router-dom";

import { R } from "@/components/sector-ui";

const ROW_LINK =
  "group relative -mx-2 block rounded-lg px-2 py-3.5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

/** Column widths, in one place so a change lands on every board at once.
 *  The phone rail and logo are narrower; everything else either survives at
 *  full width or collapses into the caption. */
const TRACK = {
  railPhone: "1.75rem",
  rail: "2.5rem",
  logoPhone: "2.5rem",
  logo: "3.5rem",
  subject: "minmax(0,1fr)",
  fact: "6.5rem",
  visual: "12rem",
  money: "7rem",
  perf: "5rem",
  figure: "7rem",
  /** The phone's single right-hand column: one quantity, not three. */
  tailPhone: "5.5rem",
} as const;

/** How many facts a row may promote. Past three the tracks are narrower than
 *  the numbers in them and the row is a table pretending to be a list. */
export const MAX_FACTS = 3;

/** The most facts that fit between 640 and 1024, where the visual is already
 *  gone and the subject is down to a name and a ticker. */
const FACTS_AT_MEDIUM = 2;

export interface BoardRowShape {
  /** False only where a row's leading mark is not a logo at all. */
  logo?: boolean;
  /** 0 to MAX_FACTS. */
  facts?: number;
  visual?: boolean;
  money?: boolean;
  perf?: boolean;
  figure?: boolean;
}

export interface BoardRowGrid {
  className: string;
  style: CSSProperties;
  /** What the phone's one right-hand column holds. The other two trailing
   *  quantities join the caption rather than stacking into a column narrower
   *  than they are. */
  tailClass: string;
  /** Which of money / perf / figure won that column. */
  tail: "figure" | "money" | "perf" | null;
}

function tracks(parts: Array<string | null>): string {
  return parts.filter(Boolean).join(" ");
}

/** The one column spec, at the three widths the boards are read at.
 *
 *  Under 640 the row is rail, logo, subject and a single quantity: the facts
 *  and the visual fold into the caption the old rows already had, written
 *  once here rather than per page. Between 640 and 1024 the visual goes and
 *  the facts are capped at two. At 1024 and over every slot the board asked
 *  for is a column of its own. */
export function BOARD_ROW_GRID(shape: BoardRowShape): BoardRowGrid {
  const facts = Math.max(0, Math.min(MAX_FACTS, shape.facts ?? 0));
  const logo = shape.logo !== false;
  const tail = shape.figure
    ? "figure"
    : shape.money
      ? "money"
      : shape.perf
        ? "perf"
        : null;

  const phone = tracks([
    TRACK.railPhone,
    logo ? TRACK.logoPhone : null,
    TRACK.subject,
    tail ? TRACK.tailPhone : null,
  ]);

  const trailing = [
    shape.money ? TRACK.money : null,
    shape.perf ? TRACK.perf : null,
    shape.figure ? TRACK.figure : null,
  ];

  const medium = tracks([
    TRACK.rail,
    logo ? TRACK.logo : null,
    TRACK.subject,
    ...Array.from<string>({ length: Math.min(facts, FACTS_AT_MEDIUM) }).fill(
      TRACK.fact,
    ),
    ...trailing,
  ]);

  const wide = tracks([
    TRACK.rail,
    logo ? TRACK.logo : null,
    TRACK.subject,
    ...Array.from<string>({ length: facts }).fill(TRACK.fact),
    shape.visual ? TRACK.visual : null,
    ...trailing,
  ]);

  return {
    // The three arbitrary-property classes are literals, so Tailwind emits
    // them; only the values behind them are computed.
    className:
      "grid items-start gap-x-3 pe-6 sm:gap-x-4 [grid-template-columns:var(--board-row-phone)] sm:[grid-template-columns:var(--board-row-medium)] lg:[grid-template-columns:var(--board-row-wide)]",
    style: {
      "--board-row-phone": phone,
      "--board-row-medium": medium,
      "--board-row-wide": wide,
    } as CSSProperties,
    tail,
    tailClass: logo
      ? "col-start-4 sm:col-start-auto"
      : "col-start-3 sm:col-start-auto",
  };
}

export interface BoardRowFact {
  /** Set once, in `BoardRowHeader`, above the column. Repeated as a micro
   *  label only in the phone collapse, where there is no header to read it
   *  against. */
  label: string;
  value: ReactNode;
}

/** The column headings, drawn from the same builder as the rows beneath them.
 *
 *  Two pages used to type this row out by hand and a third rendered a
 *  different one; sharing the builder is what makes rule 7 structural rather
 *  than a thing somebody remembers to check. */
export function BoardRowHeader({
  className = "mt-8",
  facts = [],
  figure,
  logo = true,
  money,
  perf,
  subject,
  visual,
}: {
  className?: string;
  facts?: string[];
  figure?: string;
  logo?: boolean;
  money?: string;
  perf?: string;
  subject: string;
  visual?: string;
}) {
  const grid = BOARD_ROW_GRID({
    facts: facts.length,
    figure: figure != null,
    logo,
    money: money != null,
    perf: perf != null,
    visual: visual != null,
  });

  return (
    <div
      aria-hidden
      className={`${className} pb-2.5 text-[11px] leading-[1.4] text-foreground/50 ${grid.className}`}
      style={grid.style}
    >
      <span />
      {logo ? <span /> : null}
      <span>{subject}</span>
      {facts.map((label, i) => (
        <span
          key={label}
          className={
            i < FACTS_AT_MEDIUM ? "hidden sm:block" : "hidden lg:block"
          }
        >
          {label}
        </span>
      ))}
      {visual != null ? (
        <span className="hidden lg:block">{visual}</span>
      ) : null}
      {money != null ? (
        <span
          className={`text-right ${grid.tail === "money" ? grid.tailClass : "hidden sm:block"}`}
        >
          {money}
        </span>
      ) : null}
      {perf != null ? (
        <span
          className={`text-right ${grid.tail === "perf" ? grid.tailClass : "hidden sm:block"}`}
        >
          {perf}
        </span>
      ) : null}
      {figure != null ? (
        <span className={`text-right ${grid.tailClass}`}>{figure}</span>
      ) : null}
    </div>
  );
}

/** The ruled list the rows sit in. */
export function BoardRowList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={`border-t ${R.rule} ${className}`}>{children}</ol>;
}

/** A chevron, always drawn.
 *
 *  Rule 8 asks a row that navigates to say so, and says an affordance that
 *  only exists on hover is not saying so — a phone has no hover and a reader
 *  scanning a list is not hovering anything. So it sits at 25% ink at rest and
 *  moves a couple of pixels when the row lights up. */
function RowChevron() {
  return (
    <svg
      aria-hidden
      className="absolute right-0.5 top-[1.35rem] text-foreground/25 transition-transform duration-200 group-hover:translate-x-0.5"
      fill="none"
      height={12}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 8 12"
      width={8}
    >
      <path d="M1.5 1.5 6 6l-4.5 4.5" />
    </svg>
  );
}

export interface BoardRowProps {
  /** Board position. Padded to two digits, full ink for the top three. */
  position: number;
  to: string;
  /** The leading mark. A node rather than a ticker, because /biggest-buys
   *  puts a repeat glyph here instead of a second copy of the same logo. Pass
   *  `logo={false}` on the shape only where there is no such mark at all. */
  logo?: ReactNode;
  /** The company or the person: 18/20px semibold, the largest type on the
   *  row. Nothing else may be set larger. */
  name: ReactNode;
  /** Sits beside the name. Usually a `TickerPill`. */
  badge?: ReactNode;
  /** The second line, allowed to WRAP. /cluster-buys learned the hard way
   *  that truncating a buyer list gives a headline of six above five names
   *  and an ellipsis, so this is never clamped and the row is items-start. */
  secondary?: ReactNode;
  /** Up to three promoted quantities, in the order the header names them. */
  facts?: BoardRowFact[];
  /** A sparkline or a tally run. Its own column at 1024 and over; under the
   *  caption below that, because it is the picture the page is about. */
  visual?: ReactNode;
  money?: ReactNode;
  /** An AlphaBadge or a DeltaBadge. */
  perf?: ReactNode;
  /** The ranked quantity, with the noun under it. */
  figure?: { value: ReactNode; unit?: string; srLabel?: string };
  /** Spans every column, under the row. /market-cap's proportion bar. */
  meter?: ReactNode;
  /** Shared highlight with a stage above the list. The id is a PROP because
   *  the boards key it differently — a filing id, an episode id, a ticker —
   *  and the row has no business guessing which. */
  linkId?: string | null;
  linking?: Linking;
  className?: string;
}

export function BoardRow({
  badge,
  className = "",
  facts = [],
  figure,
  linkId,
  linking,
  logo,
  meter,
  money,
  name,
  perf,
  position,
  secondary,
  to,
  visual,
}: BoardRowProps) {
  const grid = BOARD_ROW_GRID({
    facts: facts.length,
    figure: figure != null,
    logo: logo !== undefined,
    money: money != null,
    perf: perf != null,
    visual: visual != null,
  });

  const dimmed =
    linking != null &&
    linking.activeId != null &&
    linkId != null &&
    linking.activeId !== linkId;

  const hover = linking && linkId != null ? linkId : null;

  // What the phone shows in place of the fact columns: the labelled values,
  // dot-separated, exactly where the old rows put them. The third fact has to
  // survive as far as 1024, where its column has not arrived yet.
  const phoneFacts = facts.slice(0, FACTS_AT_MEDIUM);
  const mediumFact = facts[FACTS_AT_MEDIUM];
  const strandedMoney = money != null && grid.tail !== "money";
  const strandedPerf = perf != null && grid.tail !== "perf";
  const hasPhoneCaption =
    phoneFacts.length > 0 || strandedMoney || strandedPerf;

  return (
    <li
      className={`border-b ${R.rule}${linking ? " transition-opacity" : ""}${
        dimmed ? " opacity-45" : ""
      } ${className}`}
      onMouseEnter={
        linking && hover ? () => linking.setActiveId(hover) : undefined
      }
      onMouseLeave={linking ? () => linking.setActiveId(null) : undefined}
    >
      <Link
        className={ROW_LINK}
        to={to}
        onBlur={linking ? () => linking.setActiveId(null) : undefined}
        onFocus={
          linking && hover ? () => linking.setActiveId(hover) : undefined
        }
      >
        <RowChevron />
        <div className={grid.className} style={grid.style}>
          <span
            aria-hidden
            className={`font-mono text-[15px] leading-[1.35] tabular-nums ${
              position <= 3 ? "text-foreground" : "text-foreground/35"
            }`}
          >
            {String(position).padStart(2, "0")}
          </span>

          {logo !== undefined ? (
            <span className="flex justify-start pt-0.5">{logo}</span>
          ) : null}

          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 truncate text-[18px] font-semibold leading-[1.3] tracking-[-0.014em] text-foreground lg:text-[20px]">
                {name}
              </span>
              {badge}
            </span>

            {secondary != null ? (
              <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-foreground/60">
                {secondary}
              </span>
            ) : null}

            {hasPhoneCaption ? (
              <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50 sm:hidden">
                {phoneFacts.map((fact, i) => (
                  <span key={fact.label} className="inline-flex gap-1">
                    {i > 0 ? (
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                    ) : null}
                    <span className="opacity-70">{fact.label}</span>
                    <span className="tabular-nums">{fact.value}</span>
                  </span>
                ))}
                {strandedMoney ? (
                  <span className="inline-flex gap-1">
                    {phoneFacts.length > 0 ? (
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                    ) : null}
                    <span className="tabular-nums">{money}</span>
                  </span>
                ) : null}
                {strandedPerf ? (
                  <span className="inline-flex items-center gap-1">
                    {phoneFacts.length > 0 || strandedMoney ? (
                      <span aria-hidden className="opacity-40">
                        ·
                      </span>
                    ) : null}
                    {perf}
                  </span>
                ) : null}
              </span>
            ) : null}

            {mediumFact != null ? (
              // Between 640 and 1024 the third fact has no column, and a fact
              // that disappears at one width and returns at another is worse
              // than one that moves.
              <span className="mt-1.5 hidden flex-wrap items-center gap-1 text-[11px] leading-[1.35] text-foreground/50 sm:flex lg:hidden">
                <span className="opacity-70">{mediumFact.label}</span>
                <span className="tabular-nums">{mediumFact.value}</span>
              </span>
            ) : null}

            {visual != null ? (
              <span className="mt-2 block lg:hidden">{visual}</span>
            ) : null}
          </span>

          {facts.map((fact, i) => (
            <span
              key={fact.label}
              className={`text-[13px] leading-[1.35] tabular-nums text-foreground/75 ${
                i < FACTS_AT_MEDIUM ? "hidden sm:block" : "hidden lg:block"
              }`}
            >
              {fact.value}
            </span>
          ))}

          {visual != null ? (
            <span className="hidden self-center lg:block">{visual}</span>
          ) : null}

          {money != null ? (
            <span
              className={`text-right text-[14px] font-semibold leading-[1.35] tabular-nums text-foreground ${
                grid.tail === "money" ? grid.tailClass : "hidden sm:block"
              }`}
            >
              {money}
            </span>
          ) : null}

          {perf != null ? (
            <span
              className={`text-right ${
                grid.tail === "perf" ? grid.tailClass : "hidden sm:block"
              }`}
            >
              {perf}
            </span>
          ) : null}

          {figure != null ? (
            <span className={`text-right ${grid.tailClass}`}>
              <span className="text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground lg:text-[19px]">
                {figure.srLabel ? (
                  <span className="sr-only">{figure.srLabel}: </span>
                ) : null}
                {figure.value}
              </span>
              {figure.unit ? (
                <span className="mt-1.5 block text-[11px] leading-[1.3] text-foreground/45">
                  {figure.unit}
                </span>
              ) : null}
            </span>
          ) : null}

          {meter != null ? (
            <span className="col-span-full mt-2.5 block">{meter}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
