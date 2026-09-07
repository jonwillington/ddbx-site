/** "Where the filings come from", drawn as one object: the register.
 *
 *  The argument this section has to make is not "we read a lot of filings".
 *  It is that there are FIVE feeds, in five formats, naming their filers five
 *  different ways, reaching back to five different starting points — so the
 *  rows are not like-for-like and the total is not a count of purchases.
 *
 *  The version this replaces made that argument twice and landed it neither
 *  time. A market-specific `dl` stated the host market's exchange, regulator,
 *  filer noun and cadence; a two-column card grid then restated three of those
 *  four for every feed, so the reader met "London Stock Exchange RNS filings"
 *  and "RNS · PDMR notifications" within four hundred pixels of each other.
 *  And each card carried a MeterBar scaled to the largest feed on the page,
 *  which is the thing the static-page review struck on the boards: a bar
 *  measured against its biggest sibling says only "this one is smaller than
 *  that one", which the two numbers beside it already said, in figures the
 *  reader can check.
 *
 *  So: one object, a register. Aligned tabular columns — records, open-market
 *  buys, filers, issuers, and the month the feed's records start — are what
 *  make five rows scannable DOWN. The feed's own name for its filers sits in
 *  the subject block rather than in a column header, because "Officers,
 *  directors, 10% holders" against "Members of Congress" is the vocabulary
 *  point, and it is only visible when the five phrases stack.
 *
 *  The host market's own facts are not a separate table any more. They are the
 *  first row of the same object, tinted, with exchange / cadence as an inline
 *  band under the name. A reader arriving on ddbx.uk sees the United Kingdom
 *  row first, in full, and the other four feeds underneath it in the same
 *  grammar.
 *
 *  ---------------------------------------------------------------------------
 *  Why the date is a column and not a bar
 *  ---------------------------------------------------------------------------
 *
 *  A first draft drew each feed's span of held record dates as a bar on one
 *  shared axis from 2005 to now. Honest, and illegible: the Dutch backfill set
 *  the domain, so four of the five bars were slivers at the right-hand edge
 *  that read as a rendering fault, and the caption had to tell the reader
 *  that length was NOT size (the column beside it). A drawing that needs a
 *  sentence to stop it being misread is the wrong drawing. The fact the bar
 *  carried — when a feed's records begin — is a date, and a date is a word.
 *
 *  `first_disclosed` is the oldest record date held, not the date a watch
 *  started: NL reaches 2006 because of a one-off historical load. The API
 *  exposes no "watching since" field, so the column says "Records from" and
 *  the distinction is carried in words, on the row it applies to
 *  (FEEDS.NL.note) and in the caption.
 */
import type { CSSProperties } from "react";
import type { FlagComponent } from "country-flag-icons/react/3x2";
import type { CoverageSource } from "@/lib/coverage";
import type { MarketCopy } from "@/lib/markets/market-copy";
import type {
  CoverageMarket,
  CoverageMarketId,
  CoverageResponse,
} from "@/types/ddbx";

import { GB, NL, SE, US } from "country-flag-icons/react/3x2";

import { EYEBROW, Fold, KICKER, RULE } from "@/components/how-it-works/shared";
import { FEEDS, FEED_ORDER, count, monthLabel } from "@/lib/coverage";

/** Flags identify a FEED, not a country: the congressional corpus flies the US
 *  flag under its own name, one row below the Form 4 feed, and the two are
 *  never the same row. Decorative in every case — the feed's name is the next
 *  element, so an announced flag would read the jurisdiction twice. */
const FLAGS: Record<CoverageMarketId, FlagComponent> = {
  UK: GB,
  US: US,
  NL: NL,
  SE: SE,
  USG: US,
};

/** Which feed row is this host's own. Markets with no feed of their own fall
 *  through to no tinted row at all rather than to a wrong one. */
const HOME_FEED: Record<string, CoverageMarketId> = {
  uk: "UK",
  us: "US",
  nl: "NL",
  se: "SE",
};

/** One column spec for the header and the rows, built the way board-row.tsx
 *  builds its own: three literal class strings reading three custom
 *  properties, so the two can never disagree about which columns exist.
 *
 *  The gates are CONTAINER queries, not viewport ones, and that is a fix
 *  rather than a flourish. The page has dropped its 860px wrapper, so this
 *  object is handed the whole content column: about 910px at `xl` beside the
 *  SEO rail, 1,070px at 1440, and 656px at `lg` — narrower than at `md`,
 *  because the rail claims a fixed 320px and the column FALLS across that
 *  breakpoint instead of growing. A viewport gate has to be pinned to `xl` to
 *  survive that, which then withholds the columns from every wide layout with
 *  no rail. Keyed on the register's own width, all seven tracks appear at
 *  820px of register, wherever that comes from, and the answer to "can six
 *  columns be columns at lg?" is measured rather than guessed: at 656px they
 *  cannot, and the register says so by folding them.
 *
 *  Below the wide gate the stranded quantities join the row's caption,
 *  labelled, rather than being dropped. */
