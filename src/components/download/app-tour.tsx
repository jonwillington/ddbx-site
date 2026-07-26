/** "One filing, followed" — the section that answers "what am I installing?"
 *
 *  This used to be a pinned phone on the right with copy scrolling past it on
 *  the left, cross-fading the screen to match whichever beat was centred. It
 *  worked mechanically and it was the most generic thing on the site: pinned-
 *  device scrolljack is the house style of every generated landing page
 *  shipped this year, and a visitor who has seen four of them reads it as
 *  template before they read a word of the copy.
 *
 *  What replaced it is a narrative rather than a feature list. The beats are
 *  now one disclosure followed from the moment it hits the wire to what it did
 *  months later, each stamped with when it happens. A vertical hairline rail
 *  runs down the copy with the timestamp sitting on it, and the screen
 *  alternates side per beat — a rhythm a pinned column structurally cannot
 *  have, since its device never moves.
 *
 *  The screens are `variant="bare"` — no bezels. Seven handsets down a page is
 *  seven frames the visitor has to look past; the alert screenshot already
 *  answers "is this a phone app?", and the store badges answer it twice.
 *
 *  Mobile keeps the snap carousel: it's thumb-native, it was never the generic
 *  part, and a stack of full-width screenshots is worse.
 */
import { DeviceFrame } from "./device-frame";
import { Reveal } from "./reveal";
import { SectionHeader } from "./section-header";

import { dealsForMarket } from "@/components/market/hero-deal-data";
import {
  HeroNotificationStack,
  useNotificationTick,
} from "@/components/market/hero-notification-stack";
import {
  appShotSrc,
  screenAspect,
  SLOT_LABEL,
  type AppPlatform,
  type ShotSlot,
} from "@/lib/app-screenshots";

export interface TourBeat {
  slot: ShotSlot;
  /** When this happens, in the story's own clock — "07:01", "DAYS 3–9",
   *  "EVERY MORNING". Sits on the rail as the beat's marker. */
  timestamp: string;
  /** Small uppercase label — the beat's name. */
  kicker: string;
  /** The benefit, in the visitor's words. */
  title: string;
  body: string;
}

/** What a beat SHOWS.
 *
 *  Every beat but one is a screen. The "alert" beat is the live notification
 *  stack instead — a screenshot is a capture of a moment, so it lands whatever
 *  state the simulator happened to be in, which is how a "markets closed for
 *  the weekend" empty state ended up sitting under a heading promising the
 *  alert arrives the moment the filing does. The stack is the same instrument
 *  the hero runs, and it is always mid-arrival, whatever day you read the page. */
function BeatVisual({
  beat,
  marketId,
  platform,
  tick,
  variant,
}: {
  beat: TourBeat;
  marketId: string;
  platform: AppPlatform;
  tick: number;
  variant?: "bare";
}) {
  if (beat.slot === "alert") {
    // The desktop bands are height-free, but the mobile carousel's slides sit
    // in one row: an alert a third the height of a handset would drag every
    // caption after it out of line. There, the stack floats in the middle of a
    // box the same shape as the screen it replaces.
    return (
      <div
        className="flex items-center justify-center py-4"
        style={
          variant === "bare"
            ? undefined
            : { aspectRatio: String(screenAspect(platform)) }
        }
      >
        <HeroNotificationStack deals={dealsForMarket(marketId)} tick={tick} />
      </div>
    );
  }

  return (
    <DeviceFrame
      alt={`ddbx ${SLOT_LABEL[beat.slot]} screen on ${platform === "ios" ? "iPhone" : "Android"}`}
      platform={platform}
      slot={beat.slot}
      src={appShotSrc(marketId, platform, beat.slot)}
      variant={variant}
    />
  );
}

