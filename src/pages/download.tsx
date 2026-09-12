// Conversion-focused app-install landing pages — one per market × platform:
//   /download            /download/ios            /download/android      (UK)
//   /us/download         /us/download/ios         /us/download/android   (US)
//
// The bare `/download` route sniffs the visitor's device and renders that
// platform; the explicit /ios and /android routes force one, which is what ad
// campaigns and store-specific SEO need to land on. Market still resolves the
// way it does everywhere else on the site — host- and path-aware via
// `marketForPath` — so ddbx.us/download is the US page without a /us prefix.
//
// Single job: get the visitor to install and start the free trial. Intentionally
// PUBLIC and ungated — it does NOT import @/lib/discretion, so the winner proof
// is always shown in full (the data is the hook here). Returns are shown, so the
// page carries a past-performance / not-advice note.
//
// The page is built to ship BEFORE the app screenshots exist: every screen slot
// falls back to a styled placeholder (see @/lib/app-screenshots and
// `DeviceFrame`), so dropping PNGs into public/app-shots/ lights it up with no
// code change.
//
// LOCALES. The same component serves /download (English) and /zh-hk/download
// (Traditional Chinese, UK app only). Every string on the page comes from
// @/lib/download/copy — market copy via `landingCopy`, page furniture via the
// `DownloadCopyProvider` the child components read. The provider wraps
// DefaultLayout rather than sitting inside it, so the layout's floating mobile
// install bar — this page's primary tap target on a phone — is localised too.
import type { AppPlatform } from "@/lib/app-screenshots";
import type {
  DownloadLocale,
  LandingCopy,
  StatNouns,
} from "@/lib/download/copy";
import type { Analysis, Dealing, UsDealing, UsReporter } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { filingPath } from "../../shared/filings.js";
import { usFilingPath } from "../../shared/filings-us.js";

import { AppTour } from "@/components/download/app-tour";
import { DownloadFaq } from "@/components/download/download-faq";
import { DownloadRail } from "@/components/download/download-rail";
import {
  DownloadHero,
  StoreUnavailable,
  type HeroFigure,
} from "@/components/download/download-hero";
import { IncludedList, PricingCard } from "@/components/download/pricing-card";
import { SectionHeader } from "@/components/download/section-header";
import { StoryFilm } from "@/components/download/story-film";
import {
  WinnersBoard,
  type WinnerRowData,
} from "@/components/download/winners-board";
import { CAPTION } from "@/components/how-it-works/shared";
import { AppCtaBand } from "@/components/seo/app-cta-band";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { STORE_LABEL } from "@/lib/app-screenshots";
import {
  APP_STORE_URLS,
  PLAY_STORE_URLS,
  appStoreUrlForMarketId,
  playStoreUrlForMarketId,
} from "@/lib/app-store";
import { displayCompany } from "@/lib/display-name";
import {
  altLocalePath,
  CHROME,
  DownloadCopyProvider,
  hasLocale,
  landingCopy,
  localeForPath,
} from "@/lib/download/copy";
import { marketForPath } from "@/lib/markets/registry";
import { PRICING } from "@/lib/pricing";
import { useDevicePlatform } from "@/lib/use-device-platform";

type MarketId = "uk" | "us";

/** The page's one section box. Shared verbatim with `pages/api.tsx` — the two
 *  pages use the same `SectionHeader` grammar and must sit on the same grid. */
const SECTION = "mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20";

// Credibility guardrails for the winners wall. The wall is social proof, so it
// must read as "smart money", not a penny-stock pump screen.
//   - Returns outside [MIN, MAX] are dropped: < MIN isn't a compelling "winner";
//     > MAX is almost always a data glitch (illiquid micro-cap, unadjusted
//     split) and a +4000% next to a chart torpedoes trust.
//   - Sub-floor share prices are excluded — penny/sub-dollar names have
//     unreliable cached prices and aren't a credible insider signal.
const MIN_RETURN_PCT = 5;
const MAX_RETURN_PCT = 300;
const US_PRICE_FLOOR_USD = 1;
const UK_PRICE_FLOOR_GBP = 0.05;
/** Pull a bigger shortlist than we show, then keep the best survivors after the
 *  chart-bar recompute drops any whose price history contradicts the headline. */
