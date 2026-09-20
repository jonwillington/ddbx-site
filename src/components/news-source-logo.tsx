/** The source's mark next to anything we cite.
 *
 *  House rule (Jon, 2026-09-19): every source shown anywhere on the site —
 *  a headline's publisher, an evidence item's citation, a filing link to a
 *  regulator, a research reference — carries the source's favicon before its
 *  name. This is the one component that draws it.
 *
 *  Third-party sources have no logo field on the wire — at best we get a URL,
 *  sometimes only a name — so the mark is the site's own favicon, resolved
 *  from a hostname through Google's favicon service. Pass whichever you have:
 *
 *    - `url`    a full link to the cited page (hostname is taken from it)
 *    - `domain` a bare hostname ("sec.gov") when the data has no URL
 *    - `name`   a source NAME ("RNS", "SEC EDGAR · Form 4") — resolved
 *               through `sourceDomain()` for the regulators and feeds we
 *               cite by name; anything unknown renders nothing
 *
 *  It is decoration, not information: the source name is always printed next
 *  to it, so the image is `alt=""` and a source we can't resolve leaves no
 *  mark rather than a broken-image glyph.
 *
 *  Many favicons are dark marks on a transparent field and vanish on a dark
 *  ground, so in dark mode (and always, with `ground="dark"`, for the dark
 *  stages that stay dark in light mode) the mark sits on a small white
 *  rounded-mark backing. Padding is inside the box, so the footprint is the
 *  same in both modes and nothing shifts on a theme flip.
 */

/** Line-box-matched sizes: the mark is the cap-to-descender height of the
 *  text it sits beside, so it centres in the row without nudging it. */
const STEP_SIZE = {
  caption: 12, // text-caption: 11px × 1.45 ≈ 16px line box
  small: 14, //   text-small: 12.5px × 1.5 ≈ 19px line box
  body: 16, //    text-body: 14px × 1.6 ≈ 22px line box
} as const;

export type SourceLogoSize = keyof typeof STEP_SIZE | number;

/** Regulators and feeds we cite by name with no URL on the wire. Keys are
 *  matched case-insensitively as whole words against the source label, in
 *  order, so the more specific names come first. */
const SOURCE_DOMAINS: [RegExp, string][] = [
  [/\bhouse clerk\b|\bclerk\b|\bstock act\b|\bptrs?\b/i, "clerk.house.gov"],
  [/\bsenate\b|\befd\b/i, "efdsearch.senate.gov"],
  [/\bsec\b|\bedgar\b|\bform 4\b/i, "sec.gov"],
  [/\brns\b|\blondon stock exchange\b|\blse\b/i, "londonstockexchange.com"],
  [/\bafm\b/i, "afm.nl"],
  [/\bfinansinspektionen\b|\bfi\b|\binsynsregister\b/i, "fi.se"],
  [/\bdart\b|\bfinancial supervisory service\b/i, "dart.fss.or.kr"],
  [
    /\bcompanies house\b/i,
    "find-and-update.company-information.service.gov.uk",
  ],
];

/** Each market's primary disclosure feed, for surfaces keyed by market id
 *  rather than by a source label. */
export const MARKET_SOURCE_DOMAIN: Record<string, string> = {
  UK: "londonstockexchange.com",
  US: "sec.gov",
  NL: "afm.nl",
  SE: "fi.se",
  KR: "dart.fss.or.kr",
  USG: "clerk.house.gov",
};

/** The domain behind a source name, or "" when it isn't one we know. */
export function sourceDomain(name: string | null | undefined): string {
  if (!name) return "";
  for (const [re, domain] of SOURCE_DOMAINS) if (re.test(name)) return domain;

  return "";
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function NewsSourceLogo({
  url,
  domain,
  name,
  className = "",
  size = 14,
  ground = "auto",
}: {
  url?: string | null;
  domain?: string | null;
  name?: string | null;
  className?: string;
  /** A ramp step the mark sits beside, or a size in px. The encoder is asked
   *  for 2× it, so the mark stays sharp on retina. */
  size?: SourceLogoSize;
  /** "dark" for a surface that is dark in both themes (the dark stage): the
   *  white backing then applies in light mode too. */
  ground?: "auto" | "dark";
}) {
  const host =
    (url ? hostnameFromUrl(url) : "") ||
    (domain ? domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "") ||
    sourceDomain(name);

  if (!host) return null;

  const px = typeof size === "number" ? size : STEP_SIZE[size];
  const backing =
    ground === "dark" ? "bg-white p-px" : "dark:bg-white dark:p-px";

  return (
    <img
      alt=""
      className={`inline-block shrink-0 rounded-mark align-middle ${backing} ${className}`}
      height={px}
      loading="lazy"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${px * 2}`}
      style={{ width: px, height: px }}
      width={px}
    />
  );
}
