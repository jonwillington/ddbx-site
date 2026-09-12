/** The install page's proof: the best-performing recent buys, drawn as a board.
 *
 *  This was six `WinnerCard`s in a three-up grid inside a full-bleed cream
 *  band — a 40px logo, a count-up return, a bespoke 96px area chart and a
 *  "View analysis" button per card. Four things were wrong with it and none of
 *  them were cosmetic. The site's grammar for a list that sells is a row
 *  (design-language tenet 3), and every other ranked list on the site is one.
 *  A card grid truncates: "Caledonia Mining Corpor…" is the company name not
 *  being the subject of its own row. The band was full-bleed on a page that
 *  runs with the install rail, so it stopped dead against the rail's border at
 *  1440 — the same argument that pulled `AppCtaBand` and `CompanyAppPitch`
 *  back into the column. And with fewer than one survivor the grid rendered
 *  nothing at all, where static-page rule 2 asks for a sentence that says what
 *  is missing and when it will arrive.
 *
 *  So: `BoardRowHeader` + `BoardRowList` + `BoardRow`, ranked lead, 56px mark,
 *  aligned columns, the company name allowed two lines. The one store CTA
 *  stays under the list. Nothing counts up and nothing fades in — the page's
 *  neighbours don't, and a return that animates reads as an advertisement for
 *  a number rather than the number itself.
 *
 *  The section takes its strings as props rather than reading the copy
 *  context, because every reader-facing word on these six routes is owned by
 *  `lib/download/copy.tsx` in three dictionaries and a component that reaches
 *  for a default English literal is how one locale quietly goes half-English.
 */
import type { BoardRow as BoardRowModel } from "@/components/boards/board-model";
import type { AppPlatform } from "@/lib/app-screenshots";
import type { JSX, ReactNode } from "react";

