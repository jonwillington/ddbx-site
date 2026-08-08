/** Locale layer for the /download family — English and Traditional Chinese.
 *
 *  This is the ONLY localised surface on the site. There is no i18n library and
 *  no site-wide dictionary: the install landing pages are a conversion surface
 *  with a self-contained vocabulary, and standing up a framework to serve one
 *  page family would have cost more than it bought. If a second family ever
 *  needs translating, promote this module rather than copying it.
 *
 *  ---- Why Traditional Chinese and not written Cantonese -------------------
 *
 *  The brief was "Cantonese, for a Hong Kong audience". Hong Kong speaks
 *  Cantonese and *writes* Standard Written Chinese in Traditional characters —
 *  colloquial written Cantonese (嘅/唔係/睇) is used in messaging, forums and
 *  consumer advertising, not in anything that quotes a price and shows a
 *  performance figure. A landing page for a paid financial-information product
 *  written in 書面粵語 reads as a chat message, which is the wrong register for
 *  the one page whose entire job is to be trusted with a subscription.
 *
 *  So: Traditional characters, standard written register, Hong Kong financial
 *  vocabulary (增持, 場內買入, 配售, 購股權), full-width punctuation. The one
 *  deliberate Cantonese-flavoured word is 「慳」 in the annual saving badge,
 *  which is standard Hong Kong advertising copy and reads local rather than
 *  imported from a mainland or Taiwanese translation.
 *
 *  ---- Scope ---------------------------------------------------------------
 *
 *  UK app only. There is no zh-HK US page: the Chinese route exists to sell the
 *  London-listed director feed to Hong Kong, and `LANDING_COPY` is typed so a
 *  missing market falls back to English rather than rendering half a page.
 *
 *  Site chrome (navbar, footer, cookie banner, legal drawers) stays English by
 *  decision — the exception is the floating mobile install bar in
 *  `layouts/default.tsx`, which is this page's primary tap target on a phone
 *  and would otherwise be the one English word between the reader and the
 *  trial.
 */
import type { TourBeat } from "@/components/download/app-tour";
import type { FaqItem } from "@/components/download/download-faq";
import type { AppPlatform } from "@/lib/app-screenshots";
import type { MarketPricing } from "@/lib/pricing";
import type { ReactNode } from "react";

import { createContext, useContext } from "react";

import { STORE_LABEL } from "@/lib/app-screenshots";
import { formatPrice } from "@/lib/pricing";

export type DownloadLocale = "en" | "zh-HK";

export type DownloadMarketId = "uk" | "us";

/** Route prefix the Chinese pages are mounted at. Also matched in
 *  `shared/seo.js` (edge titles + market resolution) and `functions/
 *  _middleware.js` (html lang + hreflang) — change it in all three or the
 *  crawler-facing head stops agreeing with the page. */
export const ZH_HK_PREFIX = "/zh-hk";

/** Locale a pathname is served in. Prefix-based, not header-based: a language
 *  the visitor can't link to or share isn't a page, and Accept-Language
 *  sniffing would make the English URL non-deterministic for crawlers. */
export function localeForPath(pathname: string): DownloadLocale {
  return pathname === ZH_HK_PREFIX || pathname.startsWith(`${ZH_HK_PREFIX}/`)
    ? "zh-HK"
    : "en";
}

/** The same download URL in the other locale, platform preserved.
 *  `/download/ios` <-> `/zh-hk/download/ios`. Returns null where there is no
 *  counterpart (the US pages have no Chinese edition). */
export function altLocalePath(
  pathname: string,
  market: DownloadMarketId,
): string | null {
  if (market === "us") return null;

  return localeForPath(pathname) === "zh-HK"
    ? pathname.slice(ZH_HK_PREFIX.length) || "/download"
    : `${ZH_HK_PREFIX}${pathname}`;
}

// ---------------------------------------------------------------------------
// Market copy — the per-market pitch
// ---------------------------------------------------------------------------

/** The stat band's three tiles. Nouns only; every figure is computed from the
 *  feed (see `StatBand` for why none of them is ever typed in). */
export interface StatNouns {
  filings: { k: string; label: string };
  companies: { k: string; label: string };
  signal: { k: string; label: string };
}

