/** The conversion block at the foot of a company page.
 *
 *  A company page is an SEO landing surface: most of its traffic arrives cold
 *  from a search for one ticker, reads the table, and leaves. Everything above
 *  this answers their question. This is the only part of the page whose job is
 *  to make them want the app — so it doesn't argue in the abstract, it shows
 *  the alert they'd have got for THIS company, using THIS company's real
 *  disclosed buys as the notification copy.
 *
 *  Three beats, in order of how much work they do:
 *    1. the live alert — the product's core promise, animated;
 *    2. the buys as the app lists them — the same rows the table above shows,
 *       rendered the way the app renders them, so the app looks like a better
 *       version of the page they're already on;
 *    3. a screenshot roller — what it looks like once you're in.
 *
 *  Motion respects prefers-reduced-motion throughout: the alert stops
 *  advancing, the roller stops scrolling.
 */
import type { HeroDeal } from "@/components/market/hero-deal-data";
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";

import { CompanyLogo } from "@/components/company-logo";
import { DeviceFrame } from "@/components/download/device-frame";
import { HeroNotificationStack } from "@/components/market/hero-notification-stack";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { FULL_BLEED } from "@/components/full-bleed";
import { appShotSrc, SHOT_SLOTS } from "@/lib/app-screenshots";
import { useDevicePlatform } from "@/lib/use-device-platform";

/** How often the alert stack advances. Matches the hero radar's cadence so the
 *  two surfaces feel like the same instrument. */
const TICK_MS = 4200;

const SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

const isUk = (d: Dealing | UsDealing): d is Dealing => "value_gbp" in d;

const nameOf = (d: Dealing | UsDealing) =>
  isUk(d)
    ? (d.director?.name ?? "A director")
    : (d.reporter?.name ?? "An insider");

function roleOf(d: Dealing | UsDealing): string {
  if (isUk(d)) return d.director?.role ?? "";
  const r = d.reporter;

  if (!r) return "";
  if (r.officer_title) return r.officer_title;

  return (r.roles ?? [])
    .map((x) => (x === "ten_percent_owner" ? "10% owner" : x))
    .join(", ");
}

const valueOf = (d: Dealing | UsDealing) => (isUk(d) ? d.value_gbp : d.value);

