/** Shared hero section — desktop is deliberately as simple as mobile.
 *
 *  App markets (UK/US/Congress): the message column (headline, bullets,
 *  CTAs, live proof line) on the left, and the live notification stack —
 *  bare, big, badge avatar and all, exactly the object mobile leads with —
 *  on the right. No container panel, no map, no logo queue: the earlier
 *  contained-instrument passes proved every frame put around the stack
 *  competed with it. What keeps the header alive instead is the backdrop:
 *  a soft warm gradient that morphs in time with the notification clock, so
 *  each alert landing visibly moves the light (`HeroLiveGradient`).
 *
 *  Non-app markets (NL/SE) run the same message layer, centred, over the
 *  same gradient resting on its first phase (their clock never ticks).
 *
 *  The headline is the page's <h1> — market pages render no other top-level
 *  heading. Under it: an optional one-line subhead for first-time visitors,
 *  the CTA row, and a live "N filings so far today" line fed by the same
 *  dealings the page has already loaded — the hero asks the question, the
 *  live line proves we're answering it.
 *
 *  Fixed `min-h` keeps the hero the same height on every market — the
 *  optional beta notice is rendered absolutely at the top so it doesn't push
 *  the headline around, and slides in instead of popping when the user
 *  navigates to a beta market. */
import type { ReactNode } from "react";

import { CheckIcon } from "@heroicons/react/20/solid";

import { useDealRadar } from "./hero-deal-radar";
import { HeroNotificationStack } from "./hero-notification-stack";
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

        /* Showcase panel. Sized by CONTAINER width: every app market reserves
           the 320px news rail, so one viewport width means two different
           amounts of hero depending on the market, and a viewport breakpoint
           here would be guessing. */
        .hero-showcase { container-type: inline-size; }
        .hero-panel {
          /* Published so the chart can ring its markers in the panel's own
             fill — a marker then reads as punched out of the line rather
             than outlined on top of it. */
          --hero-panel-fill: var(--color-sheet);
          display: flex;
          flex-direction: column;
          /* Clips the arrival ripple to the panel. Unclipped it would expand
             to ~645px and wash across the message column. */
          overflow: hidden;
          width: 664px;
          /* Outer radius sits clear of the nested chart card's 16px so the
             two curves read as concentric rather than as one fat edge. */
          border-radius: 26px;
          padding: 16px;
          /* The panel takes its height from the message column beside it. The
             floor stops a market with a short message (US, two headline
             lines) collapsing the chart into a letterbox. */
          min-height: 400px;
          border: 1px solid var(--color-hairline);
          background: var(--hero-panel-fill);
          box-shadow: 0 18px 44px -28px rgba(90, 65, 40, 0.45),
                      0 1px 2px rgba(90, 65, 40, 0.03);
        }
        /* Dark mode runs the panel DARKER than the page rather than lighter.
           The site's usual raised-sheet fill (--surface, 26L) lands within a
           few points of the notification card's own 29L and the card
           disappears into its own frame. Recessed, the panel reads as the
           screen the alert arrives on, and the card floats clear of it. */
        :is(.dark) .hero-panel {
          --hero-panel-fill: oklch(18.5% 0.018 55);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px -28px rgba(0, 0, 0, 0.8);
        }
        .hero-panel-body { flex: 1; min-height: 0; }
        .hero-chart-col { width: 284px; }
        /* A market with a long headline (Congress wraps to four lines) would
           otherwise stretch the plot into a tower. Past this the card stops
           growing and centres in the panel instead. */
        .hero-chart-col > * { max-height: 460px; }

        /* Steps are sized so the MESSAGE never drops below ~400px. The
           headline is the page's <h1> at 64px, and a market with long words
           in it (Congress) starts stacking into five lines the moment the
           panel takes more than its share. The panel is the supporting act:
           when the two compete for the same pixels, the message wins. */
        @container (max-width: 1103px) {
          .hero-panel { width: 580px; padding: 14px; }
          .hero-chart-col { width: 236px; }
        }
        /* Not enough hero for two objects. Rather than cramp them, the chart
           and the frame around it both go, and the stack is the bare card it
           was before — the same thing mobile shows. */
        @container (max-width: 1019px) {
          .hero-panel,
          :is(.dark) .hero-panel {
            width: 400px;
            padding: 0;
            border: 0;
            background: none;
            box-shadow: none;
          }
          .hero-chart-col { display: none; }
          .hero-panel-body { gap: 0; }
          .hero-panel { min-height: 0; }
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
      className="pointer-events-none absolute inset-x-0 top-0 z-0 flex h-[220px] items-center justify-center"
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
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22a06b] opacity-50 motion-reduce:hidden" />
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
                itself left to right, and the instant the line reaches the
                disclosure the notification lands next to it. One clock, two
                halves of one event.

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
              className={`hero-showcase m-auto ${twoColShow} w-full max-w-6xl items-stretch gap-10`}
            >
              <div className="flex min-w-0 flex-1 items-center">
                <div className="flex max-w-[560px] flex-col gap-6 text-left">
                  {headlineBlock}
                  {ctaRowDesktop}
                  {proofLine}
                </div>
              </div>
              <div className="hero-panel shrink-0">
                <div className="hero-panel-body flex items-stretch gap-5">
                  <div className="hero-chart-col shrink-0">
                    <HeroPriceChart
                      key={radar.cycle}
                      deal={radar.deals[radar.chartIndex]}
                    />
                  </div>
                  {/* The alert arrives at the TOP of its column, not centred
                      in it. The panel now stretches to the message column, and
                      a notification hovering in the middle of that height read
                      as an object with nothing holding it up; landing at the
                      top is also where a real one arrives, which makes the
                      space beneath it the rest of the screen rather than a gap.

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
                    className={`relative flex min-w-0 flex-1 items-start transition-opacity duration-500 ${
                      radar.pending ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    {radar.landed && <NotificationPing tick={radar.tick} />}
                    <HeroNotificationStack
                      deals={radar.deals}
                      tick={Math.max(radar.tick, 0)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Single column: notification scroller on top, then the centred
                headline. Used on mobile and on the mid-width desktop range
                before the two-column kicks in. On mobile the floating download
                bar handles installs; from md up (where that bar is hidden) the
                download CTA below stands in. */}
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
