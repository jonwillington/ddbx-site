/** Shared furniture for the broker landing pages — the best-for/* categories
 *  and the compare/* head-to-heads.
 *
 *  Both are the same kind of document as a broker review: a ruled editorial
 *  column with a fee table in it. Rather than let three pages drift apart on
 *  spacing and rule colour, the tokens and the section shell live here, lifted
 *  verbatim from broker-detail.tsx so the whole /brokers tree reads as one
 *  publication.
 *
 *  The column renderer is the load-bearing part. Each category declares which
 *  facts matter for its own question — an ISA page leads on platform fee and
 *  FX, a funds page on the percentage charge and whether trusts are available
 *  — and that editorial choice lives in shared/broker-categories.js as a list
 *  of column ids. This maps those ids to cells, so adding a column to a
 *  category is a data edit rather than a component change.
 */
import type { ColumnId } from "../../../shared/broker-categories";
import type { BrokerOffer } from "@/lib/api";

import { InformationCircleIcon } from "@heroicons/react/20/solid";

import { COLUMNS } from "../../../shared/broker-categories.js";

import { BrokerLogo, Tick } from "./broker-ui";

import { SeoSection } from "@/components/seo/section";
import { Tooltip } from "@/components/tooltip";
import {
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtVerifiedDate,
  platformFeeSummary,
  sourceLabel,
} from "@/lib/brokers";

/** Ruled-document tokens for the whole /brokers tree — the reviews import this
 *  map rather than keeping a second copy. The design language it serves is
 *  written up at the top of broker-detail.tsx. */
export const R = {
  // A half-step off the cream page — present but low-contrast. White is
  // reserved for the floating buy panel so it reads as the raised object.
  sheet:
    "rounded-2xl border border-hairline bg-sheet shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07] dark:bg-surface",
  rule: "border-hairline dark:border-separator",
  tile: "rounded-xl bg-black/[0.035] dark:bg-white/[0.05]",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
  subhead: "text-[12px] font-semibold text-foreground/55",
} as const;

/** Heading + content in the two-column ruled grid the broker pages use.
 *  Now the "rail" variant of the family-wide `SeoSection`; this wrapper stays
 *  so the /brokers tree keeps its established import path. */
export function PageSection({
  id,
  title,
  aside,
  children,
}: {
  id?: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SeoSection aside={aside} id={id} title={title} variant="rail">
      {children}
    </SeoSection>
  );
}

export const columnLabel = (id: ColumnId): string => COLUMNS[id] ?? id;

/** What each column actually means, for the header tooltip. Lifted from the
 *  /brokers grid so a column called "FX fee" is explained in the same words
 *  wherever it appears. */
export const COLUMN_HELP: Record<ColumnId, string> = {
  platformFee:
    "The recurring account/platform charge, a flat monthly fee, an annual percentage of your investments, or free.",
  ukDealing:
    "Commission to buy or sell a UK share. “Free” means commission-free dealing.",
  usDealing: "Commission to buy or sell a US share.",
  fx: "Currency-conversion fee charged on trades in non-GBP shares (e.g. US stocks).",
  isa: "Offers a Stocks & Shares ISA, invest tax-free up to the annual allowance.",
  sipp: "Offers a SIPP, a self-invested personal pension you choose your own holdings in.",
  lisa: "Offers a Lifetime ISA, for a first home or retirement, with a government bonus.",
  funds:
    "Lets you hold funds (OEICs and unit trusts), not just shares and ETFs.",
  investmentTrusts:
    "Lets you hold investment trusts, closed-ended funds listed on the exchange.",
  fractional:
    "Lets you buy fractional shares, a slice of a share, so you can invest small amounts.",
  usShares: "Lets you buy shares listed on the US exchanges.",
};

/** Column header label with an info tooltip. Was private to the /brokers grid;
 *  the category tables use the same headers and were the only fee tables on the
 *  site without an explanation attached to them. */
export function ColHeader({
  help,
  children,
}: {
  help: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip
      className="inline-flex cursor-help items-center gap-1 whitespace-nowrap align-middle"
      content={help}
    >
      {children}
      <InformationCircleIcon className="h-3 w-3 shrink-0 text-muted/40" />
    </Tooltip>
  );
}

