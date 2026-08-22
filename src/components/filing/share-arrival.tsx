/** The two share-arrival blocks on /t/{id}.
 *
 *  A visitor here arrived from a tweet, an iMessage or a Slack link, on a phone,
 *  cold, with no idea what ddbx is. The rest of the page is the same filing page
 *  /dealings/{id} serves — the record, the chart, the six checks — and it makes
 *  the argument well but slowly. These do the one thing that page can't: they
 *  say what the reader would have got, by showing it.
 *
 *  `ShareArrivalCard` is the notification. Not a screenshot of one, and not a
 *  claim that we send them: THIS filing, rendered as the alert that went out the
 *  day it disclosed, in the same card the homepage hero uses. A reader who reads
 *  it has already had the product demonstrated on the exact thing they came here
 *  about, which is a better argument than any sentence beginning "get instant
 *  alerts".
 *
 *  ONE card, static. The homepage stack cycles through four because it is
 *  illustrating a feed; here there is exactly one filing and animating it would
 *  be motion with nothing to say.
 *
 *  ---------------------------------------------------------------------------
 *  Why these are two components and not one
 *  ---------------------------------------------------------------------------
 *
 *  They shipped as a single panel sitting where any other section sits: after
 *  the crumbs, the eyebrow, the h1, the standfirst and the pills. On a phone
 *  that put the one object doing the selling about 400px down — below the fold,
 *  behind five pieces of chrome, on the page that receives the coldest traffic
 *  the site gets.
 *
 *  So the card is now the shell's `hero`: the first thing in the document,
 *  above even the breadcrumbs. It is bare there — no panel, no eyebrow, no
 *  heading. A notification card carries the app's own icon and name inside it
 *  and is instantly legible as what it is; labelling it "the alert we sent"
 *  was explaining a picture that explains itself, and cost another 40px above
 *  the thing being explained.
 *
 *  `ShareArrivalAsk` keeps the written excerpt and the store button, and stays
 *  in the body where a reader who has been convinced by the card arrives next.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import {
  shareNotification,
  shortDate,
} from "../../../shared/share-notification.js";

import { CompanyLogo } from "@/components/company-logo";
import { NotificationCard } from "@/components/notification-card";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";

/** App identity for the notification header, by market. /t/{id} is UK-only
 *  today (the US share route is a store redirect — there is no per-row US
 *  detail API yet), but the map is here so adding US is data rather than a
 *  branch. */
const APP = {
  uk: { icon: "/ios-app-icon-uk.png", name: "ddbx.uk" },
  us: { icon: "/ios-app-icon-us.png", name: "ddbx.us" },
} as const;

/** The alert, as the page's opening object. Goes in `SeoPageShell`'s `hero`. */
export function ShareArrivalCard({
  deal,
  marketId = "uk",
}: {
  deal: Dealing | UsDealing;
  marketId?: "uk" | "us";
}) {
  const note = shareNotification(deal, marketId);

  if (!note) return null;
  const app = APP[marketId];

  return (
    // `aria-label` rather than a visible heading: to a screen reader an
    // unlabelled group of app name, date and two sentences is just loose text
    // at the top of the page, and the visual cue (a dark rounded banner) is the
    // part that doesn't survive.
    <section
      aria-label="The alert the app sent for this filing"
      className="relative mx-auto mt-4 max-w-[440px] pt-7"
    >
      {/* The company's own mark, half-in / half-out over the card's top edge,
          exactly as the homepage stack badges its front card. It is what makes
          the card read as one object rather than a quote box; the wrapper's
          top padding reserves the overhanging half. */}
      <CompanyLogo
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full border-2 border-white/90 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)] dark:border-white/[0.18]"
        size={56}
        ticker={deal.ticker}
      />
      <NotificationCard
        app={app.name}
        body={note.body}
        icon={app.icon}
        lead={note.lead}
        tag={note.tag}
        // A filing is not news by the time someone reads a shared link, and a
        // card stamped "now" over a purchase from three weeks ago is a small
        // lie in the service of a mood. The disclosure date is the honest
        // stamp and costs the demo nothing.
        time={shortDate(deal.disclosed_date)}
      />
    </section>
  );
}

/** The written excerpt and the store button, in the body of the document. */
export function ShareArrivalAsk({
  deal,
  marketId = "uk",
}: {
  deal: Dealing | UsDealing;
  marketId?: "uk" | "us";
}) {
  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-hairline bg-sheet px-5 pb-6 pt-6 dark:border-white/[0.07] dark:bg-surface sm:px-7 sm:pb-7">
      {/* The written summary, and the ONE place on the public site it appears.
          /dealings/{id} withholds it deliberately (shared/filings.js has the
          argument), and the reason given there is not only the discretion
          boundary: these summaries are written for a reader who has the full
          analysis in front of them, so they refer to it. A live one reads "the
          assessment below is carried forward from the 28 July purchase", and
          there is no assessment below on either page.

          Which is why it is labelled as an excerpt rather than used as the
          page's standfirst. Framed as the opening of a longer document that
          continues in the app, a sentence pointing at the rest of that document
          reads as truncation, which is what it is. As an opening claim it would
          read as a broken reference. */}
      {deal.analysis?.summary ? (
        <figure className="mx-auto max-w-[52ch]">
          <figcaption className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
            From the written analysis
          </figcaption>
          <blockquote className="mt-3 border-l-2 border-brand-brown/30 pl-4 text-[15.5px] leading-[1.6] text-foreground/85 dark:border-brand-tan/30">
            {deal.analysis.summary}
          </blockquote>
          <p className="mt-2 pl-4 text-[12.5px] text-foreground/45">
            The thesis, the evidence behind it and the risks continue in the
            app.
          </p>
        </figure>
      ) : null}

      <p
        className={`mx-auto max-w-[46ch] text-center text-[14px] leading-[1.6] text-foreground/70 ${
          deal.analysis?.summary ? "mt-6" : ""
        }`}
      >
        Every disclosure arrives like the alert above, the day it files, already
        rated, with the written case attached. Everything below is the filing
        behind this one.
      </p>

      {/* Deliberately the quiet ask. The page also carries the layout's
          floating mobile install bar and the terminal AppCtaBand, and three
          shouting CTAs in one document means it has no primary action at all. */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <StoreButtons
          buttonClassName={`inline-flex items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3 text-[14px] font-semibold`}
          gaEvent="cta_share_arrival"
          gaLabel={`Share arrival · ${deal.id}`}
          marketId={marketId}
        />
        <p className="text-[11.5px] text-foreground/45">
          7-day free trial, cancel anytime.
        </p>
      </div>
    </section>
  );
}
