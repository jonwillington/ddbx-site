// Conversion-focused UK landing page on /download. Single job: get the visitor
// to install the iOS app and start the 7-day free trial. Reuses the hero
// notification-stack "hook" and inherits the floating mobile download CTA from
// DefaultLayout (which resolves /download -> UK app via marketForPath). It is
// intentionally PUBLIC and ungated — it does NOT import @/lib/discretion, so
// the winner proof is always shown in full (the data is the hook here).
//
// Returns are shown, so the page carries a past-performance / not-advice note.
import type { Dealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";

import { CompanyLogo } from "@/components/company-logo";
import { useDealRadar } from "@/components/market/hero-deal-radar";
import { HeroNotificationStack } from "@/components/market/hero-notification-stack";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { APP_STORE_URLS } from "@/lib/app-store";
import { stripTickerSuffix } from "@/lib/display-name";

const APP_URL = APP_STORE_URLS.uk;

const gbp0 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** Filled brown App Store pill — same anchor styling as the market hero so the
 *  page reads as the same product. */
const CTA_CLASS =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-[#5a4128] px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[#49331f] hover:shadow-lg dark:bg-white dark:text-[#1a140d] dark:hover:bg-white/90";

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 384 512"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function DownloadButton({ gaLabel }: { gaLabel: string }) {
  return (
    <a
      className={CTA_CLASS}
      data-ga-event="cta_download_lp"
      data-ga-label={gaLabel}
      href={APP_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      <AppleGlyph className="h-[17px] w-[17px] shrink-0" />
      Download on the App Store
    </a>
  );
}

// ---------------------------------------------------------------------------
// Winner selection
// ---------------------------------------------------------------------------

interface Winner {
  d: Dealing;
  returnPct: number;
  bars?: { date: string; close: number }[];
}

/** ISO date `n` days before today (UTC date part). */
function isoDaysAgo(n: number): string {
  const t = new Date();

  t.setUTCDate(t.getUTCDate() - n);

  return t.toISOString().slice(0, 10);
}

/** Pick the biggest open-market-buy winners. Prefers the last 30 days; if that
 *  window is thin (markets go quiet), it widens to 90 so the wall is never
 *  embarrassingly empty. Sorted by trade-anchored return, best first. */
function pickWinners(dealings: Dealing[], want: number): Winner[] {
  const candidates = (windowDays: number): Winner[] => {
    const since = isoDaysAgo(windowDays);

    return dealings
      .filter(
        (d) =>
          d.tx_type === "buy" &&
          d.is_open_market_buy !== false &&
          d.trade_date >= since &&
          typeof d.live_performance?.return_pct_trade === "number" &&
          (d.live_performance.return_pct_trade as number) > 0,
      )
      .map((d) => ({
        d,
        returnPct: d.live_performance!.return_pct_trade as number,
      }))
      .sort((a, b) => b.returnPct - a.returnPct);
  };

  const recent = candidates(30);

  if (recent.length >= Math.min(want, 4)) return recent.slice(0, want);

  return candidates(90).slice(0, want);
}

// ---------------------------------------------------------------------------
// Trend chart — the "going up" line
// ---------------------------------------------------------------------------

/** Area-filled trend line, rebased to 0% at the first bar so it reads as the
 *  share-price journey since the director bought. Green when it ends up. Pure
 *  SVG, no axes — it's a feeling, not a dashboard. */
function TrendChart({
  bars,
  id,
}: {
  bars: { date: string; close: number }[];
  id: string;
}) {
  const layout = useMemo(() => {
    if (!bars || bars.length < 2) return null;
    const w = 320;
    const h = 96;
    const pad = 5;
    const base = bars[0].close;

    if (!base) return null;
    const pct = bars.map((b) => ((b.close - base) / base) * 100);
    const min = Math.min(...pct, 0);
    const max = Math.max(...pct, 0);
    const range = Math.max(max - min, 1);
    const pts = pct.map((p, i) => {
      const x = pad + (i / (pct.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (p - min) / range) * (h - 2 * pad);

      return [x, y] as const;
    });
    const line = pts
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
    const up = pct[pct.length - 1] >= 0;

    return { w, h, line, area, up };
  }, [bars]);

  if (!layout) {
    return <div aria-hidden className="h-[96px] w-full" />;
  }

  const { w, h, line, area, up } = layout;
  const color = up ? "#22a06b" : "#d1495b";

  return (
    <svg
      aria-hidden="true"
      className="block w-full"
      height={h}
      preserveAspectRatio="none"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
    >
      <defs>
        <linearGradient id={`tg-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#tg-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Winner card
// ---------------------------------------------------------------------------

function WinnerCard({ winner }: { winner: Winner }) {
  const { d, returnPct, bars } = winner;
  const company = stripTickerSuffix(d.company, d.ticker);
  const pricePerShare = d.price_pence / 100;
  const asOf = d.live_performance?.as_of;

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[#e0d8cc] dark:border-border/60 bg-white/70 dark:bg-surface-secondary/40 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <CompanyLogo size={40} ticker={d.ticker} />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{company}</p>
          <p className="truncate text-xs text-foreground/50">{d.ticker}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold tabular-nums text-[#1f9d63] dark:text-[#3ad48c]">
            +{returnPct.toFixed(1)}%
          </p>
          <p className="text-[11px] uppercase tracking-wide text-foreground/45">
            since the buy
          </p>
        </div>
      </div>

      <div className="my-4">
        {bars ? (
          <TrendChart bars={bars} id={d.id} />
        ) : (
          <div aria-hidden className="h-[96px] w-full" />
        )}
      </div>

      <p className="text-sm text-foreground/70">
        <span className="font-medium text-foreground/90">
          {d.director.name}
        </span>
        {d.director.role ? (
          <span className="text-foreground/55"> · {d.director.role}</span>
        ) : null}
      </p>
      <p className="mt-1 text-sm text-foreground/55">
        Bought {gbp0.format(d.value_gbp)} of shares at £
        {pricePerShare.toFixed(2)}
      </p>
      {asOf ? (
        <p className="mt-2 text-[11px] text-foreground/40">
          Prices as of {asOf}
        </p>
      ) : null}

      {/* The full analysis (the "why") lives in the app — this nudges the tap.
          Labelled per-ticker so GA shows which winners pull installs. */}
      <a
        className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-[#d8cfc2] px-3.5 py-1.5 text-[13px] font-medium text-[#5a4128] transition-colors hover:bg-[#5a4128]/[0.06] dark:border-border/70 dark:text-[#ad9479] dark:hover:bg-white/5"
        data-ga-event="cta_download_lp"
        data-ga-label={`LP card analysis · ${d.ticker}`}
        href={APP_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        View analysis
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STEPS: { title: string; body: string }[] = [
  {
    title: "Every filing, decoded",
    body: "UK directors must disclose when they buy shares in their own company. We read every one the moment it lands — no spreadsheets, no RNS jargon.",
  },
  {
    title: "Follow the smart money",
    body: "See who's buying, how senior they are, how much they put in, and the price they paid. The people closest to a business, voting with their own money.",
  },
  {
    title: "Track how it played out",
    body: "Live price tracking shows how each director's buy has performed since — so you can see whose conviction actually paid off.",
  },
];

export default function DownloadPage() {
  const radar = useDealRadar("uk", true);
  const [winners, setWinners] = useState<Winner[] | null>(null);

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const dealings = await api.dealings();

        if (!live) return;
        const picks = pickWinners(dealings, 6);

        setWinners(picks);

        // Fetch trend bars per winner, in parallel; fill in as they land.
        const withBars = await Promise.all(
          picks.map(async (wn) => {
            try {
              const raw = await api.priceHistory(wn.d.ticker, 75);
              const since = wn.d.trade_date;
              const bars = raw
                .filter((b) => b.date >= since)
                .map((b) => ({ date: b.date, close: b.close_pence }));

              return { ...wn, bars: bars.length >= 2 ? bars : undefined };
            } catch {
              return wn;
            }
          }),
        );

        if (live) setWinners(withBars);
      } catch {
        if (live) setWinners([]);
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  return (
    <DefaultLayout>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 70% 18%, rgba(255,248,232,0.7) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-1 md:grid-cols-2 md:py-16">
          {/* On mobile the stack comes first (it's the hook); on desktop the
              copy leads and the stack sits to the right. */}
          <div className="order-2 text-center md:order-1 md:text-left">
            <h1 className="mx-auto max-w-[560px] text-balance text-[34px] font-semibold leading-[1.06] tracking-tight md:mx-0 md:text-[52px]">
              The people who run Britain’s companies just bought their own
              shares.
            </h1>
            <p className="mx-auto mt-5 max-w-[460px] text-balance text-base leading-relaxed text-foreground/65 md:mx-0 md:text-lg">
              When a director puts their own money into the business they run,
              it’s worth a look. ddbx tracks every UK director share purchase —
              and shows you how they’ve done.
            </p>
            {/* On mobile the floating bottom bar carries the install CTA, so
                the hero button would just duplicate it — desktop has no
                floating bar, so it shows there. */}
            <div className="mt-7 hidden flex-col items-center gap-2.5 md:flex md:items-start">
              <DownloadButton gaLabel="LP hero" />
              <p className="text-sm text-foreground/55">
                Start your <span className="font-medium">7-day free trial</span>
                . Cancel anytime · iPhone
              </p>
            </div>
          </div>
          <div className="order-1 mx-auto w-full max-w-[330px] md:order-2">
            <HeroNotificationStack deals={radar.deals} tick={radar.tick} />
          </div>
        </div>
      </section>

      {/* ---- Winners wall ---- */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[#5a4128] dark:text-[#ad9479]">
            Last 30 days
          </p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Directors bought these. Here’s how they’ve done.
          </h2>
          <p className="mt-3 text-balance text-foreground/60">
            Real, recent open-market purchases by UK directors — and the
            share-price move since they bought.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {winners === null
            ? Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-[280px] animate-pulse rounded-3xl border border-[#e0d8cc] dark:border-border/60 bg-white/40 dark:bg-surface-secondary/30"
                />
              ))
            : winners.map((w) => <WinnerCard key={w.d.id} winner={w} />)}
        </div>

        {winners && winners.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-2.5">
            <DownloadButton gaLabel="LP winners" />
            <p className="text-sm text-foreground/55">
              See every director buy as it happens — free for 7 days.
            </p>
          </div>
        )}
      </section>

      {/* ---- What is ddbx ---- */}
      <section className="border-y border-[#e7e0d4] dark:border-border/50 bg-[#faf6ef] dark:bg-surface-secondary/20">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              What is ddbx?
            </h2>
            <p className="mt-3 text-balance text-foreground/60">
              The simplest way to follow what company insiders are doing with
              their own money.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center md:text-left">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#5a4128] text-base font-semibold text-white dark:bg-white dark:text-[#1a140d] md:mx-0">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Start following the smart money today.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-foreground/65">
          Every UK director buy, decoded and tracked — in your pocket. Try it
          free for 7 days.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <DownloadButton gaLabel="LP footer" />
          <p className="text-sm text-foreground/55">
            7-day free trial · Cancel anytime · iPhone
          </p>
        </div>

        <p className="mx-auto mt-12 max-w-xl text-xs leading-relaxed text-foreground/40">
          Returns shown are the share-price change since each director’s
          purchase, as of the latest cached close. Past performance is not a
          reliable indicator of future results. ddbx is information, not
          financial advice — capital is at risk.
        </p>
      </section>
    </DefaultLayout>
  );
}