import {
  BOARD_ROW_GRID,
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { BuySparkline } from "@/components/boards/buy-sparkline";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { CompanyLogo } from "@/components/company-logo";
import { SectionHeader } from "@/components/download/section-header";
import { CAPTION, RULE } from "@/components/how-it-works/shared";
import { Skeleton } from "@/components/skeleton";
import { StoreButtons } from "@/components/store-buttons";
import { TickerPill } from "@/components/ticker-pill";

/** The page's one section box, shared verbatim with `pages/download.tsx` and
 *  `pages/api.tsx`: same `SectionHeader` grammar, same grid. No band. */
const SECTION = "mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20";

/** Rows the loading state stands at. The page shows `WINNERS_SHOWN` (6) and
 *  can say so with `loadingRows`; the default is that number so the skeleton
 *  is never a shape nothing arrives in. */
const DEFAULT_LOADING_ROWS = 6;

/** One winner, normalised by the page away from the per-market wire row so
 *  this board draws UK `Dealing`s and US `UsDealing`s without knowing which. */
export interface WinnerRowData {
  id: string;
  ticker: string;
  company: string;
  returnPct: number;
  asOf?: string | null;
  buyerName: string;
  buyerRole?: string;
  /** e.g. "Bought £4,071 of shares at £0.04" — already in the reader's
   *  language and currency. */
  metaLine: string;
  tradeDate: string;
  bars?: { date: string; close: number }[];
  buyIndex?: number;
}

/** Column headings and unit nouns, already localised by the caller. */
export interface WinnersBoardLabels {
  /** Over the logo-and-name column. */
  subject: string;
  /** Over the trade-date column, and the micro label it collapses to. */
  bought: string;
  /** Over the price line, and the noun under each return. */
  sinceTheBuy: string;
  /** Over the return column, and its screen-reader name on every row. */
  ret: string;
  /** "Prices as of 24 Jul 2026", stated once under the list. Omit and the
   *  provenance line is left off rather than guessed at. */
  pricesAsOf?: (date: string) => string;
}

/** The row figure: one decimal, sign always, coloured by direction.
 *
 *  Always signed because an unsigned "14.7%" beside a price line is ambiguous
 *  about which way the line went, and this board is the page's evidence. The
 *  minus comes from `toFixed`, matching `signedPp` on the boards. */
function returnLabel(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** What `BuySparkline` needs off a board row, and nothing more.
 *
 *  It anchors the rebased line on `disclosedDate || tradeDate` and reads no
 *  other field. A winner reaches this component already normalised — there is
 *  no wire `Dealing` behind it — so rather than invent a `value`, an `alpha`
 *  and a fake `raw` row to satisfy the model, the anchor states the one date
 *  it honestly has (the trade date, which is also what the page's bars are
 *  sliced around) and omits the rest. `satisfies` holds the two field names to
 *  the model's spelling. The narrowing assertion is the deliberate part: if
 *  `buy-sparkline.tsx` ever reads a third field it will read `undefined` here,
 *  so that file's prop is a two-date contract by agreement, not by compiler. */
function sparkAnchor(tradeDate: string): BoardRowModel {
  const anchor = {
    disclosedDate: tradeDate,
    tradeDate,
  } satisfies Pick<BoardRowModel, "disclosedDate" | "tradeDate">;

  return anchor as BoardRowModel;
}

/** The slots this board asks for, restated for the loading rows.
 *
 *  `BoardRowHeader` and `BoardRow` each derive their own grid from the props
 *  they are given, so the three agree because they are given the same slots —
 *  one ranked lead, a 56px mark, the subject, one fact, the price line and the
 *  return. Change a slot below and change it at both call sites above. */
const ROW_SHAPE = {
  facts: 1,
  figure: true,
  lead: "rank",
  logo: true,
  visual: true,
} as const;

export function WinnersBoard({
  available,
  ctaSub,
  emptyNote,
  formatDate,
  gaPrefix,
  heading,
  index,
  kicker,
  labels,
  loadingRows = DEFAULT_LOADING_ROWS,
  marketId,
  platform,
  rowHref,
  sub,
  total,
  winners,
}: {
  /** Whether this route has a store to send the reader to at all — the
   *  /us/download/android branch has none, and must not grow a button here. */
  available: boolean;
  /** The line under the store button. */
  ctaSub: string;
  /** Rule 2's sentence, shown for an empty list AND a failed fetch. */
  emptyNote: string;
  /** An ISO date in the reader's locale. */
  formatDate: (iso: string) => string;
  gaPrefix: string;
  heading: ReactNode;
  index: number;
  kicker: string;
  labels: WinnersBoardLabels;
  /** Rows the skeleton stands at; pass the page's `WINNERS_SHOWN`. */
  loadingRows?: number;
  marketId: "uk" | "us";
  platform: AppPlatform;
  /** The filing page for a winner — `filingPath` / `usFilingPath`. Every row
   *  on the site navigates to its own record (decision D2). */
  rowHref: (id: string) => string;
  sub: ReactNode;
  total: number;
  /** `null` while the feed and the price histories are in flight. */
  winners: WinnerRowData[] | null;
}): JSX.Element {
  // The latest close any row is marked at, stated once under the list rather
  // than six times down it: it is one fetch's as-of date, not a per-row fact.
  const asOf =
    winners
      ?.map((w) => w.asOf)
      .filter((d): d is string => !!d)
      .sort()
      .pop() ?? null;

  return (
    <section className={SECTION}>
      <SectionHeader
        index={index}
        kicker={kicker}
        sub={sub}
        title={heading}
        total={total}
      />

      {/* Decorative for assistive tech: every row states its own figures.
          Withheld on the empty board: column headings over one sentence read
          as a table that lost its rows. */}
      {winners === null || winners.length > 0 ? (
        <BoardRowHeader
          className="mt-12"
          facts={[labels.bought]}
          figure={labels.ret}
          subject={labels.subject}
          visual={labels.sinceTheBuy}
        />
      ) : null}

      {winners === null ? (
        <WinnersSkeleton rows={loadingRows} />
      ) : winners.length === 0 ? (
        // Empty and failed are the same sentence, because to the reader they
        // are the same thing: there is nothing here yet. Silence is the one
        // answer rule 2 forbids.
        <p className={`mt-12 border-t ${RULE} pt-5 ${CAPTION} max-w-[56ch]`}>
          {emptyNote}
        </p>
      ) : (
        <BoardRowList>
          {winners.map((w, i) => (
            <BoardRow
              key={w.id}
              badge={<TickerPill ticker={w.ticker} />}
              facts={[{ label: labels.bought, value: formatDate(w.tradeDate) }]}
              figure={{
                srLabel: labels.ret,
                unit: labels.sinceTheBuy,
                value: (
                  <span
                    className={
                      w.returnPct >= 0 ? "text-positive" : "text-negative"
                    }
                  >
                    {returnLabel(w.returnPct)}
                  </span>
                ),
              }}
              logo={<CompanyLogo size={56} ticker={w.ticker} />}
              name={w.company}
              position={i + 1}
              secondary={
                <>
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="font-medium text-foreground/85">
                      {w.buyerName}
                    </span>
                    {w.buyerRole ? (
                      <>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span>{w.buyerRole}</span>
                      </>
                    ) : null}
                  </span>
                  {/* The money and the price paid, as the page already writes
                      it. Its own line: it is a sentence, not a tag. */}
                  <span className="mt-1 block">{w.metaLine}</span>
                </>
              }
              to={rowHref(w.id)}
              visual={
                // Capped below `xl`, where the line sits under the caption in
                // the subject column and would otherwise run the full width of
                // a 1,200px row.
                <span className="block max-w-[240px] xl:max-w-none">
                  <BuySparkline
                    // No benchmark line: the claim this section makes is "the
                    // price went up after the buy", not "it beat the index",
                    // and a grey second line states a comparison the figure
                    // beside it is not measuring. /biggest-buys is where the
                    // index belongs, because its figure is alpha.
                    bars={w.bars}
                    bench={undefined}
                    row={sparkAnchor(w.tradeDate)}
                  />
                </span>
              }
            />
          ))}
        </BoardRowList>
      )}

      {asOf && labels.pricesAsOf ? (
        <p className={`mt-3 ${CAPTION}`}>
          {labels.pricesAsOf(formatDate(asOf))}
        </p>
      ) : null}

      {available && winners != null && winners.length > 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2.5">
          <StoreButtons
            buttonClassName={`inline-flex items-center justify-center gap-2.5 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-7 py-3.5 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`}
            gaEvent="cta_download_lp"
            gaLabel={`${gaPrefix} winners`}
            glyphClassName="h-[17px] w-[17px] shrink-0"
            marketId={marketId}
            platform={platform}
          />
          <p className="text-sm text-foreground/55">{ctaSub}</p>
        </div>
      ) : null}
    </section>
  );
}

/** The loading state, built from the rows' own grid.
 *
 *  `SeoSkeleton variant="ranked-board"` is the house skeleton for this family
 *  and was the first choice, but it draws its row with flex tracks and brings
 *  its own `mt-8` — under a `BoardRowHeader` that is followed immediately by
 *  its list, that is a 32px jump plus cells that don't land on the grid's
 *  columns. So the rows are assembled here instead from `BOARD_ROW_GRID` with
 *  the house `Skeleton` primitive in each slot: same template columns, same
 *  row padding, same caption and price-line collapse below `xl`. Rule 6 wants
 *  the arrived list to land in the box the skeleton held, and sharing the
 *  builder is the only way that survives a change to the spec.
 *
 *  No screen-reader text: `aria-busy` says the region is loading, and a
 *  hardcoded "Loading…" would be the one English literal on a Chinese page. */
function WinnersSkeleton({ rows }: { rows: number }) {
  const grid = BOARD_ROW_GRID(ROW_SHAPE);

  return (
    <div aria-busy="true">
      <BoardRowList>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className={`border-b ${RULE} py-3.5`}>
            <div className={grid.className} style={grid.style}>
              <Skeleton className="mt-0.5 h-[15px] w-5" />
              <Skeleton circle className="shrink-0" h={56} w={56} />

              <span className="block min-w-0">
                <Skeleton className="h-[18px] w-1/2 max-w-[240px] xl:h-[20px]" />
                <Skeleton className="mt-2 h-[12.5px] w-2/3 max-w-[260px]" />
                <Skeleton className="mt-1.5 h-[12.5px] w-3/4 max-w-[300px]" />
                {/* The fact and the price line, where the row itself carries
                    them below `xl`. */}
                <Skeleton className="mt-2 h-[11px] w-24 xl:hidden" />
                <Skeleton
                  className="mt-2 block w-full max-w-[240px] rounded-md xl:hidden"
                  h={44}
                />
              </span>

              <Skeleton
                className={`mt-0.5 h-[13px] w-12 ${grid.cell.fact(0)}`}
              />

              <span className={`self-start pt-[3px] ${grid.cell.visual}`}>
                <Skeleton className="w-full rounded-md" h={44} />
              </span>

              <span className={`flex flex-col items-end ${grid.cell.figure}`}>
                <Skeleton className="h-[17px] w-14 xl:h-[19px]" />
                <Skeleton className="mt-1.5 h-[11px] w-16" />
              </span>
            </div>
          </li>
        ))}
      </BoardRowList>
    </div>
  );
}