/** Everything on the page that changes with the MARKET (and, for zh-HK, with
 *  the language). `LandingConfig` in pages/download.tsx is this plus the
 *  market's id, GA prefix and data loader. */
export interface LandingCopy {
  heroHeadline: ReactNode;
  heroSub: ReactNode;
  proofKicker: string;
  winnersHeading: ReactNode;
  winnersSub: string;
  /** Takes the trial length so the number stays sourced from `lib/pricing`
   *  rather than typed into a sentence in two languages. */
  winnersCtaSub: (trialDays: number) => string;
  tourHeading: string;
  tourSub: string;
  beats: TourBeat[];
  /** The full contents of the subscription, listed under the price. */
  benefits: string[];
  sourceLine: string;
  finalSub: (trialDays: number) => string;
  /** "director" / "insider" / "董事" — used in the returns disclaimer and the
   *  closing headline. */
  buyerNoun: string;
  statNouns: (windowDays: number) => StatNouns;
  /** The winner card's second line. `value` and `price` arrive pre-formatted
   *  in the market's own currency — this only decides the sentence around
   *  them, which in Chinese puts the unit price first. */
  boughtShares: (value: string, price: string) => string;
}

// ---------------------------------------------------------------------------
// Chrome copy — the page's own furniture, market-blind
// ---------------------------------------------------------------------------

export interface ChromeCopy {
  locale: DownloadLocale;
  /** BCP 47 tag for `<html lang>` and every `Intl` formatter on the page. */
  lang: string;
  // Hero
  trialChip: (days: number) => string;
  getOnStore: (store: string) => string;
  /** Label for the link to the other language edition, in that language. */
  altLocaleLabel: string;
  storeUnavailable: string;
  storeUnavailableAlts: { us: string; uk: string };
  // Winner card
  sinceTheBuy: string;
  legendBefore: string;
  legendAfter: string;
  pricesAsOf: (date: string) => string;
  viewAnalysis: string;
  // App tour
  tourKicker: string;
  beatOf: (index: number, total: number) => string;
  screenAlt: (slot: string, platform: AppPlatform) => string;
  // Price section
  priceKicker: string;
  priceTitle: string;
  priceSub: string;
  freeForDays: (days: number) => string;
  fullAccessNote: string;
  monthly: string;
  annual: string;
  savePct: (pct: number) => string;
  perMonth: string;
  perMonthBilledYearly: (annual: string) => string;
  billedThrough: (store: string, code: string) => string;
  everythingIncluded: string;
  // Closing band
  getAppKicker: string;
  finalTitle: (buyerNoun: string) => ReactNode;
  freeForDaysCancel: (days: number) => string;
  scanToOpen: (store: string) => string;
  returnsDisclaimer: (buyerNoun: string) => string;
  // Rail
  railFreeForDays: (days: number) => string;
  railPerMonth: string;
  railBilled: (annual: string, monthly: string) => string;
  railLinks: {
    latestFilings: string;
    companies: string;
    sectors: string;
    biggestBuys: string;
    glossary: string;
  };
  // Store button labels (Apple's and Google's own localised wording)
  storeButton: Record<AppPlatform, string>;
  // Floating mobile install bar (layouts/default.tsx)
  startTrial: string;
  floatingTrialNote: string;
  /** The install objections, answered next to the CTA. */
  faq: (args: {
    market: DownloadMarketId;
    buyerNoun: string;
    sourceLine: string;
    pricing: MarketPricing;
    platform: AppPlatform;
    otherPath: string;
  }) => FaqItem[];
}

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------

