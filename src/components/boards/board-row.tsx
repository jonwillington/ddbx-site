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
 *
 *  The widest arrangement waits for `xl`, not `lg`, and the reason is the SEO
 *  rail. `DefaultLayout drawerRight` reserves `lg:mr-80` for a 320px fixed
 *  aside that appears at exactly 1024px, so the content column does not grow
 *  across that breakpoint — it FALLS, from 975px at 1023 to 656px at 1024.
 *  Every board in this family runs with that rail, so a full-width row spec
 *  keyed on `lg` unfolds into the one width where there is least room for it
 *  and gets clipped by the layout's `overflow-x-clip` — silently, and from the
 *  right, which is where the ranked figure lives. At `xl` the column is 912px
 *  and the arrangement fits.
 *
 *  For the same reason only ONE trailing quantity is a column below `xl`. A
 *  board with money and a performance mark and a count has six tracks after
 *  the subject; at 720px they leave the company name about seventy pixels,
 *  which is a worse row than the dot-string this replaced. So below `xl` the
 *  stranded quantities join the caption under the name — labelled, in the
 *  order the header names them — and only the board's headline figure keeps
 *  its column.
 */
import type { CSSProperties, ReactNode } from "react";
import type { Linking } from "./board-model";

import { Link } from "react-router-dom";

import { R } from "@/components/sector-ui";

const ROW_LINK =
  "group relative -mx-2 block rounded-lg px-2 py-3.5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

/** Column widths, in one place so a change lands on every board at once.
 *  The phone rail is narrower; everything else either survives at full
 *  width or collapses into the caption.
 *
 *  The logo track is the SAME at every width, because the mark is. Every
 *  board passes `CompanyLogo size={56}` (and /biggest-buys' turnstile is
 *  `w-14` to match), and `CompanyLogo` sets that as an inline width, so a
 *  narrower phone track does not get a smaller logo — it gets a 56px disc
 *  overflowing a 40px cell, eating the column gap and landing flush against
 *  the company name. That was the mobile row until 2026-09-06. If the phone
 *  ever wants a smaller mark, the mark has to shrink first; the track cannot
 *  do it on the mark's behalf.
 *
 *  Sized to their contents rather than rounded up: a fact cell holds "9 days",
 *  "12 Aug" or "£1.2bn", a money cell holds "£1.2m", and every rem spent on
 *  slack here is a rem taken off the company name, which rule 5 says is the
 *  thing the row is about. */
const TRACK = {
  railPhone: "1.75rem",
  rail: "2.5rem",
  logo: "3.5rem",
  subject: "minmax(0,1fr)",
  fact: "5rem",
  visual: "12rem",
  money: "5.5rem",
  /** /biggest-buys' paid-to-worth-now pair, which is two figures and an arrow
   *  rather than one number, and cannot be told in 5.5rem. Opt in per board. */
  moneyPair: "11.5rem",
  perf: "5.5rem",
  figure: "5.5rem",
  /** The phone's single right-hand column: one quantity, not three. */
  tailPhone: "5.5rem",
} as const;

/** How many facts a row may promote. Past three the tracks are narrower than
 *  the numbers in them and the row is a table pretending to be a list. */
export const MAX_FACTS = 3;

/** The most facts that fit between 640 and 1280, where the visual is already
 *  gone and the subject is down to a name and a ticker. */
const FACTS_AT_MEDIUM = 2;

export interface BoardRowShape {
  /** False only where a row's leading mark is not a logo at all. */
  logo?: boolean;
  /** 0 to MAX_FACTS. */
  facts?: number;
  visual?: boolean;
  money?: boolean;
  /** Widen the money track for a composed pair rather than one figure. */
  moneyPair?: boolean;
  perf?: boolean;
  figure?: boolean;
}

/** Which trailing quantity a board leads on. */
export type BoardRowTail = "figure" | "money" | "perf" | null;

export interface BoardRowGrid {
  className: string;
  style: CSSProperties;
  /** Where the one trailing column sits before `xl`. */
  tailClass: string;
  /** Which of money / perf / figure won that column. */
  tail: BoardRowTail;
  /** Per-slot visibility, so the header and the rows can never disagree about
   *  which columns exist at a width. Anything hidden here is carried by the
   *  row's caption instead — never dropped. */
  cell: {
    fact: (index: number) => string;
    visual: string;
    money: string;
    perf: string;
    figure: string;
  };
}

function tracks(parts: Array<string | null>): string {
  return parts.filter(Boolean).join(" ");
}

/** The one column spec, at the three widths the boards are read at.
 *
 *  Under 640 the row is rail, logo, subject and a single quantity: the facts
 *  and the visual fold into the caption the old rows already had, written once
 *  here rather than per page. Between 640 and 1280 the facts are capped at two,
 *  the visual is gone and the other trailing quantities are still in that
 *  caption — see the header note on the rail for why 1280 and not 1024. At
 *  1280 and over every slot the board asked for is a column of its own. */