const WINNERS_SHORTLIST = 18;
const WINNERS_SHOWN = 6;
/** History window the stat band is computed over. Wide enough that a quiet
 *  fortnight doesn't make the numbers look thin. */
const STATS_WINDOW_DAYS = 90;

/** Whole-pound / whole-dollar money, in the reader's locale. Built per load
 *  rather than at module scope because the locale is a property of the route
 *  now, not of the bundle. */
function moneyFormatter(lang: string, currency: "GBP" | "USD") {
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

/** `2026-07-24` -> `24 Jul 2026` / `2026年7月24日`. Falls back to the raw
 *  string rather than printing "Invalid Date" if the wire ever hands us
 *  something else.
 *
 *  Fixed to UTC: the wire dates are calendar days, not instants, so a reader
 *  west of London would otherwise see them a day early. */
function formatAsOf(iso: string, lang: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Ratings that count as "we flagged this" — everything above `routine`.
 *  Matches the Signal definition used across the site and the apps. */
const SIGNAL_RATINGS = new Set(["significant", "noteworthy", "minor"]);

function isSignal(analysis?: Analysis | null): boolean {
  return !!analysis?.rating && SIGNAL_RATINGS.has(analysis.rating);
}

// ---------------------------------------------------------------------------
// Data selection — normalised so the page is market-blind
// ---------------------------------------------------------------------------

/** A single winner row's data, normalised away from the per-market wire row so
 *  one `WinnersBoard` renders both UK `Dealing`s and US `UsDealing`s. The
 *  shape is the board's own (`WinnerRowData`); `metaLine` is e.g. "Bought
 *  £4,071 of shares at £0.04", `tradeDate` anchors the price-history fetch and
 *  `buyIndex` is the first close on/after it. */
type Winner = WinnerRowData;

/** ISO date `n` days before today (UTC date part). */
function isoDaysAgo(n: number): string {
  const t = new Date();

  t.setUTCDate(t.getUTCDate() - n);

  return t.toISOString().slice(0, 10);
}

/** Generic candidate-shortlist picker over any wire row. Prefers the last 30
 *  days; if that window is thin (markets go quiet), widens to 90 so the wall is
 *  never embarrassingly empty. Sorted by trade-anchored return, best first,
 *  deduped to one company. Excludes sub-`priceFloor` penny names (unreliable
 *  prices) and obviously-glitched returns. This is only a SHORTLIST — the final
 *  displayed return is recomputed from the chart bars (see the page effect) so
 *  the headline number and the trend line can never disagree. */
function pickWinners<T>(
  items: T[],
  want: number,
  cfg: {
    isBuy: (x: T) => boolean;
    getReturn: (x: T) => number | null | undefined;
    getPrice: (x: T) => number | null | undefined;
    getTicker: (x: T) => string;
    getTradeDate: (x: T) => string;
    toWinner: (x: T) => Winner;
  },
  priceFloor: number,
): Winner[] {
  const build = (windowDays: number): Winner[] => {
    const since = isoDaysAgo(windowDays);
    const ranked = items
      .filter((x) => {
        const r = cfg.getReturn(x);

        return (
          cfg.isBuy(x) &&
          cfg.getTradeDate(x) >= since &&
          (cfg.getPrice(x) ?? 0) >= priceFloor &&
          typeof r === "number" &&
          r > MIN_RETURN_PCT &&
          r <= MAX_RETURN_PCT
        );
      })
      .sort(
        (a, b) => (cfg.getReturn(b) as number) - (cfg.getReturn(a) as number),
      );

    const seen = new Set<string>();
    const out: Winner[] = [];

    for (const x of ranked) {
      const key = cfg.getTicker(x).toUpperCase();

      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cfg.toWinner(x));
    }

    return out;
  };

  const recent = build(30);

  if (recent.length >= Math.min(want, 4)) return recent.slice(0, want);

  return build(90).slice(0, want);
}

/** The three numbers in the stat band, computed from the SAME feed the winners
 *  come from — one request, and nothing hand-typed. See `StatBand` for why that
 *  matters. */
function feedStats<T>(
  items: T[],
  cfg: {
    getDisclosedDate: (x: T) => string;
    getTicker: (x: T) => string;
    getAnalysis: (x: T) => Analysis | null | undefined;
  },
  nouns: StatNouns,
): HeroFigure[] {
  const since30 = isoDaysAgo(30);
  const last30 = items.filter((x) => cfg.getDisclosedDate(x) >= since30);
  const companies = new Set(
    items.map((x) => cfg.getTicker(x).toUpperCase()).filter(Boolean),
  );
  const signal = items.filter((x) => isSignal(cfg.getAnalysis(x))).length;

  return [
    { ...nouns.filings, value: last30.length },
    { ...nouns.companies, value: companies.size },
    { ...nouns.signal, value: signal },
  ].filter((s) => s.value > 0);
}

interface MarketData {
  winners: Winner[];
  stats: HeroFigure[];
}

/** What a loader needs from the locale: the market's own prose (stat nouns,
 *  the winner card's "bought" sentence) and the tag its numbers format under. */
interface LoadCtx {
  copy: LandingCopy;
  lang: string;
}

async function loadUk(want: number, ctx: LoadCtx): Promise<MarketData> {
  const dealings = await api.dealingsWindow(
    isoDaysAgo(STATS_WINDOW_DAYS),
    1000,
  );
  const gbp0 = moneyFormatter(ctx.lang, "GBP");

  return {
    winners: pickWinners<Dealing>(
      dealings,
      want,
      {
        isBuy: (d) => d.tx_type === "buy" && d.is_open_market_buy !== false,
        getReturn: (d) => d.live_performance?.return_pct_trade,
        getPrice: (d) => d.price_pence / 100,
        getTicker: (d) => d.ticker,
        getTradeDate: (d) => d.trade_date,
        toWinner: (d) => ({
          id: d.id,
          ticker: d.ticker,
          company: displayCompany(d.company, d.ticker),
          returnPct: d.live_performance!.return_pct_trade as number,
          asOf: d.live_performance?.as_of,
          buyerName: d.director.name,
          buyerRole: d.director.role || undefined,
          metaLine: ctx.copy.boughtShares(
            gbp0.format(d.value_gbp),
            `£${(d.price_pence / 100).toFixed(2)}`,
          ),
          tradeDate: d.trade_date,
        }),
      },
      UK_PRICE_FLOOR_GBP,
    ),
    stats: feedStats<Dealing>(
      dealings,
      {
        getDisclosedDate: (d) => d.disclosed_date,
        getTicker: (d) => d.ticker,
        getAnalysis: (d) => d.analysis,
      },
      ctx.copy.statNouns(STATS_WINDOW_DAYS),
    ),
  };
}

/** Flatten a US reporter's multi-checkbox roles into one short label. */
function usRoleLabel(r: UsReporter): string | undefined {
  if (r.officer_title) return r.officer_title;
  if (r.roles.includes("officer")) return "Officer";
  if (r.roles.includes("director")) return "Director";
  if (r.roles.includes("ten_percent_owner")) return "10% owner";

  return undefined;
}

/** The US market has no non-English edition (see lib/download/copy), so the
 *  share-count fallback below stays an English sentence rather than earning a
 *  slot in `LandingCopy` that only one locale would ever fill. */
function usMetaLine(
  d: UsDealing,
  copy: LandingCopy,
  usd0: Intl.NumberFormat,
): string {
  if (d.value != null && d.price != null) {
    return copy.boughtShares(usd0.format(d.value), `$${d.price.toFixed(2)}`);
  }

  return `Bought ${d.shares.toLocaleString("en-US")} shares`;
}

async function loadUs(want: number, ctx: LoadCtx): Promise<MarketData> {
  const { dealings } = await api.usDealings({
    view: "all",
    since: isoDaysAgo(STATS_WINDOW_DAYS),
    // Without an explicit limit the endpoint caps at its 200-row default, so
    // the `since` window silently truncated to whatever the newest 200 Form 4
    // rows covered — a few days, not 90. That left six candidate tickers, of
    // which only two survived the price-history recompute, and the wall
    // rendered two cards. 1000 is the endpoint's ceiling; UK already asks for
    // the same via dealingsWindow.
    limit: 1000,
  });
  const usd0 = moneyFormatter(ctx.lang, "USD");

  return {
    winners: pickWinners<UsDealing>(
      dealings,
      want,
      {
        // Form 4 code "P" + acquired = an open-market purchase by an insider.
        isBuy: (d) => d.transaction_code === "P" && d.acquired_disposed === "A",
        getReturn: (d) => d.live_performance?.return_pct_trade,
        getPrice: (d) => d.price,
        getTicker: (d) => d.ticker,
        getTradeDate: (d) => d.trade_date,
        toWinner: (d) => ({
          id: d.id,
          ticker: d.ticker,
          company: d.company,
          returnPct: d.live_performance!.return_pct_trade as number,
          asOf: d.live_performance?.as_of,
          buyerName: d.reporter.name,
          buyerRole: usRoleLabel(d.reporter),
          metaLine: usMetaLine(d, ctx.copy, usd0),
          tradeDate: d.trade_date,
        }),
      },
      US_PRICE_FLOOR_USD,
    ),
    stats: feedStats<UsDealing>(
      dealings,
      {
        getDisclosedDate: (d) => d.disclosed_date,
        getTicker: (d) => d.ticker,
        getAnalysis: (d) => d.analysis,
      },
      ctx.copy.statNouns(STATS_WINDOW_DAYS),
    ),
  };
}

// ---------------------------------------------------------------------------
// Per-market config
// ---------------------------------------------------------------------------

/** A market's page: its prose (from the locale dictionary) plus the three
 *  things that are structural rather than editorial. */
interface LandingConfig extends LandingCopy {
  marketId: MarketId;
  gaPrefix: string;
  load: (want: number, ctx: LoadCtx) => Promise<MarketData>;
}

/** Everything about a market that is NOT copy. Kept apart from the dictionary
 *  so adding a language never means restating which loader a market uses. */
const MARKET_SHELL: Record<
  MarketId,
  {
    gaPrefix: string;
    load: (want: number, ctx: LoadCtx) => Promise<MarketData>;
  }
> = {
  uk: { gaPrefix: "LP", load: loadUk },
  us: { gaPrefix: "LP US", load: loadUs },
};

function configFor(locale: DownloadLocale, market: MarketId): LandingConfig {
  return {
    marketId: market,
    ...MARKET_SHELL[market],
    ...landingCopy(locale, market),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DownloadPage({
  /** Set by the /download/ios and /download/android routes. Omitted on the bare
   *  /download route, which falls back to sniffing the device (and to iOS on
   *  desktop, where there's nothing to sniff and the App Store is the larger
   *  listing). */
  platform: forcedPlatform,
}: {
  platform?: AppPlatform;
} = {}) {
  // Resolve the market the same way the rest of the site does — host- and
  // path-aware (ddbx.us -> US, ddbx.uk -> UK; the /us/download route forces US
  // on any host). A fixed per-route prop would show UK content on the US host.
  const { pathname } = useLocation();
  const market: MarketId = marketForPath(pathname).id === "us" ? "us" : "uk";
  // The /zh-hk prefix is the only thing that selects a language — never an
  // Accept-Language sniff, which would make the English URL non-deterministic
  // for crawlers and give the reader no link to share. `hasLocale` is the guard
  // for the one case the routes can't prevent: ddbx.us resolves every path to
  // the US market, and there is no Chinese US edition, so a Chinese route
  // reached on that host falls back to English rather than rendering English
  // prose inside a zh-HK document.
  const requested = localeForPath(pathname);
  const locale: DownloadLocale = hasLocale(requested, market)
    ? requested
    : "en";
  const t = CHROME[locale];
  // Memoised because the fetch effect below keys on it: `configFor` builds a
  // fresh object every call, so an unmemoised value would re-run the load on
  // every render, forever.
  const cfg = useMemo(() => configFor(locale, market), [locale, market]);
  const detected = useDevicePlatform();
  const platform: AppPlatform = forcedPlatform ?? detected ?? "ios";
  const pricing = PRICING[market];

  // The store this exact market × platform pair installs from. `undefined`
  // means we don't have a listing yet (US on Google Play) — the page then runs
  // in "not yet" mode rather than linking somewhere misleading.
  const storeHref =
    platform === "android"
      ? playStoreUrlForMarketId(market)
      : appStoreUrlForMarketId(market);
  const available = !!storeHref;

  // The sibling-platform page keeps the reader's language: an /zh-hk visitor
  // told "there's an Android version" must not be dropped onto the English one.
  const prefix = `${locale === "zh-HK" ? "/zh-hk" : ""}${market === "us" ? "/us" : ""}`;
  const otherPath = `${prefix}/download/${platform === "ios" ? "android" : "ios"}`;
  // The same page in the other language, platform preserved. Null for US,
  // which has no Chinese edition — the link is simply not rendered there.
  const altPath = altLocalePath(pathname, market);

  // `<html lang>` for client-side navigations. functions/_middleware.js already
  // stamps the right value on the served shell, but a React-Router move from
  // /download to /zh-hk/download never touches the document — leaving a page of
  // Chinese declared as English to screen readers and to translation prompts.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;

    root.lang = t.lang;

    return () => {
      root.lang = previous;
    };
  }, [t.lang]);

  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    let live = true;

    setData(null);
    (async () => {
      try {
        // One feed fetch powers the winners shortlist, the stat band and the
        // hero's live count; only the price histories are extra requests.
        const loaded = await cfg.load(WINNERS_SHORTLIST, {
          copy: cfg,
          lang: t.lang,
        });

        if (!live) return;

        const withBars = await Promise.all(
          loaded.winners.map(async (wn) => {
            try {
              // 120d covers trades up to the 90d fallback window plus a buffer.
              const raw = await api.priceHistory(wn.ticker, 120);
              const all = raw.map((b) => ({
                date: b.date,
                close: b.close_pence,
              }));
              const firstAfter = all.findIndex((b) => b.date >= wn.tradeDate);

              if (firstAfter < 0) return null;
              const post = all.slice(firstAfter);

              if (post.length < 2) return null;

              // Show a lead-in *into* the buy, but never let it dominate: the
              // card is selling what happened after, so the grey run-up is
              // capped at roughly half the post-buy span (and at least a
              // fortnight of trading, so the marker isn't jammed against the
              // left edge on a very recent buy).
              const leadIn = Math.min(
                firstAfter,
                Math.max(10, Math.round(post.length * 0.5)),
              );
              const bars = all.slice(firstAfter - leadIn);
              const buyIndex = leadIn;
              const base = bars[buyIndex].close;
              const last = bars[bars.length - 1].close;

              if (!base) return null;
              // Recompute the headline return from the SAME bars the chart
              // draws (trade-day close -> latest close) so the number and the
              // line are one measurement and can never contradict.
              const returnPct = ((last - base) / base) * 100;

              return { ...wn, bars, buyIndex, returnPct };
            } catch {
              return null;
            }
          }),
        );

        // Keep only credible, still-rising winners; show the best survivors.
        const winners = withBars
          .flatMap((w) => (w ? [w] : []))
          .filter(
            (w) =>
              w.returnPct >= MIN_RETURN_PCT && w.returnPct <= MAX_RETURN_PCT,
          )
          .sort((a, b) => b.returnPct - a.returnPct)
          .slice(0, WINNERS_SHOWN);

        if (live) setData({ ...loaded, winners });
      } catch {
        if (live) setData({ winners: [], stats: [] });
      }
    })();

    return () => {
      live = false;
    };
  }, [cfg, t.lang]);

  return (
    // The provider wraps DefaultLayout rather than sitting inside it: the
    // layout renders the floating mobile install bar, which is the one tappable
    // CTA on a phone and has to speak the page's language.
    <DownloadCopyProvider value={t}>
      {/* drawerRight reserves lg:mr-80 for the fixed install rail — the same
          pairing every other page in the section uses. The FULL_BLEED bands
          below stay correct inside it: the band's centre lands on the narrowed
          column's centre, its left overhang is clipped by the layout root and
          its right runs under the rail (see /company/:key, which does the
          same). */}
      <DefaultLayout drawerRight>
        <DownloadRail
          gaLabel={cfg.gaPrefix}
          marketId={cfg.marketId}
          platform={platform}
        />

        <DownloadHero
          altLocale={
            altPath
              ? {
                  href: altPath,
                  label: t.altLocaleLabel,
                  // The label is written in the language it links TO, so the
                  // tag is the OTHER locale's, not this page's.
                  lang: CHROME[locale === "zh-HK" ? "en" : "zh-HK"].lang,
                }
              : undefined
          }
          figures={data ? data.stats : null}
          gaLabel={cfg.gaPrefix}
          headline={cfg.heroHeadline}
          marketId={cfg.marketId}
          platform={platform}
          sourceLine={cfg.sourceLine}
          storeHref={storeHref}
          sub={cfg.heroSub}
          trialDays={pricing.trialDays}
          unavailableSlot={
            <StoreUnavailable
              alternatives={[
                {
                  label: t.storeUnavailableAlts.us,
                  href: APP_STORE_URLS.us,
                  gaLabel: "US Android → US iOS",
                },
                {
                  label: t.storeUnavailableAlts.uk,
                  href: PLAY_STORE_URLS.uk,
                  gaLabel: "US Android → UK Play",
                },
              ]}
              message={t.storeUnavailable}
            />
          }
        />

        {/* ---- The film ----
             Thirty seconds of the pitch before the tour walks it beat by
             beat. Its own numbered section, not a beat: it is the story
             told once, whole; the tour is the same story taken apart. */}
        <StoryFilm
          copy={cfg.film}
          filmLabel={t.filmLabel}
          index={1}
          kicker={t.filmKicker}
          playLabel={t.playFilm}
          total={4}
        />

        <AppTour
          beats={cfg.beats}
          heading={cfg.tourHeading}
          index={2}
          kicker={t.tourKicker}
          marketId={cfg.marketId}
          platform={platform}
          sub={cfg.tourSub}
          total={4}
        />

        {/* ---- Winners board ----
             A ranked list, drawn the way every board on the site is: rows
             on the page ground, the return as the figure, the price line in
             the visual track. Rows go to the filing page; the one store CTA
             sits under the list. */}
        <WinnersBoard
          available={available}
          ctaSub={cfg.winnersCtaSub(pricing.trialDays)}
          emptyNote={t.winnersEmpty}
          formatDate={(iso) => formatAsOf(iso, t.lang)}
          gaPrefix={cfg.gaPrefix}
          heading={cfg.winnersHeading}
          index={3}
          kicker={cfg.proofKicker}
          labels={{
            ...t.winnersLabels,
            sinceTheBuy: t.sinceTheBuy,
            pricesAsOf: t.pricesAsOf,
          }}
          loadingRows={WINNERS_SHOWN}
          marketId={cfg.marketId}
          platform={platform}
          rowHref={market === "us" ? usFilingPath : filingPath}
          sub={cfg.winnersSub}
          total={4}
          winners={data ? data.winners : null}
        />

        {/* ---- Price + objections ----
             Two columns from lg: the card on the left, what it buys on the
             right. Stacked, the card was a narrow ribbon down the left of an
             otherwise empty screen with a nine-item list trailing off it. */}
        <section className={SECTION}>
          <SectionHeader
            index={4}
            kicker={t.priceKicker}
            sub={t.priceSub}
            title={t.priceTitle}
            total={4}
          />

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <PricingCard pricing={pricing} storeLabel={STORE_LABEL[platform]} />
            <IncludedList benefits={cfg.benefits} />
          </div>

          {/* MarketFaq brings its own top padding and two-column grid, so it
              takes the section's full width rather than a squeezed measure. */}
          <DownloadFaq
            copy={t.faqCopy}
            items={t.faq({
              market,
              buyerNoun: cfg.buyerNoun,
              sourceLine: cfg.sourceLine,
              pricing,
              platform,
              otherPath,
            })}
          />
        </section>

        {/* ---- The ask ----
             The site's one terminal band, contained in the column like every
             other page's (it used to run full-bleed and stop dead against
             the rail). `platform` is the route's, so /download/android shows
             Play on a desktop; the QR encodes the same store and shows only
             where there is no store to tap. Unnumbered: the ask is not a
             section of the argument, it is what the argument is for. */}
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <AppCtaBand
            body={cfg.finalSub(pricing.trialDays)}
            gaEvent="cta_download_lp"
            gaLabel={`${cfg.gaPrefix} footer`}
            headline={t.finalTitle(cfg.buyerNoun)}
            kicker={t.getAppKicker}
            marketId={cfg.marketId}
            media={available ? "qr" : "none"}
            note={t.freeForDaysCancel(pricing.trialDays)}
            platform={platform}
            qrCaption={t.scanToOpen(STORE_LABEL[platform])}
          />

          {/* Small print reads as the caption of the whole page and belongs
              at the true bottom, after the ask. */}
          <p className={`${CAPTION} mt-8 max-w-[72ch]`}>
            {t.returnsDisclaimer(cfg.buyerNoun)}
          </p>
        </div>
      </DefaultLayout>
    </DownloadCopyProvider>
  );
}
