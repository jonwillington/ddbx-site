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

function monogram(ticker: string): string {
  return ticker.replace(/\.L$/, "").slice(0, 3);
}

interface CompanyLogoProps {
  ticker: string;
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
  size = 40,
  className,
}: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl(ticker, size);

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
          {monogram(ticker)}
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
