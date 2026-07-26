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

import { COLUMNS } from "../../../shared/broker-categories.js";

import { Tick } from "./broker-ui";

import { fmtMoney, fmtPct, platformFeeSummary } from "@/lib/brokers";

/** Ruled-document tokens. Mirrors the `R` map in broker-detail.tsx. */
export const R = {
  sheet:
    "rounded-2xl border border-[#e8e0d5] bg-[#faf7f2] shadow-[0_1px_2px_rgba(90,65,40,0.03)] dark:border-white/[0.07] dark:bg-surface",
  rule: "border-[#e8e0d5] dark:border-separator",
  tile: "rounded-xl bg-black/[0.035] dark:bg-white/[0.05]",
  label: "text-[11px] leading-none text-foreground/50",
  body: "text-[14px] leading-[1.65] text-foreground/70",
  subhead: "text-[12px] font-semibold text-foreground/55",
} as const;

/** Heading + content in the two-column ruled grid the broker pages use. */
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
    <section
      className={`grid scroll-mt-24 gap-x-10 gap-y-4 border-t ${R.rule} py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-9`}
      id={id}
    >
      <div>
        <h2 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground">
          {title}
        </h2>
        {aside && <div className="mt-3">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export const columnLabel = (id: ColumnId): string => COLUMNS[id] ?? id;

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
