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
 *  The screens sit in real device frames. An earlier pass ran them `bare` on
 *  the theory that seven handsets down a page is seven frames the visitor has
 *  to look past — but a bare screen with a home indicator and no hardware reads
 *  as an unfinished image rather than as a phone, and the site was rendering
 *  bezels on the company page while omitting them here. One treatment
 *  everywhere; `variant="bare"` stays available but is no longer used.
 *
 *  Mobile keeps the snap carousel: it's thumb-native, it was never the generic
 *  part, and a stack of full-width screenshots is worse. The one rule it has
 *  to obey is that a beat fits on one screenful — see `SHOT_W` for why the
 *  handset there is sized off the viewport height and not the column.
 */
import { useState, type ReactNode, type UIEvent } from "react";

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

/** The tinted well every beat's visual stands in.
 *
 *  It started as the alert beat's own stage — a notification floating in a
 *  phone-tall empty box read as a layout error — while the handsets sat
 *  directly on the page. That made the one non-device beat look like the
 *  exception rather than a member of the set, and left the phones drifting on
 *  bare cream with nothing holding them. One stage for every beat: the screens
 *  and the alert are now the same kind of object, framed the same way, and the
 *  section reads as a sequence instead of a pile of loose screenshots. */
function BeatStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-2xl bg-black/[0.035] p-4 dark:bg-white/[0.05] sm:p-6">
      {children}
    </div>
  );
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
  shotWidth,
  shotHeight,
}: {
  beat: TourBeat;
  marketId: string;
  platform: AppPlatform;
  tick: number;
  /** Caps the handset's width (mobile sizes it off the viewport height —
   *  see `MobileTour`). Unset means "fill the column", which is what the
   *  desktop bands want. */
  shotWidth?: string;
  /** The height the alert stack should occupy so it lines up with the
   *  handsets either side of it. Unset falls back to a screen-shaped box. */
  shotHeight?: string;
}) {
  if (beat.slot === "alert") {
    // The alert is not a device and must not wear a device's silhouette: a
    // notification floating in a phone-tall empty box read as a layout error,
    // not a choice. On the height-free desktop bands it sizes to its content;
    // the mobile carousel's slides sit in one row, so there it keeps the framed
    // handset's height (an alert a third the height of a phone would drag every
    // caption after it out of line).
    return (
      <BeatStage>
        <div
          className={
            shotHeight
              ? "flex w-full items-center"
              : "w-full max-w-[340px] py-8"
          }
          style={shotHeight ? { height: shotHeight } : undefined}
        >
          <HeroNotificationStack deals={dealsForMarket(marketId)} tick={tick} />
        </div>
      </BeatStage>
    );
  }

  return (
    <BeatStage>
      <div
        className="mx-auto w-full"
        style={shotWidth ? { width: shotWidth } : undefined}
      >
        <DeviceFrame
          alt={`ddbx ${SLOT_LABEL[beat.slot]} screen on ${platform === "ios" ? "iPhone" : "Android"}`}
          platform={platform}
          slot={beat.slot}
          src={appShotSrc(marketId, platform, beat.slot)}
        />
      </div>
    </BeatStage>
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
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-24">
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
                className={`grid items-center gap-16 border-t border-hairline py-14 dark:border-border/50 ${
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
                  <div className="border-l border-hairline pl-8 dark:border-border/60">
                    <div className="relative flex items-center gap-3">
                      <span
                        aria-hidden
                        className="absolute -left-[calc(2rem+4.5px)] h-[9px] w-[9px] rounded-full bg-brand-brown dark:bg-brand-tan"
                      />
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] tabular-nums text-brand-brown dark:text-brand-tan">
                        {b.timestamp}
                      </span>
                      <span
                        aria-hidden
                        className="h-px w-6 bg-hairline dark:bg-border/60"
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

/** The handset's width on mobile, sized off the VIEWPORT HEIGHT rather than
 *  the slide width.
 *
 *  This is the whole trick. A phone sized as a share of its column filled the
 *  column — ~296px wide, which at the screen's ~2.17 aspect is 620px of
 *  handset before a word of caption. Every slide came out taller than the
 *  device holding the page, so reading a beat meant scrolling down, swiping
 *  sideways, and landing at whatever vertical offset the last beat left you
 *  at. Horizontal and vertical scroll fighting each other is exactly the
 *  "weird" part; the screenshots were never the problem.
 *
 *  Sized off `svh` (the SMALL viewport height — the conservative one, with
 *  browser chrome expanded), a whole beat fits on one screenful at any handset
 *  size, so the carousel is a pure sideways gesture again. The clamp keeps it
 *  sane on a short landscape window and on a tablet-sized phone.
 *
 *  The budget is tighter than `svh` suggests, which is why this is 20 and not
 *  30-something: these pages carry a sticky header AND a fixed mobile install
 *  bar, so ~165px of any phone's viewport is spoken for before the tour gets a
 *  pixel. Measured on /download/ios at 390×780 — header 65, and of the install
 *  bar's 136 the top 40 is a gradient you can still read through, so the hard
 *  floor is the 96px button-plus-caption block.
 *
 *  The lower clamp bound is deliberately small: on a 667px viewport (SE-class,
 *  where that same fixed chrome is a quarter of the screen) 20svh is the only
 *  thing that keeps a beat near one screenful, and holding a larger minimum
 *  there just reintroduces the scroll it was there to prevent. */
const SHOT_W = "clamp(132px, 20svh, 232px)";

/** A framed handset is ~2.11× as tall as it is wide: the screen's aspect plus
 *  the bezel and chin `device-frame.tsx` draws around it. Used to give the
 *  alert stack the same height as the phones on the slides either side, so the
 *  captions stay on one line across the row. */
const SHOT_H = `calc(${SHOT_W} * 2.11)`;

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
  // Which beat the track has settled nearest to, for the counter below. The
  // scrollbar is hidden and the next-slide peek is the only other signal that
  // this row moves sideways — the counter is the explicit one, and it's the
  // same `01 / 05` device SectionHeader already stamps on every section.
  const [active, setActive] = useState(0);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const kids = Array.from(el.children) as HTMLElement[];

    if (!kids.length) return;
    const origin = kids[0].offsetLeft;
    let best = 0;
    let bestDist = Infinity;

    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - origin - el.scrollLeft);

      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  };

  return (
    <div className="mt-10 lg:hidden">
      {/* snap-start rather than snap-center: centring split the peek across
          both edges, ~12px a side, which is invisible. Left-aligned to the
          page grid, the whole remainder shows the next slide on the right —
          one unambiguous "there's more" edge, and the slides sit on the same
          left margin as everything above them. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={onScroll}
      >
        {beats.map((b, i) => (
          <div
            key={b.slot}
            /* Wider than the phone inside it. The slide's width is the copy's
               measure, and at the old 76% the body ran to six lines of ~30
               characters — which cost more height than the handset saved. 82%
               keeps the measure while leaving a peek wide enough to read as
               the next slide rather than as a rendering artefact. */
            className="w-[82%] max-w-[320px] shrink-0 snap-start sm:w-[56%]"
          >
            <BeatVisual
              beat={b}
              marketId={marketId}
              platform={platform}
              shotHeight={SHOT_H}
              shotWidth={SHOT_W}
              tick={tick}
            />
            <p className="mt-5 flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
              {b.timestamp}
              <span
                aria-hidden
                className="h-px w-5 bg-hairline dark:bg-border/60"
              />
              <span className="text-foreground/40">{b.kicker}</span>
            </p>
            <h3 className="mt-2 text-balance text-[22px] font-semibold leading-[1.15] tracking-[-0.02em]">
              {b.title}
            </h3>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-foreground/65">
              {b.body}
            </p>
            <span className="sr-only">
              Beat {i + 1} of {beats.length}
            </span>
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="mt-5 flex items-center gap-3 font-mono text-[11px] font-semibold tracking-[0.16em] tabular-nums text-foreground/40"
      >
        <span>
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(beats.length).padStart(2, "0")}
        </span>
        <span className="relative h-px flex-1 bg-hairline dark:bg-border/60">
          <span
            className="absolute inset-y-0 left-0 bg-brand-brown transition-[width] duration-300 dark:bg-brand-tan"
            style={{ width: `${((active + 1) / beats.length) * 100}%` }}
          />
        </span>
      </div>
    </div>
  );
}
