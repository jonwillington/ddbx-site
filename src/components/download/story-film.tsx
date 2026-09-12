/** "Follow the money" — the thirty-second brand film, on the download page.
 *
 *  The film tells the whole pitch in one sitting: a share falls to a 52-week
 *  low, two more directors buy, the app shows what happened next. It was cut
 *  for social, portrait 4:5, silent, on a dark ground. On the site it is NOT
 *  a hero background — the home hero already tells this story live in code,
 *  and a dark video under a light hero breaks the page's treatment. It is a
 *  contained panel, the design language's first tenet: a rounded hairline
 *  frame the visual sits inside, with the copy beside it.
 *
 *  Two rules the panel enforces that the film cannot:
 *
 *  1. The disclaimer baked into the film's footer is a grey smear at panel
 *     size. The company is invented and the return is a made-up number, so the
 *     panel carries its own note saying so — the static-page rule about never
 *     stating a number you do not have applies to a number in a film too.
 *  2. It only plays while it is on screen. `preload="none"` and a poster mean
 *     a visitor who never scrolls this far never downloads it; an observer
 *     starts it as it enters and pauses it as it leaves. Under
 *     prefers-reduced-motion nothing autoplays — the poster sits there with
 *     native controls and the visitor decides.
 *
 *  The encode is a web cut of the master: 720×900 H.264 at ~650 kbps, ~2.3 MB.
 *  Re-cut with the AVFoundation script in the session that shipped this, or
 *  ffmpeg — keep the 4:5 frame, the panel's aspect ratio is fixed to it.
 */
import { useEffect, useRef, useState } from "react";

import { SectionHeader } from "./section-header";

import { CAPTION, EYEBROW } from "@/components/how-it-works/shared";

export interface FilmBeat {
  /** The caption as it appears on screen in the film. */
  title: string;
  /** What the visitor should take from it. */
  body: string;
}

export interface FilmCopy {
  heading: string;
  sub: string;
  beats: FilmBeat[];
  /** The fictional-scenario note under the panel. */
  note: string;
}

const FILM_SRC = "/film/follow-the-money.mp4";
const FILM_POSTER = "/film/follow-the-money-poster.jpg";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** Plays the video while it is meaningfully on screen and pauses it
 *  otherwise. Autoplay can be refused (Low Power Mode on iOS does), so the
 *  hook also reports whether playback ever started — the panel shows a tap
 *  target when it did not. */
function usePlayInView(reduced: boolean) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (!el || reduced || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().then(
            () => setBlocked(false),
            () => setBlocked(true),
          );
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 },
    );

    io.observe(el);

    return () => io.disconnect();
  }, [reduced]);

  return { ref, blocked };
}

export function StoryFilm({
  copy,
  kicker,
  index,
  total,
  playLabel,
  filmLabel,
}: {
  copy: FilmCopy;
  kicker: string;
  index?: number;
  total?: number;
  /** Accessible name for the tap-to-play affordance. */
  playLabel: string;
  /** Accessible name for the video itself. */
  filmLabel: string;
}) {
  const [reduced] = useState(() => prefersReducedMotion());
  const { ref, blocked } = usePlayInView(reduced);

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
      <SectionHeader
        index={index}
        kicker={kicker}
        sub={copy.sub}
        title={copy.heading}
        total={total}
      />

      {/* Copy left, film right from lg; stacked below. The film column is
          fixed at the width the tour gives a handset, so the two sections
          share a right-hand edge. */}
      <div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
        {/* Same rail the tour runs its beats on: a hairline down the copy with
            the marker sitting on it. Here the marker is the beat's position in
            the film rather than a clock. */}
        <ol className="border-l border-hairline dark:border-border/60">
          {copy.beats.map((b, i) => (
            <li
              key={b.title}
              className={`relative pl-8 ${i === 0 ? "" : "mt-9"}`}
            >
              <span
                aria-hidden
                className="absolute -left-[4.5px] top-[7px] h-[9px] w-[9px] rounded-full bg-brand-brown dark:bg-brand-tan"
              />
              <p className={`${EYEBROW} tabular-nums`}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 max-w-[20ch] text-balance text-[26px] font-semibold leading-[1.1] tracking-[-0.022em] sm:text-[30px]">
                {b.title}
              </h3>
              <p className="mt-2.5 max-w-[46ch] text-[16.5px] leading-[1.55] text-foreground/65">
                {b.body}
              </p>
            </li>
          ))}
        </ol>

        <figure className="mx-auto w-full max-w-[440px] lg:mx-0">
          {/* The panel. `bg-ink` under the video so the poster's fade-in and
              any letterbox rounding land on the film's own ground, not on
              cream. */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-hairline bg-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-border/60">
            <video
              ref={ref}
              disablePictureInPicture
              loop
              muted
              playsInline
              aria-label={filmLabel}
              className="h-full w-full object-cover"
              controls={reduced}
              poster={FILM_POSTER}
              preload="none"
              src={FILM_SRC}
            />
            {blocked ? (
              <button
                aria-label={playLabel}
                className="absolute inset-0 flex items-center justify-center bg-black/20"
                type="button"
                onClick={() => ref.current?.play()}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg">
                  <svg
                    aria-hidden
                    className="ml-1 h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            ) : null}
          </div>
          <figcaption className={`mt-4 max-w-[52ch] ${CAPTION}`}>
            {copy.note}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
