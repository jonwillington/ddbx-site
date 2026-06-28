import type { BrokerBadge, BrokerOffer } from "@/lib/api";

// Display labels for the editorial award badges. Keep in step with
// BROKER_BADGES in ddbx-data/worker/db/types.ts.
export const BADGE_LABELS: Record<BrokerBadge, string> = {
  top_pick: "Top pick",
  best_for_beginners: "Best for beginners",
  best_for_isa: "Best for ISA",
  best_for_sipp: "Best for SIPP",
  best_for_lisa: "Best for LISA",
  lowest_cost: "Lowest cost",
  best_for_fractional: "Best for fractional",
  best_for_us_stocks: "Best for US stocks",
  best_for_funds: "Best for funds",
  best_for_active_traders: "Best for active traders",
};

export function badgeLabel(b: BrokerBadge): string {
  return BADGE_LABELS[b] ?? b;
}

/** "—" for unknown (null), "Free" for 0, otherwise £-prefixed. */
export function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "Free";
  return `£${v.toLocaleString("en-GB")}`;
}

/** "—" for unknown, "0%" for 0, otherwise percent. */
export function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "0%";
  return `${v}%`;
}

/** One-line platform-fee summary for the grid. */
export function platformFeeSummary(fees: BrokerOffer["fees"]): string {
  const { platform_fee_monthly_gbp: m, platform_fee_pct: p } = fees;
  if (m === 0 && p === 0) return "Free";
  const parts: string[] = [];
  if (m) parts.push(`£${m}/mo`);
  if (p) parts.push(`${p}%`);
  if (parts.length) return parts.join(" + ");
  if (m === 0 && p == null) return "No monthly fee";
  return "—";
}

/** The link to send a user to. Falls back to the canonical homepage until the
 *  owner supplies a referral/affiliate URL. */
export function brokerHref(b: BrokerOffer): string {
  return b.affiliate_url || b.website_url;
}

/** Whether the outbound link is a monetised affiliate/referral link (drives
 *  rel="sponsored" and per-row "Ad" labelling per ASA guidance). */
export function isAffiliateLink(b: BrokerOffer): boolean {
  return Boolean(b.affiliate_url);
}

/** rel attribute for an outbound broker link. Affiliate links get
 *  rel="sponsored" per ASA/Google guidance. */
export function brokerLinkRel(b: BrokerOffer): string {
  return isAffiliateLink(b)
    ? "sponsored noopener noreferrer"
    : "noopener noreferrer";
}

/** Short, human label for a source URL (hostname without www). */
export function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

/** Field-relative cost comparison for the "how it compares" context. Lower is
 *  cheaper for every fee field we compare, so the verdict is uniform. */
export type CompareTone = "good" | "bad" | "neutral";
export function compareToField(
  value: number | null | undefined,
  avg: number | null,
  min: number | null,
): { label: string; tone: CompareTone } | null {
  if (value == null || avg == null) return null;
  if (min != null && value <= min) return { label: "Lowest", tone: "good" };
  // within 5% of the average reads as "about average"
  const band = Math.max(Math.abs(avg) * 0.05, 0.001);
  if (value < avg - band) return { label: "Below average", tone: "good" };
  if (value > avg + band) return { label: "Above average", tone: "bad" };
  return { label: "Around average", tone: "neutral" };
}

// ---------------------------------------------------------------------------
// Compliance copy — sourced from the FCA/ASA brief at
// ddbx-data/investigations/broker-comparison/fca-compliance.md. The grid lists
// mainstream investing/ISA/SIPP platforms only; crypto/CFD are factual feature
// flags and never get a CTA. Keep this wording factual and non-advisory.
// ---------------------------------------------------------------------------

/** Prominent top-of-page affiliate disclosure (must not be footer-only). */
export const BROKER_DISCLOSURE =
  "Ad — we may earn a commission if you open an account through links on this page. It doesn’t affect what you pay, or how we rank platforms.";

/** Capital-at-risk + not-advice + tax + status lines shown near the grid. */
export const BROKER_DISCLAIMERS = [
  "Information only, not financial advice. We don’t recommend any specific provider — consider taking regulated advice before investing.",
  "Capital at risk. The value of investments can go down as well as up and you may get back less than you invest.",
  "Tax treatment depends on your individual circumstances and ISA/SIPP rules may change in the future.",
  "ddbx is not FCA-authorised and provides no regulated advice or arranging service. Listed providers are responsible for their own regulatory status.",
];

/** How rankings are determined — supports "fair, clear, not misleading". */
export const BROKER_METHODOLOGY =
  "How we rank: platforms are ordered editorially on fees, account range, features and FSCS protection — not on commission. Listings are commercial (see disclosure above). Figures are checked against providers’ official pages; always confirm the current terms on the provider’s site before opening an account.";
