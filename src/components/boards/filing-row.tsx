/** One ranked disclosure, as the performance board and the role hubs list it.
 *
 *  Deliberately NOT extracted from biggest-buys.tsx's BuyRow. That row leads on
 *  the pair of money figures ("£3.8m became £5.2m") because value is what it
 *  ranks; these pages rank on alpha and on who filed, so the same layout would
 *  put the ranked quantity in the smallest type on the row. Same vocabulary,
 *  different emphasis.
 *
 *  The row links to the purchase, not the issuer — every UK disclosure has a
 *  permanent page and sending the click to the company index throws away what
 *  the reader chose. `/dealings/:id` is a UK pipeline route, so US rows fall
 *  back to the company page rather than a 404 (see functions/dealings/[id].js).
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { Link } from "react-router-dom";

import { buyAlpha, buyPerson, buyValue } from "../../../shared/leaderboard.js";
import { filingPath } from "../../../shared/filings.js";

import { money, R } from "@/components/sector-ui";
import { ClusterChip } from "@/components/cluster-chip";
import { CompanyLogo } from "@/components/company-logo";
import { DeltaBadge } from "@/components/market/market-row";
import { shortDate } from "@/components/market/market-utils";
import { TickerPill } from "@/components/ticker-pill";
import { MeterBar } from "@/components/seo/meter-bar";
import {
  cleanCompanyName,
  cleanInsiderName,
  companyPath,
  displayTicker,
} from "@/lib/company";

const ROW_LINK =
  "-mx-2 block rounded-lg px-2 py-3.5 outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:hover:bg-white/[0.03]";

const ROW_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_9rem] sm:gap-x-4";

/** "12 Jun", with the year when it isn't this one. A rolling twelve-month
 *  window straddles two calendar years, so a bare day-and-month is ambiguous on
 *  exactly the rows a reader is most likely to misread. */
function dateLabel(iso: string | null | undefined, locale: string): string {
  const raw = String(iso ?? "");

  if (!raw) return "—";
  const label = shortDate(raw, locale);
  const year = raw.slice(0, 4);

  return year && year !== String(new Date().getFullYear())
    ? `${label} ${year}`
    : label;
}

export function FilingRow({
  deal: d,
  locale,
  marketId,
  /** What the meter is drawn against. The ranked quantity, so the bar measures
   *  the thing the board is sorted by rather than decorating the row. */
  meterMax,
  meterValue,
  position,
  /** Shown under the figure. Omitted on the role hubs, where every row on the
   *  page shares the same role and repeating it is noise. */
  showRole = false,
  symbol,
}: {
  deal: Dealing | UsDealing;
  locale: string;
  marketId: "UK" | "US";
  meterMax: number;
  meterValue: number;
  position: number;
  showRole?: boolean;
  symbol: string;
}) {
  const alpha = buyAlpha(d);
  const ticker = displayTicker(d.ticker ?? "");
  const person = cleanInsiderName(buyPerson(d) ?? "");
  const role =
    marketId === "US"
      ? ((d as UsDealing).reporter?.officer_title ?? "")
      : ((d as Dealing).director?.role ?? "");
  const href =
    marketId === "UK" && d.id ? filingPath(d.id) : companyPath(d.ticker ?? "");

  return (
    <li className={`border-b ${R.rule}`}>
      <Link className={ROW_LINK} to={href}>
        <div className={ROW_GRID}>
          <span
            aria-hidden
            className={`font-mono text-[15px] leading-[1.35] tabular-nums ${
              position <= 3 ? "text-foreground" : "text-foreground/35"
            }`}
          >
            {String(position).padStart(2, "0")}
          </span>

          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <CompanyLogo size={28} ticker={d.ticker ?? ""} />
              <span className="min-w-0 truncate text-[16px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[18px]">
                {cleanCompanyName(d.company ?? "") || ticker}
              </span>
              <TickerPill ticker={ticker} />
            </span>

            <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-[1.35] text-foreground/50">
              {person ? (
                <span className="max-w-[24ch] truncate">{person}</span>
              ) : null}
              {showRole && role ? (
                <>
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <span className="max-w-[26ch] truncate">{role}</span>
                </>
              ) : null}
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="tabular-nums">
                {dateLabel(d.trade_date, locale)}
              </span>
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="tabular-nums">{money(buyValue(d), symbol)}</span>
              {d.cluster ? (
                <span className="inline-flex items-center gap-1">
                  <ClusterChip cluster={d.cluster} />
                  <span>of {d.cluster.count} insiders</span>
                </span>
              ) : null}
            </span>
          </span>

          {/* Alpha carries the row, because alpha is what the board ranks. */}
          <span className="text-right">
            <span className="sr-only">Alpha since disclosure: </span>
            {alpha == null ? (
              <span className="text-[13px] tabular-nums text-foreground/40">
                n/a
              </span>
            ) : (
              <span
                className={`text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] sm:text-[26px] ${
                  alpha >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {alpha > 0 ? "+" : ""}
                {(alpha * 100).toFixed(1)}pp
              </span>
            )}
          </span>

          <MeterBar
            className="col-span-3 mt-2.5"
            max={meterMax}
            value={meterValue}
          />
        </div>
      </Link>
    </li>
  );
}

/** The alpha badge, for pages that show it inside a denser row.
 *
 *  Three states, not two. `null` is unmeasured; a figure that rounds to zero at
 *  one decimal place is measured and flat, and it gets neutral type rather than
 *  a badge. DeltaBadge colours and points its arrow on the sign alone, so a
 *  median alpha of +0.04pp renders as a green "▲ +0.0PP" — an arrow claiming a
 *  rise above a number saying there wasn't one. The 2026-08-02 round logged the
 *  same shape ("+0.0% against +0.0%") as a defect on the filing pages.
 *
 *  Contained here rather than fixed in DeltaBadge: that component is on the
 *  market rows, the drawer and /biggest-buys, and changing how every one of
 *  them renders a flat figure is a live-page decision, not a side effect of
 *  adding four pages. Noted as a follow-up in the round-three investigation. */
export function AlphaBadge({ ratio }: { ratio: number | null }) {
  if (ratio == null) {
    return (
      <span className="text-[13px] tabular-nums text-foreground/40">n/a</span>
    );
  }

  const pp = ratio * 100;

  if (Math.abs(pp) < 0.05) {
    return (
      <span className="text-[13px] tabular-nums text-foreground/50">0.0pp</span>
    );
  }

  return <DeltaBadge suffix="pp" value={pp} />;
}