export function AppTour({
  marketId,
  platform,
  beats,
  heading,
  sub,
  kicker = "The app",
  index,
  total,
}: {
  marketId: string;
  platform: AppPlatform;
  beats: TourBeat[];
  heading: string;
  sub: string;
  kicker?: string;
  index?: number;
  total?: number;
}) {
  // One clock for the section: the desktop band and the mobile carousel each
  // render an alert stack, and they should advance together.
  const tick = useNotificationTick(true);

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-24">
      <SectionHeader
        index={index}
        kicker={kicker}
        sub={sub}
        title={heading}
        total={total}
      />

      {/* ---- Desktop: alternating bands on a timeline rail ---- */}
      <div className="mt-16 hidden lg:block">
        {beats.map((b, i) => {
          const flip = i % 2 === 1;

          return (
            <Reveal key={b.slot}>
              <div
                className={`grid items-center gap-16 border-t border-[#e7e0d4] py-14 dark:border-border/50 ${
                  flip
                    ? "lg:grid-cols-[380px_minmax(0,1fr)]"
                    : "lg:grid-cols-[minmax(0,1fr)_380px]"
                }`}
              >
                {/* Copy. `order` rather than two branches of markup: the DOM
                    order stays narrative, so a screen reader and the tab order
                    still run beat-by-beat regardless of which side the screen
                    is painted on. */}
                <div className={flip ? "lg:order-2" : "lg:order-1"}>
                  {/* The rail: a hairline down the copy with the timestamp
                      sitting on it, dot and all. */}
                  <div className="border-l border-[#e0d8cc] pl-8 dark:border-border/60">
                    <div className="relative flex items-center gap-3">
                      <span
                        aria-hidden
                        className="absolute -left-[calc(2rem+4.5px)] h-[9px] w-[9px] rounded-full bg-[#5a4128] dark:bg-[#ad9479]"
                      />
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] tabular-nums text-[#5a4128] dark:text-[#ad9479]">
                        {b.timestamp}
                      </span>
                      <span
                        aria-hidden
                        className="h-px w-6 bg-[#e0d8cc] dark:bg-border/60"
                      />
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                        {b.kicker}
                      </span>
                    </div>

                    {/* The beat's claim is the thing worth reading on this
                        band — sized to lead it rather than to sit level with
                        the body copy under it. */}
                    <h3 className="mt-6 max-w-[18ch] text-balance text-[42px] font-semibold leading-[1.04] tracking-[-0.028em] xl:text-[46px]">
                      {b.title}
                    </h3>
                    <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-foreground/65">
                      {b.body}
                    </p>
                  </div>
                </div>

                <div className={flip ? "lg:order-1" : "lg:order-2"}>
                  <BeatVisual
                    beat={b}
                    marketId={marketId}
                    platform={platform}
                    tick={tick}
                    variant="bare"
                  />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* ---- Mobile: snap carousel ---- */}
      <MobileTour
        beats={beats}
        marketId={marketId}
        platform={platform}
        tick={tick}
      />
    </section>
  );
}

function MobileTour({
  beats,
  marketId,
  platform,
  tick,
}: {
  beats: TourBeat[];
  marketId: string;
  platform: AppPlatform;
  tick: number;
}) {
  return (
    <div className="mt-10 lg:hidden">
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {beats.map((b, i) => (
          <div
            key={b.slot}
            className="w-[76%] max-w-[300px] shrink-0 snap-center sm:w-[52%]"
          >
            <BeatVisual
              beat={b}
              marketId={marketId}
              platform={platform}
              tick={tick}
            />
            <p className="mt-6 flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5a4128] dark:text-[#ad9479]">
              {b.timestamp}
              <span
                aria-hidden
                className="h-px w-5 bg-[#e0d8cc] dark:bg-border/60"
              />
              <span className="text-foreground/40">{b.kicker}</span>
            </p>
            <h3 className="mt-2.5 text-balance text-[26px] font-semibold leading-[1.12] tracking-[-0.02em]">
              {b.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              {b.body}
            </p>
            <span className="sr-only">
              Beat {i + 1} of {beats.length}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
