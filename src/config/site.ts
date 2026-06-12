export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  /** Short brand — browser tab / sharing prefix */
  brand: "ddbx",
  name: "Director Dealings",
  /** Standardised brand strapline. Prefixed onto every shared-link OG/Twitter
   *  description so any ddbx link unfurls with the same claim, and mirrored on
   *  the rendered card images (ddbx-data: summary-image.ts `TAGLINE`). Keep in
   *  sync with that constant. */
  tagline: "The world's largest insider market intelligence platform",
  description:
    "Opinionated analysis of director (PDMR) share purchases across UK, US and Sweden, with evidence tables and tracked performance.",
  links: {
    source: "https://www.sharecast.com/uk_shares/director_dealings",
  },
};
