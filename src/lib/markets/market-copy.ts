// Per-market regulatory vocabulary — the jurisdiction-specific terms that
// change between markets: the listing venue, the disclosure source, and the
// noun for the person who files. Ported from the iOS app's MarketCopy
// (~/ddbx-ios-app/Sources/DdbxApp/Core/Market/MarketCopy.swift) so the
// website's "What are we looking for?" explainer reads in each market's own
// language. Localisation copy only — no pipeline or behaviour lives here, so
// it can describe markets that don't (yet) run an analysis layer without
// overclaiming.

export interface MarketCopy {
  /** Region phrase for prose — "the UK", "Sweden", "the Netherlands". */
  regionName: string;
  /** Short name of the primary listing venue. "LSE", "NYSE / Nasdaq", … */
  exchangeShortName: string;
  /** Long form. "London Stock Exchange", "Euronext Amsterdam", … */
  exchangeFullName: string;
  /** Long, human name for the disclosure source shown in the meta grid. */
  regulatorFullName: string;
  /** Singular noun for the filer. "director", "insider", "PDMR". */
  insiderTerm: string;
  /** Plural form. "directors", "insiders", "PDMRs". */
  insiderTermPlural: string;
  /** Optional gloss shown beside the term in the meta grid — e.g. the PDMR
   *  expansion, or who the SEC counts as an insider. */
  insiderNote?: string;
}

const MARKET_COPY: Record<string, MarketCopy> = {
  uk: {
    regionName: "the UK",
    exchangeShortName: "LSE",
    exchangeFullName: "London Stock Exchange",
    regulatorFullName: "London Stock Exchange RNS filings",
    insiderTerm: "director",
    insiderTermPlural: "directors",
  },
  us: {
    regionName: "the US",
    exchangeShortName: "NYSE / Nasdaq",
    exchangeFullName: "NYSE & Nasdaq",
    regulatorFullName: "SEC EDGAR Form 4 filings",
    insiderTerm: "insider",
    insiderTermPlural: "insiders",
    insiderNote: "officers, directors & 10% owners",
  },
  se: {
    regionName: "Sweden",
    exchangeShortName: "Stockholm",
    exchangeFullName: "Nasdaq Stockholm",
    regulatorFullName: "Finansinspektionen Insynsregister",
    insiderTerm: "PDMR",
    insiderTermPlural: "PDMRs",
    insiderNote: "Persons Discharging Managerial Responsibilities",
  },
  nl: {
    regionName: "the Netherlands",
    exchangeShortName: "Amsterdam",
    exchangeFullName: "Euronext Amsterdam",
    regulatorFullName: "AFM Register meldingen (MAR 19)",
    insiderTerm: "PDMR",
    insiderTermPlural: "PDMRs",
    insiderNote: "Persons Discharging Managerial Responsibilities",
  },
};

/** Resolve a market id to its localisation copy; UK is the safe fallback. */
export function marketCopyFor(id: string): MarketCopy {
  return MARKET_COPY[id] ?? MARKET_COPY.uk;
}
