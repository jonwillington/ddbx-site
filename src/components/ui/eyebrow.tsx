/** The eyebrow — the one uppercase mono label above a heading.
 *
 *  Before 2026-09-19 every eyebrow was its own pasted string: mono, 11px,
 *  uppercase and one of ten trackings, in whatever colour the file felt like.
 *  The type now lives in the `eyebrow` utility (styles/globals.css); this
 *  adds the three colours an eyebrow is allowed:
 *
 *    brand  — brown / tan, the default on light pages
 *    quiet  — foreground at 45%, for a label that should not compete
 *    stage  — white at 55%, on the fixed-dark board-stage ground
 *
 *  Spec: investigations/2026-09-19-ui-standardisation.md §3.
 */
import type { HTMLAttributes } from "react";

import clsx from "clsx";

export type EyebrowTone = "brand" | "quiet" | "stage";

export const EYEBROW_TONE: Record<EyebrowTone, string> = {
  brand: "text-brand-brown dark:text-brand-tan",
  quiet: "text-foreground/45",
  stage: "text-white/55",
};

/** The class string, for the places a component can't go (a `<dt>`, a
 *  `<figcaption>`, a label inside someone else's markup). */
export const eyebrow = (tone: EyebrowTone = "brand") =>
  `eyebrow ${EYEBROW_TONE[tone]}`;

export interface EyebrowProps extends HTMLAttributes<HTMLElement> {
  tone?: EyebrowTone;
  /** The element. `p` by default — an eyebrow is a line of its own. */
  as?: "p" | "span" | "div";
}

export function Eyebrow({
  tone = "brand",
  as: Tag = "p",
  className,
  ...rest
}: EyebrowProps) {
  return <Tag className={clsx(eyebrow(tone), className)} {...rest} />;
}
