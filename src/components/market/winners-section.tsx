// Winners tab for the mobile homepage list. Where the chronological feed
// answers "what filed?", this answers the question a cold visitor actually
// has: "does following these people work?" Each row links to the filing's own
// page; an interstitial midway makes the app ask.
//
// Rows, not cards. This shipped as a stack of lifted cards and on a phone
// that bought two and a half winners per screen: card padding, shadow and
// gutter around each item, plus a fixed navbar and a pinned trial button
// eating a third of the viewport between them. The design language's third
// tenet (investigations/2026-08-30-design-language.md) puts selling lists in
// full-width hairline rows, and this list is doing selling work — so it is
// rows now: rule between items, logo left, the same headline-plus-sentence
// inside. It also makes the tab pair read as one list re-sorted, which is how
// a segmented control presents them, rather than two products.
//
// Each row is a HEADLINE PLUS A SENTENCE. The scannable part — company, and
// the return in green at the opposite end — stays on one line, so the move is
// readable at a glance. The return is the only green figure on the row and
// the largest thing on it: the earlier version also painted the "worth today"
// figure green and the two competed. Under it one sentence says what the
// director did and what it came to, in plain words, because a first-time
// visitor does not know what "disclosure" means. The header above the list
// says "in the company they run" once; the rows don't repeat it, which was
// costing a wrapped line per row.
//
// Data comes from the 90-day channel window (channelDealings), not the page's
// ~1-month dealings fetch — winners need time to season, and a row claiming
// "+0.4% in 1 day" would be noise dressed as proof. Selection lives in
// buildWinners (channel-summary.ts): positive live return only, ≥ 7 days held
// unless nothing qualifies, one row per ticker.
//
// Static-page rules apply: empty and failed are different states, and no
// figure is ever rendered that the data doesn't carry.
import type { MarketDealing } from "@/lib/markets/types";
import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";
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
import { useSuppressFloatingCta } from "@/lib/floating-cta";
import {
  BUTTON_FILLED,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";
import { CompanyLogo } from "@/components/company-logo";
import { RowList } from "@/components/row-list";
import { Skeleton } from "@/components/skeleton";

/** Illustration stake for a row whose trade value the wire didn't carry —
 *  "£1,000 put in alongside them would be worth £X today". Same figure as the
 *  channel's HeroContributorCard, so the two surfaces can't disagree. */
const STAKE = 1000;

/** Interstitial position: the app ask lands after this many winner rows. */
const INTERSTITIAL_AFTER = 3;

/** Hairline rule shared with RowList, so the list closes on the same line
 *  weight it opened on. */
const RULE = "border-hairline dark:border-separator";

/** Panel chrome for the non-row states (failed, empty) and the interstitial:
 *  a contained object sitting between rows, per tenet 1. */
const PANEL_CLASS =
  "rounded-xl border border-hairline bg-white/45 shadow-[0_8px_24px_-22px_rgba(61,43,26,0.8)] dark:border-border/70 dark:bg-surface-secondary/35";

/** Reader-facing role. The wire's PCA role is a sentence — "Person Closely
 *  Associated to J Smith (Chief Executive)", or the abbreviated "PCA of CFO
 *  J Smith" — and on a phone the long form truncated to "Person Closely
 *  Associated to …" on every PCA row, which is the one part of the phrase
 *  that carries no meaning on its own, while the short form leans on an
 *  acronym a first-time visitor doesn't know. Collapse both to the
 *  plain-words relation the /roles page already uses. Everything else is
 *  short enough to pass through. */
function displayRole(role: string | undefined): string | undefined {
  if (!role) return undefined;
  if (/closely\s+associated|^\s*PCA\b/i.test(role)) {
    return "Associate of an insider";
  }

  return role;
}

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

  // The app ask lands after the proof has landed — mid-list when there's a
  // list to be mid of, after the last row otherwise. Built as a flat list of
  // <li>s so the interstitial owns its own rule rather than sitting inside a
  // winner's row.
  const items: ReactNode[] = [];

  winners.forEach((w, i) => {
    items.push(
      <WinnerRow
        key={w.id}
        formatValue={formatValue}
        href={dealHref(w.id)}
        winner={w}
      />,
    );
    const askHere =
      winners.length > INTERSTITIAL_AFTER
        ? i === INTERSTITIAL_AFTER - 1
        : i === winners.length - 1;

    if (askHere) {
      items.push(
        <li key="interstitial" className={`border-b ${RULE} py-3`}>
          <AppInterstitial appHref={appHref} marketId={marketId} />
        </li>,
      );
    }
  });

  return (
    <section aria-label="Best recent insider buys" className="space-y-3">
      {/* The tab above already says "Best of 90 days", so the header carries
          only the one line of context the rows lean on: whose money, and
          that these are results, not picks. */}
      <p className="text-sm leading-relaxed text-foreground/65">
        Directors buying shares in the company they run, with their own money.
        Here is how those buys have done since.
      </p>

      {loading && <WinnersSkeleton />}

      {failed && (
        <div className={`${PANEL_CLASS} px-4 py-5 text-center`}>
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
        <div className={`${PANEL_CLASS} px-4 py-5 text-center`}>
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

      {winners.length > 0 && <RowList ordered={false}>{items}</RowList>}
    </section>
  );
}

/** One winner, in a sentence a first-time visitor can read without knowing
 *  what a disclosure is: what they put in, when, and what it is worth now.
 *  The whole row is the link; the trailing label at the end of the sentence
 *  is an honest one — winners are ranked on price, and the biggest movers are
 *  often filings the screen passed over, whose page carries the record and
 *  the reason but no written analysis.
 *
 *  Degrades rather than invents: with no trade value it can't state a stake
 *  or what the stake became, so it falls back to the fixed £1,000
 *  illustration — which is a hypothetical and says so — and it never prints a
 *  role it doesn't have. */
function WinnerRow({
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
  const role = displayRole(w.insiderRole);

  return (
    <li className={`border-b ${RULE}`}>
      <Link
        className="group flex items-start gap-3 py-3.5"
        data-ga-event="cta_winner_read_analysis"
        data-ga-label={w.ticker}
        to={href}
      >
        <CompanyLogo size={36} ticker={w.ticker} />
        <span className="min-w-0 flex-1">
          {/* The two things worth a glance, on one line and at opposite ends:
              what it is, and what it did. The return is the hook, so it is
              the larger of the two. */}
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-semibold leading-snug text-foreground">
              {w.company}
            </span>
            <span className="shrink-0 text-[17px] font-bold tabular-nums leading-none text-positive">
              {formatSignedPct(w.returnPct)}
            </span>
          </span>

          {/* Who bought. Secondary: it qualifies the buy, it isn't the hook. */}
          <span className="mt-0.5 block truncate text-[13px] leading-snug text-foreground/60">
            {w.insiderName}
            {role ? ` · ${role}` : ""}
          </span>

          {/* The story in one sentence, then the honest label for what the
              row's page holds. Stake figures are ink, not green: one green
              number per row. */}
          <span className="mt-1.5 block text-[13px] leading-relaxed text-foreground/75">
            {value != null ? (
              <>
                Bought{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatValue(value)}
                </span>{" "}
                worth {days}. Now worth{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatValue(value * (1 + w.returnPct))}
                </span>
                .
              </>
            ) : (
              <>
                Bought shares {days}. {formatValue(STAKE)} put in alongside them
                would be worth{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatValue(STAKE * (1 + w.returnPct))}
                </span>{" "}
                today.
              </>
            )}{" "}
            <span className="inline-flex items-baseline whitespace-nowrap font-semibold text-brand-brown group-hover:underline dark:text-brand-tan">
              {w.analysed ? "Read the analysis" : "See the filing"}
              <ChevronRightIcon className="h-3.5 w-3.5 self-center" />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The mid-list app ask. These rows are winners with hindsight; the app is
 *  how you see the next one at the start.
 *
 *  The claim this panel makes — "the app sends every new filing the moment it
 *  lands" — is a claim about an alert, and a paragraph is a weak way to make
 *  it. The live notification stack (the same object the homepage hero and the
 *  share funnel use) shows the alert instead of describing it, which is why
 *  this panel is given more room than the rows around it rather than
 *  matching them. Under prefers-reduced-motion `useNotificationTick` freezes
 *  and the stack rests on a single static card, which is still the proof.
 *
 *  While it is on screen it holds the layout's floating trial button away:
 *  the panel sits exactly where that button also sits on a phone, and two
 *  identical app asks stacked in one viewport read as pressure. */
function AppInterstitial({
  appHref,
  marketId,
}: {
  appHref: string;
  marketId?: string;
}) {
  const tick = useNotificationTick(true);
  const ref = useRef<HTMLDivElement | null>(null);
  const [onScreen, setOnScreen] = useState(false);

  useSuppressFloatingCta(onScreen);

  useEffect(() => {
    const el = ref.current;

    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      // A third of the panel is enough: at that point its own button is
      // about to clear the pinned one, and the pinned one should be gone
      // before they overlap rather than after.
      { threshold: 0.3 },
    );

    io.observe(el);

    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${PANEL_CLASS} px-5 py-6 text-center`}>
      <p className="text-[17px] font-semibold leading-snug text-foreground">
        Every deal is in the ddbx app
      </p>
      <p className="mx-auto mt-1.5 max-w-[34ch] text-sm leading-relaxed text-foreground/60">
        These are the winners with hindsight. The app sends every new filing the
        moment it lands, so you see the next one at the start.
      </p>

      {/* Capped and centred: the stack sizes to its column, and full-bleed
          inside the panel it would out-scale the rows it sits between. */}
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

/** Loading state matching the arrived geometry — rule, logo circle, headline
 *  line, sentence lines — so nothing jumps when the rows paint. */
function WinnersSkeleton() {
  return (
    <RowList ordered={false}>
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className={`border-b ${RULE} py-3.5`}>
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-2/5 rounded" />
                <Skeleton className="h-4 w-14 rounded" />
              </div>
              <Skeleton className="h-3.5 w-3/5 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
            </div>
          </div>
        </li>
      ))}
    </RowList>
  );
}
