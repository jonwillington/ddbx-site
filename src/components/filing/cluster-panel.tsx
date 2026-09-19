/** The cluster, shown as one sentence and a list of people.
 *
 *  `cluster.count` says "2 insiders bought inside a 14-day window", and this
 *  panel exists to make that the most legible thing on the page rather than
 *  the most technical. The previous drawing (2026-09) was a ten-column
 *  calendar strip of every day in the span, weekend columns shaded, a tick
 *  under each purchase day, then calendar-chip rows, then a summary sentence
 *  saying the total again. Three devices, each restating the same two
 *  numbers, and Jon's verdict on it was "very hard to understand".
 *
 *  So now: a verdict line at heading scale, the way the checks section opens
 *  with its tally ("2 purchases 9 days apart, £910k in total"), then one
 *  contained panel (design language, tenet 1) holding one row per purchase
 *  in date order, the filing being read washed in the brand colour and
 *  tagged, every other row a door to its own page, and one quiet line saying
 *  exactly which purchases these are. Nothing here is called a cluster, a
 *  window or breadth.
 *
 *  Every figure is computed from the co-buyers this component loaded, never
 *  from the detector's own `count`: the two can disagree (the detector does
 *  not treat a person-closely-associated filing as a separate member), and
 *  the detector's number belongs to the section aside, where it is stated
 *  once. The panel counts *purchases*, not people, for the same reason.
 *
 *  Degrades to a sentence. The company bundle is a second request for
 *  supporting evidence, so while it loads, and if it fails, the caller's
 *  `fallback` (the detector's one-line summary, also what the pre-render
 *  emits) stands in, and the section is never empty.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { cleanName } from "../../../shared/filings.js";
import { filingFamily } from "../../../shared/filing-family.js";

import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";
import { panel } from "@/components/ui/panel";
import { useIssuerDeals } from "@/lib/issuer-deals";

const DAY = 86_400_000;

/** Days either side of this trade to treat as "the window".
 *  `cluster.window_days` is the detector's own span, so it is used directly
 *  rather than a constant of this component's invention. */
