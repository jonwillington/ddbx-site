/** The scroll tour — the section that answers "what am I actually installing?"
 *
 *  Desktop: one phone, pinned. The copy beats scroll past it and the screen
 *  inside cross-fades to match whichever beat is centred. It's the closest a
 *  web page gets to handing someone the app: the device never leaves the
 *  viewport, so the visitor watches it *change* rather than watching four
 *  static marketing images go by.
 *
 *  Mobile: a pinned phone would eat the whole viewport and leave no room for
 *  the copy, so the same beats become a snap-scrolling carousel — a thumb
 *  gesture over a row of phones, which reads as more app-like than a stack of
 *  full-width screenshots anyway.
 *
 *  The active beat is driven by a single IntersectionObserver keyed on the
 *  middle band of the viewport (`-46%` top and bottom), so exactly one beat is
 *  ever active and the swap happens as a beat reaches the centre line, not as
 *  it clips the edge.
 */
import { useEffect, useRef, useState } from "react";

import { DeviceFrame } from "./device-frame";
import { Reveal } from "./reveal";

import {
  appShotSrc,
  SLOT_LABEL,
  type AppPlatform,
  type ShotSlot,
} from "@/lib/app-screenshots";

export interface TourBeat {
  slot: ShotSlot;
  /** Small uppercase label — the feature's name. */
  kicker: string;
  /** The benefit, in the visitor's words. */
  title: string;
  body: string;
}

export function AppTour({
  marketId,
  platform,
  beats,
  heading,
  sub,
}: {
  marketId: string;
  platform: AppPlatform;
  beats: TourBeat[];
  heading: string;
  sub: string;
}) {
  const [active, setActive] = useState(0);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = beatRefs.current.filter(Boolean) as HTMLDivElement[];

    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const idx = Number((e.target as HTMLElement).dataset.beat);

          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      // A thin band across the middle of the viewport: a beat becomes active
      // when it crosses the centre line.
      { rootMargin: "-46% 0px -46% 0px", threshold: 0 },
    );

    els.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [beats.length]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-[42px] md:leading-[1.08]">
          {heading}
        </h2>
        <p className="mt-3 text-balance text-foreground/60">{sub}</p>
      </Reveal>

      {/* ---- Desktop: pinned phone + scrolling beats ----
           Beat height is the one number that tunes this section. Too short and
           two beats are active-looking at once; too tall (64vh was) and each
           beat floats alone in a field of cream with nothing else on screen.
           At 52vh the neighbouring beat peeks in dimmed, which is what makes
           the active-beat highlight legible as a highlight at all. */}
      <div className="mt-12 hidden gap-16 lg:grid lg:grid-cols-[1fr_320px]">
        <div>
          {beats.map((b, i) => (
            <div
              key={b.slot}
              ref={(el) => {
                beatRefs.current[i] = el;
              }}
              className="flex min-h-[52vh] flex-col justify-center py-6"
              data-beat={i}
            >
              <div
                className={`max-w-[460px] transition-all duration-500 ${
                  i === active
                    ? "opacity-100"
                    : "opacity-40 motion-reduce:opacity-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Numbered rail marker — doubles as a progress indicator, so
                      the visitor knows how much tour is left. */}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-500 ${
                      i === active
                        ? "bg-[#5a4128] text-white dark:bg-[#ad9479] dark:text-[#1a140d]"
                        : "bg-[#1a140d]/[0.07] text-foreground/50 dark:bg-white/10"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#5a4128] dark:text-[#ad9479]">
                    {b.kicker}
                  </span>
                </div>
                <h3 className="mt-5 text-balance text-3xl font-semibold leading-[1.14] tracking-tight">
                  {b.title}
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-foreground/65">
                  {b.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="sticky top-24 flex h-[calc(100vh-8rem)] items-center">
            <div className="relative w-full">
              {beats.map((b, i) => (
                <div
                  key={b.slot}
                  aria-hidden={i !== active}
                  className={`transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    i === 0 ? "" : "absolute inset-0"
                  } ${
                    i === active
                      ? "opacity-100 translate-y-0 scale-100"
                      : "pointer-events-none opacity-0 translate-y-3 scale-[0.97]"
                  }`}
                >
                  <DeviceFrame
                    alt={`ddbx ${SLOT_LABEL[b.slot]} screen on ${platform === "ios" ? "iPhone" : "Android"}`}
                    platform={platform}
                    slot={b.slot}
                    src={appShotSrc(marketId, platform, b.slot)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Mobile: snap carousel ---- */}
      <MobileTour beats={beats} marketId={marketId} platform={platform} />
    </section>
  );
}

function MobileTour({
  beats,
  marketId,
  platform,
}: {
  beats: TourBeat[];
  marketId: string;
  platform: AppPlatform;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);

  // Derive the dot from real scroll position rather than tracking taps, so a
  // free swipe (which can land anywhere) still reports the right slide.
  useEffect(() => {
    const el = trackRef.current;

    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const slide = el.scrollWidth / beats.length;

        setIdx(
          Math.max(
            0,
            Math.min(beats.length - 1, Math.round(el.scrollLeft / slide)),
          ),
        );
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [beats.length]);

  return (
    <div className="mt-10 lg:hidden">
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {beats.map((b, i) => (
          <div
            key={b.slot}
            className="w-[76%] max-w-[300px] shrink-0 snap-center sm:w-[52%]"
          >
            <DeviceFrame
              alt={`ddbx ${SLOT_LABEL[b.slot]} screen on ${platform === "ios" ? "iPhone" : "Android"}`}
              platform={platform}
              slot={b.slot}
              src={appShotSrc(marketId, platform, b.slot)}
            />
            <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#5a4128] dark:text-[#ad9479]">
              {b.kicker}
            </p>
            <h3 className="mt-2 text-balance text-xl font-semibold leading-snug tracking-tight">
              {b.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              {b.body}
            </p>
            <span className="sr-only">
              Slide {i + 1} of {beats.length}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {beats.map((b, i) => (
          <span
            key={b.slot}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === idx
                ? "w-5 bg-[#5a4128] dark:bg-[#ad9479]"
                : "w-1.5 bg-[#1a140d]/20 dark:bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
