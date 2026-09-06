/** The site's internal link graph, in one place.
 *
 *  Why this exists: until now the footer carried no internal content links at
 *  all — a logo, five paragraphs of disclaimer, and legal links rendered as
 *  <button> drawer triggers rather than anchors, so a crawler following links
 *  from any page found nothing but the navbar. Several hundred company pages
 *  hung off a single /companies index, and the sitemap was doing work that
 *  internal linking should do.
 *
 *  So the footer needs real hrefs, and the moment more than one surface wants
 *  that list (the footer today; related-links blocks on the new landing pages
 *  next) it has to stop living inside a component.
 *
 *  ---------------------------------------------------------------------------
 *  Cross-domain rules
 *  ---------------------------------------------------------------------------
 *
 *  One SPA serves ddbx.uk, ddbx.us and ddbx.eu, so "/" means different things
 *  depending on who's asking. Every link here goes through marketHref(), which
 *  keeps same-host links relative, makes cross-market links absolute to the
 *  owning domain, and collapses to local route shapes on localhost and preview
 *  builds where domain routing doesn't apply.
 *
 *  Broker pages are the special case: there is no US broker data
 *  (/api/brokers?market=US 404s), so they are UK-only editorial and always
 *  point at ddbx.uk. That matches canonicalUrlFor() in shared/seo.js, which
 *  folds every /brokers/* URL onto ddbx.uk whichever domain served it — if the
 *  footer linked to a same-host copy, we'd be advertising a URL that
 *  canonicalises elsewhere.
 */
import { CATEGORIES, categoryPath } from "../../shared/broker-categories.js";
import {
  COMPARISONS,
  comparisonPath,
} from "../../shared/broker-comparisons.js";
import { entriesForHost, learnPath } from "../../shared/glossary.js";

import {
  MARKETS,
  marketDashboardPath,
  marketForPath,
  marketHref,
  type MarketRegistryEntry,
} from "@/lib/markets/registry";

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

/** A research destination, carrying the two extra facts the masthead needs
 *  and the footer ignores. */
export interface ResearchLink extends NavLink {
  /** The site-relative path, before marketHref() may make it host-absolute.
   *  `href` is what you follow; this is what you compare the current route
   *  against — matching on `href` would break the moment a link goes
   *  cross-host. */
  path: string;
  /** Also listed in the masthead's Research dropdown. The footer takes all
   *  nine; the dropdown takes the seven that are a hub, a standing ranking or
   *  the archive. /market-cap and /roles are facet cuts of the same corpus,
   *  reachable from /companies and the footer — in a seven-item menu they'd be
   *  two more rows saying "companies, sliced differently". */
  nav?: true;
  /** Draw a rule above this row in the dropdown. One divider, separating the
   *  standing rankings from the archive behind them. A flag rather than
   *  "before the last item" so reordering the list can't silently move it. */
  divider?: true;
}

/** Every path the Research dropdown's trigger counts as "you are here".
 *
 *  All nine, not the seven in the menu: the trigger names the section, and a
 *  reader on /roles or /market-cap is as much inside Research as one on
 *  /sectors. Same reason /company/* joins them in the navbar's match — a leaf
 *  is in the section that owns it, whether or not the menu lists it. */
export const RESEARCH_PATHS = [
  "/companies",
  "/sectors",
  "/market-cap",
  "/roles",
  "/biggest-buys",
  "/best-performing-buys",
  "/cluster-buys",
  "/most-active-companies",
  "/reports",
] as const;

const uk = () => MARKETS.find((m) => m.id === "uk")!;

/** A path on ddbx.uk, wherever the reader currently is. */
function ukHref(path: string, hostname?: string): string {
  return marketHref(uk(), path, hostname);
}

/** The research destinations, in one order, for both surfaces that list them:
 *  the footer's Research column (all nine) and the masthead's Research
 *  dropdown (the seven tagged `nav`). Labels are shared verbatim — two
 *  surfaces naming the same page differently is how a reader ends up thinking
 *  there are two pages.
 *
 *  Ordered hubs-then-boards: the ways into the whole corpus, then the rankings
 *  over it, then the archive.
 *
 *  Research links stay on the reader's own market — someone on ddbx.us wants
 *  US companies, not UK ones — EXCEPT on ddbx.eu.
 *
 *  Every path here is in UK_US_ONLY_PREFIXES (shared/seo.js): SE and NL carry
 *  no company pages, no sector rollups and no value field to rank, so the
 *  middleware 301s all of them to ddbx.uk. The footer was linking them to
 *  `home` regardless, which meant four links on ddbx.eu each advertised a URL
 *  that immediately redirects — precisely what this module's header says it
 *  exists to avoid. Same UK pin the "How it works" link below already applies,
 *  and for the same reason.
 *
 *  The pin never fires for the masthead: the navbar shows the dropdown only on
 *  uk/us/usg/djt, deliberately, because a masthead item that silently jumps
 *  host is a worse thing than a footer one. The footer is a crawl surface
 *  where a UK-pinned href is the honest choice over one that 301s; primary
 *  navigation should not move you between domains without saying so. */
