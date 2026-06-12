/** Direct App Store link used by the in-page gating CTAs (drawer overlay,
 *  monthly recap). Points at the UK app — the canonical surface those
 *  surfaces nudge toward. The footer's multi-app chooser uses
 *  `AppStoreBadgeImg` + `APP_CHOICES` instead. */
const APP_STORE_URL =
  "https://apps.apple.com/us/app/ddbx-uk/id6762196330?itscg=30200&itsct=apps_box_badge&mttnsubad=6762196330";

/** Local static copy of Apple's official "Download on the App Store" badge
 *  (public/app-store-badge.svg) — self-hosted so we don't depend on Apple's
 *  marketing-tools endpoint at runtime. */
const BADGE_SRC = "/app-store-badge.svg";

const SIZES = {
  sm: { width: 85, height: 28 },
  md: { width: 120, height: 40 },
  lg: { width: 160, height: 53 },
} as const;

/** Just the badge artwork. Render this inside whatever element should carry
 *  the action — an `<a>` for a direct link, or a `<button>` for a chooser. */
export function AppStoreBadgeImg({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { width, height } = SIZES[size];

  return (
    <img
      alt="Download on the App Store"
      className={className}
      src={BADGE_SRC}
      style={{ width, height, verticalAlign: "middle", objectFit: "contain" }}
    />
  );
}

/** Badge wired straight to the UK App Store link. */
export function AppStoreBadge({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <a
      aria-label="Download on the App Store"
      className={`inline-block opacity-80 hover:opacity-100 transition-opacity ${className}`}
      href={APP_STORE_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      <AppStoreBadgeImg size={size} />
    </a>
  );
}
