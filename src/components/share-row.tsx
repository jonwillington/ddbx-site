/** THE share control — every "send this to someone" affordance on the site
 *  renders through this.
 *
 *  Sibling of components/close-button.tsx and components/button.ts: one shape,
 *  one fill language, one position. The fill is CloseButton's circle (a
 *  light-contrast disc that is visible at rest and deepens on hover) because
 *  these two are the same species of object — small, circular, chrome rather
 *  than content — and having them disagree was the kind of drift the close
 *  button was consolidated to end.
 *
 *  FOUR CHANNELS, deliberately: X, WhatsApp, LinkedIn, copy link. X is where
 *  this material already circulates, WhatsApp is how one person actually sends
 *  a filing to another, LinkedIn is the broker/guide audience, and copy-link is
 *  the one that never breaks. Facebook and Reddit were considered and left out
 *  — six icons is a toolbar, four is a row. Reddit is opt-in (`reddit`) for
 *  the sticky shell header, which IS a toolbar (Jon, 2026-09-19).
 *
 *  On a device with a system share sheet a fifth button appears at the end and
 *  folds in everything the four don't cover (Messages, Mail, Notes, whatever
 *  the reader actually uses). It is ADDITIVE, never a replacement: sniffing for
 *  "mobile" and hiding the icon row would leave a phone whose browser lacks
 *  `navigator.share` with nothing but a copy button. `canShare` is resolved in
 *  an effect rather than at render so the first paint is the same everywhere.
 *
 *  POSITION is fixed across surfaces: directly under the header furniture
 *  (eyebrow / headline / figures) and above the body. Not floating, not at the
 *  foot. A reader decides to share an article from its headline far more often
 *  than from its last paragraph, and a consistent slot means the control is
 *  findable without being looked for.
 *
 *  Every button emits `share_click` with the channel and the calling surface,
 *  via the delegated listener in lib/cookie-consent.ts.
 */
import { useEffect, useState } from "react";
import { CheckIcon, LinkIcon, ShareIcon } from "@heroicons/react/24/outline";

import { CLOSE_FILL } from "@/components/close-button";

/** The X account the site posts from — appended as `via` so a reshare is
 *  attributable. Same handle as the `twitter:site` card meta in
 *  components/document-title.tsx; changing one means changing both. */
const X_HANDLE = "ddbxuk";

export interface ShareRowProps {
  /** What to share. A path ("/reports/2026-08") is resolved against the
   *  current origin; an absolute URL is used as given. Pass the CANONICAL
   *  address, not `window.location.href` — a link carrying `?theme=light` or
   *  a stale `utm_*` is what the recipient then lands on. */
  url: string;
  /** The headline the share carries. Channels that ignore free text (LinkedIn)
   *  just drop it; the unfurl card fills in from og: meta either way. */
  title: string;
  /** GA label suffix identifying the surface — "daily-summary", "filing",
   *  "broker-detail". Reported as `share_click` / "x · filing". */
  context: string;
  /** "sm" for drawers and sheets, "md" for full pages. */
  size?: "sm" | "md";
  /** Adds Reddit, after LinkedIn. Off by default — see the header note. */
  reddit?: boolean;
  /** Mono uppercase kicker to the left of the icons. Omit for bare icons. */
  label?: string;
  className?: string;
}

const SIZES = {
  sm: { button: "h-8 w-8", icon: "h-4 w-4", gap: "gap-1.5" },
  md: { button: "h-9 w-9", icon: "h-[18px] w-[18px]", gap: "gap-2" },
} as const;

/** CloseButton's `tone="auto"` circle — imported, so the two can't drift:
 *  they are the same object at two jobs. */
const FILL = CLOSE_FILL;

const SHAPE =
  "inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2";