function researchLinks(
  home: MarketRegistryEntry,
  hostname?: string,
): ResearchLink[] {
  const href = (path: string) =>
    home.id === "se" || home.id === "nl"
      ? ukHref(path, hostname)
      : marketHref(home, path, hostname);

  const link = (
    label: string,
    path: string,
    extra?: Omit<ResearchLink, "label" | "path" | "href">,
  ): ResearchLink => ({ label, path, href: href(path), ...extra });

  return [
    link("All companies", "/companies", { nav: true }),
    link("By sector", "/sectors", { nav: true }),
    link("By size", "/market-cap"),
    link("By role", "/roles"),
    link("Biggest buys", "/biggest-buys", { nav: true }),
    link("Best performing", "/best-performing-buys", { nav: true }),
    link("Cluster buying", "/cluster-buys", { nav: true }),
    link("Most active", "/most-active-companies", { nav: true }),
    link("Monthly reports", "/reports", { nav: true, divider: true }),
  ];
}

/** The subset of researchLinks() the masthead's Research dropdown lists.
 *
 *  /reports stays in despite resolving on ddbx.us against an API that holds UK
 *  months only: the page says "No reports published for this market yet"
 *  (src/pages/reports.tsx), which is a named empty state rather than a dead
 *  end, and dropping the row here would put the dropdown and the footer back
 *  into disagreement. */
export function researchNavLinks(
  pathname: string,
  hostname?: string,
): ResearchLink[] {
  const current = marketForPath(pathname, hostname);
  const home = MARKETS.find((m) => m.id === current.id) ?? uk();

  return researchLinks(home, hostname).filter((l) => l.nav);
}

/** Footer link groups for the current route and host.
 *
 *  Deliberately not exhaustive — a footer listing every URL on the site stops
 *  being navigation and starts being a link dump, which distributes crawl
 *  equity evenly instead of usefully. Each group carries the entry point plus
 *  the handful of pages worth reaching from anywhere. */
export function footerGroups(pathname: string, hostname?: string): NavGroup[] {
  const current = marketForPath(pathname, hostname);
  const home = MARKETS.find((m) => m.id === current.id) ?? uk();

  const markets: NavLink[] = MARKETS.filter((m) => !m.hidden).map((m) => ({
    label: m.id === "usg" ? "US Congress" : `${m.label} dealings`,
    href: marketHref(m, marketDashboardPath(m), hostname),
  }));

  // All nine — the footer takes the full list where the masthead dropdown
  // takes a curated seven. Longer than it was, and still navigation rather
  // than a dump: this is the site's primary content axis and every entry is a
  // hub or a standing ranking, not a leaf.
  const research: NavLink[] = researchLinks(home, hostname);

  const platforms: NavLink[] = [
    { label: "Compare UK platforms", href: ukHref("/brokers", hostname) },
    ...CATEGORIES.map((c) => ({
      label: c.h1,
      href: ukHref(categoryPath(c.slug), hostname),
    })),
    // Two head-to-heads, not all six: the rest are reachable from the
    // category and comparison pages themselves.
    ...COMPARISONS.slice(0, 2).map((c) => ({
      label: c.title,
      href: ukHref(comparisonPath(c.slug), hostname),
    })),
  ];

  const app: NavLink[] = [
    // First in the group, and deliberately above the store links: it is the
    // page that answers the question a reader has before they'd consider
    // installing anything, and it had no entry point outside a modal on the
    // homepage hero until it got a URL.
    //
    // UK-pinned for SE and NL, like the broker links below. Those markets run
    // no analysis layer, so ddbx.eu/how-it-works 301s to ddbx.uk — and a footer
    // that advertises a redirecting URL is the thing this module exists to
    // avoid. UK and US each own their own copy and link to it directly.
    {
      label: "How it works",
      href:
        home.id === "se" || home.id === "nl"
          ? ukHref("/how-it-works", hostname)
          : marketHref(home, "/how-it-works", hostname),
    },
    { label: "Get the app", href: marketHref(home, "/download", hostname) },
    {
      label: "iPhone",
      href: marketHref(home, "/download/ios", hostname),
    },
    {
      label: "Android",
      href: marketHref(home, "/download/android", hostname),
    },
  ];

  // Only entries this domain owns — linking to another host's copy would
  // advertise a URL that canonicalises elsewhere.
  const learn: NavLink[] = entriesForHost(hostname ?? "")
    .slice(0, 5)
    .map((e) => ({ label: e.term, href: learnPath(e.slug) }));

  return [
    { title: "Markets", links: markets },
    { title: "Research", links: research },
    { title: "UK platforms", links: platforms },
    { title: "App", links: app },
    ...(learn.length > 0 ? [{ title: "Learn", links: learn }] : []),
  ];
}
