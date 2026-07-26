/** Scroll-in motion primitives for the download landing pages.
 *
 *  Deliberately tiny and dependency-free: the site ships no animation library,
 *  and the whole vocabulary here is "fade up when it enters, once". One
 *  IntersectionObserver per element is cheap at this page's element count, and
 *  it means a section can't animate before the visitor has actually reached it
 *  — which is the entire point of scroll-reveal on a conversion page.
 *
 *  Everything degrades to "already visible, no motion" under
 *  prefers-reduced-motion, including the count-ups (they render their final
 *  value immediately rather than ticking).
 */
import type { ElementType, ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** True once the element has entered the viewport. Stays true afterwards —
 *  re-animating on the way back up reads as a glitch, not a flourish. */
export function useInView<T extends HTMLElement>(
  /** How far into the viewport before it counts. Negative bottom margin means
   *  "the element must be meaningfully on screen", not just clipping the edge. */
  rootMargin = "0px 0px -12% 0px",
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;
    // Guard for very old browsers / test envs: without IO, show everything.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);

      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    io.observe(el);

    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

/** Fade-and-rise wrapper. `delay` staggers siblings — keep it under ~240ms in
 *  total across a row, past that it reads as the page being slow. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={`dl-reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Eased count-up, started the first time the number is on screen. Uses rAF
 *  rather than a CSS transition because the value has to be *readable* while
 *  it moves — a transform can't animate text content. */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1100,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>("0px 0px -20% 0px");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setShown(value);

      return;
    }

    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / durationMs, 1);
      // easeOutCubic — fast off the mark, settles rather than stops dead.
      const eased = 1 - Math.pow(1 - p, 3);

      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf);
  }, [inView, value, durationMs]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {shown.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
