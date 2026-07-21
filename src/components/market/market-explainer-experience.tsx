import type { MarketDealing } from "@/lib/markets/types";
import type { PriceFormat } from "@/components/position-card";
import type { RatingChecklist } from "@/types/ddbx";

import { useEffect, useMemo, useRef, useState } from "react";

import { shortDate } from "./market-utils";

import { CompanyLogo } from "@/components/company-logo";
import { marketCopyFor } from "@/lib/markets/market-copy";

/** "What are we looking for?" — the explainer as a full-screen walkthrough
 *  instead of a drawer. The hero's atmosphere (warm spotlight, drifting
 *  shimmer, disclosure pulses) expands to fill the viewport, then the
 *  methodology is *demonstrated* rather than described: a real recent filing
 *  from the already-loaded dealings is run through the six-point checklist
 *  one check per scene, each verdict landing with the hero's ripple motif,
 *  ending on the rating it earned. Markets whose rows carry no checklist yet
 *  (SE/NL — analysis flag off) get the same walkthrough without the
 *  worked-example lines.
 *
 *  Web-only surface. Congress brings its own signal model and keeps the
 *  MarketExplainerSheet drawer; this component renders for checklist markets
 *  (UK/US/SE/NL). The six checks mirror RatingChecklist in
 *  ddbx-data/worker/db/types.ts — same order, same meaning.
 *
 *  Navigation: click/tap anywhere advances, arrow keys step both ways,
 *  Escape closes, the progress dots jump. All animation is CSS-only and
 *  respects prefers-reduced-motion. */

/** One scene per checklist key, in scoring order. `passLine` narrates the
 *  verdict for the featured filing; the generic `body` carries the scene when
 *  there is no featured filing (or the check somehow didn't pass). */
const CHECKS: {
  key: keyof RatingChecklist;
  title: string;
  body: string;
  passLine: (ctx: FeaturedContext) => string;
}[] = [
  {
    key: "open_market_buy",
    title: "Open-market buy",
    body: "They paid for the shares themselves on the open market. Not an option grant, a vesting, or an internal transfer.",
    passLine: (c) =>
      c.price
        ? `${c.name} paid ${c.price} a share on the open market — ${c.value} of their own money.`
        : `${c.name} put ${c.value} of their own money in on the open market.`,
  },
  {
    key: "senior_insider",
    title: "Senior insider",
    body: "The buyer is a CEO, CFO, or a board member close to the business, not a junior name on the register.",
    passLine: (c) =>
      c.role
        ? `${c.name} is ${c.role} at ${c.company} — close enough to see the whole picture.`
        : `${c.name} is a senior insider at ${c.company}.`,
  },
  {
    key: "meaningful_conviction",
    title: "Meaningful conviction",
    body: "The amount is large relative to what they earn, so it reads as a real commitment rather than a token.",
    passLine: (c) => `${c.value} of personal capital. That is not a token.`,
  },
  {
    key: "no_alternative_explanation",
    title: "No scheme or plan",
    body: "Nothing mechanical explains the timing: no dividend reinvestment, no pre-arranged trading plan, no contractual or tax deadline.",
    passLine: () =>
      "Nothing mechanical explains the timing — no plan, no scheme, no deadline forcing it.",
  },
  {
    key: "supporting_context_found",
    title: "Supporting context",
    body: "Either there is news that makes the timing make sense, or nothing public argues against it. A buy in a quiet period can be the strongest kind.",
    passLine: (c) =>
      `The timing holds up against everything public about ${c.company}.`,
  },
  {
    key: "no_major_counter_signal",
    title: "No major counter-signal",
    body: "Nothing serious points the other way: no other insiders selling at the same time, no open investigation, no sign the business is still getting worse.",
    passLine: () =>
      "No insiders selling against it, no open investigation, nothing pointing the other way.",
  },
];

/** Pre-formatted strings the verdict lines interpolate. */
interface FeaturedContext {
  name: string;
  role?: string;
  company: string;
  /** Per-share entry, already through fmt.formatPrice. Null when unpriced. */
  price: string | null;
  /** Deal value, already through fmt.formatValue. */
  value: string;
}

/** Ambient blip anchor points — hand-placed in the side gutters like the
 *  hero's, clear of the centre column where the scene text sits. */
