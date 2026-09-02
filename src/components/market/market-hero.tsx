/** Shared hero section — desktop is deliberately as simple as mobile.
 *
 *  App markets (UK/US/Congress): the message column (headline, bullets,
 *  CTAs, live proof line) on the left, and on the right a run of success
 *  stories — real filings ddbx surfaced, each told in three beats: the alert
 *  lands, the chart draws what the shares did next, and the outcome stamps
 *  in ("+135% in 107 days"). Mobile shows the same stories without the
 *  chart: the alert, then the outcome as a line of text beneath it
 *  (`HeroOutcomeLine`). What keeps the header alive around them is the
 *  backdrop: a soft warm gradient that morphs in time with the notification
 *  clock, so each alert landing visibly moves the light
 *  (`HeroLiveGradient`).
 *
 *  Non-app markets (NL/SE) run the same message layer, centred, over the
 *  same gradient resting on its first phase (their clock never ticks).
 *
 *  The headline is the page's <h1> — market pages render no other top-level
 *  heading. Under it: an optional one-line subhead for first-time visitors,
 *  the CTA row, and a live "N filings so far today" line fed by the same
 *  dealings the page has already loaded — the hero asks the question, the
 *  live line proves we're answering it. In the desktop card the line gets a
 *  hairline-topped footer of its own with today's tickers as chips, and its
 *  green dot pulses once per radar landing, so the message half visibly
 *  belongs to the same clock as the demo half.
 *
 *  Fixed `min-h` keeps the hero the same height on every market — the
 *  optional beta notice is rendered absolutely at the top so it doesn't push
 *  the headline around, and slides in instead of popping when the user
 *  navigates to a beta market. */
import type { ReactNode } from "react";

import { CheckIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";

import { useDealRadar } from "./hero-deal-radar";
import { HeroNotificationStack } from "./hero-notification-stack";
import { HeroOutcomeBar, HeroOutcomeLine } from "./hero-outcome-line";
import { HeroPriceChart } from "./hero-price-chart";

import {
  BUTTON_FILLED,
  BUTTON_GHOST,
  BUTTON_RADIUS,
} from "@/components/button";
import { chip } from "@/components/chip";
import { StoreButtons } from "@/components/store-buttons";

/** The header's living backdrop: a soft pool of the brand warmth that
 *  relocates on every advance of the shared radar clock, so the light in the
 *  header visibly morphs as each notification lands — movement without an
 *  object competing with the stack. Four fixed phase layers cross-fade
 *  (opacity is the only property transitioned, so the morph is cheap and
 *  smooth) while a slow drift keeps the active pool breathing between ticks.
 *  Masked so the wash never presents an edge against the page. On markets
 *  whose clock never ticks (NL/SE) it rests on phase 0 as a static ambient.
 *  Respects prefers-reduced-motion: no drift, and the clock is frozen
 *  upstream so the cross-fade never fires. */
function HeroLiveGradient({ tick }: { tick: number }) {
  // Clamped: the radar's tick is -1 until the first alert lands, and markets
  // whose clock never ticks (NL/SE) sit there permanently. Without this they
  // would rest on phase 3 rather than the phase 0 this is tuned around.
  const phase = ((Math.max(tick, 0) % 4) + 4) % 4;

  return (
    <div
      aria-hidden
      className="hlg pointer-events-none absolute -top-28 bottom-0 left-1/2 z-0 w-screen -translate-x-1/2 overflow-hidden"
    >
      <style>{`
        /* Full-bleed: the wash belongs to the PAGE, not the content column —
           the w-screen break-out spans the viewport (the layout's
           overflow-x-clip absorbs the overspill) and the -top extension runs
           it up behind the floating glass navbar, whose blur picks the
           moving colour up. The mask fades the layer in from the viewport
           top and out before the hero's bottom edge, so it never presents a
           horizontal seam; the phases' own radial falloff handles the
           sides. */
        .hlg {
          -webkit-mask-image: linear-gradient(to bottom,
            transparent 0%, black 18%, black 78%, transparent 100%);
          mask-image: linear-gradient(to bottom,
            transparent 0%, black 18%, black 78%, transparent 100%);
        }
        .hlg-layer {
          position: absolute; inset: -12%;
          opacity: 0;
          transition: opacity 3.2s ease;
          will-change: opacity, transform;
          animation: hlg-drift 16s ease-in-out infinite alternate;
        }
        .hlg-layer.is-live { opacity: 1; }
        @keyframes hlg-drift {
          0%   { transform: translate3d(-2.5%, -1.5%, 0) scale(1); }
          100% { transform: translate3d( 2.5%,  1.5%, 0) scale(1.06); }
        }
        .hlg-0 { background:
          radial-gradient(ellipse 52% 58% at 24% 30%,
            rgba(196, 168, 130, 0.22) 0%,
            rgba(196, 168, 130, 0.08) 45%, transparent 70%); }
        .hlg-1 { background:
          radial-gradient(ellipse 55% 55% at 74% 26%,
            rgba(222, 184, 135, 0.20) 0%,
            rgba(222, 184, 135, 0.07) 45%, transparent 70%); }
        .hlg-2 { background:
          radial-gradient(ellipse 55% 60% at 66% 74%,
            rgba(196, 168, 130, 0.20) 0%,
            rgba(196, 168, 130, 0.07) 45%, transparent 70%); }
        .hlg-3 { background:
          radial-gradient(ellipse 52% 58% at 20% 70%,
            rgba(210, 172, 128, 0.20) 0%,
            rgba(210, 172, 128, 0.07) 45%, transparent 70%); }
        :is(.dark) .hlg-0 { background:
          radial-gradient(ellipse 52% 58% at 24% 30%,
            rgba(196, 168, 130, 0.11) 0%, transparent 66%); }
        :is(.dark) .hlg-1 { background:
          radial-gradient(ellipse 55% 55% at 74% 26%,
            rgba(238, 197, 132, 0.09) 0%, transparent 66%); }
        :is(.dark) .hlg-2 { background:
          radial-gradient(ellipse 55% 60% at 66% 74%,
            rgba(196, 168, 130, 0.09) 0%, transparent 66%); }
        :is(.dark) .hlg-3 { background:
          radial-gradient(ellipse 52% 58% at 20% 70%,
            rgba(238, 197, 132, 0.08) 0%, transparent 66%); }
        @media (prefers-reduced-motion: reduce) {
          .hlg-layer { animation: none; transition: none; }
        }

        /* Arrival ripple — a one-shot double ring that expands from behind
           the notification stack as each card lands (the element re-mounts
           per tick, so the animation plays once and rests). The alert
           visibly arrives somewhere, without wrapping the stack in a
           container. */
        .hero-ping-ring {
          position: absolute; width: 300px; height: 300px;
          border-radius: 50%;
          border: 1.5px solid rgba(139, 96, 64, 0.4);
          opacity: 0; transform: scale(0.35);
          will-change: opacity, transform;
          animation: hero-ping 1.9s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .hero-ping-ring-2 { animation-delay: 0.28s; }
        :is(.dark) .hero-ping-ring { border-color: rgba(238, 197, 132, 0.32); }
        @keyframes hero-ping {
          0%   { opacity: 0;    transform: scale(0.35); }
          12%  { opacity: 0.5; }
          100% { opacity: 0;    transform: scale(2.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-ping-ring { display: none; }
        }

        /* The proof dot's landing pulse — one shot per radar tick (the
           element is keyed by tick, so it re-mounts and plays once). It's the
           message half's share of the arrival: the demo lands an alert, and
           the "live" dot under the CTAs answers it, so the hairline split
           reads as one instrument rather than two columns. Markets whose
           clock never ticks keep the continuous ping instead. */
        .hero-dot-pulse {
          opacity: 0;
          animation: hero-dot-pulse 1.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        @keyframes hero-dot-pulse {
          0%   { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0;   transform: scale(3.4); }
        }

        /* Showcase panel. Sized by CONTAINER width: every app market reserves
           the 320px news rail, so one viewport width means two different
           amounts of hero depending on the market, and a viewport breakpoint
           here would be guessing. */
        .hero-showcase { container-type: inline-size; }
        /* ONE card for the whole desktop hero, split left/right by a
           hairline — not a message floating on the page beside a separate
           panel. The two halves are one exhibit (here's the claim, here's the
           proof) and reading as two unrelated objects undersold both.

           Translucent over the tick-synced gradient rather than opaque: the
           backdrop is the notification clock made visible, and a solid card
           across the whole hero would have hidden the only thing keeping the
           header alive. Same recipe as the floating navbar. */
        .hero-card {
          display: flex;
          align-items: stretch;
          width: 100%;
          border-radius: 28px;
          /* Clips the arrival ripple. Unclipped it expands to ~645px and
             washes across the message half. */
          overflow: hidden;
          border: 1px solid var(--color-hairline);
          background: color-mix(in srgb, var(--color-sheet) 80%, transparent);
          -webkit-backdrop-filter: blur(14px) saturate(150%);
          backdrop-filter: blur(14px) saturate(150%);
          box-shadow: 0 26px 64px -36px rgba(90, 65, 40, 0.5),
                      0 1px 2px rgba(90, 65, 40, 0.03);
        }
        /* Dark runs the card DARKER than the page rather than lighter. The
           site's usual raised-sheet fill (--surface, 26L) lands within a few
           points of the notification card's own 29L and the alert disappears
           into its own frame. Recessed, the demo half reads as the screen the
           alert arrives on. */
        :is(.dark) .hero-card {
          border-color: rgba(255, 255, 255, 0.08);
          background: color-mix(in oklab, oklch(19.5% 0.02 55) 88%, transparent);
          box-shadow: 0 28px 68px -36px rgba(0, 0, 0, 0.85);
        }
        .hero-card-msg {
          display: flex;
          flex: 1;
          min-width: 0;
          align-items: center;
          padding: 40px 44px;
        }
        .hero-card-demo {
          display: flex;
          flex: none;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          width: 516px;
          padding: 28px;
          border-left: 1px solid var(--color-hairline);
        }
        :is(.dark) .hero-card-demo {
          border-left-color: rgba(255, 255, 255, 0.07);
        }
        /* Landscape, and fixed. A price series wants to be wider than it is
           tall; letting this grow was what turned the demo half into a tower. */
        .hero-chart-col { height: 208px; }
        /* Both nested objects run the demo half's full inner width, inset
           evenly the way a nested card should be — an alert narrower than the
           chart beneath it read as a centring accident rather than as two
           parts of one instrument. The column is sized so that width is also a
           believable iOS banner (~460px); wider and the notification stops
           reading as a banner and starts reading as a toolbar. */
        .hero-alert-col { width: 100%; }

        /* Steps keep the MESSAGE half above ~400px. The headline is the page's
           <h1> at 64px, and a market with long words in it (Congress) starts
           stacking into five lines the moment the demo half takes more than
           its share. The demo is the supporting act: when the two compete for
           the same pixels, the message wins. Sized by CONTAINER width, because
           every app market reserves the 320px news rail and one viewport width
           therefore means two different amounts of hero. */
        @container (max-width: 963px) {
          .hero-card-msg { padding: 32px 34px; }
          .hero-card-demo { width: 452px; padding: 22px; }
          .hero-chart-col { height: 176px; }
        }
        /* Not enough hero for both. The chart goes rather than cramping, and
           the demo half is the alert alone. */
        @container (max-width: 879px) {
          .hero-card-msg { padding: 28px 30px; }
          .hero-card-demo { width: 384px; padding: 20px; }
          .hero-chart-col { display: none; }
        }
      `}</style>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`hlg-layer hlg-${i}${i === phase ? " is-live" : ""}`}
        />
      ))}
    </div>
  );
}

