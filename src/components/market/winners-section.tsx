// Winners tab for the mobile homepage list. Where the chronological feed
// answers "what filed?", this answers the question a cold visitor actually
// has: "does following these people work?" Each card links to the filing's own
// page; an interstitial midway makes the app ask.
//
// Cards are a HEADLINE PLUS A SENTENCE. The scannable part — company, and the
// return in green at the opposite end — stays on one line, so the move is
// readable at a glance. Under it the card spells out in plain words what the
// director did and what it came to, because a first-time visitor does not know
// what "disclosure" means, and "Bought £29,848 · Since 71 days" made them
// assemble the meaning themselves.
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

import { dealsForMarket } from "./hero-deal-data";
import {
  HeroNotificationStack,
  useNotificationTick,
} from "./hero-notification-stack";

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

/** Illustration stake for a card whose trade value the wire didn't carry —
 *  "£1,000 put in alongside them would be worth £X today". Same figure as the
 *  channel's HeroContributorCard, so the two surfaces can't disagree. */
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
  marketId,
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
  /** Picks the market's own example alerts for the interstitial's
   *  notification stack, so a US reader isn't shown LSE tickers. */
  marketId?: string;
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
          Directors buying shares in the company they run, with their own money.
          Here is how those buys have done since.
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
                winner={w}
              />
              {/* App ask after the proof has landed — mid-list when there's a
                  list to be mid of, after the last card otherwise. */}
              {(winners.length > INTERSTITIAL_AFTER
                ? i === INTERSTITIAL_AFTER - 1
                : i === winners.length - 1) && (
                <AppInterstitial appHref={appHref} marketId={marketId} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One winner, in sentences a first-time visitor can read without knowing
 *  what a disclosure is. The labelled-field version ("Bought £29,848   Since
 *  71 days") was compact but it asked the reader to assemble the meaning
 *  themselves, and "Since 71 days" isn't English. The card now says what
 *  happened and what it was worth, in that order.
 *
 *  Degrades rather than invents: with no trade value it can't state a stake or
 *  what the stake became, so it falls back to the fixed £1,000 illustration —
 *  which is a hypothetical and says so — and it never prints a role it
 *  doesn't have. */
function WinnerCard({
  winner: w,
  href,
  formatValue,
}: {
  winner: WinnerDealing;
  href: string;
  formatValue: (n: number) => string;
}) {
  const value = w.value != null && w.value > 0 ? w.value : null;
  const days = `${w.daysHeld} ${w.daysHeld === 1 ? "day" : "days"} ago`;

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

          {/* The whole story, in two short sentences. */}
          <span className="mt-2 block text-[13px] leading-relaxed text-foreground/75">
            {value != null ? (
              <>
                Bought{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatValue(value)}
                </span>{" "}
                of shares in their own company {days}. That stake is worth{" "}
                <span className="font-semibold tabular-nums text-positive">
                  {formatValue(value * (1 + w.returnPct))}
                </span>{" "}
                today.
              </>
            ) : (
              <>
                Bought shares in their own company {days}. {formatValue(STAKE)}{" "}
                put in alongside them would be worth{" "}
                <span className="font-semibold tabular-nums text-positive">
                  {formatValue(STAKE * (1 + w.returnPct))}
                </span>{" "}
                today.
              </>
            )}
          </span>

          {/* Honest label: winners are ranked on price, and the biggest
              movers are often filings the screen passed over, whose page
              carries the record and the reason but no written analysis. */}
          <span className="mt-1.5 inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand-brown group-hover:underline dark:text-brand-tan">
            {w.analysed ? "Read the analysis" : "See the filing"}
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** The mid-list app ask. These cards are winners with hindsight; the app is
 *  how you see the next one at the start.
 *
 *  The claim this card makes — "the app sends every new filing the moment it
 *  lands" — is a claim about an alert, and a paragraph is a weak way to make
 *  it. The live notification stack (the same object the homepage hero and the
 *  share funnel use) shows the alert instead of describing it, which is why
 *  this card is given more room than the winner cards around it rather than
 *  matching them. Under prefers-reduced-motion `useNotificationTick` freezes
 *  and the stack rests on a single static card, which is still the proof. */
function AppInterstitial({
  appHref,
  marketId,
}: {
  appHref: string;
  marketId?: string;
}) {
  const tick = useNotificationTick(true);

  return (
    <div className={`${CARD_CLASS} px-5 py-6 text-center`}>
      <p className="text-[17px] font-semibold leading-snug text-foreground">
        Every deal is in the ddbx app
      </p>
      <p className="mx-auto mt-1.5 max-w-[34ch] text-sm leading-relaxed text-foreground/60">
        These are the winners with hindsight. The app sends every new filing the
        moment it lands, so you see the next one at the start.
      </p>

      {/* Capped and centred: the stack sizes to its column, and full-bleed
          inside the card it would out-scale the winner cards it sits between. */}
      <div className="mx-auto mt-4 w-full max-w-[320px]">
        <HeroNotificationStack deals={dealsForMarket(marketId)} tick={tick} />
      </div>

      <a
        className={`mt-5 inline-flex items-center justify-center ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-[15px] font-semibold shadow-md`}
        data-ga-event="cta_winners_app_interstitial"
        data-ga-label="winners_after_3"
        href={appHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        Get the app free
      </a>
      <p className="mt-2 text-xs text-foreground/50">
        Free for 7 days, cancel any time.
      </p>
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
