import type { ButtonHTMLAttributes } from "react";

import { XMarkIcon } from "@heroicons/react/24/outline";

/** THE close/dismiss button — every "X" in the app renders through this.
 *
 *  The X buttons had drifted into three species (bare `×` text glyphs, a
 *  local CLOSE_CLASS, a banner one-off), some with no resting affordance at
 *  all. This canonicalises them: a circular, light-contrast fill that is
 *  visible at rest, deepens on hover, and carries the repo's standard
 *  focus-visible ring. Sibling of components/button.ts / chip.ts — if you
 *  need an X anywhere, use this instead of hand-rolling one.
 *
 *  `tone="dark"` is for surfaces whose background is fixed dark art
 *  regardless of theme (e.g. the explainer walkthrough), where the
 *  theme-aware tokens would vanish in light mode. `tone="light"` is its
 *  mirror, for surfaces that stay CREAM regardless of theme (the `/api`
 *  closing band and its request modal, on a route that pins `.dark`). */

const SIZES = {
  /** Compact dismiss for banners/toasts. */
  sm: { button: "h-7 w-7", icon: "h-4 w-4" },
  /** Default for drawer/modal headers. */
  md: { button: "h-8 w-8", icon: "h-4.5 w-4.5" },
} as const;

const TONES = {
  /** Theme-aware: light-contrast circle against the page background. */
  auto: "bg-black/[0.05] text-muted hover:bg-black/[0.09] hover:text-foreground dark:bg-white/[0.08] dark:hover:bg-white/[0.14] dark:hover:text-foreground focus-visible:ring-[#5a4128]/40 dark:focus-visible:ring-[#ad9479]/40",
  /** For always-dark surfaces (explainer stage) in either theme. */
  dark: "bg-white/[0.08] text-[#f3ecdf]/60 hover:bg-white/[0.14] hover:text-[#f3ecdf] focus-visible:ring-white/40",
  /** For always-cream surfaces in either theme. `auto`'s light half, literal. */
  light:
    "bg-black/[0.05] text-[#1a140d]/55 hover:bg-black/[0.09] hover:text-[#1a140d] focus-visible:ring-[#5a4128]/40",
} as const;

export function CloseButton({
  className = "",
  size = "md",
  tone = "auto",
  "aria-label": ariaLabel = "Close",
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 ${TONES[tone]} ${SIZES[size].button} ${className}`}
      type="button"
      {...rest}
    >
      <XMarkIcon className={SIZES[size].icon} />
    </button>
  );
}
