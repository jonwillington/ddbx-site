/** Substance strip under the hero: three numbers and where the data comes from.
 *
 *  Every number here is DERIVED FROM THE FEED THE PAGE HAS ALREADY FETCHED for
 *  the winners wall — nothing is typed in, and nothing is rounded up. That's
 *  deliberate: this band sits directly above a wall of returns, so an inflated
 *  or hand-written stat here would poison the credibility of everything below
 *  it. If a number can't be computed, its tile doesn't render.
 */
import { CountUp, Reveal } from "./reveal";

import { FULL_BLEED } from "@/components/full-bleed";

export interface Stat {
  value: number;
  label: string;
  suffix?: string;
}

export function StatBand({
  stats,
  sourceLine,
}: {
  stats: Stat[];
  /** "Straight from SEC EDGAR" etc. — the provenance claim. */
  sourceLine: string;
}) {
  if (!stats.length) return null;

  return (
    <section
      className={`${FULL_BLEED} border-y border-hairline bg-sheet dark:border-border/50 dark:bg-surface-secondary/20`}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-8 sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal
              key={s.label}
              className="text-center sm:text-left"
              delay={i * 80}
            >
              <p className="text-4xl font-semibold tracking-tight md:text-5xl">
                <CountUp suffix={s.suffix} value={s.value} />
              </p>
              <p className="mt-2 text-sm leading-snug text-foreground/55">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="mt-9 border-t border-hairline pt-6 text-center text-sm text-foreground/50 dark:border-border/50 sm:text-left">
            {sourceLine}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
