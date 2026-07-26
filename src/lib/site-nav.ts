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
  marketPerformancePath,
} from "@/lib/markets/registry";

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

const uk = () => MARKETS.find((m) => m.id === "uk")!;

/** A path on ddbx.uk, wherever the reader currently is. */
function ukHref(path: string, hostname?: string): string {
  return marketHref(uk(), path, hostname);
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

  // Research links stay on the reader's own market — someone on ddbx.us wants
  // US companies, not UK ones.
  const research: NavLink[] = [
    {
      label: "All companies",
      href: marketHref(home, "/companies", hostname),
    },
    { label: "By sector", href: marketHref(home, "/sectors", hostname) },
    {
      label: "Biggest buys",
      href: marketHref(home, "/biggest-buys", hostname),
    },
    { label: "Monthly reports", href: marketHref(home, "/reports", hostname) },
    {
      label: "Insider performance",
      href: marketHref(home, marketPerformancePath(home), hostname),
    },
  ];

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