export function BOARD_ROW_GRID(shape: BoardRowShape): BoardRowGrid {
  const facts = Math.max(0, Math.min(MAX_FACTS, shape.facts ?? 0));
  const logo = shape.logo !== false;
  const money = shape.moneyPair ? TRACK.moneyPair : TRACK.money;
  const tail: BoardRowTail = shape.figure
    ? "figure"
    : shape.money
      ? "money"
      : shape.perf
        ? "perf"
        : null;

  const phone = tracks([
    TRACK.railPhone,
    logo ? TRACK.logo : null,
    TRACK.subject,
    // Always the narrow tail on a phone, even for the money pair: 11.5rem of
    // a 343px screen leaves the company name nothing, and the pair already
    // knows how to stack.
    tail ? TRACK.tailPhone : null,
  ]);

  const medium = tracks([
    TRACK.rail,
    logo ? TRACK.logo : null,
    TRACK.subject,
    ...Array.from<string>({ length: Math.min(facts, FACTS_AT_MEDIUM) }).fill(
      TRACK.fact,
    ),
    tail === "money" ? money : tail === "perf" ? TRACK.perf : null,
    tail === "figure" ? TRACK.figure : null,
  ]);

  const wide = tracks([
    TRACK.rail,
    logo ? TRACK.logo : null,
    TRACK.subject,
    ...Array.from<string>({ length: facts }).fill(TRACK.fact),
    shape.visual ? TRACK.visual : null,
    shape.money ? money : null,
    shape.perf ? TRACK.perf : null,
    shape.figure ? TRACK.figure : null,
  ]);

  const tailClass = logo
    ? "col-start-4 sm:col-start-auto"
    : "col-start-3 sm:col-start-auto";
  // A trailing slot that did not win the tail has no column until `xl`; the
  // caption carries it in the meantime.
  const trailing = (slot: Exclude<BoardRowTail, null>) =>
    tail === slot ? tailClass : "hidden xl:block";

  return {
    // The three arbitrary-property classes are literals, so Tailwind emits
    // them; only the values behind them are computed.
    className:
      "grid items-start gap-x-3 pe-6 sm:gap-x-4 [grid-template-columns:var(--board-row-phone)] sm:[grid-template-columns:var(--board-row-medium)] xl:[grid-template-columns:var(--board-row-wide)]",
    style: {
      "--board-row-phone": phone,
      "--board-row-medium": medium,
      "--board-row-wide": wide,
    } as CSSProperties,
    tail,
    tailClass,
    cell: {
      fact: (i: number) =>
        i < FACTS_AT_MEDIUM ? "hidden sm:block" : "hidden xl:block",
      figure: trailing("figure"),
      money: trailing("money"),
      perf: trailing("perf"),
      visual: "hidden xl:block",
    },
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
  moneyPair,
  perf,
  subject,
  visual,
}: {
  className?: string;
  facts?: string[];
  figure?: string;
  logo?: boolean;
  money?: string;
  /** Match the row's own `moneyPair`, or the heading sits over the wrong
   *  track. */
  moneyPair?: boolean;
  perf?: string;
  subject: string;
  visual?: string;
}) {
  const grid = BOARD_ROW_GRID({
    facts: facts.length,
    figure: figure != null,
    logo,
    money: money != null,
    moneyPair,
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
        <span key={label} className={grid.cell.fact(i)}>
          {label}
        </span>
      ))}
      {visual != null ? (
        <span className={grid.cell.visual}>{visual}</span>
      ) : null}
      {money != null ? (
        <span className={`text-right ${grid.cell.money}`}>{money}</span>
      ) : null}
      {perf != null ? (
        <span className={`text-right ${grid.cell.perf}`}>{perf}</span>
      ) : null}
      {figure != null ? (
        <span className={`text-right ${grid.cell.figure}`}>{figure}</span>
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
  /** A sparkline or a tally run. Its own column at 1280 and over; under the
   *  caption below that, because it is the picture the page is about. */
  visual?: ReactNode;
  money?: ReactNode;
  /** Widen the money track: /biggest-buys tells a pair and an arrow there,
   *  which is not a thing 5.5rem can hold. */
  moneyPair?: boolean;
  /** An AlphaBadge or a DeltaBadge. */
  perf?: ReactNode;
  /** The ranked quantity, with the noun under it. */
  figure?: { value: ReactNode; unit?: string; srLabel?: string };
  /** Spans every column, under the row. /market-cap's proportion bar. */
  meter?: ReactNode;
  /** A DOM id on the row itself, for a page that wants to address one. */
  id?: string;
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
  id,
  linkId,
  linking,
  logo,
  meter,
  money,
  moneyPair,
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
    moneyPair,
    perf: perf != null,
    visual: visual != null,
  });

  const dimmed =
    linking != null &&
    linking.activeId != null &&
    linkId != null &&
    linking.activeId !== linkId;

  const hover = linking && linkId != null ? linkId : null;

  // Everything the row states that has no column yet, in the order the header
  // names it: on a phone that is every fact, and up to 1280 it is the third
  // fact plus whichever trailing quantity did not win the tail. Nothing is
  // dropped on the way down — it moves, labelled, to the line under the name
  // that the rows this replaced used for all of it.
  const caption: Array<{
    key: string;
    node: ReactNode;
    /** Drawn here under 640. */
    phone: boolean;
    /** Drawn here between 640 and 1280. */
    medium: boolean;
  }> = [
    ...facts.map((fact, i) => ({
      key: `fact-${fact.label}`,
      medium: i >= FACTS_AT_MEDIUM,
      node: (
        <>
          <span className="opacity-70">{fact.label}</span>
          <span className="tabular-nums">{fact.value}</span>
        </>
      ),
      phone: true,
    })),
    ...(money != null && grid.tail !== "money"
      ? [
          {
            key: "money",
            medium: true,
            node: <span className="tabular-nums">{money}</span>,
            phone: true,
          },
        ]
      : []),
    ...(perf != null && grid.tail !== "perf"
      ? [{ key: "perf", medium: true, node: perf, phone: true }]
      : []),
  ];

  // A separator belongs before an item only where something visible at that
  // width precedes it — and "visible" differs between the two widths this
  // line serves, so it is decided per width rather than per position.
  let seenPhone = false;
  let seenMedium = false;
  const captionCells = caption.map((item) => {
    const cell = {
      ...item,
      sepMedium: item.medium && seenMedium,
      sepPhone: item.phone && seenPhone,
    };

    seenPhone = seenPhone || item.phone;
    seenMedium = seenMedium || item.medium;

    return cell;
  });

  return (
    <li
      className={`border-b ${R.rule}${linking ? " transition-opacity" : ""}${
        dimmed ? " opacity-45" : ""
      } ${className}`}
      id={id}
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
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              {/* Wraps to two lines rather than truncating. A company board
                  that loses the company name to make room for a fact cell has
                  got the row backwards — rule 5 puts the subject first, and
                  "Jardine Matheson Hold…" is the subject not being first. Two
                  lines is the cap: past that the rows stop being scannable
                  down, which is the whole point of the aligned columns. */}
              <span className="line-clamp-2 min-w-0 text-[18px] font-semibold leading-[1.3] tracking-[-0.014em] text-foreground xl:text-[20px]">
                {name}
              </span>
              {badge}
            </span>

            {secondary != null ? (
              <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-foreground/60">
                {secondary}
              </span>
            ) : null}

            {captionCells.length > 0 ? (
              <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50 xl:hidden">
                {captionCells.map((cell) => (
                  <span
                    key={cell.key}
                    className={
                      cell.phone && cell.medium
                        ? "inline-flex items-center gap-1"
                        : cell.phone
                          ? "inline-flex items-center gap-1 sm:hidden"
                          : "hidden items-center gap-1 sm:inline-flex"
                    }
                  >
                    {cell.sepPhone || cell.sepMedium ? (
                      <span
                        aria-hidden
                        className={
                          cell.sepPhone && cell.sepMedium
                            ? "opacity-40"
                            : cell.sepPhone
                              ? "opacity-40 sm:hidden"
                              : "hidden opacity-40 sm:inline"
                        }
                      >
                        ·
                      </span>
                    ) : null}
                    {cell.node}
                  </span>
                ))}
              </span>
            ) : null}

            {visual != null ? (
              <span className="mt-2 block xl:hidden">{visual}</span>
            ) : null}
          </span>

          {facts.map((fact, i) => (
            <span
              key={fact.label}
              // Truncated, because a fact track is sized for "12 Aug" and
              // /market-cap puts "Consumer Discretionary" in one; without this
              // the overflow lands on top of the next column rather than in
              // the cell it belongs to.
              className={`truncate text-[13px] leading-[1.35] tabular-nums text-foreground/75 ${grid.cell.fact(i)}`}
            >
              {fact.value}
            </span>
          ))}

          {visual != null ? (
            // Top-set with the fact cells, not centred in the row. The facts
            // start at the container top and the subject can now run to two
            // lines, so a centred picture floats below the values it sits
            // beside and the row reads as two staggered halves. 3px is where
            // a 13px fact's glyphs start inside its line box.
            <span className={`self-start pt-[3px] ${grid.cell.visual}`}>
              {visual}
            </span>
          ) : null}

          {money != null ? (
            <span
              className={`text-right text-[14px] font-semibold leading-[1.35] tabular-nums text-foreground ${grid.cell.money}`}
            >
              {money}
            </span>
          ) : null}

          {perf != null ? (
            <span className={`text-right ${grid.cell.perf}`}>{perf}</span>
          ) : null}

          {figure != null ? (
            <span className={`text-right ${grid.cell.figure}`}>
              <span className="text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground xl:text-[19px]">
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
