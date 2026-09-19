import type { MouseEvent, KeyboardEvent } from "react";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { API_BASE } from "@/lib/api";
import { companyHref } from "@/lib/company";
import { NewsSourceLogo } from "@/components/news-source-logo";
import { marketForPath } from "@/lib/markets/registry";

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
  /** Market the ticker trades on ("UK", "US", "uk", "us"…). Defaults to the
   *  market of the page it is drawn on, which is right everywhere except a
   *  surface that mixes markets (the global tape) — that passes it per row. */
  market?: string | null;
  /** House rule (2026-09-19): wherever a company logo is drawn, it opens that
   *  company's page. Pass `false` only where it cannot — the company page's
   *  own header (a link to itself) and illustrative surfaces (the hero
   *  notification demo, the explainer, blurred teaser overlays). */
  link?: boolean;
}

/**
 * Circular company logo for an LSE ticker via Logo.dev. Falls back to a
 * ticker monogram when the network image fails or fires nothing useful.
 * Mirrors `CompanyLogo` in the iOS app.
 */
export function CompanyLogo(props: CompanyLogoProps) {
  const { ticker, market, link = true, monogramText } = props;
  const location = useLocation();
  const pageMarket = marketForPath(
    location.pathname,
    typeof window === "undefined" ? undefined : window.location.hostname,
  ).id;
  const href = link ? companyHref(ticker, market ?? pageMarket) : null;

  if (!href) return <LogoDisc {...props} />;

  return (
    <LogoLink href={href} label={monogramText ?? ticker}>
      <LogoDisc {...props} />
    </LogoLink>
  );
}

/** The link around a logo. Most logos sit inside a row that already links
 *  somewhere (usually the filing), and an anchor inside an anchor is invalid
 *  HTML the browser silently re-parents. So the logo renders as a real <a> only
 *  where no ancestor is one; inside a link it becomes a role="link" span that
 *  takes the click for itself — the row still opens the filing, the logo opens
 *  the company. Starts as the span so the first paint never nests anchors. */
function LogoLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [nested, setNested] = useState(true);
  const navigate = useNavigate();
  const external = /^https?:/.test(href);
  const aria = `${label} company page`;

  useLayoutEffect(() => {
    setNested(!!ref.current?.parentElement?.closest("a"));
  }, []);

  const go = (newTab: boolean) => {
    if (newTab) window.open(href, "_blank", "noopener");
    else if (external) window.location.assign(href);
    else navigate(href);
  };

  if (!nested) {
    return external ? (
      <a
        aria-label={aria}
        className="inline-flex shrink-0 rounded-full"
        href={href}
      >
        {children}
      </a>
    ) : (
      <Link
        aria-label={aria}
        className="inline-flex shrink-0 rounded-full"
        to={href}
      >
        {children}
      </Link>
    );
  }

  return (
    <span
      ref={ref}
      aria-label={aria}
      className="inline-flex shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      role="link"
      tabIndex={0}
      onAuxClick={(e: MouseEvent) => {
        if (e.button !== 1) return;
        e.preventDefault();
        e.stopPropagation();
        go(true);
      }}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        go(e.metaKey || e.ctrlKey);
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();
        go(false);
      }}
    >
      {children}
    </span>
  );
}

function LogoDisc({
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
        <NewsSourceLogo className="mr-1" domain="logo.dev" size="caption" />
        Logo.dev
      </a>
    </div>
  );
}