function moneyShort(v: number | null | undefined, currency: string): string {
  const n = Number(v);

  if (!isFinite(n) || n === 0) return "—";
  const sym = SYMBOL[currency] ?? "";

  if (n >= 1_000_000) {
    const m = n / 1_000_000;

    return `${sym}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;

  return `${sym}${Math.round(n)}`;
}

/** A monotonic counter for the alert stack. Rolled here rather than reusing
 *  `useDealRadar`, which also owns a map camera this block has no use for.
 *  Frozen under prefers-reduced-motion — the stack then rests on one card. */
function useTick(enabled: boolean): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);

    return () => clearInterval(id);
  }, [enabled]);

  return tick;
}

export function CompanyAppPitch({
  company,
  tickerKey,
  ticker,
  deals,
  market,
  currency,
}: {
  company: string;
  /** Storage key, for the logo. */
  tickerKey: string;
  /** Display ticker, no exchange suffix. */
  ticker: string;
  deals: Array<Dealing | UsDealing>;
  market: string;
  currency: string;
}) {
  const platform = useDevicePlatform() ?? "ios";
  const marketId = market === "UK" ? "uk" : "us";
  const insider = market === "UK" ? "director" : "insider";

  // The alert copy IS this company's disclosure history. Newest first, capped
  // at four: the stack only ever shows one card plus rims, and a longer loop
  // takes too long to come back round to the buy the visitor just read about.
  const alerts: HeroDeal[] = useMemo(() => {
    const recent = [...deals]
      .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))
      .slice(0, 4);

    return recent.map((d, i) => ({
      id: d.id ?? `${tickerKey}-${i}`,
      ticker: tickerKey,
      icon: `/ios-app-icon-${marketId}.png`,
      app: `ddbx.${marketId}`,
      tag: d.analysis?.rating === "significant" ? "SIGNAL" : "JUST IN",
      lead: `${ticker} · ${company}`,
      body: `${nameOf(d)}${roleOf(d) ? ` (${roleOf(d)})` : ""} bought ${moneyShort(
        valueOf(d),
        currency,
      )} of shares.`,
      // The map never renders here, but HeroDeal requires the geo fields.
      city: "",
      lng: 0,
      lat: 0,
    }));
  }, [deals, tickerKey, ticker, company, currency, marketId]);

  const tick = useTick(alerts.length > 1);

  // Nothing to show an alert about — a company page with no disclosures
  // shouldn't fake one.
  if (alerts.length === 0) return null;

  const listed = [...deals]
    .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))
    .slice(0, 5);

  return (
    <section
      className={`${FULL_BLEED} mt-16 border-y border-[#e8e0d5] bg-[#faf7f2] dark:border-separator dark:bg-surface`}
    >
      <div className="mx-auto max-w-[1280px] px-4 py-14 md:px-6 md:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          {/* ---- Left: the promise + the live alert ---- */}
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#5a4128] dark:text-[#ad9479]">
              The app
            </p>
            <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[40px]">
              Don&rsquo;t miss the next buy from {company}.
            </h2>
            <p className="mt-4 max-w-[36em] text-[16px] leading-[1.6] text-foreground/65">
              Follow {ticker} and your phone buzzes the moment{" "}
              {market === "UK"
                ? "a director files with the LSE"
                : "an insider files a Form 4"}{" "}
              — with the rating, the full thesis and the price history already
              attached. No inbox to check, no filing feed to babysit.
            </p>

            <div className="mt-8 flex flex-col items-start gap-2.5">
              <StoreButtons
                buttonClassName={`inline-flex items-center gap-2.5 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-6 py-3.5 text-[15px] font-semibold shadow-sm transition-colors`}
                className="items-start"
                gaEvent="cta_company_download"
                gaLabel={`Company pitch · ${ticker}`}
                glyphClassName="h-4 w-4 shrink-0"
                marketId={marketId}
              />
              <p className="text-[12.5px] text-foreground/50">
                Free for 7 days, cancel any time.
              </p>
            </div>

            {/* The alert itself, under the claim it's evidence for. */}
            <div className="mt-12 max-w-[380px]">
              <HeroNotificationStack deals={alerts} tick={tick} />
            </div>
          </div>

          {/* ---- Right: the buys, as the app lists them ---- */}
          <div className="rounded-2xl border border-[#e8e0d5] bg-background/70 p-1.5 shadow-[0_12px_36px_-20px_rgba(90,65,40,0.5)] dark:border-white/[0.07] dark:bg-surface-secondary/50">
            <div className="flex items-center justify-between px-3.5 pb-2.5 pt-3">
              <span className="flex items-center gap-2.5">
                <CompanyLogo size={26} ticker={tickerKey} />
                <span className="text-[13.5px] font-semibold text-foreground">
                  {ticker}
                </span>
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
                In the app
              </span>
            </div>

            <ul className="rounded-xl bg-background dark:bg-surface">
              {listed.map((d, i) => (
                <li
                  key={d.id ?? i}
                  className="flex items-center gap-3 border-b border-[#e8e0d5] px-3.5 py-3 last:border-b-0 dark:border-separator"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium leading-snug text-foreground">
                      {nameOf(d)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] leading-4 text-foreground/50">
                      {roleOf(d) || insider} · {d.trade_date}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13.5px] font-semibold tabular-nums text-foreground">
                      {moneyShort(valueOf(d), currency)}
                    </span>
                    {d.analysis?.rating && (
                      <span className="mt-0.5 block font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#5a4128] dark:text-[#ad9479]">
                        {d.analysis.rating}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <p className="px-3.5 py-3 text-[11.5px] leading-snug text-foreground/45">
              Tap any row in the app for the full thesis, the evidence behind
              the rating, and what the price has done since.
            </p>
          </div>
        </div>

        {/* ---- The roller ---- */}
        <ScreenRoller marketId={marketId} platform={platform} />
      </div>
    </section>
  );
}

/** Auto-scrolling row of app screens.
 *
 *  The track holds the slot list TWICE and translates by exactly -50%, so the
 *  loop is seamless — at the end of the animation the second copy sits exactly
 *  where the first started. Duplicating in markup rather than cloning in JS
 *  keeps it a pure CSS animation, which the compositor runs off the main
 *  thread. `aria-hidden` on the whole strip: it's decorative, and a screen
 *  reader announcing ten identical "Analysis screen" images is noise. */
function ScreenRoller({
  marketId,
  platform,
}: {
  marketId: string;
  platform: "ios" | "android";
}) {
  const slots = [...SHOT_SLOTS, ...SHOT_SLOTS];

  return (
    <div aria-hidden className="mt-16">
      <style>{`
        @keyframes cap-roll {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .cap-roller {
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
          mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .cap-track {
          display: flex;
          width: max-content;
          gap: 1.25rem;
          will-change: transform;
          animation: cap-roll 46s linear infinite;
        }
        .cap-roller:hover .cap-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .cap-track { animation: none; }
        }
      `}</style>
      <div className="cap-roller overflow-hidden">
        <div className="cap-track">
          {slots.map((slot, i) => (
            <div key={`${slot}-${i}`} className="w-[168px] shrink-0">
              <DeviceFrame
                alt=""
                platform={platform}
                slot={slot}
                src={appShotSrc(marketId, platform, slot)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
