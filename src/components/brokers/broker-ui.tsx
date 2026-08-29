import type { BrokerBadge, BrokerOffer } from "@/lib/api";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { CheckIcon, GiftIcon } from "@heroicons/react/24/outline";

import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import {
  CHIP_BASE,
  CHIP_HAIRLINE,
  CHIP_HAIRLINE_FILLED,
  CHIP_SIZE,
} from "@/components/chip";
import { domainLogoUrl } from "@/components/company-logo";
import {
  BROKER_DISCLAIMERS,
  BROKER_DISCLOSURE,
  BROKER_METHODOLOGY,
  badgeLabel,
  brokerHref,
  brokerLinkRel,
  fmtMoney,
  fmtPct,
  isAffiliateLink,
  isOfferLive,
  platformFeeSummary,
} from "@/lib/brokers";

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  }
}

function monogram(name: string): string {
  const initials = name
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("");

  return (initials || name).slice(0, 2).toUpperCase();
}

/** Rounded-square brand logo via Logo.dev (by `logo_url` if set, else the
 *  website domain). Falls back to a name monogram when the image misses. */
export function BrokerLogo({
  broker,
  size = 40,
  className,
}: {
  broker: BrokerOffer;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src =
    broker.logo_url || domainLogoUrl(domainFromUrl(broker.website_url), size);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#d0c8be]/50 bg-white dark:border-border/50 dark:bg-surface-secondary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span
          className="font-semibold leading-none text-foreground/50"
          style={{ fontSize: Math.max(10, Math.round(size * 0.34)) }}
        >
          {monogram(broker.name)}
        </span>
      ) : (
        <img
          alt=""
          className="h-full w-full object-contain p-1"
          decoding="async"
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          src={src}
          width={size}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

/** Editorial award badge as a small pill. The top-pick crown gets the accent
 *  treatment; the rest are quiet neutral chips. */
export function BadgeChip({ badge }: { badge: BrokerBadge }) {
  const isTop = badge === "top_pick";

  return (
    <span
      className={clsx(
        CHIP_BASE,
        CHIP_SIZE.sm,
        isTop
          ? `${CHIP_HAIRLINE_FILLED} bg-brand-brown text-white dark:bg-[#d8c4af] dark:text-ink`
          : `${CHIP_HAIRLINE} bg-hairline text-foreground/70 dark:bg-surface-secondary`,
      )}
    >
      {badgeLabel(badge)}
    </span>
  );
}

/** Boolean cell: check / em dash / ? for true / false / unknown(null). The one
 *  vocabulary every broker surface uses, so a tick never means two things. */
export function Tick({ value }: { value: boolean | null | undefined }) {
  if (value === true)
    return (
      <CheckIcon
        aria-label="Yes"
        className="h-[15px] w-[15px] shrink-0 text-positive"
        strokeWidth={2.5}
      />
    );
  if (value === false)
    return (
      <span aria-label="No" className="text-foreground/30">
        ,
      </span>
    );

  return (
    <span aria-label="Unknown" className="text-foreground/45">
      ?
    </span>
  );
}

/** Partial-fill star rating (0–5) with the numeric value alongside. */
export function StarRating({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-block text-[13px] leading-none">
        <span className="text-foreground/20">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#e0a52e]"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </span>
      <span className="text-xs font-medium tabular-nums text-foreground/70">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

/** Row of available store/Trustpilot ratings — only renders the ones present. */
export function RatingsStrip({
  broker,
  className,
}: {
  broker: BrokerOffer;
  className?: string;
}) {
  const items = (
    [
      { label: "App Store", value: broker.trust.app_store_rating },
      { label: "Google Play", value: broker.trust.play_store_rating },
      { label: "Trustpilot", value: broker.trust.trustpilot_rating },
    ] as { label: string; value: number | null }[]
  ).filter((i): i is { label: string; value: number } => i.value != null);

  if (!items.length) return null;

  return (
    <div
      className={clsx("flex flex-wrap items-center gap-x-5 gap-y-2", className)}
    >
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <StarRating value={i.value} />
          <span className="text-[11px] text-foreground/50">{i.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Verbose boolean for detail rows: check + Yes / No / Not stated (null).
 *  Clearer than the compact grid Tick on a long spec page. */
export function BoolValue({ value }: { value: boolean | null | undefined }) {
  if (value === true)
    return (
      <span className="inline-flex items-center gap-1 text-positive">
        <CheckIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={2.5} />
        Yes
      </span>
    );
  if (value === false) return <span className="text-foreground/55">No</span>;

  return <span className="text-foreground/40">Not stated</span>;
}

/** Outbound CTA to a broker. Renders the affiliate/referral link when present
 *  (rel="sponsored", with an "Ad" marker per ASA guidance), else the canonical
 *  site. Click is auto-tracked by the delegated GA listener via data-ga-*. */
export function BrokerVisitLink({
  broker,
  variant = "primary",
  size = "md",
  placement = "visit",
  className,
  children,
}: {
  broker: BrokerOffer;
  variant?: "primary" | "secondary" | "grey";
  size?: "md" | "lg";
  /** Where this button lives (grid, buy_box, mobile_bar…) — sent as the GA
   *  label so per-broker events can also be split by placement. */
  placement?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const affiliate = isAffiliateLink(broker);
  // Per-broker GA4 event name so each platform is its own event in reports,
  // e.g. cta_visit_trading_212. Sanitised to the [a-z0-9_] the tracker allows.
  const gaEvent = `cta_visit_${broker.slug.replace(/-/g, "_")}`;

  return (
    <a
      className={clsx(
        `inline-flex items-center justify-center gap-1.5 ${BUTTON_RADIUS} font-semibold transition-colors`,
        size === "lg" ? "px-5 py-3 text-sm" : "px-3.5 py-2 text-sm",
        variant === "primary" && BUTTON_FILLED,
        variant === "secondary" &&
          "ring-1 ring-separator text-foreground hover:bg-surface",
        variant === "grey" &&
          "bg-black/[0.05] text-foreground/75 hover:bg-black/[0.09] hover:text-foreground dark:bg-white/[0.08] dark:text-foreground/85 dark:hover:bg-white/[0.14]",
        className,
      )}
      data-ga-event={gaEvent}
      data-ga-label={placement}
      href={brokerHref(broker)}
      rel={brokerLinkRel(broker)}
      target="_blank"
    >
      <span>{children ?? `Visit ${broker.name}`}</span>
      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0 opacity-55" />
      {affiliate && (
        <span
          className="text-[10px] font-normal opacity-60"
          title="Affiliate link. We may earn a commission"
        >
          Ad
        </span>
      )}
    </a>
  );
}

/** Highlighted sign-up offer — a tinted pill with a gift icon so the
 *  incentive reads as a promo rather than plain text. */
export function OfferBadge({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-start gap-2 rounded-lg bg-brand-brown/[0.08] px-3 py-2 text-xs font-semibold leading-snug text-brand-brown dark:bg-[#d8c4af]/[0.14] dark:text-[#e7d4bf]",
        className,
      )}
    >
      <GiftIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/** Prominent top-of-page affiliate disclosure. Required to be visible at the
 *  point of engagement, not buried in the footer. */
export function BrokerDisclosure({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-separator bg-surface/60 px-4 py-2.5 text-xs text-foreground/80",
        className,
      )}
    >
      <span className="font-semibold text-foreground/80">Ad</span>.{" "}
      {BROKER_DISCLOSURE.replace(/^Ad\. /, "")}
    </div>
  );
}

function BuyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-foreground/55">{label}</dt>
      <dd className="font-medium text-foreground/85">{value}</dd>
    </div>
  );
}

/** Conversion card for a single broker — logo, rating, headline facts, offer
 *  and a full-width Visit CTA. Used in the detail-page sticky rail and the
 *  mobile sticky bar. */
export function BrokerBuyBox({ broker: b }: { broker: BrokerOffer }) {
  const accounts =
    [b.accounts.stocks_isa && "ISA", b.accounts.sipp && "SIPP"]
      .filter(Boolean)
      .join(" + ") || "General only";

  return (
    <div className="rounded-2xl border border-brand-brown/25 bg-background/60 p-4 dark:border-[#d8c4af]/25">
      <div className="flex items-center gap-3">
        <BrokerLogo broker={b} size={44} />
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{b.name}</div>
          {/* Stars are driven by one named source. App Store, Play and
              Trustpilot rate different things and don't average. */}
          {b.trust.trustpilot_rating != null && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[11px] text-foreground/50">Trustpilot</span>
              <StarRating value={b.trust.trustpilot_rating} />
            </span>
          )}
        </div>
      </div>
      {isOfferLive(b) && (
        <OfferBadge className="mt-3" text={b.offer_headline!} />
      )}
      <dl className="mt-3 space-y-1.5 text-xs">
        <BuyFact label="Platform fee" value={platformFeeSummary(b.fees)} />
        <BuyFact
          label="UK trade"
          value={fmtMoney(b.fees.trade_commission_uk_gbp)}
        />
        <BuyFact label="FX fee" value={fmtPct(b.fees.fx_fee_pct)} />
        <BuyFact label="Accounts" value={accounts} />
      </dl>
      <div className="mt-4">
        <BrokerVisitLink
          broker={b}
          className="w-full"
          placement="buy_box"
          size="lg"
        />
      </div>
      <p className="mt-2 text-center text-[10px] leading-snug text-foreground/45">
        Capital at risk.
        {isAffiliateLink(b) ? " We may earn a commission." : ""}
      </p>
    </div>
  );
}

/** Capital-at-risk, not-advice, tax and ranking-methodology copy. Render once
 *  near the grid (and on detail pages). */
export function BrokerComplianceNote({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "space-y-2 text-xs leading-5 text-foreground/55",
        className,
      )}
    >
      {BROKER_DISCLAIMERS.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{BROKER_METHODOLOGY}</p>
    </div>
  );
}
