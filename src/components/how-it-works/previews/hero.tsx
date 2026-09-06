/** Preview: section 0 of /how-it-works — the opening stage.
 *
 *  Renders exactly what the page will mount: the shell in `wide` with
 *  `titleInHero`, the HeroStage as the hero, then the two things that follow
 *  it on the light ground — the SpecimenCard and the contents strip. The
 *  strip's markup is copied from the page rather than extracted, because the
 *  page owns it and this preview must not change what ships.
 */
import { SpecimenCard } from "@/components/how-it-works/specimen-card";
import { HeroStage } from "@/components/how-it-works/hero-stage";
import { SeoPageShell } from "@/components/seo/page-shell";
import { count, monthLabel, useCoverage } from "@/lib/coverage";
import { marketCopyFor } from "@/lib/markets/market-copy";
import { CHECK_COUNT_WORD } from "@/lib/methodology";
import { examplesFor } from "@/lib/methodology-examples";

export const wide = true;

const RULE = "border-hairline dark:border-separator";

const CONTENTS = [
  { id: "pipeline", label: "The pipeline" },
  { id: "checks", label: "The checks" },
  { id: "ratings", label: "The ratings" },
  { id: "sources", label: "The sources" },
  { id: "measured", label: "What we can measure" },
  { id: "limits", label: "Where it stops" },
];

export default function HeroPreview() {
  const copy = marketCopyFor("uk");
  const examples = examplesFor("uk");
  const { data: coverage, source } = useCoverage();

  const openMarketFloor = coverage.markets.reduce(
    (sum, m) => (m.open_market_buys != null ? sum + m.open_market_buys : sum),
    0,
  );
  const funnelCaption = `${
    source === "snapshot" ? "Stored counts from" : "Counted"
  } ${monthLabel(coverage.generated_at)} · open-market figure is a floor`;

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
          caption={funnelCaption}
          disclosures={coverage.totals.disclosures}
          eyebrow="Methodology"
          finding="Almost everything filed is a grant, a vesting or an option exercise, with the purchases buried among them, so the work is almost entirely in the sorting."
          openMarketFloor={openMarketFloor}
          specimenCompany={examples?.specimen.company ?? null}
          standfirst={`Several hundred ${copy.insiderTermPlural} disclose share dealings every month, and almost none of them mean anything. This is how a filing becomes a rating, what the ${CHECK_COUNT_WORD} checks actually test, and where the method stops, shown on real filings you can check.`}
          thesis={
            <>
              {copy.insiderTermPlural.charAt(0).toUpperCase() +
                copy.insiderTermPlural.slice(1)}{" "}
              know their companies better than the market does. When one of them
              buys with their own money, that is worth a look.
            </>
          }
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
      {examples ? <SpecimenCard specimen={examples.specimen} /> : null}

      <nav
        aria-label="On this page"
        className={`mt-8 flex flex-wrap gap-1.5 border-t ${RULE} pt-5`}
      >
        {CONTENTS.map((c, i) => (
          <a
            key={c.id}
            className="rounded-full border border-hairline bg-sheet px-2.5 py-1 text-[11.5px] leading-4 text-foreground/70 transition-colors hover:border-brand-brown/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-separator dark:bg-surface dark:hover:border-white/20"
            href={`#${c.id}`}
          >
            <span className="mr-1.5 font-mono text-[10px] tabular-nums text-foreground/40">
              {String(i + 1).padStart(2, "0")}
            </span>
            {c.label}
          </a>
        ))}
      </nav>

      <p className="mt-10 text-[13px] text-foreground/40">
        (preview only — sections 01–06 follow here on the real page. Live
        counts: {count(coverage.totals.disclosures)} disclosed,{" "}
        {count(openMarketFloor)} open-market, {count(coverage.totals.analyses)}{" "}
        rated. Source: {source}.)
      </p>
    </SeoPageShell>
  );
}
