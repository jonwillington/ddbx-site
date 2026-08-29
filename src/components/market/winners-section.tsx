// Winners tab for the mobile homepage list. Where the chronological feed
// answers "what filed?", this answers the question a cold visitor actually
// has: "does following these people work?" Each card links to the filing's own
// page; an interstitial midway makes the app ask.
//
// Cards are LABELLED FIELDS, not sentences. The sentence form ("Jane Doe, CFO
// at Eurocell, bought £21k and is up +18.4% in 34 days.") wrapped to three
// lines on a phone and buried the number that does the persuading in the
// middle of the third one. Someone who just landed should be able to read the
// company, the move and the size without reading a clause.
//
// Data comes from the 90-day channel window (channelDealings), not the page's
// ~1-month dealings fetch — winners need time to season, and a card claiming
// "+0.4% in 1 day" would be noise dressed as proof. Selection lives in
// buildWinners (channel-summary.ts): positive live return only, ≥ 7 days held
// unless nothing qualifies, one card per ticker.
//
// Static-page rules apply: empty and failed are different states, and no
// figure is ever rendered that the data doesn't carry.
import type { MarketDealing } from "@/lib/markets/types";

import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

import {
  buildWinners,
  type WinnerDealing,
} from "@/lib/performance/channel-summary";
import { formatSignedPct } from "@/lib/performance/format";
import {
  BUTTON_FILLED,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/skeleton";

/** iOS-style payoff stake for the top card — "£1,000 at disclosure → £X
 *  today". Matches the channel's HeroContributorCard so the two surfaces
 *  can't disagree. */
const STAKE = 1000;

/** Interstitial position: the app ask lands after this many winner cards. */
const INTERSTITIAL_AFTER = 3;

/** Shared card chrome — same lifted card as the channel's top pick. */
const CARD_CLASS =
  "block rounded-xl border border-hairline bg-white/45 shadow-[0_8px_24px_-22px_rgba(61,43,26,0.8)] dark:border-border/70 dark:bg-surface-secondary/35";

export function WinnersSection<W>({
  dealings,
  failed,
  formatValue,
  dealHref,
  appHref,
  onShowChronological,
}: {
  /** The channel window rows — null while the fetch is in flight. */
  dealings: MarketDealing<W>[] | null;
  /** True when the channel fetch errored (failed ≠ empty). */
  failed: boolean;
  /** Market money formatter (major units). */
  formatValue: (n: number) => string;
  /** Route for a winner's own filing page (UK → /dealings/:id). */
  dealHref: (id: string) => string;
  /** Store link (or /download fallback) for the app CTAs. */
  appHref: string;
  /** Switches the mobile list to the chronological tab — the fallback
   *  affordance when there are no winners to show. */
  onShowChronological: () => void;
}) {
  const loading = dealings === null && !failed;
  const winners = dealings ? buildWinners(dealings as MarketDealing[]) : [];

  return (
    <section aria-label="Best recent insider buys" className="space-y-3">
      <header className="space-y-1 px-1">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown/80 dark:text-brand-tan/80">
          Best of the last 90 days
        </p>
        <p className="text-sm leading-relaxed text-foreground/60">
          Real buys by company directors, flagged the day they filed.
        </p>
      </header>

      {loading && <WinnersSkeleton />}

      {failed && (
        <div className={`${CARD_CLASS} px-4 py-5 text-center`}>
          <p className="text-sm font-medium text-foreground/80">
            Couldn&rsquo;t load the winners list.
          </p>
          <div className="mt-3 flex flex-col items-center gap-2">
            <button
              className={`${BUTTON_RADIUS} ${BUTTON_GHOST} px-4 py-2.5 text-sm font-semibold`}
              data-ga-event="cta_winners_show_chronological"
              data-ga-label="winners_failed"
              type="button"
              onClick={onShowChronological}
            >
              See the day-by-day feed
            </button>
            <a
              className="text-sm font-medium text-brand-brown hover:underline dark:text-brand-tan"
              data-ga-event="cta_winners_footer_app"
              data-ga-label="winners_failed"
              href={appHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              Or get every deal in the app
            </a>
          </div>
        </div>
      )}

      {!loading && !failed && winners.length === 0 && (
        <div className={`${CARD_CLASS} px-4 py-5 text-center`}>
          <p className="text-sm font-medium text-foreground/80">
            No priced winners to show right now.
          </p>
          <p className="mt-1 text-sm text-foreground/55">
            The full day-by-day feed has every filing.
          </p>
          <button
            className={`mt-3 ${BUTTON_RADIUS} ${BUTTON_GHOST} px-4 py-2.5 text-sm font-semibold`}
            data-ga-event="cta_winners_show_chronological"
            data-ga-label="winners_empty"
            type="button"
            onClick={onShowChronological}
          >
            See the day-by-day feed
          </button>
        </div>
      )}

      {winners.length > 0 && (
        <ul className="space-y-3">
          {winners.map((w, i) => (
            <li key={w.id} className="space-y-3">
              <WinnerCard
                formatValue={formatValue}
                href={dealHref(w.id)}
                showPayoff={i === 0}
                winner={w}
              />
              {/* App ask after the proof has landed — mid-list when there's a
                  list to be mid of, after the last card otherwise. */}
              {(winners.length > INTERSTITIAL_AFTER
                ? i === INTERSTITIAL_AFTER - 1
                : i === winners.length - 1) && (
                <AppInterstitial appHref={appHref} />
              )}
            </li>
          ))}
        </ul>
      )}

      {winners.length > 0 && (
        <div className="flex flex-col items-center gap-1.5 px-1 pt-1 text-center">
          <p className="text-sm text-foreground/60">
            Every new filing, rated, in the app as it lands.
          </p>
          <a
            className="text-sm font-semibold text-brand-brown hover:underline dark:text-brand-tan"
            data-ga-event="cta_winners_footer_app"
            data-ga-label="winners_footer"
            href={appHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Get the app free
          </a>
        </div>
      )}

      {!loading && (
        <p className="px-1 text-[10px] leading-relaxed text-muted">
          Share-price change since disclosure. Winners chosen after the fact.
          Not financial advice; capital is at risk.
        </p>
      )}
    </section>
  );
}

/** One winner as labelled fields. Reading order is company → return → who →
 *  size/age, because that is the order the questions arrive in. Degrades
 *  rather than invents: no role → just the name; no value → "Shares". */
function WinnerCard({
  winner: w,
  href,
  formatValue,
  showPayoff,
}: {
  winner: WinnerDealing;
  href: string;
  formatValue: (n: number) => string;
  showPayoff: boolean;
}) {
  const bought =
    w.value != null && w.value > 0 ? formatValue(w.value) : "Shares";

  return (
    <Link
      className={`${CARD_CLASS} group px-3.5 py-3 transition-colors hover:border-positive/30 hover:bg-white/70`}
      data-ga-event="cta_winner_read_analysis"
      data-ga-label={w.ticker}
      to={href}
    >
      <span className="flex items-start gap-3">
        <CompanyLogo size={38} ticker={w.ticker} />
        <span className="min-w-0 flex-1">
          {/* The two things worth a glance, on one line and at opposite ends:
              what it is, and what it did. */}
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-semibold leading-snug text-foreground">
              {w.company}
            </span>
            <span className="shrink-0 text-[15px] font-bold tabular-nums text-positive">
              {formatSignedPct(w.returnPct)}
            </span>
          </span>

          {/* Who bought. Secondary: it qualifies the buy, it isn't the hook. */}
          <span className="mt-0.5 block truncate text-[13px] leading-snug text-foreground/60">
            {w.insiderName}
            {w.insiderRole ? ` · ${w.insiderRole}` : ""}
          </span>

          {/* Size and age as labelled pairs, so neither number has to be
              inferred from a preposition. */}
          <span className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] leading-snug">
            <span className="flex items-baseline gap-1.5">
              <span className="text-muted">Bought</span>
              <span className="font-semibold tabular-nums text-foreground/85">
                {bought}
              </span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-muted">Since</span>
              <span className="font-semibold tabular-nums text-foreground/85">
                {w.daysHeld} {w.daysHeld === 1 ? "day" : "days"}
              </span>
            </span>
          </span>

          {showPayoff && (
            <span className="mt-2 flex items-baseline gap-1 border-t border-positive/15 pt-1.5 text-[10.5px] tabular-nums text-muted">
              {formatValue(STAKE)} at disclosure →
              <span className="font-semibold text-foreground">
                {formatValue(STAKE * (1 + w.returnPct))} today
              </span>
            </span>
          )}
          <span className="mt-1.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand-brown group-hover:underline dark:text-brand-tan">
            Read the analysis
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** The mid-list app ask. These cards are winners with hindsight; the app is
 *  how you see the next one at the start. */
function AppInterstitial({ appHref }: { appHref: string }) {
  return (
    <div className={`${CARD_CLASS} px-4 py-4 text-center`}>
      <p className="text-[15px] font-semibold text-foreground">
        Every deal is in the ddbx app
      </p>
      <p className="mt-1 text-sm leading-relaxed text-foreground/60">
        These are the winners with hindsight. The app sends every new filing the
        moment it lands, so you see the next one at the start.
      </p>
      <a
        className={`mt-3 inline-flex items-center justify-center ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-2.5 text-sm font-semibold shadow-md`}
        data-ga-event="cta_winners_app_interstitial"
        data-ga-label="winners_after_3"
        href={appHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        Get the app free
      </a>
    </div>
  );
}

/** Loading state matching the arrived geometry — logo circle, sentence lines,
 *  link line — so nothing jumps when the cards paint. */
function WinnersSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className={`${CARD_CLASS} px-3.5 py-3`}>
          <div className="flex items-start gap-3">
            <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/5 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
