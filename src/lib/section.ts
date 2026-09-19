/** Which masthead section a route belongs to, for eyebrows.
 *
 *  Every page's eyebrow reads "<Section> · <kind>" — "Research · Leaderboard",
 *  "Learn · Methodology", "Stories · Since the buy" — so a reader landing
 *  cold on any page sees where it sits in the site before what it is. The
 *  section names are the masthead's own labels, so the eyebrow and the nav
 *  item that lights up for the page always agree.
 *
 *  Pages outside a section (the market feeds, filings, legal) return null and
 *  keep their eyebrow as written. */
import { useLocation } from "react-router-dom";

import { RESEARCH_PATHS } from "@/lib/site-nav";

const under = (p: string, prefix: string) =>
  p === prefix || p.startsWith(`${prefix}/`);

export type SiteSection =
  | "Research"
  | "Stories"
  | "Learn"
  | "Brokers"
  | "API"
  | "MCP";

export function sectionForPath(p: string): SiteSection | null {
  if (under(p, "/stories")) return "Stories";
  if (under(p, "/learn") || p === "/how-it-works") return "Learn";
  if (under(p, "/brokers") || under(p, "/compare")) return "Brokers";
  if (p === "/developers" || p === "/api") return "API";
  if (p === "/mcp") return "MCP";
  if (
    RESEARCH_PATHS.some((x) => under(p, x)) ||
    p.startsWith("/company/") ||
    under(p, "/directors") ||
    under(p, "/us/directors") ||
    under(p, "/tape") ||
    under(p, "/weekly") ||
    under(p, "/daily")
  ) {
    return "Research";
  }

  return null;
}

/** "Research · Leaderboard". Leaves the kind alone when the page has no
 *  section, or when the kind already is the section (an index page whose
 *  eyebrow names it). */
export function withSection(section: SiteSection | null, kind: string): string {
  if (!section || !kind) return kind;
  if (kind.toLowerCase().startsWith(section.toLowerCase())) return kind;

  return `${section} · ${kind}`;
}

/** `title` is the page's h1. A section's own index (/stories, h1
 *  "Stories") already names the section in its title, so its eyebrow stays
 *  the bare kind rather than saying "Stories" twice in two lines. */
export function useSectionEyebrow(kind: string, title?: string): string {
  const { pathname } = useLocation();
  const section = sectionForPath(pathname);

  if (section && title && title.trim().toLowerCase() === section.toLowerCase())
    return kind;

  return withSection(section, kind);
}