const ROW_GRID =
  "grid items-start gap-x-5 [grid-template-columns:var(--reg-phone)] @min-[520px]:[grid-template-columns:var(--reg-medium)] @min-[820px]:[grid-template-columns:var(--reg-wide)]";

const ROW_STYLE = {
  "--reg-phone": "2.25rem minmax(0,1fr) 5.25rem",
  "--reg-medium": "2.25rem minmax(0,1fr) 5.25rem 7.5rem",
  // 7.5rem on the buys track so "Open-market buys" sets on one line at 13px
  // and the header row reads as five labels rather than four and a wrap.
  "--reg-wide": "2.5rem minmax(0,1fr) 5.25rem 7.5rem 4.75rem 4.75rem 5.5rem",
} as CSSProperties;

/** Anything full-width inside a row: the facts band, the folded quantities,
 *  the note. Starts at column one at every width. */
const FULL = "col-span-3 @min-[520px]:col-span-4 @min-[820px]:col-span-7";

/* ------------------------------------------------------------------- rows -- */

function ColumnHeader() {
  return (
    <div
      aria-hidden
      className={`${ROW_GRID} items-end border-t ${RULE} pt-3 text-[13px] leading-[1.35] text-foreground/45`}
      style={ROW_STYLE}
    >
      <span />
      <span>Feed</span>
      <span className="text-right">Records</span>
      <span className="hidden text-right @min-[520px]:block">
        Open-market buys
      </span>
      <span className="hidden text-right @min-[820px]:block">Filers</span>
      <span className="hidden text-right @min-[820px]:block">Issuers</span>
      <span className="hidden text-right @min-[820px]:block">Records from</span>
    </div>
  );
}

function Figure({
  className = "",
  lead,
  value,
}: {
  className?: string;
  lead?: boolean;
  value: string;
}) {
  return (
    <p
      className={`text-right tabular-nums leading-none ${
        lead
          ? "text-[20px] font-semibold tracking-[-0.015em] text-foreground"
          : "text-[16px] text-foreground/70"
      } ${className}`}
    >
      {value}
    </p>
  );
}

/** The host market's own facts, as the first row's own band rather than as a
 *  table above the object.
 *
 *  Only the facts the row does not already carry: the row's mono line is the
 *  disclosure source and the line under it is the filer vocabulary, so
 *  repeating `regulatorFullName` and `insiderTermPlural` here would put the
 *  same fact on screen twice in two wordings. What survives is the listing
 *  venue and the read cadence, neither of which the feed table knows. */
