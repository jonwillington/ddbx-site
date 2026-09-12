import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/api";

/**
 * Logo.dev is now reached through our own Worker proxy (`/api/logo/*`) rather
 * than `img.logo.dev` directly. The proxy holds the token, applies ticker→domain
 * overrides, passes `fallback=404`, and fingerprints junk favicons (e.g. the
 * WordPress default that AIE.L resolves to) — so all that logic lives in ONE
 * place (ddbx-data pipeline/logo.ts) and a bad logo is fixed by a worker deploy,
 * not a site/iOS/Android release. On a 404 the proxy returns nothing and the
 * `onError` path below shows the monogram. Free tier still requires attribution
 * via `LogoDevAttribution` once per logo-bearing screen.
 */
const LOGO_DEV_ATTRIBUTION_URL = "https://logo.dev";

// The proxy serves one canonical pixel size, so callers no longer pass a size
// into the URL (kept in the signature for call-site stability; the rendered box
// size is applied by CSS). `.L` and other exchange suffixes are preserved — the
// server keys Logo.dev on the exchange-qualified symbol.
export function logoUrl(ticker: string, _sizePx?: number): string {
  return `${API_BASE}/logo/ticker/${encodeURIComponent(ticker)}`;
}

/** Proxy DOMAIN lookup — for entities we identify by website rather than an
 *  exchange ticker (e.g. broker-comparison platforms). */
export function domainLogoUrl(domain: string, _sizePx?: number): string {
  return `${API_BASE}/logo/domain/${encodeURIComponent(domain)}`;
}

/** The fallback glyph. Three characters of the ticker works wherever the
 *  ticker is a word — VOD, AAPL — and fails wherever it is a number: a KRX
 *  code renders "006", which reads as a broken cell rather than a company.
 *  Those markets pass `monogramText` (the company name) instead. */
function monogram(ticker: string, monogramText?: string | null): string {
  const named = monogramText?.trim();

  if (named) {
    const words = named.split(/\s+/).filter(Boolean);

    // Initials of a multi-word name ("Samsung Electronics" → SE), or the
    // opening of a single word ("Hyundai" → HYU). Hangul falls through the
    // same path and yields its own first syllables, which is right: a reader
    // who cannot parse the name still gets a stable, distinguishing mark.
    //
    // Uppercased because the ticker path always was, and a lone "Sys" in a
    // column of DCC / STI / OCL reads as a different kind of object. Hangul
    // is unaffected — it has no case.
    const initials =
      words.length > 1
        ? words
            .slice(0, 3)
            .map((w) => w[0])
            .join("")
        : words[0].slice(0, 3);

    return initials.toUpperCase();
  }

  return ticker.replace(/\.L$/, "").slice(0, 3);
}

interface CompanyLogoProps {
  ticker: string;
  /** Company website domain ("samsung.com"). When present the logo is
   *  looked up by domain rather than ticker — the ticker provider knows
   *  nothing about KRX codes, but DART publishes every issuer's homepage.
   *  The monogram fallback still comes from `ticker`. */
  domain?: string | null;
  /** Overrides the monogram fallback with initials drawn from this text —
   *  for markets whose ticker is a number and makes a meaningless glyph. */
  monogramText?: string | null;
  /** Rendered diameter in px. Defaults to 40. */
  size?: number;
  className?: string;
}

/**
 * Circular company logo for an LSE ticker via Logo.dev. Falls back to a
 * ticker monogram when the network image fails or fires nothing useful.
 * Mirrors `CompanyLogo` in the iOS app.
 */
export function CompanyLogo({
  ticker,
  domain,
  monogramText,
  size = 40,
  className,
}: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = domain ? domainLogoUrl(domain, size) : logoUrl(ticker, size);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full border border-[#d0c8be]/50 dark:border-border/50 bg-[#f1ebe2] dark:bg-surface-secondary ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span
          className="font-mono font-semibold text-muted leading-none"
          style={{ fontSize: Math.max(9, Math.round(size * 0.32)) }}
        >
          {monogram(ticker, monogramText)}
        </span>
      ) : (
        <img
          alt=""
          className="w-full h-full object-contain"
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

/**
 * Logo.dev's free tier requires a followable link back to logo.dev. Place
 * once per page that shows logos.
 */
export function LogoDevAttribution({ className }: { className?: string }) {
  return (
    <div className={`text-xs text-muted ${className ?? ""}`}>
      Logos provided by{" "}
      <a
        className="font-medium hover:text-foreground transition-colors"
        href={LOGO_DEV_ATTRIBUTION_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        Logo.dev
      </a>
    </div>
  );
}