/** First column of a horizontally-scrolling fee table: pinned, on the page fill
 *  so the scrolling cells pass under it rather than through it. Without this the
 *  platform name scrolls away and the row becomes four unlabelled numbers. */
export const STICKY_COL = `sticky left-0 z-10 bg-background border-r ${R.rule}`;

/** Weight on the cheaper of two comparable figures — the signal the cost table
 *  gives its winning column. Unrankable rows (a feature, or a figure missing on
 *  one side) keep the neutral ink. */
export function cheaperInk(
  mine: number | null | undefined,
  theirs: number | null | undefined,
): string {
  if (mine == null || theirs == null) return "text-foreground/85";

  return mine <= theirs
    ? "font-semibold text-foreground"
    : "text-foreground/65";
}

/** How to read a directly-rankable figure off a record, per column.
 *
 *  `platformFee` is deliberately absent: a monthly amount and a percentage
 *  aren't comparable without a balance, so marking one "best" would be a claim
 *  we can't substantiate. Same rule the comparison table's `cost` field applies.
 */
const RANKABLE: Partial<Record<ColumnId, (b: BrokerOffer) => number | null>> = {
  ukDealing: (b) => b.fees.trade_commission_uk_gbp,
  usDealing: (b) => b.fees.trade_commission_us_gbp,
  fx: (b) => b.fees.fx_fee_pct,
};

/** Whether this broker holds the lowest figure in a rankable column, so the
 *  cell can carry the weight. Lower is cheaper in every column listed above, so
 *  the verdict is uniform. */
export function bestInColumn(
  column: ColumnId,
  broker: BrokerOffer,
  brokers: BrokerOffer[],
): boolean {
  const read = RANKABLE[column];

  if (!read) return false;
  const mine = read(broker);

  if (mine == null) return false;
  const values = brokers.map(read).filter((v): v is number => v != null);

  // A single known figure isn't "the lowest" of anything.
  return values.length > 1 && mine <= Math.min(...values);
}

/** Overlapped logo pair — the media slot on a head-to-head card, so a list of
 *  comparisons reads as platforms rather than as six similar strings. Renders
 *  nothing until both records are in hand; half a pair is worse than none. */
export function LogoPair({ a, b }: { a?: BrokerOffer; b?: BrokerOffer }) {
  if (!a || !b) return null;

  return (
    <span className="flex -space-x-1.5">
      {[a, b].map((broker) => (
        <span
          key={broker.slug}
          className="rounded-lg ring-2 ring-sheet dark:ring-surface"
        >
          <BrokerLogo broker={broker} size={22} />
        </span>
      ))}
    </span>
  );
}

/** The three charges every broker surface leads on, as micro-tiles.
 *
 *  These pages were shipping ranked lists and pair columns with no figures on
 *  them at all while the crawler pre-render published the same three facts per
 *  entry — the reader was getting less than the bot. Same tile vocabulary as
 *  the review header's fact band, one size down. */
