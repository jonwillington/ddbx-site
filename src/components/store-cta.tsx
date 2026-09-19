/** StoreCta — the one "get the app" control.
 *
 *  Before 2026-09-19 there were three parallel systems: `StoreButtons` (one
 *  filled button for the visitor's store), `StoreBadges` / `StoreBadgeImg`
 *  (the vendors' own badge artwork) and a set of hand-rolled filled anchors
 *  with a `StoreGlyph` in them (navbar pill, mobile menu, side rail, floating
 *  mobile bar). They agreed on the fill and disagreed on everything else.
 *
 *    button   filled ink button, glyph + label. `size` sm (side rail),
 *             md (menu sheet), lg (floating mobile bar).
 *    compact  the small inline pill that rides in a bar (navbar).
 *    badge    Apple's / Google's badge artwork. `size` is the artwork height.
 *
 *  Renders an `<a>` when given `href` (new tab, noopener — overridable), a
 *  `<button type="button">` otherwise. Everything else — `data-ga-*`,
 *  `onClick`, `aria-*`, the handoff flow's `data-ga-store-intercepted` —
 *  passes straight through: this is the conversion surface, so the component
 *  decides the look and nothing about where the click goes or how it is
 *  counted. Store URL resolution stays with the caller (`storeUrlForMarketId`,
 *  `storeTargetsForMarket`, `useAppHandoff`).
 *
 *  `StoreButtons` and `StoreBadges` remain as thin wrappers over this for
 *  their existing call sites. Spec: investigations/2026-09-19-ui-standardisation.md §3.
 */
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import clsx from "clsx";

import { AndroidGlyph } from "@/components/android-glyph";
import { AppleGlyph } from "@/components/apple-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { StoreGlyph } from "@/components/store-glyph";

export type Store = "ios" | "android";

/** Self-hosted store badges (public/*.svg) — Apple's "Download on the App
 *  Store" and Google's "Get it on Google Play" — kept local so we don't depend
 *  on either vendor's marketing-tools endpoint at runtime. Each badge keeps its
 *  own aspect ratio (Apple ≈ 3.0, Google ≈ 2.58) so neither is squashed; we
 *  size by height and derive width from the ratio. */
export const STORE_BADGES = {
  ios: {
    src: "/app-store-badge.svg",
    alt: "Download on the App Store",
    ratio: 3,
    gaEvent: "cta_download_app_store_badge",
  },
  android: {
    src: "/play-store-badge.svg",
    alt: "Get it on Google Play",
    // Official Google badge artwork (Wikimedia), viewBox 180 × 53.333.
    ratio: 180 / 53.333,
    gaEvent: "cta_download_play_store_badge",
  },
} as const;

const BADGE_HEIGHTS = { sm: 28, md: 40, lg: 53 } as const;

export type StoreCtaSize = keyof typeof BADGE_HEIGHTS;

/** Just one badge's artwork. Render this inside whatever element should carry
 *  the action — or use `<StoreCta variant="badge">`, which does. */
export function StoreBadgeImg({
  store = "ios",
  size = "sm",
  className = "",
}: {
  store?: Store;
  size?: StoreCtaSize;
  className?: string;
}) {
  const { src, alt, ratio } = STORE_BADGES[store];
  const height = BADGE_HEIGHTS[size];

  return (
    <img
      alt={alt}
      className={className}
      src={src}
      style={{
        width: Math.round(height * ratio),
        height,
        verticalAlign: "middle",
        objectFit: "contain",
      }}
    />
  );
}

/** Padding, gap and label type per shape. Colour and radius come from
 *  button.ts, so a store CTA is never a different species of button. */
const BUTTON_SIZE: Record<StoreCtaSize, string> = {
  sm: "gap-2 px-3 py-2 text-small font-medium",
  md: "gap-2 px-4 py-3 text-base font-medium",
  lg: "gap-2.5 px-5 py-4 text-base font-semibold",
};
const COMPACT = "gap-1.5 px-4 py-1.5 text-sm font-medium";

const GLYPH_SIZE: Record<StoreCtaSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

interface StoreCtaOwnProps {
  variant?: "button" | "compact" | "badge";
  /** button: the preset (sm/md/lg). badge: the artwork height. Ignored by
   *  compact. */
  size?: StoreCtaSize;
  /** Full width (`flex w-full`) rather than inline. button/compact only. */
  block?: boolean;
  /** Pin the store. Unset, the glyph follows the visitor's device (Android
   *  robot on Android, Apple mark elsewhere). Required in effect for badge,
   *  which defaults to the App Store. */
  store?: Store;
  /** Replace the whole class recipe (fill, radius, padding, type) — for the
   *  StoreButtons call sites that style the button to their own surface
   *  (white on a dark band). New call sites use variant + size. */
  recipe?: string;
  glyphClassName?: string;
  className?: string;
  /** The label. Not rendered by badge, whose artwork carries its own. */
  children?: ReactNode;
}

type AnchorCta = StoreCtaOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof StoreCtaOwnProps> & {
    href: string;
  };
type ButtonCta = StoreCtaOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof StoreCtaOwnProps> & {
    href?: undefined;
  };

export type StoreCtaProps = AnchorCta | ButtonCta;

export function StoreCta(props: StoreCtaProps) {
  const {
    variant = "button",
    size = "md",
    block = false,
    store,
    recipe,
    glyphClassName,
    className,
    children,
    ...rest
  } = props;

  let classes: string;
  let content: ReactNode;

  if (variant === "badge") {
    const badgeStore = store ?? "ios";

    classes = clsx("inline-block transition-opacity", className);
    content = <StoreBadgeImg size={size} store={badgeStore} />;
    if (rest["aria-label"] == null) {
      rest["aria-label"] = STORE_BADGES[badgeStore].alt;
    }
  } else {
    const glyphClass = clsx(
      glyphClassName ??
        (variant === "compact" ? GLYPH_SIZE.sm : GLYPH_SIZE[size]),
      "shrink-0",
    );

    classes = clsx(
      recipe ?? [
        block ? "flex w-full" : "inline-flex",
        "items-center justify-center",
        BUTTON_RADIUS,
        BUTTON_FILLED,
        variant === "compact" ? COMPACT : BUTTON_SIZE[size],
        "transition-colors",
      ],
      className,
    );
    content = (
      <>
        {store === "android" ? (
          <AndroidGlyph className={glyphClass} />
        ) : store === "ios" ? (
          <AppleGlyph className={glyphClass} />
        ) : (
          <StoreGlyph className={glyphClass} />
        )}
        {children}
      </>
    );
  }

  if (rest.href != null) {
    return (
      <a
        className={classes}
        rel="noopener noreferrer"
        target="_blank"
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type="button"
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