/** The arrival ripple, centred behind whatever it's placed in (the stack
 *  column). Keyed by tick so it re-mounts and replays once per landing;
 *  its CSS lives in HeroLiveGradient's sheet, which always renders first. */
function NotificationPing({ tick }: { tick: number }) {
  return (
    <span
      key={tick}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
    >
      <span className="hero-ping-ring" />
      <span className="hero-ping-ring hero-ping-ring-2" />
    </span>
  );
}

/** Filled primary — the row's single anchor. Exactly one CTA per market
 *  renders in this style: the App Store link where one exists (UK, US),
 *  otherwise the explainer is promoted so the row never reads as two equal
 *  ghost buttons. */
const FILLED_CTA = `inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`;

/** Ghost secondary — same radius and near-black family as the primary, just
 *  turned down. The old brown capsule read as a chip, not a button. A visible
 *  hairline border does the affordance work here: the 7% tint alone dissolved
 *  into the hero's cream wash and read as a disabled chip. */
const GHOST_CTA = `inline-flex items-center ${BUTTON_RADIUS} ${BUTTON_GHOST} border border-ink/[0.18] dark:border-white/20 px-6 py-3 text-base font-semibold backdrop-blur-sm transition-colors`;

/** How many of today's tickers show as chips before the row folds to "+N". */
const MAX_TICKER_CHIPS = 6;

