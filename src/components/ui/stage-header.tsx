/** The message column on a dark stage: eyebrow, h1, standfirst, figures,
 *  notice — in that order, on one spacing.
 *
 *  Every board, the insider index and the methodology hero hand-built this
 *  stack before 2026-09-19, with the h1 at 50, 54 or 56px on the same stage.
 *  They share `display-stage` now (34 → 44 → 54, weight 400: light, not bold
 *  — the object is the emphasis and the title names it).
 *
 *  Slots, all optional but the title:
 *    eyebrow   a string is prefixed with the page's masthead section through
 *              SectionEyebrow ("Research · Leaderboard"); a node renders as is
 *    media     between eyebrow and title — a company or broker logo
 *    dek       the standfirst, rendered directly after the h1 so the shell
 *              CSS's `.board-stage h1 + p` measure rule still reaches it
 *    children  after the dek, before the figures (a verdict line)
 *    figures   usually <StageFigures>
 *    notice    usually <StageNotice>, plus any caveat that follows it
 *
 *  Spec: investigations/2026-09-19-ui-standardisation.md §3.
 */
import type { HTMLAttributes, ReactNode } from "react";

import clsx from "clsx";

import { Eyebrow } from "./eyebrow";

import { SectionEyebrow } from "@/components/section-eyebrow";

export interface StageTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Stop at 44px. The filing stage's h1 is a sentence about the trade, long
   *  enough that 54px wraps it to four lines. */
  capped?: boolean;
}

/** The stage h1 on its own, for a stage whose header is not the standard
 *  stack (filing, story, company, broker). Carries no margin or measure:
 *  those depend on what sits above it. */
export function StageTitle({ capped, className, ...rest }: StageTitleProps) {
  return (
    <h1
      className={clsx(
        capped ? "display-stage-capped" : "display-stage",
        "text-balance font-normal text-white",
        className,
      )}
      {...rest}
    />
  );
}

/** The standfirst under a stage h1. */
export const STAGE_DEK = "text-lede text-white/65";

/** The quieter stage link inside a dek: white text over a faint rule. */
export const STAGE_LINK =
  "text-white/85 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/70";

export interface StageHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  media?: ReactNode;
  title: ReactNode;
  /** The h1's measure. 22ch fits every board title on two lines at lg. */
  titleClassName?: string;
  capped?: boolean;
  dek?: ReactNode;
  /** The standfirst's measure. */
  dekClassName?: string;
  figures?: ReactNode;
  notice?: ReactNode;
}

export function StageHeader({
  eyebrow,
  media,
  title,
  titleClassName = "max-w-[22ch]",
  capped,
  dek,
  dekClassName = "max-w-[58ch]",
  figures,
  notice,
  children,
  className,
  ...rest
}: StageHeaderProps) {
  return (
    <div className={clsx("min-w-0", className)} {...rest}>
      {typeof eyebrow === "string" ? (
        <SectionEyebrow tone="stage">{eyebrow}</SectionEyebrow>
      ) : eyebrow != null ? (
        <Eyebrow tone="stage">{eyebrow}</Eyebrow>
      ) : null}
      {media}
      <StageTitle
        capped={capped}
        className={clsx(media ? "mt-5" : "mt-3", titleClassName)}
      >
        {title}
      </StageTitle>
      {dek != null ? (
        <p className={clsx("mt-5", dekClassName, STAGE_DEK)}>{dek}</p>
      ) : null}
      {children}
      {figures}
      {notice}
    </div>
  );
}
