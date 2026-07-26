/** The publisher's mark next to a headline.
 *
 *  Third-party news has no logo field on the wire — all we get is a source
 *  name and a URL — so the mark is the site's own favicon, resolved from the
 *  article's hostname through Google's favicon service. That's the same
 *  service the market channel's news strip has always used; this is that
 *  treatment lifted out of it so the company pages render publishers
 *  identically rather than growing a second, slightly-different version.
 *
 *  It is decoration, not information: the source name is always printed next
 *  to it, so the image is `alt=""` and a publisher with no favicon simply
 *  leaves a gap rather than a broken-image glyph.
 */
function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function NewsSourceLogo({
  url,
  className = "",
  /** Rendered size in px. The encoder is asked for 2× it, so the mark stays
   *  sharp on retina without shipping a bigger file than it needs to. */
  size = 14,
}: {
  url: string;
  className?: string;
  size?: number;
}) {
  const host = hostnameFromUrl(url);

  if (!host) return null;

  return (
    <img
      alt=""
      className={`shrink-0 rounded-sm ${className}`}
      height={size}
      loading="lazy"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size * 2}`}
      style={{ width: size, height: size }}
      width={size}
    />
  );
}