function HostFacts({ copy }: { copy: MarketCopy }) {
  const facts: Array<{ label: string; value: string }> = [
    { label: "Exchange", value: copy.exchangeFullName },
    { label: "Checked", value: "Every 15 minutes, through the trading day" },
  ];

  return (
    <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-1.5">
      {facts.map((f) => (
        <div key={f.label} className="flex items-baseline gap-2">
          <dt className={`shrink-0 ${KICKER} text-foreground/40`}>{f.label}</dt>
          <dd className="text-[14px] leading-[1.5] text-foreground/75">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FeedRow({
  copy,
  home,
  row,
}: {
  copy: MarketCopy;
  home: boolean;
  row: CoverageMarket;
}) {
  const feed = FEEDS[row.market];
  const Flag = FLAGS[row.market];
  const from = row.first_disclosed ? monthLabel(row.first_disclosed) : null;

  // Below xl the columns that lost their track are carried here rather than
  // dropped, labelled, in the order the header names them.
  const folded: string[] = [];

  if (row.open_market_buys != null) {
    folded.push(`${count(row.open_market_buys)} open-market buys`);
  }
  folded.push(`${count(row.insiders)} filers`);
  folded.push(`${count(row.issuers)} issuers`);
  if (from) folded.push(`records from ${from}`);

  return (
    <li className={`border-t ${RULE}`}>
      <div
        className={`${ROW_GRID} py-5 ${
          home
            ? "-mx-3 rounded-lg bg-brand-brown/[0.045] px-3 dark:bg-brand-tan/[0.08]"
            : ""
        }`}
        style={ROW_STYLE}
      >
        <Flag
          aria-hidden
          className="mt-0.5 h-[1.5rem] w-[2.25rem] rounded-[3px] ring-1 ring-black/10 dark:ring-white/15"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.015em] text-foreground">
              {feed.name}
            </h3>
            {home ? (
              <span
                className={`rounded-full border ${RULE} px-2 py-[2px] text-[11px] leading-[1.5] text-foreground/55`}
              >
                This site’s market
              </span>
            ) : null}
          </div>
          <p className={`mt-1.5 ${EYEBROW} leading-[1.4]`}>{feed.source}</p>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-foreground/55">
            {feed.filer}
          </p>
        </div>

        <Figure lead value={count(row.disclosures)} />
        <p className="hidden text-right text-[16px] tabular-nums leading-none text-foreground/70 @min-[520px]:block">
          {row.open_market_buys != null ? count(row.open_market_buys) : ""}
        </p>
        <Figure
          className="hidden @min-[820px]:block"
          value={count(row.insiders)}
        />
        <Figure
          className="hidden @min-[820px]:block"
          value={count(row.issuers)}
        />
        {/* Empty rather than a dash when the feed reports no first date: rule
            2 of the static pages, and the caption says what the column is. */}
        <p className="hidden text-right text-[16px] tabular-nums leading-none text-foreground/70 @min-[820px]:block">
          {from ?? ""}
        </p>

        {home ? (
          <div className={FULL}>
            <HostFacts copy={copy} />
          </div>
        ) : null}

        {/* The quantities with no column at this width. Gone at xl, where
            every one of them has a track and a heading of its own. */}
        <p
          className={`${FULL} mt-3 text-[14px] leading-[1.5] text-foreground/50 @min-[820px]:hidden`}
        >
          <span className="@min-[520px]:hidden">{folded.join(" · ")}</span>
          <span className="hidden @min-[520px]:inline">
            {folded.slice(1).join(" · ")}
          </span>
        </p>

        {feed.note ? (
          <p
            className={`${FULL} mt-3 max-w-[68ch] text-[14px] leading-[1.55] text-foreground/45`}
          >
            {feed.note}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- section -- */

export function SourcesRegister({
  copy,
  data,
  marketId,
  source,
}: {
  copy: MarketCopy;
  data: CoverageResponse;
  marketId: string;
  source: CoverageSource;
}) {
  const home = HOME_FEED[marketId];

  // FEED_ORDER's own order, with this host's feed hoisted to the front so the
  // reader's own market is the row that carries the expanded facts.
  const order = home
    ? [home, ...FEED_ORDER.filter((id) => id !== home)]
    : FEED_ORDER;

  const rows = order
    .map((id) => data.markets.find((m) => m.market === id))
    .filter((m): m is CoverageMarket => Boolean(m));

  return (
    <>
      {/* The exchange is left to the register below rather than named here as
          well: for the UK `regulatorFullName` already contains the venue, so
          interpolating both put "London Stock Exchange" in one sentence
          twice. */}
      <p className="max-w-[70ch] text-[16px] leading-[1.65] text-foreground/80">
        Markets don’t disclose the same way, and a pipeline that pretends they
        do gets the vocabulary wrong before it gets anything else wrong. In{" "}
        {copy.regionName} that means reading {copy.regulatorFullName}, filed by
        the people local rules call {copy.insiderTermPlural}, in their own
        format, standardised here, and never a third party’s summary of them.
      </p>

      <p className="mt-4 max-w-[70ch] text-[16px] leading-[1.65] text-foreground/80">
        And it is not one feed but five. They arrive in five formats, name their
        filers five different ways, and hold records reaching back to five
        different starting points, so the rows below are not like-for-like and
        the total is not a count of purchases.
      </p>

      <Fold className="mt-4 max-w-[70ch]" label="How to read the register">
        <p className="text-[16px] leading-[1.65] text-foreground/65">
          A US, Swedish or Dutch row is a single transaction line from a filing
          that may hold several, and a congressional row is an amount band
          sorted by fixed rules rather than by a model. Filers and issuers are
          counted on whatever stable identity each feed publishes, so a person
          who files in two markets is two filers here.
        </p>
      </Fold>

      {/* The container the row gates measure. Everything that shares the
          seven-track spec has to sit inside it, header included. */}
      <div className="@container mt-8">
        <ColumnHeader />
        <ol className={`border-b ${RULE}`}>
          {rows.map((row) => (
            <FeedRow
              key={row.market}
              copy={copy}
              home={row.market === home}
              row={row}
            />
          ))}
        </ol>
      </div>

      {/* The house caption, one step up from shared.tsx's 12.5px: the whole
          page moved to a larger scale this round and a caption set to the old
          number under a 16px body reads as a different document. */}
      <p className="mt-5 max-w-[74ch] text-[13px] leading-[1.6] text-foreground/50">
        {source === "snapshot" ? (
          <>
            Counted {monthLabel(data.generated_at)}, from a stored reading: the
            live count did not come back.
          </>
        ) : (
          <>
            Counted from the database, most recently in{" "}
            {monthLabel(data.generated_at)}.
          </>
        )}{" "}
        Open-market buys are a floor, counting only the rows a classifier has
        confirmed were bought on the market. Records from is the oldest record a
        feed holds, which is not the same as how long it has been watched.
      </p>
    </>
  );
}
