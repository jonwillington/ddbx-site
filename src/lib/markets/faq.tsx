// Shared builder for the foot-of-page market FAQ. One source of truth so the
// objection-handling copy — and crucially the no-guarantee language — reads the
// same across every market. Each market calls buildMarketFaq() with its own
// nouns (what an insider is, what they file) and whether it ships an iOS app;
// the wording is otherwise fixed.
//
// Two of these answers are deliberate liability surfaces: "Is this financial
// advice?" and "Do you promise returns?" both state, in the product's own
// voice, that ddbx rates conviction — not outcomes. Keep that posture if you
// edit them.

import type { MarketFaqItem } from "./types";

export function buildMarketFaq({
  /** How this market names the person doing the buying, lower-case and
   *  singular-general, e.g. "company director", "US insider", "member of
   *  Congress". Used in the "what do I get?" answer. */
  insiderTerm,
  /** Short phrase for where/how the buy is disclosed, e.g. "with the LSE",
   *  "on a Form 4", "in a STOCK Act report". Slots after "the moment it's
   *  filed …". */
  filingPhrase,
  /** True when this market has a live iOS app (UK, US, and Congress via the
   *  US app). Drives the "is it free?" and alerts answers — markets without
   *  an app yet lead with the free web view instead of a trial. */
  hasApp,
}: {
  insiderTerm: string;
  filingPhrase: string;
  hasApp: boolean;
}): MarketFaqItem[] {
  return [
    {
      question: "Is this financial advice?",
      answer: (
        <>
          No. ddbx rates the <em>conviction</em> behind insider buys — how well
          each one clears our six-point check — and shows the reasoning.
          It&apos;s information, never a recommendation, and never a guarantee.
          What you do with it is your call.
        </>
      ),
    },
    {
      question: "What do I actually get?",
      answer: (
        <>
          Every open-market purchase by a {insiderTerm}, screened and rated the
          moment it&apos;s filed {filingPhrase} — with the full thesis, the
          evidence behind the rating, the risks, and the price history. You see
          the buys as they land, not when they become news.
        </>
      ),
    },
    {
      question: "Is it free?",
      answer: hasApp ? (
        <>
          The app is free to start — a 7-day trial, cancel anytime. You
          don&apos;t need an account to look around the web, and the first full
          analysis each day is free here too.
        </>
      ) : (
        <>
          Yes — this market is free to browse on the web while it&apos;s in
          beta. No account needed. A dedicated app for it is on the way.
        </>
      ),
    },
    {
      question: "How fast are the alerts?",
      answer: hasApp ? (
        <>
          Real-time. The app alerts you the moment a qualifying buy is filed, so
          you&apos;re early to it rather than reading about it later.
        </>
      ) : (
        <>
          We publish each buy as it&apos;s filed, throughout the day — so the
          list is always current. Real-time push alerts arrive with this
          market&apos;s app.
        </>
      ),
    },
    {
      question: "Do you promise returns?",
      answer: (
        <>
          No. We surface the signal and show our working; we don&apos;t promise
          a buy will go up, and a high rating is conviction in the <em>buy</em>,
          not a forecast of the price. Insider buying is one input, not a sure
          thing.
        </>
      ),
    },
  ];
}
