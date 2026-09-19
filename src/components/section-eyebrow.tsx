import type { EyebrowProps } from "@/components/ui/eyebrow";

import { Eyebrow } from "@/components/ui/eyebrow";
import { useSectionEyebrow } from "@/lib/section";

/** An eyebrow prefixed with the page's masthead section — "Research ·
 *  Leaderboard". A thin wrapper over `<Eyebrow>`: pick the colour with
 *  `tone` (brand on light pages, stage on the dark panel); `className` is for
 *  spacing only. */
export function SectionEyebrow({
  children,
  ...rest
}: Omit<EyebrowProps, "children"> & { children: string }) {
  return <Eyebrow {...rest}>{useSectionEyebrow(children)}</Eyebrow>;
}