const PULSE_POINTS: {
  left: string;
  top: string;
  size: number;
  delay: number;
}[] = [
  { left: "10%", top: "24%", size: 9, delay: 0.8 },
  { left: "17%", top: "62%", size: 11, delay: 3.4 },
  { left: "8%", top: "44%", size: 8, delay: 6.1 },
  { left: "86%", top: "30%", size: 10, delay: 1.9 },
  { left: "79%", top: "58%", size: 8, delay: 4.8 },
  { left: "91%", top: "46%", size: 11, delay: 7.5 },
];

import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
const FILLED_CTA = `inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3 text-base font-semibold shadow-md transition-all hover:shadow-lg`;

const GHOST_CTA =
  "inline-flex items-center rounded-full border border-white/15 px-6 py-3 text-base font-semibold text-[#e9e1d4] transition-colors hover:bg-white/[0.06]";

export function MarketExplainerExperience({
  open,
  onClose,
  marketId,
  dealings,
  fmt,
  locale,
  showLogo,
  onViewFiling,
}: {
  open: boolean;
  onClose: () => void;
  marketId: string;
  /** The page's already-loaded dealings — the walkthrough picks its worked
   *  example from these, so it costs no extra fetch. */
  dealings: MarketDealing<unknown>[];
  fmt: PriceFormat;
  locale?: string;
  /** Render the featured company's logo in the intro. Off for markets where
   *  logo.dev coverage is too thin (SE), mirroring the table rows. */
  showLogo?: boolean;
  /** Opens the featured filing's detail drawer (caller closes this overlay
   *  first). Omitted → the finale shows no "see this filing" CTA. */
  onViewFiling?: (key: string) => void;
}) {
  const c = marketCopyFor(marketId);
  // Scenes: 0 = intro, 1..6 = the checks, 7 = verdict.
  const LAST = CHECKS.length + 1;
  const [step, setStep] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  /** The worked example: the best recent buy that cleared all six checks.
   *  Hard bar: an open-market buy with a value and every checklist item true.
   *  Among those, prefer in order of weight: top rating tier (a "significant"
   *  payoff lands hardest), disclosed in the last 45 days (the story stays
   *  current), not underwater right now (an exemplary buy that's down 20%
   *  undercuts the finale — unknown performance is treated as fine), a
   *  quotable summary, a named senior role for the headline. Recency breaks
   *  ties. Null when the market has no checklist data — the walkthrough runs
   *  without examples. */
  const featured = useMemo(() => {
    const cleared = dealings.filter(
      (d) =>
        d.actionTone === "buy" &&
        d.value != null &&
        d.checklist &&
        Object.values(d.checklist).every(Boolean),
    );
    const freshCutoff = new Date(Date.now() - 45 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const score = (d: MarketDealing<unknown>) =>
      (d.rating === "significant" ? 100 : d.rating === "noteworthy" ? 50 : 0) +
      (d.disclosedDate.slice(0, 10) >= freshCutoff ? 25 : 0) +
      ((d.livePerformance?.return_pct_trade ?? 0) >= 0 ? 20 : 0) +
      (d.summary ? 15 : 0) +
      (d.insiderRole ? 10 : 0);

    return (
      cleared.sort(
        (a, b) =>
          score(b) - score(a) || b.disclosedDate.localeCompare(a.disclosedDate),
      )[0] ?? null
    );
  }, [dealings]);

  const ctx: FeaturedContext | null = featured
    ? {
        name: featured.insiderName,
        role: featured.insiderRole,
        company: featured.company,
        price:
          featured.entryPrice != null
            ? fmt.formatPrice(featured.entryPrice)
            : null,
        value: fmt.formatValue(featured.value!),
      }
    : null;

  // Restart from the intro every time the overlay opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Lock body scroll and move focus onto the stage while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    stageRef.current?.focus();

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard: arrows step, Escape closes, advancing past the end walks out.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (step >= LAST) onClose();
        else setStep(step + 1);
      } else if (e.key === "ArrowLeft") {
        setStep(Math.max(0, step - 1));
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, LAST, onClose]);

  if (!open) return null;

  const advance = () => {
    if (step >= LAST) onClose();
    else setStep(step + 1);
  };

  const check = step >= 1 && step <= CHECKS.length ? CHECKS[step - 1] : null;
  const checkPassed =
    check && featured ? featured.checklist?.[check.key] === true : false;

  return (
    <div
      ref={stageRef}
      aria-label="What are we looking for?"
      aria-modal="true"
      className="exp-stage fixed inset-0 z-[70] flex flex-col overflow-hidden bg-[#14100b] text-[#f3ecdf] outline-none animate-content-in"
      role="dialog"
      tabIndex={-1}
    >
      <style>{`
        @keyframes exp-spotlight-breathe {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes exp-shimmer-drift {
          0%   { transform: translate3d(-6%, -3%, 0); }
          50%  { transform: translate3d( 6%,  3%, 0); }
          100% { transform: translate3d(-6%, -3%, 0); }
        }
        .exp-spotlight {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 70% at 50% 38%,
              rgba(196, 168, 130, 0.22) 0%,
              rgba(196, 168, 130, 0.10) 30%,
              rgba(196, 168, 130, 0.04) 55%,
              transparent 75%);
          will-change: opacity, transform;
          animation: exp-spotlight-breathe 9s ease-in-out infinite;
        }
        .exp-shimmer {
          position: absolute; inset: -20% -10%;
          background:
            radial-gradient(ellipse 50% 50% at 18% 24%, rgba(130, 140, 160, 0.12) 0%, transparent 55%),
            radial-gradient(ellipse 45% 50% at 82% 18%, rgba(120, 130, 150, 0.10) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 35% 78%, rgba(140, 145, 160, 0.07) 0%, transparent 60%);
          will-change: transform;
          animation: exp-shimmer-drift 22s ease-in-out infinite;
        }
        .exp-vignette {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 90% 95% at 50% 42%,
              transparent 45%,
              rgba(0, 0, 0, 0.25) 80%,
              rgba(0, 0, 0, 0.45) 100%);
        }
        /* Ambient gutter blips — same grammar as the hero's disclosure
           pulses, quieter, so the stage keeps breathing between scenes. */
        .exp-pulse {
          position: absolute; border-radius: 50%; pointer-events: none;
          opacity: 0; background: #ad9479;
          will-change: opacity, transform;
          animation: exp-pulse-dot 9s ease-out infinite;
        }
        .exp-pulse-ring {
          position: absolute; inset: 0; border-radius: 50%;
          opacity: 0; border: 1.5px solid rgba(173, 148, 121, 0.6);
          will-change: opacity, transform;
          animation: exp-pulse-ring 9s ease-out infinite;
          animation-delay: inherit;
        }
        @keyframes exp-pulse-dot {
          0%   { opacity: 0;    transform: scale(0); }
          2.5% { opacity: 0.7;  transform: scale(1.3); }
          5%   { opacity: 0.55; transform: scale(1); }
          22%  { opacity: 0.4;  transform: scale(1); }
          30%  { opacity: 0;    transform: scale(0.4); }
          100% { opacity: 0;    transform: scale(0); }
        }
        @keyframes exp-pulse-ring {
          0%   { opacity: 0;   transform: scale(0.5); }
          2.5% { opacity: 0.5; }
          18%  { opacity: 0;   transform: scale(3.8); }
          100% { opacity: 0;   transform: scale(3.8); }
        }
        /* The intro's centre-stage blip — fires once, then holds a soft glow. */
        .exp-hero-blip {
          position: relative; width: 14px; height: 14px; border-radius: 50%;
          background: #cdb190;
          box-shadow: 0 0 24px 4px rgba(205, 177, 144, 0.45);
          animation: exp-hero-blip-in 1s ease-out both;
        }
        /* Logo variant: the featured company's mark lands like a blip — same
           scale-in + ripple rings, a soft glow instead of the dot. */
        .exp-hero-land {
          position: relative; border-radius: 50%;
          box-shadow: 0 0 32px 6px rgba(205, 177, 144, 0.3);
          animation: exp-hero-blip-in 1s ease-out both;
        }
        .exp-hero-blip-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(205, 177, 144, 0.8);
          animation: exp-hero-blip-ring 1.8s ease-out both;
        }
        .exp-hero-blip-ring--late { animation-delay: 0.35s; }
        @keyframes exp-hero-blip-in {
          0%   { opacity: 0; transform: scale(0); }
          40%  { opacity: 1; transform: scale(1.4); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes exp-hero-blip-ring {
          0%   { opacity: 0;   transform: scale(0.5); }
          15%  { opacity: 0.8; }
          100% { opacity: 0;   transform: scale(5); }
        }
        /* From the 56px logo the dot's 5x ripple would be ~280px — keep the
           rings proportionate to the bigger anchor. */
        .exp-hero-land .exp-hero-blip-ring {
          animation-name: exp-hero-land-ring;
        }
        @keyframes exp-hero-land-ring {
          0%   { opacity: 0;   transform: scale(0.8); }
          15%  { opacity: 0.7; }
          100% { opacity: 0;   transform: scale(2.1); }
        }
        /* Scene change: content rises in; the verdict card lands a beat
           after the check it answers. */
        .exp-scene { animation: exp-scene-in 0.55s ease-out both; }
        @keyframes exp-scene-in {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .exp-verdict { animation: exp-verdict-in 0.5s ease-out 0.45s both; }
        @keyframes exp-verdict-in {
          0%   { opacity: 0; transform: translateY(10px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .exp-spotlight, .exp-shimmer, .exp-scene, .exp-verdict,
          .exp-hero-blip, .exp-hero-land { animation: none !important; opacity: 1; }
          .exp-pulse { animation: none !important; opacity: 0.2; }
          .exp-pulse-ring, .exp-hero-blip-ring { display: none; }
        }
      `}</style>

      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none">
        <div className="exp-shimmer" />
        <div className="exp-spotlight" />
        <div className="exp-vignette" />
        {PULSE_POINTS.map((p) => (
          <span
            key={`${p.left}-${p.top}`}
            className="exp-pulse hidden md:block"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          >
            <span className="exp-pulse-ring" />
          </span>
        ))}
      </div>

      {/* Click-to-advance — a full-bleed button under the real controls, so
          a tap anywhere on the stage steps the walkthrough forward. The text
          layers above it are pointer-events-none except their own buttons. */}
      <button
        aria-label="Next"
        className="absolute inset-0 z-[5] cursor-default outline-none"
        type="button"
        onClick={advance}
      />

      {/* Close */}
      <button
        aria-label="Close"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-[#f3ecdf]/50 transition-colors hover:bg-white/[0.06] hover:text-[#f3ecdf]"
        type="button"
        onClick={onClose}
      >
        ×
      </button>

      {/* Scene */}
      <div className="pointer-events-none relative z-10 flex flex-1 items-center justify-center px-6 [&_button]:pointer-events-auto">
        <div key={step} className="exp-scene w-full max-w-xl text-center">
          {step === 0 && (
            <IntroScene
              ctx={ctx}
              dealing={featured}
              exchange={c.exchangeFullName}
              insiderTermPlural={c.insiderTermPlural}
              locale={locale}
              showLogo={showLogo}
              onBegin={advance}
            />
          )}

          {check && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ad9479]">
                Check {step} of {CHECKS.length}
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.05]">
                {check.title}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-balance text-[15px] leading-relaxed text-[#f3ecdf]/65">
                {check.body}
              </p>
              {ctx && (
                <div className="exp-verdict mx-auto mt-9 flex max-w-md items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-left backdrop-blur-sm">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      checkPassed
                        ? "bg-[#6fcf97]/15 text-[#6fcf97]"
                        : "bg-rose-400/15 text-rose-300"
                    }`}
                  >
                    {checkPassed ? "✓" : "✗"}
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f3ecdf]/40">
                      This filing
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#f3ecdf]/90">
                      {checkPassed
                        ? check.passLine(ctx)
                        : "This one didn't clear the check — and that costs it."}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === LAST && (
            <FinaleScene
              copy={c}
              dealing={featured}
              onClose={onClose}
              onViewFiling={onViewFiling}
            />
          )}
        </div>
      </div>

      {/* Progress + next. Dots jump; the pill is the explicit affordance for
          anyone who doesn't discover click-to-advance. */}
      <div className="pointer-events-none relative z-10 flex items-center justify-center gap-6 pb-7 md:pb-9 [&_button]:pointer-events-auto">
        <div className="flex items-center gap-2">
          {Array.from({ length: LAST + 1 }).map((_, i) => (
            <button
              key={i}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-[#f3ecdf]/90"
                  : "w-1.5 bg-[#f3ecdf]/25 hover:bg-[#f3ecdf]/50"
              }`}
              type="button"
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        {step > 0 && step < LAST && (
          <button
            className="absolute right-5 rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-[#f3ecdf]/70 transition-colors hover:bg-white/[0.06] hover:text-[#f3ecdf]"
            type="button"
            onClick={advance}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Scenes ──────────────────────────────────────────────────────────── */

function IntroScene({
  ctx,
  dealing,
  exchange,
  insiderTermPlural,
  locale,
  showLogo,
  onBegin,
}: {
  ctx: FeaturedContext | null;
  dealing: MarketDealing<unknown> | null;
  exchange: string;
  insiderTermPlural: string;
  locale?: string;
  showLogo?: boolean;
  onBegin: () => void;
}) {
  // The featured company's logo lands centre-stage like a filing blip; the
  // plain dot carries the scene when logos are off or there's no example.
  const logoTicker = showLogo && dealing ? dealing.ticker : null;

  return (
    <>
      {logoTicker ? (
        <span aria-hidden className="mx-auto mb-7 block h-14 w-14">
          <span className="exp-hero-land block h-full w-full">
            <CompanyLogo
              className="!h-full !w-full"
              size={56}
              ticker={logoTicker}
            />
            <span className="exp-hero-blip-ring" />
            <span className="exp-hero-blip-ring exp-hero-blip-ring--late" />
          </span>
        </span>
      ) : (
        <span aria-hidden className="mx-auto mb-8 block h-3.5 w-3.5">
          <span className="exp-hero-blip block h-full w-full">
            <span className="exp-hero-blip-ring" />
            <span className="exp-hero-blip-ring exp-hero-blip-ring--late" />
          </span>
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ad9479]">
        {exchange}
        {dealing && ` · ${shortDate(dealing.disclosedDate, locale)}`}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.05]">
        {ctx && dealing ? (
          <>
            {ctx.role ? `The ${ctx.role} of ${ctx.company}` : ctx.name} just
            bought <span className="text-[#cdb190]">{ctx.value}</span> of{" "}
            {ctx.role ? "their own" : `${ctx.company}`} stock.
          </>
        ) : (
          <>
            Hundreds of {insiderTermPlural} file share dealings every month.
            Most are noise.
          </>
        )}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-balance text-[15px] leading-relaxed text-[#f3ecdf]/65">
        {ctx
          ? "Most filings are noise. We run every one through six checks — watch this one go through."
          : "We run every filing through six checks before it earns a place on the list. Here's what we look for."}
      </p>
      <div className="mt-9">
        <button className={FILLED_CTA} type="button" onClick={onBegin}>
          Run the checklist →
        </button>
      </div>
      <p className="mt-5 hidden text-xs text-[#f3ecdf]/35 md:block">
        Click anywhere or use ← → · Esc to close
      </p>
    </>
  );
}

function FinaleScene({
  copy,
  dealing,
  onClose,
  onViewFiling,
}: {
  copy: ReturnType<typeof marketCopyFor>;
  dealing: MarketDealing<unknown> | null;
  onClose: () => void;
  onViewFiling?: (key: string) => void;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ad9479]">
        The verdict
      </p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.05]">
        {dealing ? "Six for six." : "That's the bar."}
      </h2>
      {dealing?.rating && (
        <span className="mt-5 inline-flex items-center rounded-full border border-[#ad9479]/40 bg-[#ad9479]/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#cdb190]">
          Rated {dealing.rating}
        </span>
      )}
      {dealing?.summary ? (
        <p className="mx-auto mt-5 max-w-md text-balance text-[15px] leading-relaxed text-[#f3ecdf]/80">
          &ldquo;{dealing.summary}&rdquo;
        </p>
      ) : (
        <p className="mx-auto mt-5 max-w-md text-balance text-[15px] leading-relaxed text-[#f3ecdf]/65">
          A buy that clears all six is what we rate highest; the more it misses,
          the further it sinks down the list.
        </p>
      )}
      <p className="mx-auto mt-6 max-w-md text-balance text-sm leading-relaxed text-[#f3ecdf]/45">
        Built for {copy.regionName} — we read {copy.regulatorFullName} on{" "}
        {copy.exchangeFullName}, filed by the people local rules call{" "}
        {copy.insiderTermPlural}. The checklist isn&apos;t fixed: as we see
        which buys go on to perform, the checks get sharper.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button className={FILLED_CTA} type="button" onClick={onClose}>
          Browse the signals
        </button>
        {dealing && onViewFiling && (
          <button
            className={GHOST_CTA}
            type="button"
            onClick={() => onViewFiling(dealing.key)}
          >
            See this filing
          </button>
        )}
      </div>
    </>
  );
}