export function ShareRow({
  url,
  title,
  context,
  size = "md",
  reddit = false,
  label,
  className = "",
}: ShareRowProps) {
  const s = SIZES[size];
  const [absolute, setAbsolute] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Origin is only knowable in the browser, and `navigator.share` only exists
  // on some of them. Both resolve after mount so the first frame is identical
  // on every device and the row never reflows as capabilities are discovered
  // — the buttons are laid out from the start, the share sheet is the one
  // addition and it sits at the end where it can't shift the others.
  useEffect(() => {
    setAbsolute(new URL(url, window.location.origin).toString());
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [url]);

  // The copied confirmation is a state, not a toast: the link icon becomes a
  // tick in place for two seconds. Nothing moves, nothing has to be dismissed.
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(t);
  }, [copied]);

  // Until the origin resolves (one frame) the hrefs would be relative and the
  // intent URLs meaningless, so the row holds its geometry and waits.
  const href = absolute ?? url;
  const encodedUrl = encodeURIComponent(href);
  const encodedTitle = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      // Clipboard is permission-gated and absent over plain http. Falling back
      // to a selection prompt is worse than doing nothing — the four other
      // buttons still work, and a failed copy that silently reports success
      // would be the actual bug.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: href });
    } catch {
      // AbortError is the normal path: the reader opened the sheet and
      // dismissed it. Nothing to report either way.
    }
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {label ? <span className="micro mr-1 text-muted">{label}</span> : null}

      <ChannelLink
        className={s.button}
        context={context}
        href={`https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}&via=${X_HANDLE}`}
        label="Share on X"
        name="x"
      >
        <XGlyph className={s.icon} />
      </ChannelLink>

      <ChannelLink
        className={s.button}
        context={context}
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${href}`)}`}
        label="Share on WhatsApp"
        name="whatsapp"
      >
        <WhatsAppGlyph className={s.icon} />
      </ChannelLink>

      <ChannelLink
        className={s.button}
        context={context}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        label="Share on LinkedIn"
        name="linkedin"
      >
        <LinkedInGlyph className={s.icon} />
      </ChannelLink>

      {reddit ? (
        <ChannelLink
          className={s.button}
          context={context}
          href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`}
          label="Share on Reddit"
          name="reddit"
        >
          <RedditGlyph className={s.icon} />
        </ChannelLink>
      ) : null}

      <button
        aria-label={copied ? "Link copied" : "Copy link"}
        className={`${SHAPE} ${FILL} ${s.button} ${
          copied ? "!text-positive" : ""
        }`}
        data-ga-event="share_click"
        data-ga-label={`copy · ${context}`}
        title={copied ? "Link copied" : "Copy link"}
        type="button"
        onClick={copy}
      >
        {copied ? (
          <CheckIcon className={s.icon} />
        ) : (
          <LinkIcon className={s.icon} />
        )}
      </button>

      {canShare ? (
        <button
          aria-label="More sharing options"
          className={`${SHAPE} ${FILL} ${s.button}`}
          data-ga-event="share_click"
          data-ga-label={`native · ${context}`}
          title="More"
          type="button"
          onClick={nativeShare}
        >
          <ShareIcon className={s.icon} />
        </button>
      ) : null}
    </div>
  );
}

function ChannelLink({
  href,
  label,
  name,
  context,
  className,
  children,
}: {
  href: string;
  label: string;
  name: string;
  context: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className={`${SHAPE} ${FILL} ${className}`}
      data-ga-event="share_click"
      data-ga-label={`${name} · ${context}`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={label}
    >
      {children}
    </a>
  );
}

/* The brand glyphs. Drawn rather than imported: heroicons carries no
 * brand marks, and a logo package for three paths is 40kB for nothing. Each is
 * the official mark at 24×24, filled with currentColor so it inherits the
 * button's rest/hover colour like the heroicons beside it. */

function XGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.688 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function LinkedInGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124m1.778 13.019H3.555V9h3.56zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    </svg>
  );
}

function RedditGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z" />
    </svg>
  );
}
