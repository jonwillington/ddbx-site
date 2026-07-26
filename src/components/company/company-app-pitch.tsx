/** The conversion block at the foot of a company page.
 *
 *  A company page is an SEO landing surface: most of its traffic arrives cold
 *  from a search for one ticker, reads the table, and leaves. Everything above
 *  this answers their question. This is the only part of the page whose job is
 *  to make them want the app — so it doesn't argue in the abstract, it shows
 *  the alert they'd have got for THIS company, using THIS company's real
 *  disclosed buys as the notification copy.
 *
 *  Two beats:
 *    1. the promise, and the live alert it would have sent for THIS company —
 *       the claim on the left, the animated evidence on the right;
 *    2. a screenshot roller — what it looks like once you're in.
 *
 *  There used to be a third: the company's buys rendered as the app lists
 *  them, sat where the alert now is. It was the same disclosures the table
 *  further up the page already carries, so the block held two inventories of
 *  one company side by side and pushed the only animated thing on the page
 *  into a corner beneath the CTA. The alert has the column to itself now.
 *
 *  Motion respects prefers-reduced-motion throughout: the alert stops
 *  advancing, the roller stops scrolling.
 */
import type { HeroDeal } from "@/components/market/hero-deal-data";
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useMemo } from "react";

import { DeviceFrame } from "@/components/download/device-frame";
import {
  HeroNotificationStack,
  useNotificationTick,
} from "@/components/market/hero-notification-stack";
import { StoreButtons } from "@/components/store-buttons";
import { BUTTON_RADIUS } from "@/components/button";
import { FULL_BLEED } from "@/components/full-bleed";
import { appShotSrc, SHOT_SLOTS } from "@/lib/app-screenshots";
import { useAvailableShots } from "@/lib/use-app-shots";
import { useDevicePlatform } from "@/lib/use-device-platform";

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

  const tick = useNotificationTick(alerts.length > 1);

  // Nothing to show an alert about — a company page with no disclosures
  // shouldn't fake one.
  if (alerts.length === 0) return null;

  return (
    // A dark band, not another cream one. Everything above this is the record
    // — cream sheets on a cream page — and the one block whose job is to sell
    // rather than inform was rendered in the same surface as all of it, so it
    // scrolled past as one more section. The change of surface IS the signal
    // that the page has stopped reporting and started asking.
    <section
      className={`${FULL_BLEED} mt-16 bg-[#1a140d] text-white dark:bg-[oklch(17%_0.02_55)]`}
    >
      <div className="mx-auto max-w-[1280px] px-4 py-14 md:px-6 md:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          {/* ---- Left: the promise ---- */}
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#eec584]">
              The app
            </p>
            <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[40px]">
              Don&rsquo;t miss the next buy from {company}.
            </h2>
            <p className="mt-4 max-w-[36em] text-[16px] leading-[1.6] text-white/65">
              Follow {ticker} and your phone buzzes the moment{" "}
              {market === "UK"
                ? "a director files with the LSE"
                : "an insider files a Form 4"}{" "}
              — with the rating, the full thesis and the price history already
              attached. No inbox to check, no filing feed to babysit.
            </p>

            <div className="mt-8 flex flex-col items-start gap-2.5">
              {/* Light fill: BUTTON_FILLED is near-black, which is the band. */}
              <StoreButtons
                buttonClassName={`inline-flex items-center gap-2.5 ${BUTTON_RADIUS} bg-white px-6 py-3.5 text-[15px] font-semibold text-[#1a140d] shadow-sm transition-colors hover:bg-white/90`}
                className="items-start"
                gaEvent="cta_company_download"
                gaLabel={`Company pitch · ${ticker}`}
                glyphClassName="h-4 w-4 shrink-0"
                marketId={marketId}
              />
              <p className="text-[12.5px] text-white/50">
                Free for 7 days, cancel any time.
              </p>
            </div>
          </div>

          {/* ---- Right: the live alert ----
              This used to be a static list of the same buys the table above
              already shows, with the animation tucked under the CTA on the
              left. Two inventories of one company's disclosures, side by side,
              and the only moving thing on the page relegated to a footnote
              beneath a button. The alert takes the column now: it's the thing
              being sold, it's the thing they don't already have, and nothing
              is competing with it for the same glance. */}
          <div className="mx-auto w-full max-w-[420px] lg:mx-0 lg:max-w-none">
            <HeroNotificationStack deals={alerts} tick={tick} />
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
 *  reader announcing ten identical "Analysis screen" images is noise.
 *
 *  Only screens we actually have are rolled. `DeviceFrame`'s placeholder earns
 *  its place in the tour, where a beat has a slot whether or not it's been
 *  captured — here it was a card reading "Lock screen · iPhone screenshot"
 *  gliding past in a rail of real app screens, which is an admission, not a
 *  product shot. */
function ScreenRoller({
  marketId,
  platform,
}: {
  marketId: string;
  platform: "ios" | "android";
}) {
  const available = useAvailableShots(marketId, platform, SHOT_SLOTS);

  // Nothing yet (still probing) or nothing at all for this market/platform —
  // either way the rail has no content, so it doesn't reserve space for any.
  if (!available || available.length === 0) return null;

  const slots = [...available, ...available];

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