/** One of today's tickers, as a mono capsule under the proof line. */
const TICKER_CHIP =
  "inline-flex items-center rounded-full border border-ink/[0.12] px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-foreground/60 dark:border-white/15";

export function MarketHero({
  marketId,
  marketLabel,
  headline,
  subhead,
  bullets,
  hasTopNotice = false,
  hasRightDrawer = false,
  primaryCtaHref,
  onExplain,
  onViewReport,
  reportLabel,
  todayCount = 0,
  todaySignalCount = 0,
  todayTickers = [],
}: {
  /** Market identifier — selects the app icon and sample disclosures for the
   *  desktop notification showcase (UK vs US). */
  marketId?: string;
  marketLabel: string;
  /** Optional full headline override. When provided it replaces the templated
   *  "Which directors have been buying shares in {marketLabel} companies?" —
   *  used by markets where that phrasing doesn't fit (e.g. Congress, where
   *  members buy other companies, they aren't companies). */
  headline?: ReactNode;
  /** One-line answer for cold visitors — what the product does for this
   *  market. When a market does not provide an explicit headline, this copy is
   *  promoted into the main `<h1>` so mobile and desktop both show the updated
   *  action-oriented message. */
  subhead?: ReactNode;
  /** Checkmark bullets rendered in place of the subhead paragraph. Their
   *  presence also drops the trial eyebrow chip — the offer is expected to
   *  carry in the headline/bullets themselves (see MarketConfig.heroBullets). */
  bullets?: ReactNode[];
  /** When the market carries a beta/advisory notice, the floating <BetaTag/>
   *  sits at the top of the hero. Desktop has room to spare; on the compact
   *  mobile hero the badge would land on the headline, so we reserve top
   *  space for it here. */
  hasTopNotice?: boolean;
  /** Whether the page reserves a right-hand drawer (`lg:mr-80`). When it does,
   *  the two-column showcase only has room from `xl` up — below that it falls
   *  back to the single-column layout so the drawer never squeezes it. */
  hasRightDrawer?: boolean;
  /** Optional App Store link — when present, the right-hand notification
   *  showcase panel renders and links here (the panel is the only download CTA;
   *  the left column carries the explainer). */
  primaryCtaHref?: string;
  /** When provided, a "What are we looking for?" pill renders under the
   *  headline and opens the per-market explainer sheet. It's the left column's
   *  filled anchor (the download CTA lives on the right-hand panel). */
  onExplain?: () => void;
  /** When provided (a monthly recap exists), a secondary "View the {month}
   *  report" pill renders beside the explainer and opens the recap modal. */
  onViewReport?: () => void;
  /** Short month label for the report CTA, e.g. "May". */
  reportLabel?: string;
  /** Today's filing count for this market — drives the live proof line.
   *  0 (or omitted, e.g. while loading) hides the line. */
  todayCount?: number;
  /** How many of today's filings are above routine (rated or triaged as
   *  promising/maybe). */
  todaySignalCount?: number;
  /** Today's distinct tickers in disclosure order — rendered as mono chips
   *  under the proof line in the desktop card, so "N filings so far today"
   *  is a claim with names attached. `href` links to the company page where
   *  the market has one (UK/US), null renders a plain chip. */
  todayTickers?: { ticker: string; label: string; href: string | null }[];
}) {
  const resolvedHeadline = headline ?? subhead ?? (
    <>
      Which directors have been buying shares in{" "}
      <span className="text-brand-brown dark:text-brand-tan">
        {marketLabel}
      </span>{" "}
      companies?
    </>
  );
  const displaySubhead = headline ? subhead : undefined;
  /** When the one-line subhead is promoted into the <h1> (markets without an
   *  explicit headline — SE/NL), it's a full sentence, not a slogan: render it
   *  at a much smaller size so it reads as copy, not a shouting wall. */
  const promotedSubhead = !headline && !!subhead;

  /** App markets (UK, US, Congress — which ships inside the US app) get the
   *  two-column desktop hero: text on the left, the notification app-showcase
   *  panel on the right. Markets without an App Store link (NL, SE) keep the
   *  original centred layout. Mobile is centred on every market — the showcase
   *  panel is desktop-only. */
  const appShowcase = !!primaryCtaHref;
  // Shared deal-radar clock — drives the showcase panel's queue and the
  // notification stack from one source so they stay in lockstep.
  const radar = useDealRadar(marketId, appShowcase);
  // The two-column showcase needs more room when a right drawer is present, so
  // it switches on at `xl` then; otherwise `lg`. Alignment + visibility classes
  // track that same breakpoint so the headline only goes left-aligned once the
  // two-column layout is actually showing.
  const twoColShow = hasRightDrawer ? "hidden xl:flex" : "hidden lg:flex";
  const centeredHide = hasRightDrawer ? "xl:hidden" : "lg:hidden";
  const headlineAlign = !appShowcase
    ? "mx-auto"
    : hasRightDrawer
      ? "mx-auto xl:mx-0"
      : "mx-auto lg:mx-0";
  const ctaJustify = !appShowcase
    ? "justify-center"
    : hasRightDrawer
      ? "justify-center xl:justify-start"
      : "justify-center lg:justify-start";

  const headlineBlock = (
    <div className="space-y-3 md:space-y-5">
      {/* Trial promo eyebrow — the offer, called out where the eye lands
          first instead of buried under the App Store button. Chip-system
          capsule in the brand brown; app markets only (no trial elsewhere).
          Markets that moved the offer into the headline/bullets drop it. */}
      {appShowcase && !bullets && (
        <div className={`flex ${ctaJustify}`}>
          <span
            className={`${chip("lg")} bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/15 dark:text-brand-tan`}
          >
            7-day free trial · Cancel any time
          </span>
        </div>
      )}
      <h1
        className={`${headlineAlign} text-balance font-semibold tracking-tight ${
          promotedSubhead
            ? "max-w-[560px] text-[24px] leading-[1.25] md:text-[32px] md:leading-[1.2]"
            : "max-w-[600px] text-[40px] leading-[1.05] md:text-[64px] md:leading-[1.02]"
        }`}
      >
        {resolvedHeadline}
      </h1>
      {bullets ? (
        <ul className={`${headlineAlign} max-w-[480px] space-y-2 text-left`}>
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] leading-snug text-foreground/70"
            >
              <CheckIcon
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-positive"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        displaySubhead && (
          <p
            className={`${headlineAlign} max-w-[480px] text-balance text-base leading-relaxed text-foreground/60`}
          >
            {displaySubhead}
          </p>
        )
      )}
    </div>
  );

  const ctaRow = (onExplain || onViewReport) && (
    <div className={`flex flex-wrap items-center gap-3 ${ctaJustify}`}>
      {/* On app markets the App Store button (right) is the primary CTA, so the
          explainer reads as secondary (ghost). On markets without an app link it
          has nothing to defer to and becomes the primary (filled) anchor. */}
      {onExplain && (
        <button
          className={primaryCtaHref ? GHOST_CTA : FILLED_CTA}
          data-ga-event="cta_hero_open_explainer"
          data-ga-label="What are we looking for"
          type="button"
          onClick={onExplain}
        >
          What are we looking for?
        </button>
      )}
      {onViewReport && (
        <button
          className={GHOST_CTA}
          data-ga-event="cta_hero_view_report"
          data-ga-label={`View ${reportLabel ?? "latest"} report`}
          type="button"
          onClick={onViewReport}
        >
          View {reportLabel} Report
        </button>
      )}
    </div>
  );

  // Two-column desktop CTA row: the App Store button leads, sized to its
  // content like any other button — it belongs to the message column, not to
  // the showcase panel, so it no longer inherits the notification stack's
  // width. The explainer stays the ghost beside it.
  const ctaRowDesktop = (
    <div className={`flex flex-wrap items-center gap-3 ${ctaJustify}`}>
      <StoreButtons
        buttonClassName={FILLED_CTA}
        gaEvent="cta_hero_download_app"
        gaLabel="Hero desktop download"
        marketId={marketId ?? "uk"}
      />
      {onExplain && (
        <button
          className={GHOST_CTA}
          data-ga-event="cta_hero_open_explainer"
          data-ga-label="What are we looking for"
          type="button"
          onClick={onExplain}
        >
          What are we looking for?
        </button>
      )}
      {onViewReport && (
        <button
          className={GHOST_CTA}
          data-ga-event="cta_hero_view_report"
          data-ga-label={`View ${reportLabel ?? "latest"} report`}
          type="button"
          onClick={onViewReport}
        >
          View {reportLabel} Report
        </button>
      )}
    </div>
  );

  // Live proof line — the headline asks the question, this shows we're
  // answering it today. Counts arrive with the page's dealings fetch; on app
  // markets the line never disappears (a live "watching" state stands in while
  // the count is 0 or loading) so the column always carries proof under the
  // CTAs instead of dead space. Hidden on mobile where the Today card directly
  // below carries the same state, bigger.
  const proofLine = (todayCount > 0 || appShowcase) && (
    <p
      className={`hidden animate-content-in items-center gap-2 text-sm text-foreground/55 md:flex ${ctaJustify}`}
    >
      <span aria-hidden className="relative flex h-2 w-2">
        {/* Once the radar clock is running, the dot pulses once per landing
            (keyed by tick) instead of pinging on its own loop — the left
            half's visible answer to each alert arriving on the right. */}
        {radar.landed ? (
          <span
            key={radar.tick}
            className="hero-dot-pulse absolute inline-flex h-full w-full rounded-full bg-[#22a06b] motion-reduce:hidden"
          />
        ) : (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22a06b] opacity-50 motion-reduce:hidden" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22a06b]" />
      </span>
      {todayCount > 0 ? (
        <>
          {todayCount} filing{todayCount === 1 ? "" : "s"} so far today
          {todaySignalCount > 0 && (
            <>
              {" "}
              · {todaySignalCount} signal{todaySignalCount === 1 ? "" : "s"}
            </>
          )}
        </>
      ) : (
        <>Live · watching today&rsquo;s filings as they land</>
      )}
    </p>
  );

  // Today's names, under the count that claims them — "14 filings so far
  // today" is a stronger line with the tickers attached, and it changes
  // daily, so a returning visitor sees movement without a demo playing.
  // Desktop card only: the mobile hero hands today's state to the Today card
  // directly below it.
  const tickerChips = todayTickers.length > 0 && (
    <div className="hidden flex-wrap items-center gap-1.5 md:flex">
      {todayTickers.slice(0, MAX_TICKER_CHIPS).map((t) =>
        t.href ? (
          <Link
            key={t.ticker}
            className={`${TICKER_CHIP} transition-colors hover:border-ink/30 hover:text-foreground dark:hover:border-white/35`}
            to={t.href}
          >
            {t.label}
          </Link>
        ) : (
          <span key={t.ticker} className={TICKER_CHIP}>
            {t.label}
          </span>
        ),
      )}
      {todayTickers.length > MAX_TICKER_CHIPS && (
        <span className="px-1 font-mono text-[11px] font-medium text-foreground/45">
          +{todayTickers.length - MAX_TICKER_CHIPS} more
        </span>
      )}
    </div>
  );

  return (
    <header
      className={`relative -mt-4 md:mt-0 md:min-h-[58svh] flex flex-col animate-content-in ${
        appShowcase
          ? hasRightDrawer
            ? "xl:min-h-[560px]"
            : "lg:min-h-[560px]"
          : "md:min-h-[380px]"
      }`}
    >
      {/* Backdrop: the tick-synced morphing gradient — the header's only
          atmosphere, and its movement is the notification clock made
          visible. */}
      <HeroLiveGradient tick={radar.tick} />

      <div
        className={`relative z-10 flex-1 flex flex-col px-4 md:px-10 md:py-16 ${
          hasTopNotice ? "pt-16 pb-3 md:pb-6" : "py-3 md:py-6"
        }`}
      >
        {appShowcase ? (
          <>
            {/* Desktop: message column (left) beside the showcase panel
                (right), which is the demonstration the page exists to make.
                Inside the panel, the price the director bought into draws
                itself left to right; the instant the line reaches the
                disclosure the notification lands next to it; then the line
                draws on through what followed and the outcome stamps in on
                the full-width bar beneath. One clock, one story per cycle.

                The panel is the only frame in the hero, and it earns one by
                holding two objects that have to read as a single instrument;
                the bare stack that preceded it had nothing to be grouped
                with. It's a LIGHT sheet on purpose — the notification card
                is a warm dark object, and the dark panel this replaces would
                have swallowed it (see the value ladder in globals.css:
                background 22L, panel 26L, card 29L).

                No arrival ripple here: it was invented to give the bare
                stack somewhere to arrive, and a ring expanding under an
                opaque panel is either invisible or fighting the frame. The
                gradient phase change still marks the landing page-wide.

                Sizing is by CONTAINER width, not viewport. Every app market
                reserves the 320px news rail, so the same viewport gives the
                hero wildly different room depending on the market and the
                same breakpoint means two different things. Below 940px of
                hero the chart and the frame drop out entirely rather than
                cramping, and the stack is bare again. */}
            <div
              className={`hero-showcase m-auto ${twoColShow} w-full max-w-6xl`}
            >
              <div className="hero-card">
                <div className="hero-card-msg">
                  <div className="flex max-w-[560px] flex-col gap-6 text-left">
                    {headlineBlock}
                    {ctaRowDesktop}
                    {/* The card's live footer: proof line plus today's names,
                        seated under a hairline so it reads as the card's own
                        ticker strip rather than a stray caption. */}
                    <div className="flex flex-col gap-3 border-t border-hairline pt-5 dark:border-white/10">
                      {proofLine}
                      {tickerChips}
                    </div>
                  </div>
                </div>
                <div className="hero-card-demo">
                  {/* Alert on top, chart beneath — stacked, not side by side.
                      Side by side gave the chart a portrait box and left the
                      alert floating in a half-empty column beside it. Stacked,
                      the chart gets the landscape aspect a price series wants
                      and the alert sits at a believable notification width.

                      The alert is put AWAY while the next price draws, rather
                      than being replaced with a placeholder. Two earlier passes
                      tried standing something in for it — the rims of the stack
                      as a "closed pile" — and a contentless dark slab in a hero
                      panel reads as a skeleton loader, not as notifications
                      waiting. An empty half beside a drawing chart reads as
                      what it is: the alert hasn't happened yet. It also makes
                      the landing land. The stack stays MOUNTED at zero opacity
                      so the front card is still measured and nothing reflows
                      when it comes back. */}
                  <div
                    className={`hero-alert-col relative shrink-0 transition-opacity duration-500 ${
                      radar.pending ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    {radar.landed && <NotificationPing tick={radar.tick} />}
                    <HeroNotificationStack
                      deals={radar.deals}
                      tick={Math.max(radar.tick, 0)}
                    />
                  </div>
                  {/* Positioned and lifted: the arrival ripple lives in the
                      alert column above, which is a positioned element, so by
                      default its rings painted over this card. The chart is the
                      thing being read — the ripple washes behind it. */}
                  <div className="hero-chart-col relative z-10">
                    <HeroPriceChart
                      key={radar.cycle}
                      deal={radar.deals[radar.chartIndex]}
                    />
                  </div>
                  {/* The payoff, full width under the chart: keyed with it
                      so the pair re-mount together and the bar stamps in
                      the moment the continuation finishes drawing. */}
                  <div className="relative z-10">
                    <HeroOutcomeBar
                      key={radar.cycle}
                      deal={radar.deals[radar.chartIndex]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Single column: notification scroller on top, then the centred
                headline. Used on mobile and on the mid-width desktop range
                before the two-column kicks in. There is no chart here, so
                the story's last beat is a line of text under the alert —
                "Up 135% in 107 days since the alert" — landing on the same
                clock. On mobile the floating download bar handles installs;
                from md up (where that bar is hidden) the download CTA below
                stands in. */}
            <div
              className={`m-auto flex ${centeredHide} flex-col items-center gap-5 md:gap-7 text-center`}
            >
              {/* No logo on mobile — the stack is centred on its own. The cap
                  is above a phone's content width, so the card runs the full
                  column and only bounds itself on a tablet. */}
              <div className="relative w-full max-w-[400px]">
                {radar.landed && <NotificationPing tick={radar.tick} />}
                <div
                  className={`relative transition-opacity duration-500 ${
                    radar.pending ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <HeroNotificationStack
                    deals={radar.deals}
                    tick={Math.max(radar.tick, 0)}
                  />
                  {radar.landed && (
                    <HeroOutcomeLine
                      className="mt-3"
                      deal={radar.deals[radar.activeIndex]}
                      tick={radar.tick}
                    />
                  )}
                </div>
              </div>
              {headlineBlock}
              <div className="hidden md:block">
                <StoreButtons
                  buttonClassName={`inline-flex items-center justify-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-base font-semibold shadow-md transition-[background-color,box-shadow] hover:shadow-lg`}
                  className="items-center sm:flex-row"
                  gaEvent="cta_hero_download_app"
                  gaLabel="Hero compact download"
                  marketId={marketId ?? "uk"}
                />
              </div>
              {ctaRow}
              {proofLine}
            </div>
          </>
        ) : (
          <div className="m-auto flex flex-col items-center justify-center gap-6 text-center md:gap-8">
            {headlineBlock}
            {ctaRow}
            {proofLine}
          </div>
        )}
      </div>
    </header>
  );
}