export const EN_CHROME: ChromeCopy = {
  locale: "en",
  lang: "en-GB",
  trialChip: (d) => `${d}-day free trial · Cancel any time`,
  getOnStore: (store) => `Get ddbx on the ${store}`,
  altLocaleLabel: "繁體中文",
  storeUnavailable:
    "The US app is still in Play internal testing — it isn’t on the Google Play store yet. Two things you can install today:",
  storeUnavailableAlts: {
    us: "ddbx US on iPhone",
    uk: "ddbx UK on Google Play",
  },
  sinceTheBuy: "since the buy",
  legendBefore: "Before",
  legendAfter: "After the buy",
  pricesAsOf: (date) => `Prices as of ${date}`,
  viewAnalysis: "View analysis",
  tourKicker: "The app",
  beatOf: (i, total) => `Beat ${i} of ${total}`,
  screenAlt: (slot, platform) =>
    `ddbx ${slot} screen on ${platform === "ios" ? "iPhone" : "Android"}`,
  priceKicker: "The price",
  priceTitle: "What it costs",
  priceSub:
    "One subscription, both the alerts and the analysis. No tiers, no add-ons, nothing held back for a higher plan.",
  freeForDays: (d) => `Free for ${d} days`,
  fullAccessNote:
    "Full access. Cancel any time before it ends and you pay nothing.",
  monthly: "Monthly",
  annual: "Annual",
  savePct: (pct) => `Save ${pct}%`,
  perMonth: "per month",
  perMonthBilledYearly: (annual) => `per month, billed ${annual} yearly`,
  billedThrough: (store, code) =>
    `Billed through ${store}. Prices shown in ${code} and may vary by territory — your store shows the exact amount before you confirm.`,
  everythingIncluded: "Everything included",
  getAppKicker: "Get the app",
  finalTitle: (noun) => (
    <>A {noun} buys tomorrow morning. You’ll know within minutes.</>
  ),
  freeForDaysCancel: (d) => `Free for ${d} days, cancel any time.`,
  scanToOpen: (store) => `Scan to open ddbx on the ${store}`,
  returnsDisclaimer: (noun) =>
    `Returns shown are the share-price change since each ${noun}’s purchase, as of the latest cached close. Past performance is not a reliable indicator of future results. ddbx is information, not financial advice — capital is at risk.`,
  railFreeForDays: (d) => `Free for ${d} days`,
  railPerMonth: "/ month",
  railBilled: (annual, monthly) =>
    `Billed ${annual} yearly, or ${monthly} a month. Cancel any time.`,
  railLinks: {
    latestFilings: "Latest filings",
    companies: "Companies",
    sectors: "Sectors",
    biggestBuys: "Biggest buys",
    glossary: "Glossary",
  },
  storeButton: {
    ios: "Download on the App Store",
    android: "Get it on Google Play",
  },
  startTrial: "Start your free trial",
  floatingTrialNote: "Free for 7 days, cancel any time. On iOS and Android.",
  faq: ({ buyerNoun, sourceLine, pricing, platform, otherPath, market }) => {
    const other = platform === "ios" ? "Android" : "iPhone";

    return [
      {
        q: "Is this financial advice?",
        a: (
          <>
            No. ddbx tells you what {buyerNoun}s have disclosed and what has
            happened to the share price since — it never tells you what to buy.
            Insider buying is one input among many, and capital is at risk.
          </>
        ),
      },
      { q: "Where does the data come from?", a: <>{sourceLine}</> },
      {
        q: `What happens when the ${pricing.trialDays}-day trial ends?`,
        a: (
          <>
            You’re asked to subscribe — {formatPrice(pricing, pricing.monthly)}{" "}
            a month, or {formatPrice(pricing, pricing.annual)} for the year.
            Cancel any time before the trial ends in your{" "}
            {STORE_LABEL[platform]} subscription settings and you won’t be
            charged.
          </>
        ),
      },
      {
        q: `Is there ${other === "iPhone" ? "an iPhone" : "an Android"} version?`,
        a: (
          <>
            Yes —{" "}
            <a
              className="font-medium underline underline-offset-2"
              href={otherPath}
            >
              see the {other} page
            </a>
            . Your subscription is per store, so start the trial on the device
            you actually read on.
          </>
        ),
      },
      {
        q: "Which markets does it cover?",
        a: (
          <>
            The UK app covers every London-listed director dealing; the US app
            covers SEC Form 4 insider filings and congressional trades. They’re
            separate apps — this page is for the {market === "uk" ? "UK" : "US"}{" "}
            one.
          </>
        ),
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Traditional Chinese (Hong Kong)
// ---------------------------------------------------------------------------

export const ZH_HK_CHROME: ChromeCopy = {
  locale: "zh-HK",
  lang: "zh-HK",
  trialChip: (d) => `免費試用 ${d} 天 · 隨時取消`,
  getOnStore: (store) => `在 ${store} 下載 ddbx`,
  altLocaleLabel: "English",
  // Kept for type completeness. The zh-HK routes are UK-only, and the UK app is
  // live on both stores, so this block cannot render on a Chinese page today.
  storeUnavailable:
    "美國版 App 仍在 Play 內部測試階段，尚未在 Google Play 上架。以下兩個你今日就可以安裝：",
  storeUnavailableAlts: {
    us: "iPhone 版 ddbx US",
    uk: "Google Play 版 ddbx UK",
  },
  sinceTheBuy: "買入至今",
  legendBefore: "買入前",
  legendAfter: "買入後",
  pricesAsOf: (date) => `股價截至 ${date}`,
  viewAnalysis: "查看分析",
  tourKicker: "應用程式",
  beatOf: (i, total) => `第 ${i} 節，共 ${total} 節`,
  screenAlt: (slot, platform) =>
    `${platform === "ios" ? "iPhone" : "Android"} 版 ddbx${slot}畫面`,
  priceKicker: "收費",
  priceTitle: "訂閱幾多錢",
  priceSub:
    "一個訂閱，通知與分析全部包含。沒有分級，沒有加購，也沒有功能要留給更貴的方案。",
  freeForDays: (d) => `免費試用 ${d} 天`,
  fullAccessNote: "完整權限。試用期結束前隨時取消，分文不收。",
  monthly: "月付",
  annual: "年付",
  savePct: (pct) => `慳 ${pct}%`,
  perMonth: "每月",
  perMonthBilledYearly: (annual) => `每月計，按年收取 ${annual}`,
  billedThrough: (store, code) =>
    `經 ${store} 收費。價格以 ${code} 顯示，各地區或有不同 — 確認付款前，商店會顯示實際金額。`,
  everythingIncluded: "全部包含",
  getAppKicker: "下載 App",
  finalTitle: (noun) => <>明早有{noun}買入。幾分鐘內你就會知道。</>,
  freeForDaysCancel: (d) => `免費試用 ${d} 天，隨時取消。`,
  scanToOpen: (store) => `掃描二維碼，在 ${store} 開啟 ddbx`,
  returnsDisclaimer: (noun) =>
    `所示回報為每位${noun}買入後的股價變化，以最近一次快取收市價計算。過往表現並非未來業績的可靠指標。ddbx 提供的是資訊，並非投資建議 — 投資涉及風險，本金可能虧損。`,
  railFreeForDays: (d) => `免費試用 ${d} 天`,
  railPerMonth: "／月",
  railBilled: (annual, monthly) =>
    `按年收取 ${annual}，或每月 ${monthly}。隨時取消。`,
  railLinks: {
    latestFilings: "最新披露",
    companies: "公司",
    sectors: "行業",
    biggestBuys: "最大手買入",
    glossary: "詞彙表",
  },
  // Apple's and Google's own Hong Kong badge wording, so the button reads the
  // way every other Chinese-language install button in the store does.
  storeButton: {
    ios: "從 App Store 下載",
    android: "立即前往 Google Play 下載",
  },
  startTrial: "開始免費試用",
  floatingTrialNote: "免費試用 7 天，隨時取消。支援 iOS 及 Android。",
  faq: ({ buyerNoun, sourceLine, pricing, platform, otherPath }) => {
    const other = platform === "ios" ? "Android" : "iPhone";

    return [
      {
        q: "這算是投資建議嗎？",
        a: (
          <>
            不算。ddbx 只告訴你{buyerNoun}
            披露咗甚麼，以及此後股價的變化 —
            它從不告訴你應該買甚麼。內部人士買入只是眾多參考之一，投資涉及風險，本金可能虧損。
          </>
        ),
      },
      // Second, not buried: this page is entirely in Chinese and the app it
      // sells is not. A reader who only finds that out after paying is a
      // refund and a one-star review, so the surprise is spent here — before
      // the price — rather than saved for the App Store listing.
      {
        q: "App 介面是中文嗎？",
        a: (
          <>
            不是。App 的介面、每日回顧和每一宗買入分析目前都只有英文 —
            中文的是這一頁，不是 App
            本身。用語跟英國監管披露一致，所以如果你平時讀開英文財經資訊，應該不難上手；但訂閱之前，請先確認這一點。
          </>
        ),
      },
      { q: "資料從何而來？", a: <>{sourceLine}</> },
      {
        q: `${pricing.trialDays} 天試用期完結之後會點？`,
        a: (
          <>
            系統會邀請你訂閱 — 每月 {formatPrice(pricing, pricing.monthly)}
            ，或全年 {formatPrice(
              pricing,
              pricing.annual,
            )}。在試用期結束前，於 {STORE_LABEL[platform]}{" "}
            的訂閱設定中取消，就不會扣費。
          </>
        ),
      },
      {
        q: `有${other === "iPhone" ? " iPhone " : " Android "}版嗎？`,
        a: (
          <>
            有 —{" "}
            <a
              className="font-medium underline underline-offset-2"
              href={otherPath}
            >
              前往 {other} 版頁面
            </a>
            。訂閱按商店劃分，所以請在你實際會閱讀的裝置上開始試用。
          </>
        ),
      },
      {
        q: "覆蓋哪些市場？",
        a: (
          <>
            英國版 App 覆蓋每一宗倫敦上市公司的董事交易；美國版 App
            覆蓋美國證交會 Form 4 內部人士申報及國會議員交易。兩者是獨立的 App —
            此頁介紹的是英國版，而美國版並沒有中文頁面。
          </>
        ),
      },
    ];
  },
};

export const CHROME: Record<DownloadLocale, ChromeCopy> = {
  en: EN_CHROME,
  "zh-HK": ZH_HK_CHROME,
};

// ---------------------------------------------------------------------------
// Market copy per locale
// ---------------------------------------------------------------------------

const EN_UK: LandingCopy = {
  heroHeadline: (
    <>The people who run Britain’s companies just bought their own shares.</>
  ),
  heroSub: (
    <>
      When a director puts their own money into the business they run, it’s
      worth a look. ddbx tracks every UK director share purchase — and shows you
      how they’ve done.
    </>
  ),
  proofKicker: "Last 30 days",
  winnersHeading: <>Directors bought these. Here’s how they’ve done.</>,
  winnersSub:
    "Real, recent open-market purchases by UK directors — and the share-price move since they bought. Every one of them was in the app the day it filed.",
  winnersCtaSub: (d) =>
    `See every director buy as it happens — free for ${d} days.`,
  tourHeading: "One filing, followed.",
  tourSub:
    "A director buys. Here is everything that happens next — from the second it hits the wire to what the shares had done months later.",
  beats: [
    {
      slot: "alert",
      timestamp: "07:01",
      kicker: "The alert",
      title: "It lands the moment the filing does.",
      body: "A director discloses a purchase and your phone buzzes — usually within minutes of the RNS, not the next morning. No inbox to check, no feed to trawl.",
    },
    {
      slot: "analysis",
      timestamp: "07:02",
      kicker: "The read",
      title: "Somebody has already read it for you.",
      body: "Every purchase is decoded: who bought, how senior they are, how much of their own money went in, and whether the price they paid looks like conviction or paperwork.",
    },
    {
      slot: "balance",
      timestamp: "07:03",
      kicker: "Both sides",
      title: "The case against, next to the case for.",
      body: "Every rated buy is argued both ways — what makes it interesting, and what should give you pause — each point expandable down to the filing it came from. Nothing here is trying to talk you into a trade.",
    },
    {
      slot: "cluster",
      timestamp: "Days 3–9",
      kicker: "The pattern",
      title: "One buy is a data point. Six is a pattern.",
      body: "When several directors buy the same company inside a few weeks, ddbx groups them — every purchase plotted on the price chart, the average they paid, and what the shares have done since.",
    },
    {
      slot: "performance",
      timestamp: "Today",
      kicker: "The score",
      title: "See whether it actually worked.",
      body: "Live price tracking from the trade date onward, so you can tell whose buying has been worth following — and whose hasn’t.",
    },
    {
      slot: "recap",
      timestamp: "Every morning",
      kicker: "The recap",
      title: "The whole day, written up by the time you wake.",
      body: "One piece each morning on what actually mattered: the clusters, the standout names, the totals, and why the biggest buy of the day was or wasn’t the interesting one.",
    },
    {
      slot: "today",
      timestamp: "Every day",
      kicker: "The desk",
      title: "The whole market on one screen.",
      body: "Every UK director purchase of the day, ranked and stripped of the noise. Placings, vestings and option exercises are pulled out, so what’s left is people choosing to buy.",
    },
  ],
  benefits: [
    "Push alerts within minutes of every director disclosure, not the next morning",
    "Written analysis on every rated buy — the case for it and the case against",
    "Cluster detection: several directors in the same company, grouped and plotted on the price chart",
    "Live performance tracking from the trade date, so you can see whose buying is worth following",
    "A daily recap of the whole UK market, written for you before the open",
    "Follow any company or director, and get told when the price moves after a buy you’re watching",
    "Placings, vestings and option exercises stripped out, so what’s left is people choosing to buy",
    "Every London-listed director dealing, back to the day we started — searchable",
    "No ads, no upsells, and your data is never resold",
  ],
  sourceLine:
    "Sourced from primary UK regulatory disclosures (RNS) as they publish — never scraped from a third-party summary.",
  finalSub: (d) =>
    `Every UK director buy, decoded and tracked from the day it files. Try it free for ${d} days.`,
  buyerNoun: "director",
  statNouns: (days) => ({
    filings: {
      k: "Disclosures",
      label: "director disclosures read in the last 30 days",
    },
    companies: {
      k: "Coverage",
      label: `UK companies covered in the last ${days} days`,
    },
    signal: { k: "Signal", label: "flagged as worth a second look" },
  }),
  boughtShares: (value, price) => `Bought ${value} of shares at ${price}`,
};

const EN_US: LandingCopy = {
  heroHeadline: <>America’s company insiders just bought their own stock.</>,
  heroSub: (
    <>
      When the people who run a business buy its stock with their own money,
      it’s worth a look. ddbx tracks every US insider purchase — and shows you
      how they’ve done.
    </>
  ),
  proofKicker: "Last 30 days",
  winnersHeading: <>Insiders bought these. Here’s how they’ve done.</>,
  winnersSub:
    "Real, recent open-market purchases by US insiders — and the share-price move since they bought. Every one of them was in the app the day it filed.",
  winnersCtaSub: (d) =>
    `See every insider buy as it happens — free for ${d} days.`,
  tourHeading: "One filing, followed.",
  tourSub:
    "A director buys. Here is everything that happens next — from the second it hits the wire to what the shares had done months later.",
  beats: [
    {
      slot: "alert",
      timestamp: "07:01",
      kicker: "The alert",
      title: "It lands the moment the Form 4 does.",
      body: "An insider files with the SEC and your phone buzzes — usually within minutes of it hitting EDGAR. No filters to build, no filing feed to babysit.",
    },
    {
      slot: "analysis",
      timestamp: "07:02",
      kicker: "The read",
      title: "Somebody has already read it for you.",
      body: "Every purchase is decoded: CEO or 10% holder, how much of their own money went in, and whether it was a real open-market buy or a 10b5-1 plan running on autopilot.",
    },
    {
      slot: "balance",
      timestamp: "07:03",
      kicker: "Both sides",
      title: "The case against, next to the case for.",
      body: "Every rated buy is argued both ways — what makes it interesting, and what should give you pause — each point expandable down to the filing it came from. Nothing here is trying to talk you into a trade.",
    },
    {
      slot: "cluster",
      timestamp: "Days 3–9",
      kicker: "The pattern",
      title: "One buy is a data point. Six is a pattern.",
      body: "When several insiders buy the same company inside a few weeks, ddbx groups them — every purchase plotted on the price chart, the average they paid, and what the stock has done since.",
    },
    {
      slot: "performance",
      timestamp: "Today",
      kicker: "The score",
      title: "See whether it actually worked.",
      body: "Live price tracking from the trade date onward, so you can tell whose buying has been worth following — and whose hasn’t.",
    },
    {
      slot: "recap",
      timestamp: "Every morning",
      kicker: "The recap",
      title: "The whole day, written up before the open.",
      body: "One piece each morning on what actually mattered: the clusters, the standout names, the totals, and why the biggest buy of the day was or wasn’t the interesting one.",
    },
    {
      slot: "today",
      timestamp: "Every day",
      kicker: "The desk",
      title: "The whole market on one screen.",
      body: "Every US insider purchase of the day, ranked and stripped of the noise. Grants, vestings and option exercises are pulled out, so what’s left is people choosing to buy.",
    },
  ],
  benefits: [
    "Push alerts within minutes of the Form 4 hitting EDGAR, not the next morning",
    "Written analysis on every rated buy — the case for it and the case against",
    "Cluster detection: several insiders in the same company, grouped and plotted on the price chart",
    "Live performance tracking from the trade date, so you can see whose buying is worth following",
    "A daily recap of the whole US market, written for you before the open",
    "Follow any company or insider, and get told when the price moves after a buy you’re watching",
    "Grants, vestings and 10b5-1 autopilot stripped out, so what’s left is people choosing to buy",
    "Congressional trading disclosed under the STOCK Act, alongside the corporate insiders",
    "No ads, no upsells, and your data is never resold",
  ],
  sourceLine:
    "Sourced from SEC EDGAR Form 4 filings as they publish — never scraped from a third-party summary.",
  finalSub: (d) =>
    `Every US insider buy, decoded and tracked from the day it files. Try it free for ${d} days.`,
  buyerNoun: "insider",
  statNouns: (days) => ({
    filings: { k: "Filings", label: "Form 4 filings read in the last 30 days" },
    companies: {
      k: "Coverage",
      label: `US companies covered in the last ${days} days`,
    },
    signal: { k: "Signal", label: "flagged as worth a second look" },
  }),
  boughtShares: (value, price) => `Bought ${value} of stock at ${price}`,
};

const ZH_HK_UK: LandingCopy = {
  heroHeadline: <>掌管英國上市公司的人，剛剛買入自己公司的股份。</>,
  heroSub: (
    <>
      當一位董事拿自己的錢，投入自己經營的公司，這件事值得看一眼。ddbx
      追蹤每一宗英國董事增持，並讓你看到他們買入之後的成績。
    </>
  ),
  proofKicker: "過去 30 天",
  winnersHeading: <>董事買入了這些。看看他們的成績。</>,
  winnersSub:
    "全部是英國董事近期在場內的真實買盤，以及他們買入之後的股價變化。每一宗在披露當日就已經在 App 內。",
  winnersCtaSub: (d) => `每一宗董事增持，即時掌握 — 免費試用 ${d} 天。`,
  tourHeading: "一宗披露，跟到底。",
  tourSub:
    "一位董事買入。以下是接下來發生的每一件事 — 由消息上線那一秒，到幾個月後股價的去向。",
  beats: [
    {
      slot: "alert",
      timestamp: "07:01",
      kicker: "即時通知",
      title: "披露一出，通知同時到。",
      body: "董事披露買入，你的手機隨即震動 — 通常在 RNS 公佈後幾分鐘內，而不是第二天早上。不用查郵箱，也不用翻資訊流。",
    },
    {
      slot: "analysis",
      timestamp: "07:02",
      kicker: "解讀",
      title: "已經有人替你讀完。",
      body: "每一宗買入都經過拆解：是誰買、職級多高、投入了多少自己的錢，以及他付出的價格看起來是真有信心，還是例行公事。",
    },
    {
      slot: "balance",
      timestamp: "07:03",
      kicker: "正反兩面",
      title: "看好的理由，旁邊就是看淡的理由。",
      body: "每一宗獲評級的買入都會正反並陳 — 值得留意的地方，以及應該審慎的地方 — 每一點都可以展開，一直追溯到原始披露文件。這裡沒有任何內容是想說服你入市。",
    },
    {
      slot: "cluster",
      timestamp: "第 3–9 天",
      kicker: "形態",
      title: "一宗是數據，六宗是形態。",
      body: "當多位董事在數星期內買入同一間公司，ddbx 會把它們歸為一組 — 每一宗買入都標在股價圖上，連同平均買入價，以及此後股價的表現。",
    },
    {
      slot: "performance",
      timestamp: "今日",
      kicker: "成績",
      title: "看看到底有沒有用。",
      body: "由成交日起計的實時股價追蹤，讓你分得清誰的買盤值得跟，誰的不值得。",
    },
    {
      slot: "recap",
      timestamp: "每日早上",
      kicker: "每日回顧",
      title: "你睡醒之前，全日已經寫好。",
      body: "每朝一篇，只講真正重要的事：密集買入、值得注意的名字、成交總額，以及當日最大手的買盤為甚麼是（或不是）最值得留意的那一宗。",
    },
    {
      slot: "today",
      timestamp: "每日",
      kicker: "全景",
      title: "整個市場，一個畫面。",
      body: "當日每一宗英國董事買入，排好序、去掉雜訊。配售、股份歸屬及購股權行使都會被抽起，剩下的就是有人主動選擇買入。",
    },
  ],
  benefits: [
    "每一宗董事披露後數分鐘內推送通知，而不是第二天早上",
    "每一宗獲評級的買入都有文字分析 — 看好的理由，以及看淡的理由",
    "密集買入偵測：同一間公司多位董事買入，自動歸組並標示在股價圖上",
    "由成交日起計的實時表現追蹤，讓你看清誰的買盤值得跟",
    "每日一篇英國市場全景回顧，開市前為你寫好",
    "追蹤任何公司或董事；你關注的買盤之後股價有異動，即時收到通知",
    "抽起配售、股份歸屬及購股權行使，剩下的就是有人主動選擇買入",
    "每一宗倫敦上市公司的董事交易，由我們開始收錄那天起，全部可搜尋",
    "沒有廣告、沒有加購，你的資料絕不轉售",
  ],
  sourceLine:
    "資料在公佈時直接取自英國監管披露原文（RNS），絕不從第三方摘要轉載。",
  finalSub: (d) =>
    `每一宗英國董事買入，由披露當日起解讀並持續追蹤。免費試用 ${d} 天。`,
  buyerNoun: "董事",
  statNouns: (days) => ({
    filings: { k: "披露", label: "過去 30 天已讀取的董事披露" },
    companies: { k: "覆蓋", label: `過去 ${days} 天覆蓋的英國公司` },
    signal: { k: "訊號", label: "被標記為值得再看一眼" },
  }),
  // Chinese puts the unit price before the amount: "以每股 £0.04 買入 £4,071 股份".
  boughtShares: (value, price) => `以每股 ${price} 買入 ${value} 股份`,
};

/** Market copy by locale. `zh-HK` is deliberately UK-only — see the note at the
 *  top of this file. `landingCopy` falls back to English rather than rendering
 *  a page with holes in it. */
const LANDING_COPY: Record<
  DownloadLocale,
  Partial<Record<DownloadMarketId, LandingCopy>>
> = {
  en: { uk: EN_UK, us: EN_US },
  "zh-HK": { uk: ZH_HK_UK },
};

export function landingCopy(
  locale: DownloadLocale,
  market: DownloadMarketId,
): LandingCopy {
  return LANDING_COPY[locale][market] ?? LANDING_COPY.en[market]!;
}

/** True when this market actually has a page in this locale. The route exists
 *  for `/zh-hk/download` only, but a host-resolved US market (ddbx.us) reaching
 *  it would otherwise render English copy under a `lang="zh-HK"` document. */
export function hasLocale(
  locale: DownloadLocale,
  market: DownloadMarketId,
): boolean {
  return LANDING_COPY[locale][market] !== undefined;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** English by default, so every existing caller of these components — and any
 *  future one that never thinks about locale — keeps working unchanged. Only
 *  the download page provides a different value. */
const DownloadCopyContext = createContext<ChromeCopy>(EN_CHROME);

export const DownloadCopyProvider = DownloadCopyContext.Provider;

export function useDownloadCopy(): ChromeCopy {
  return useContext(DownloadCopyContext);
}
