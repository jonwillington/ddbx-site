/** The cluster, shown rather than asserted.
 *
 *  `cluster.count` says "2 insiders bought inside a 14-day window" and the
 *  first version printed exactly that, as a sentence, in a card. It is the most
 *  interesting fact on a filing page — breadth is the one signal a single
 *  purchase cannot give you — and it was the least visual thing on the page.
 *
 *  So this fetches the issuer's other filings and draws the cluster: every
 *  purchase in the window on a shared date axis, with this one marked, and the
 *  people underneath ranked by what they put in. That turns "a strong cluster"
 *  from a label into something a reader can count for themselves.
 *
 *  Degrades to nothing. The company bundle is a second request for supporting
 *  evidence, so a failure leaves the page standing on the rest of its content
 *  rather than showing an empty frame — the caller renders the cluster's
 *  one-line summary either way, which is also what the pre-render emits.
 */
import type { Dealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cleanName, filingPath, money } from "../../../shared/filings.js";

import { api } from "@/lib/api";

const RULE = "border-hairline dark:border-separator";

/** Days either side of this trade to treat as "the window".
 *  `cluster.window_days` is the detector's own span, so it is used directly
 *  rather than a constant of this component's invention. */
function inWindow(iso: string, anchor: string, days: number) {
  const a = Date.parse(`${anchor}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

  return Math.abs(b - a) <= days * 86_400_000;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

interface Peer {
  id: string;
  name: string;
  role: string;
  date: string;
  value: number;
  isThis: boolean;
}

export function ClusterPanel({
  deal,
  fallback,
  market = "UK",
}: {
  deal: Dealing;
  /** Rendered instead of the drawing when the co-buyers cannot be loaded, so
   *  the section is never empty and the cluster is always stated exactly once
   *  somewhere on the page. */
  fallback: string;
  market?: string;
}) {
  // Typed as UK rows: this panel only renders on /dealings/:id, which is a UK
  // pipeline route (see functions/dealings/[id].js). A US filing page would
  // need the reporter shape too, and gets it when that route lands.
  const [deals, setDeals] = useState<Dealing[] | null>(null);

  const windowDays = deal.cluster?.window_days ?? 14;

  useEffect(() => {
    let live = true;

    api
      .companyPage(market, deal.ticker)
      .then((r) => live && setDeals(r.deals as Dealing[]))
      .catch(() => live && setDeals([]));

    return () => {
      live = false;
    };
  }, [market, deal.ticker]);

  const peers = useMemo<Peer[]>(() => {
    if (!deals) return [];

    return deals
      .filter((d) => inWindow(d.trade_date, deal.trade_date, windowDays))
      .map((d) => ({
        id: d.id,
        name: d.director?.name ?? "Insider",
        role: d.director?.role ?? "",
        date: d.trade_date,
        value: Number(d.value_gbp ?? 0),
        isThis: d.id === deal.id,
      }))
      .sort((a, b) => b.value - a.value);
  }, [deals, deal.id, deal.trade_date, windowDays]);

  if (!deals || peers.length < 2) {
    return (
      <p className="mt-5 max-w-[62ch] text-[14px] leading-[1.65] text-foreground/70">
        {fallback}
      </p>
    );
  }

  const dates = peers.map((p) => Date.parse(`${p.date}T00:00:00Z`));
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const span = Math.max(1, max - min);
  const top = Math.max(...peers.map((p) => p.value), 1);
  const total = peers.reduce((n, p) => n + p.value, 0);

  return (
    <div className="mt-5">
      {/* The window, as a line with a mark per purchase. Dates rather than a
          bar chart: the claim being made is about TIMING — several people
          acting close together — and a chart of values would answer a
          different question. */}
      <div className="px-1">
        <div className={`relative h-9 border-b ${RULE}`}>
          {peers.map((p) => {
            const x = ((Date.parse(`${p.date}T00:00:00Z`) - min) / span) * 100;

            return (
              <span
                key={`${p.id}-tick`}
                className="absolute bottom-0 -translate-x-1/2"
                style={{ left: `${x}%` }}
                title={`${p.name}, ${dayLabel(p.date)}`}
              >
                <span
                  className={`block rounded-full ${
                    p.isThis
                      ? "h-3 w-3 bg-brand-brown ring-4 ring-brand-brown/15 dark:bg-brand-tan dark:ring-brand-tan/15"
                      : "h-2 w-2 bg-foreground/25"
                  }`}
                  style={{ transform: "translateY(50%)" }}
                />
              </span>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-foreground/40">
          <span>
            {dayLabel(peers.reduce((a, b) => (a.date < b.date ? a : b)).date)}
          </span>
          <span>
            {dayLabel(peers.reduce((a, b) => (a.date > b.date ? a : b)).date)}
          </span>
        </div>
      </div>

      <ul className={`mt-4 border-t ${RULE}`}>
        {peers.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-3 border-b ${RULE} py-2.5`}
          >
            <span className="min-w-0 flex-1">
              {p.isThis ? (
                <span className="text-[13.5px] font-semibold text-foreground">
                  {p.name}
                  <span className="ml-2 rounded bg-brand-brown/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan">
                    This buy
                  </span>
                </span>
              ) : (
                <Link
                  className="text-[13.5px] text-foreground/85 underline-offset-4 hover:underline"
                  to={filingPath(p.id)}
                >
                  {p.name}
                </Link>
              )}
              <span className="mt-0.5 block text-[12px] text-foreground/45">
                {p.role || "Insider"} · {dayLabel(p.date)}
              </span>
            </span>
            <span className="w-20 shrink-0 sm:w-32">
              <span
                aria-hidden
                className={`block h-[4px] rounded-full ${
                  p.isThis
                    ? "bg-brand-brown/70 dark:bg-brand-tan/70"
                    : "bg-foreground/15"
                }`}
                style={{ width: `${Math.max(6, (p.value / top) * 100)}%` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right text-[13px] tabular-nums text-foreground/70">
              {money(p.value, deal.currency)}
            </span>
          </li>
        ))}
      </ul>

      {/* Deliberately states purchases and value, NOT a headcount.
          `cluster.count` is the detector's own figure and the only authoritative
          one; counting distinct names in this list produced a different number
          (it picked up a person-closely-associated filing the detector does
          not treat as a separate member) and printed it three lines from the
          detector's, disagreeing. One idea, one source. */}
      <p className="mt-3 text-[13px] leading-[1.6] text-foreground/55">
        {money(total, deal.currency)} across {peers.length}{" "}
        {peers.length === 1 ? "disclosed purchase" : "disclosed purchases"} at{" "}
        {cleanName(deal.company)} inside {windowDays} days.
      </p>
    </div>
  );
}
