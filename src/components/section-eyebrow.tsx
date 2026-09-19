import { useSectionEyebrow } from "@/lib/section";

/** An eyebrow prefixed with the page's masthead section — "Research ·
 *  Leaderboard". Styling stays with the caller: the stages set theirs in
 *  white on the dark panel, the light pages in brand brown. */
export function SectionEyebrow({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return <p className={className}>{useSectionEyebrow(children)}</p>;
}