export function FeeTiles({
  broker: b,
  className = "",
}: {
  broker: BrokerOffer;
  className?: string;
}) {
  const tiles = [
    { label: "Platform fee", value: platformFeeSummary(b.fees) },
    { label: "UK dealing", value: fmtMoney(b.fees.trade_commission_uk_gbp) },
    { label: "FX", value: fmtPct(b.fees.fx_fee_pct) },
  ];

  return (
    <dl className={`grid grid-cols-3 gap-2 ${className}`}>
      {tiles.map((t) => (
        <div key={t.label} className={`${R.tile} px-3 py-2`}>
          <dt className={R.label}>{t.label}</dt>
          <dd className="mt-1.5 truncate text-[13.5px] font-semibold leading-none tracking-[-0.01em] tabular-nums text-foreground">
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Label · bar · value rows off one shared baseline — the review's cost
 *  comparison, lifted here so the head-to-head draws the same object instead of
 *  restating the same arithmetic as a table of four numbers.
 *
 *  Only the `primary` row carries full ink; identity lives in the row labels,
 *  never in colour alone. Pass `max` to hold several groups on one scale. */
export function CostBars({
  rows,
  max: maxProp,
  className = "",
}: {
  rows: { label: string; value: number; primary?: boolean }[];
  max?: number;
  className?: string;
}) {
  const max = maxProp ?? Math.max(...rows.map((row) => row.value), 1);

  return (
    <div
      className={`grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,11rem)_1fr_auto] ${className}`}
    >
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <span
            className={`truncate text-[13px] leading-none ${
              row.primary
                ? "font-semibold text-foreground"
                : "text-foreground/55"
            }`}
          >
            {row.label}
          </span>
          <span className={`h-[12px] self-center border-l ${R.rule}`}>
            <span
              className={`block h-full rounded-r-[4px] ${
                row.primary
                  ? "bg-foreground/80"
                  : "bg-foreground/20 dark:bg-white/20"
              }`}
              style={{ width: `${Math.max((row.value / max) * 100, 1.5)}%` }}
            />
          </span>
          <span
            className={`text-right text-[13px] leading-none tabular-nums ${
              row.primary
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/60"
            }`}
          >
            {fmtMoneyRound(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Where the figures came from and when they were last checked.
 *
 *  Takes a list rather than one broker so a head-to-head can cite both sides'
 *  pages; the check date is the OLDEST across them, for the same reason
 *  VerifiedNote uses the oldest — the reader's question is how stale the worst
 *  figure on the page might be. */
export function SourceNote({
  brokers,
  className = "",
}: {
  brokers: BrokerOffer[];
  className?: string;
}) {
  const sources = [
    ...new Map(
      brokers
        .flatMap((b) => b.sources ?? [])
        .map((source) => [sourceLabel(source), source]),
    ),
  ];

  if (!sources.length) return null;

  const checked = brokers
    .map((b) => b.last_verified)
    .filter(Boolean)
    .sort()[0];

  return (
    <p className={`text-xs leading-5 text-foreground/50 ${className}`}>
      <span className="mr-1 font-semibold text-foreground/55">Sources</span>
      {sources.map(([label, source], index) => (
        <span key={label}>
          <a
            className="underline underline-offset-2 hover:text-foreground/70"
            href={source}
            rel="noopener noreferrer"
            target="_blank"
          >
            {label}
          </a>
          {index < sources.length - 1 ? " · " : ""}
        </span>
      ))}
      {checked ? `. Checked ${fmtVerifiedDate(checked)}` : ""}.{" "}
      {brokers.length === 1
        ? `Always confirm current terms with ${brokers[0].name}.`
        : "Always confirm current terms on each provider’s own site."}
    </p>
  );
}

/** One comparison cell. Money and percentage fields go through the same
 *  formatters the compare grid uses, so "—" means unknown and "Free" means a
 *  genuine zero on every broker surface. */
export function ColumnValue({
  broker: b,
  column,
}: {
  broker: BrokerOffer;
  column: ColumnId;
}) {
  switch (column) {
    case "platformFee":
      return <>{platformFeeSummary(b.fees)}</>;
    case "ukDealing":
      return <>{fmtMoney(b.fees.trade_commission_uk_gbp)}</>;
    case "usDealing":
      return <>{fmtMoney(b.fees.trade_commission_us_gbp)}</>;
    case "fx":
      return <>{fmtPct(b.fees.fx_fee_pct)}</>;
    case "isa":
      return <Tick value={b.accounts.stocks_isa} />;
    case "sipp":
      return <Tick value={b.accounts.sipp} />;
    case "lisa":
      return <Tick value={b.accounts.lisa} />;
    case "funds":
      return <Tick value={b.assets.mutual_funds} />;
    case "investmentTrusts":
      return <Tick value={b.assets.investment_trusts} />;
    case "fractional":
      return <Tick value={b.assets.fractional_shares} />;
    case "usShares":
      return <Tick value={b.assets.us_shares} />;
    default:
      return <>—</>;
  }
}

/** "Checked against providers' official pages on 28 Jun 2026."
 *
 *  Derived from the oldest `last_verified` across the brokers actually on the
 *  page rather than the newest: the reader's question is how stale the WORST
 *  figure here might be, and answering with the freshest would flatter it. */
export function VerifiedNote({
  brokers,
  className,
}: {
  brokers: BrokerOffer[];
  className?: string;
}) {
  const oldest = brokers
    .map((b) => b.last_verified)
    .filter(Boolean)
    .sort()[0];

  if (!oldest) return null;

  return (
    <p className={`${R.label} leading-[1.6] ${className ?? ""}`}>
      Figures checked against providers’ official pages on{" "}
      {new Date(oldest).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
      . Always confirm current terms on the provider’s own site.
    </p>
  );
}
