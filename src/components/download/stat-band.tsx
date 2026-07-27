/** Substance strip under the hero: three numbers and where the data comes from.
 *
 *  Every number here is DERIVED FROM THE FEED THE PAGE HAS ALREADY FETCHED for
 *  the winners wall — nothing is typed in, and nothing is rounded up. That's
 *  deliberate: this band sits directly above a wall of returns, so an inflated
 *  or hand-written stat here would poison the credibility of everything below
 *  it. If a number can't be computed, its tile doesn't render.
 *
 *  Form: the same proof cards the API page stands its headline on — mono key,
 *  figure, note — rather than the full-bleed ruled band this used to be. The
 *  band's top rule landed flush against the hero panel's bottom edge, so the
 *  two read as one object with a line through it. Cards on the page surface,
 *  set clear of the hero, read as evidence placed under the claim.
 */
import { CountUp, Reveal } from "./reveal";

export interface Stat {
  /** Mono eyebrow — what the figure counts, in one or two words. */
  k: string;
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
    <section className="mx-auto w-full max-w-6xl px-4 pt-12 md:px-6 md:pt-16 lg:pt-20">
      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={s.label} className="h-full" delay={i * 80}>
            <div className="h-full rounded-2xl border border-hairline bg-white/70 px-5 py-4 dark:border-border/60 dark:bg-surface-secondary/40">
              <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
                {s.k}
              </dt>
              <dd className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums md:text-[38px]">
                <CountUp suffix={s.suffix} value={s.value} />
              </dd>
              <p className="mt-2.5 text-[12.5px] leading-[1.45] text-foreground/50">
                {s.label}
              </p>
            </div>
          </Reveal>
        ))}
      </dl>
      <Reveal delay={200}>
        <p className="mt-5 text-[12.5px] leading-[1.45] text-foreground/45">
          {sourceLine}
        </p>
      </Reveal>
    </section>
  );
}
