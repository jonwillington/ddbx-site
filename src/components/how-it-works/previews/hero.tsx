/** Preview: section 0 of /how-it-works — the opening stage.
 *
 *  Renders exactly what the page will mount: the shell in `wide` with
 *  `titleInHero`, the HeroStage as the hero (the worked example is its footer
 *  row since 2026-09-19).
 */
import { HeroStage } from "@/components/how-it-works/hero-stage";
import { SeoPageShell } from "@/components/seo/page-shell";
import { count, useCoverage } from "@/lib/coverage";
import { marketCopyFor } from "@/lib/markets/market-copy";
import { CHECK_COUNT_WORD } from "@/lib/methodology";
import { examplesFor } from "@/lib/methodology-examples";

export const wide = true;

export default function HeroPreview() {
  const copy = marketCopyFor("uk");
  const examples = examplesFor("uk");
  const { data: coverage, source } = useCoverage();

  const openMarketFloor = coverage.markets.reduce(
    (sum, m) => (m.open_market_buys != null ? sum + m.open_market_buys : sum),
    0,
  );

  return (
    <SeoPageShell
      titleInHero
      cta={{
        headline: "You’ve read the method. Watch it run.",
        body: `The checks above are applied to every ${copy.insiderTerm} purchase disclosed on ${copy.exchangeShortName}, the day it files.`,
        gaLabel: "How it works",
        marketId: "uk",
      }}
      eyebrow="Methodology"
      hero={
        <HeroStage
          analyses={coverage.totals.analyses}
          disclosures={coverage.totals.disclosures}
          eyebrow="Learn · Methodology"
          openMarketFloor={openMarketFloor}
          specimen={examples?.specimen ?? null}
          standfirst={`Several hundred ${copy.insiderTermPlural} disclose share dealings every month, and almost none of them mean anything. This is how a filing becomes a rating, what the ${CHECK_COUNT_WORD} checks actually test, and where the method stops, shown on real filings you can check.`}
          title={
            <>
              How we rate{" "}
              {copy.insiderTerm === "director"
                ? "a director’s"
                : "an insider’s"}{" "}
              share purchase
            </>
          }
        />
      }
      standfirst=""
      title="How we rate a director’s share purchase"
      width="wide"
    >
      <p className="mt-10 text-[13px] text-foreground/40">
        (preview only — sections 01–06 follow here on the real page. Live
        counts: {count(coverage.totals.disclosures)} disclosed,{" "}
        {count(openMarketFloor)} open-market, {count(coverage.totals.analyses)}{" "}
        rated. Source: {source}.)
      </p>
    </SeoPageShell>
  );
}