function inWindow(iso: string, anchor: string, days: number) {
  const a = Date.parse(`${anchor}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

  return Math.abs(b - a) <= days * DAY;
}

/** "Wed" and "2 Sept", from an ISO date. UTC throughout: filing dates are
 *  calendar dates with no time, and letting the local zone interpret them
 *  moves a purchase to the previous day for anyone west of London. */
function dateParts(iso: string) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return { weekday: "", day: "" };

  return {
    weekday: d.toLocaleDateString("en-GB", {
      weekday: "short",
      timeZone: "UTC",
    }),
    day: d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
  };
}

/** The role as the filing states it, with the one formula a lay reader
 *  cannot parse rewritten. "Person Closely Associated with a Shareholder
 *  Nominated Non-Executive Director" is the regulation's phrase for a
 *  spouse, dependant or controlled company of the named insider; "Close
 *  associate of a …" says the same thing in words a reader has met before.
 *  Everything else is left exactly as filed, because it is the record. */
export function plainRole(role: string) {
  const m = role.match(/^person\s+closely\s+associated\s+with\s+(.+)$/i);

  if (!m) return role;
  const rest = m[1].trim();

  // Keep an article the filing supplied; a bare title gets "the"; a named
  // person (Mr, Mrs, Ms, Dr …) gets neither.
  if (/^(?:an?|the)\s/i.test(rest)) return `Close associate of ${rest}`;
  if (/^(?:mr|mrs|ms|miss|dr|sir|dame|lord|lady)\b/i.test(rest))
    return `Close associate of ${rest}`;

  return `Close associate of the ${rest}`;
}

export interface Peer {
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
  deal: Dealing | UsDealing;
  /** Rendered instead of the panel while the co-buyers load and when they
   *  cannot be loaded, so the section is never empty and the cluster is
   *  always stated exactly once somewhere on the page. */
  fallback: string;
  market?: string;
}) {
  // Both markets. `market` picks the formatter family AND the company bundle,
  // so the rows read `reporter`/`value` on a US row and `director`/`value_gbp`
  // on a UK one without this component knowing which.
  const fam = filingFamily(market);
  const deals = useIssuerDeals(market, deal.ticker);

  const windowDays = deal.cluster?.window_days ?? 14;

  // Date order, oldest first. The old list ranked by value, which is a fact
  // about size; the section's claim is about timing, and a reader following
  // the dates down the list should meet them in order.
  const peers = useMemo<Peer[]>(() => {
    if (!deals) return [];

    return deals
      .filter((d) => inWindow(d.trade_date, deal.trade_date, windowDays))
      .map((d) => {
        const who = fam.insider(d);

        return {
          id: d.id,
          name: who.name || "Insider",
          role: who.role ?? "",
          date: d.trade_date,
          value: Number(fam.value(d) ?? 0),
          isThis: d.id === deal.id,
        };
      })
      .sort((a, b) =>
        a.date === b.date ? b.value - a.value : a.date < b.date ? -1 : 1,
      );
  }, [deals, deal.id, deal.trade_date, windowDays, fam]);

  if (!deals || peers.length < 2) {
    return (
      <p className="mt-5 max-w-measure text-body text-foreground/70">
        {fallback}
      </p>
    );
  }

  const dates = peers.map((p) => Date.parse(`${p.date}T00:00:00Z`));
  const spanDays = Math.round((Math.max(...dates) - Math.min(...dates)) / DAY);
  const total = peers.reduce((n, p) => n + p.value, 0);
  const company = cleanName(deal.company);

  // "9 days apart" is how two events relate; nine purchases are not "apart",
  // they happen "over 14 days" (the inclusive span, the count a reader gets
  // from the first and last dates on the rows below).
  const spanPhrase =
    spanDays === 0
      ? "on the same day"
      : peers.length === 2
        ? `${spanDays} ${spanDays === 1 ? "day" : "days"} apart`
        : `over ${spanDays + 1} days`;

  return (
    <div className="mt-6">
      {/* THE VERDICT, set the way the checks section sets its tally (one
          figure at heading scale, the rest of the sentence a step down in
          quieter ink), so the two sections open the same way and a reader
          who stops at this line has the whole story: how many, how close,
          how much. The second clause takes its own line in a phone sheet. */}
      <p className="text-heading font-semibold tabular-nums text-foreground">
        {peers.length} purchases
        <span className="mt-1 block text-title font-semibold text-foreground/70 sm:ml-2 sm:mt-0 sm:inline">
          {spanPhrase}, {fam.money(total)} in total
        </span>
      </p>

      <div className={`mt-5 overflow-hidden ${panel()}`}>
        {/* ONE ROW PER PURCHASE, in date order. The filing being read is
            washed in the brand colour and tagged, so a reader arriving cold
            can see where they are in the list without reading a name. */}
        <ul className="divide-y divide-rule">
          {peers.map((p) => (
            <PeerRow key={p.id} className="px-5" market={market} p={p} />
          ))}
        </ul>

        {/* Which purchases these are, exactly. `inWindow` collects purchases
            up to `windowDays` EITHER SIDE of this trade, so the set can span
            up to twice the detector's window, and the line says so rather
            than letting the verdict above imply otherwise. */}
        <p className="border-t border-rule px-5 py-3 text-small text-foreground/50">
          Every disclosed purchase at {company} within {windowDays} days
          either side of this one.
        </p>
      </div>
    </div>
  );
}

/** One purchase as a row: the date, who and what they are, what they put
 *  in, and the way to its own page. Shared with the filing page's other-buys
 *  list (issuer-buys.tsx) so a filing reached from either reads the same.
 *
 *  The row for the filing being read is not a link, is tagged, and carries
 *  the brand wash. Rows own no rules of their own: the list that holds them
 *  draws them with `divide-y divide-rule`, so the same row sits inside a
 *  rounded panel here and between page hairlines there. */
export function PeerRow({
  p,
  market,
  className = "",
}: {
  p: Peer;
  market?: string;
  /** Horizontal padding, for a row inside a panel. */
  className?: string;
}) {
  const fam = filingFamily(market);
  const { weekday, day } = dateParts(p.date);
  const body = (
    <>
      {/* The date, as words a reader already knows: weekday over "2 Sept".
          A fixed column so the names line up down the list. */}
      <span className="w-16 shrink-0">
        <span className="micro block text-foreground/45">{weekday}</span>
        <span className="mt-1 block text-body font-semibold tabular-nums text-foreground/80">
          {day}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-semibold text-foreground">
          {p.name}
          {p.isThis ? (
            <span
              className={`${CHIP_BASE} ${CHIP_SIZE.sm} ${CHIP_HAIRLINE} bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan`}
            >
              This purchase
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-small text-foreground/55">
          {p.role ? plainRole(p.role) : "Insider"}
        </span>
      </span>

      {/* What they put in is the row's headline: the panel's whole argument
          is how much money went in, so it is the largest thing on the row. */}
      <span className="shrink-0 text-right text-subheading font-semibold tabular-nums text-foreground">
        {fam.money(p.value)}
      </span>

      {/* A fixed slot either way, so the figures stay in one column whether
          or not the row is a link. */}
      <span className="flex w-4 shrink-0 justify-end">
        {p.isThis ? null : (
          <ArrowRightIcon
            aria-hidden
            className="h-4 w-4 text-foreground/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground/60"
          />
        )}
      </span>
    </>
  );

  return (
    <li
      className={
        p.isThis ? "bg-brand-brown/10 dark:bg-brand-tan/15" : undefined
      }
    >
      {p.isThis ? (
        <div className={`flex items-center gap-4 py-4 ${className}`}>{body}</div>
      ) : (
        <Link
          className={`group flex items-center gap-4 py-4 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brown/40 ${className}`}
          to={fam.path(p.id)}
        >
          {body}
        </Link>
      )}
    </li>
  );
}
