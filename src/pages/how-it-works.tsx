/** /how-it-works — the methodology, as a page with a URL.
 *
 *  The explanation existed before this; it just wasn't reachable. The good
 *  version — MarketExplainerExperience, a six-scene walkthrough that runs a
 *  real filing through the checks — is a modal behind a button on the market
 *  hero, with no URL to link, share, cite or index. This page is that address.
 *  Both read from src/lib/methodology.ts, so they cannot drift.
 *
 *  ---------------------------------------------------------------------------
 *  The shape (2026-09-06 redesign)
 *  ---------------------------------------------------------------------------
 *
 *  Same material and grammar as the board pages (the dark stage, the light
 *  hairline panels, full-width rows, the numbered SeoSection run), but the
 *  proof objects are about METHOD rather than populations, so each section
 *  draws the element it actually needs. In order:
 *
 *    hero      HeroStage — the one dark stage on the page. The record drawn to
 *              scale as a bed of hairlines thinning left to right (disclosed →
 *              bought on market → sorted → read in full and rated), with one
 *              tan hairline running the whole way: the worked example. The h1,
 *              standfirst, thesis and live figures sit in the stage's message
 *              column; the finding in words sits in its caption strip.
 *    (intro)   SpecimenCard — the worked example introduced once, in full
 *              (who, role, value, price, date). Then the contents strip.
 *    01        PipelineLedger — six gates as full-width rows on a static
 *              spine: stage left, "what leaves" the pipe right of a vertical
 *              hairline. The finding falls out of the geometry: two stages
 *              discard filings, four do not.
 *    02        ChecksScorecard + ChecksRowList — the specimen's six results
 *              as six filled discs (which teaches the code: filled = cleared,
 *              hollow = not), then the six tenet-3 rows, each with its verdict
 *              pair visible (how the specimen cleared it; a real filing that
 *              didn't) and the long "why" folded.
 *    03        RatingLadder — four rungs best-first in one panel, the six-slot
 *              gauge on the top rung, the ceiling stated once in a tinted band
 *              beneath it, the specimen marked on the rung it landed on.
 *    04        SourcesRegister — five feeds as one register: flag, name, the
 *              feed's own filer vocabulary, and aligned columns (records,
 *              open-market buys, filers, issuers, records from). The host
 *              market's row first, tinted, with exchange and cadence inline.
 *    05        MeasuredSection — the horizon rail (five frames, one
 *              denominator: every buy with a measured outcome), the specimen
 *              placed at the horizon it has really reached, two live alphas as
 *              rows, the mechanics folded.
 *    06        LimitsLedger — five caveats at the selling-row scale, each on a
 *              named axis (scope, judgement, disclosure, sample, revision).
 *
 *  The page's vocabulary is exclusive and lives in two files: the marks in
 *  components/how-it-works/specimen-mark.tsx (specimen mark, verdict disc) and
 *  the tokens and small parts in components/how-it-works/shared.tsx (rule,
 *  panel, eyebrow, kicker, caption, Fold, StepNode, shortDate). Colour: green
 *  and red appear only on the two measured alphas in section 05; pass/fail is
 *  fill, not colour. Every number is live from useCoverage() with a dated
 *  snapshot fallback, and every slot with no number is omitted.
 *
 *  Each section's own file carries the argument for its element and what it
 *  replaced. `src/pages/lab-how-it-works.tsx` mounts any one of them alone at
 *  /__lab/how-it-works/<name> in dev.
 *
 *  ---------------------------------------------------------------------------
 *  Ownership
 *  ---------------------------------------------------------------------------
 *
 *  Published on ddbx.uk and ddbx.us, and the two are genuinely different pages:
 *  the regulator, the exchange, the noun for the filer and the worked vocabulary
 *  all change, so this is not the glossary's one-owner situation. ddbx.eu is a
 *  different matter — SE and NL carry no analysis layer, so a page describing
 *  six checks and four ratings would be describing something those markets
 *  don't do. It 301s to ddbx.uk at the edge (isForeignResearchPath in
 *  shared/seo.js), and the SPA branch below only ever renders on localhost.
 */
import type { GlossaryEntry } from "../../shared/glossary";

import { useMemo } from "react";
import { Link } from "react-router-dom";

import { entryBySlug, learnPath, ownerForHost } from "../../shared/glossary.js";

import {
  ChecksRowList,
  ChecksScorecard,
} from "@/components/how-it-works/checks-scorecard";
import { HeroStage } from "@/components/how-it-works/hero-stage";
import { LimitsLedger } from "@/components/how-it-works/limits-ledger";
import { MeasuredSection } from "@/components/how-it-works/measured-section";
import { PipelineLedger } from "@/components/how-it-works/pipeline-ledger";
import { RatingLadder } from "@/components/how-it-works/ratings-ladder";
import { DIVIDE, Fold, RULE } from "@/components/how-it-works/shared";
import { SourcesRegister } from "@/components/how-it-works/sources-register";
import { SpecimenCard } from "@/components/how-it-works/specimen-card";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import DefaultLayout from "@/layouts/default";
import { approx, monthLabel, useCoverage } from "@/lib/coverage";
import { marketCopyFor } from "@/lib/markets/market-copy";
import { marketForPath } from "@/lib/markets/registry";
import { CHECK_COUNT_WORD } from "@/lib/methodology";
import { examplesFor } from "@/lib/methodology-examples";

const EYEBROW = "Methodology";

/** The numbered run, in reading order. Kept as data because it drives two
 *  things that have to agree: the contents strip at the top and the `NN / 06`
 *  counter on each section rule. Hand-numbering those was how the page would
 *  eventually end up with two section fives.
 *
 *  The old standalone "What we’ve read" section dissolved when the funnel
 *  learned to carry the real counts: its headline figures live on the funnel
 *  bands now, its feed grid moved to "The sources" (which is what it was
 *  about), and its price-history sentence moved to "What we can measure"
 *  (which is what it limits). */
const CONTENTS = [
  { id: "pipeline", label: "The pipeline" },
  { id: "checks", label: "The checks" },
  { id: "ratings", label: "The ratings" },
  { id: "sources", label: "The sources" },
  { id: "measured", label: "What we can measure" },
  { id: "limits", label: "Where it stops" },
];

/** 1-based position of a section in the run. Returns undefined for an id that
 *  isn't in CONTENTS, so a typo renders no counter at all rather than the
 *  silently wrong "00 / 07" that a bare `indexOf + 1` produces. */
function stepOf(id: string): number | undefined {
  const i = CONTENTS.findIndex((c) => c.id === id);

  return i === -1 ? undefined : i + 1;
}

/** Glossary entries a reader of this page plausibly wants next, in the order
 *  they'd want them. Filtered to the host's own entries at render — linking to
 *  a slug this domain doesn't publish would advertise a URL that canonicalises
 *  on another host. */
const RELATED_SLUGS = [
  "open-market-buy",
  "what-a-director-buy-signals",
  "rule-10b5-1",
  "cluster-buying",
  "closed-period",
  "form-4",
];

export default function HowItWorksPage() {
  const hostname =
    typeof window === "undefined" ? undefined : window.location.hostname;
  const market = marketForPath("/how-it-works", hostname);
  const copy = marketCopyFor(market.id);
  // The band and the rail are a UK/US choice — those are the two app listings —
  // so anyone who reaches this on a third host is offered the UK app.
  const appMarketId = market.id === "us" ? "us" : "uk";

  // Snapshot first, live counts when they land. Never a loading state: the
  // fallback is a dated measurement, so there is nothing to wait for.
  const { data: coverage, source } = useCoverage();

  // The curated real filings (specimen, per-check counter-examples, rating
  // examples, tracked pair). Null outside UK/US — every example surface
  // below gates on it, so the page still composes for unrated markets.
  const examples = examplesFor(market.id);

  // Hero figures: real counts where an honest one exists, nothing where
  // there isn't one. All five feeds are summed (the drawing's first band says
  // so). The open-market figure is a floor (rows a classifier has CONFIRMED
  // were bought on the market), and triage survivors aren't counted anywhere,
  // so that band stays a bare label.
  const openMarketFloor = coverage.markets.reduce(
    (sum, m) => (m.open_market_buys != null ? sum + m.open_market_buys : sum),
    0,
  );
  const funnelCaption = `${
    source === "snapshot" ? "Stored counts from" : "Counted"
  } ${monthLabel(coverage.generated_at)} · open-market figure is a floor`;

  const standfirst = `Several hundred ${copy.insiderTermPlural} disclose share dealings every month, and almost none of them mean anything. This is how a filing becomes a rating, what the ${CHECK_COUNT_WORD} checks actually test, and where the method stops${examples ? ", shown on real filings you can check" : ""}.`;
  const title = (
    <>
      How we rate{" "}
      {copy.insiderTerm === "director" ? "a director’s" : "an insider’s"} share
      purchase
    </>
  );

  const related = useMemo(() => {
    const owner = ownerForHost(hostname ?? "");

    return RELATED_SLUGS.map((s) => entryBySlug(s))
      .filter((e): e is GlossaryEntry => Boolean(e))
      .filter((e) => owner === null || e.owner === owner)
      .slice(0, 3);
  }, [hostname]);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={market.id}
        placement="how_it_works_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        titleInHero
        cta={{
          headline: "You’ve read the method. Watch it run.",
          body: `The checks above are applied to every ${copy.insiderTerm} purchase disclosed on ${copy.exchangeShortName}, the day it files. The app is where the results land, rated, with the reasoning attached, before the story reaches anyone else.`,
          gaLabel: "How it works",
          marketId: appMarketId,
        }}
        eyebrow={EYEBROW}
        hero={
          <HeroStage
            analyses={coverage.totals.analyses}
            caption={funnelCaption}
            disclosures={coverage.totals.disclosures}
            eyebrow={EYEBROW}
            finding="Almost everything filed is a grant, a vesting or an option exercise, with the purchases buried among them, so the work is almost entirely in the sorting."
            openMarketFloor={openMarketFloor}
            specimenCompany={examples?.specimen.company ?? null}
            standfirst={standfirst}
            thesis={
              <>
                {copy.insiderTermPlural.charAt(0).toUpperCase() +
                  copy.insiderTermPlural.slice(1)}{" "}
                know their companies better than the market does. When one of
                them buys with their own money, that is worth a look.
              </>
            }
            title={title}
          />
        }
        standfirst={standfirst}
        title={title}
        width="wide"
      >
        {/* The document keeps the 860px measure under a hero that spans the
            column: `width="wide"` hands the measure to the page, so every
            section below sits inside this one wrapper. */}
        <div className="mx-auto w-full max-w-[860px]">
          {/* The specimen — one real filing the reader meets before the
            machinery, then follows through it. Introduced here so every
            "this filing" below already means something. */}
          {examples ? <SpecimenCard specimen={examples.specimen} /> : null}

          {/* The contents strip. Every one of these sections has carried an `id`
            and a scroll margin since the page shipped and nothing has ever
            linked to them, so a reader arriving for "what are the six checks"
            has had to scroll past the pipeline to find out.

            Deliberately NOT sticky. The sticky version wrapped to three or four
            rows of chips on a phone, which put its own bottom edge below the
            96px scroll margin the sections reserve: clicking a link scrolled
            the target underneath the bar it was clicked from, and the page
            appeared not to respond. A contents list at the top of a document is
            the ordinary shape and has none of that risk. */}
          <nav
            aria-label="On this page"
            className={`mt-8 flex flex-wrap gap-1.5 border-t ${RULE} pt-5`}
          >
            {CONTENTS.map((c, i) => (
              <a
                key={c.id}
                className={`rounded-full border border-hairline bg-sheet px-2.5 py-1 text-[11.5px] leading-4 text-foreground/70 transition-colors hover:border-brand-brown/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-separator dark:bg-surface dark:hover:border-white/20`}
                href={`#${c.id}`}
              >
                <span className="mr-1.5 font-mono text-[10px] tabular-nums text-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {c.label}
              </a>
            ))}
          </nav>

          <SeoSection
            aside="Filing to rating, in six stages, and where the pipe narrows."
            id="pipeline"
            index={stepOf("pipeline")}
            title="What happens to a disclosure"
            total={CONTENTS.length}
          >
            <PipelineLedger
              specimen={examples?.specimen ?? null}
              totals={coverage.totals}
            />
          </SeoSection>

          <SeoSection
            aside="Applied one at a time, in this order, to every purchase that reaches the read."
            id="checks"
            index={stepOf("checks")}
            title={`The ${CHECK_COUNT_WORD} checks`}
            total={CONTENTS.length}
          >
            <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
              Each check is a yes or no. There is no score to average: a
              purchase clears them or it doesn’t, and the count of what it
              cleared is published on the filing itself, so you can see which
              ones it missed rather than taking the rating on trust.
            </p>

            <ChecksScorecard examples={examples} />
            <ChecksRowList examples={examples} />
          </SeoSection>

          <SeoSection
            aside="What the label on a filing is telling you."
            id="ratings"
            index={stepOf("ratings")}
            title="The four ratings"
            total={CONTENTS.length}
          >
            <RatingLadder examples={examples} />
          </SeoSection>

          <SeoSection
            aside={`Built for ${copy.regionName}.`}
            id="sources"
            index={stepOf("sources")}
            title="Where the filings come from"
            total={CONTENTS.length}
          >
            <SourcesRegister
              copy={copy}
              data={coverage}
              marketId={market.id}
              source={source}
            />
          </SeoSection>

          <SeoSection
            aside="The evidence behind the last stage, at its real size."
            id="measured"
            index={stepOf("measured")}
            title="What we can measure, and how much of it there is"
            total={CONTENTS.length}
          >
            <MeasuredSection
              coverage={coverage}
              examples={examples}
              marketId={market.id}
            >
              <Fold
                className="mt-3 max-w-[64ch]"
                label="How the measuring is done"
              >
                <p className="text-[14px] leading-[1.7] text-foreground/65">
                  Both legs of every return are market closes off the same price
                  series, entry and exit, stored beside the benchmark over the
                  identical window, so what we keep is the difference against
                  the market rather than the raw direction. Rows that look wrong
                  are flagged and kept, never dropped, because quietly
                  discarding the ugly ones biases a sample in exactly the
                  direction that flatters us.
                </p>
                {/* Rendered only when the research database answered. The
                  `research` field is nullable precisely so this paragraph can
                  be absent rather than claim "0 insider transactions from 0
                  filings", which is the one thing worse than saying nothing. */}
                {coverage.research ? (
                  <p className="mt-4 text-[14px] leading-[1.7] text-foreground/65">
                    The checks themselves are tuned against a much larger
                    offline panel: {approx(coverage.research.transactions)}{" "}
                    insider transactions from{" "}
                    {approx(coverage.research.filings)} US Form 4 filings since{" "}
                    {coverage.research.first_filing?.slice(0, 4)}, held in a
                    separate database and never served as content here. It is US
                    filings because that is where a corpus of this size can be
                    had in bulk; what it calibrates is the shape of the checks,
                    which are the same six in every market. A change to a check
                    has to survive that panel before it ships.
                  </p>
                ) : null}
              </Fold>
            </MeasuredSection>
          </SeoSection>

          {/* Korea only. Every other market in the product reports a purchase
            that HAS happened; Korea's headline feed reports ones that have
            not. That distinction is the single thing a reader most needs and
            most easily misses, so it gets a section rather than a footnote.
            The /api/kr-plans payload links straight to this anchor. */}
          {market.id === "kr" ? (
            <SeoSection
              aside="Why the Korean feed reads differently from every other one here."
              id="korea-advance-plans"
              title="Trades declared before they happen"
            >
              <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
                Korea is the only market here where the disclosure arrives{" "}
                <em>before</em> the trade. Officers and major shareholders have
                to declare a planned purchase in advance, naming themselves, the
                size, and the window it has to happen in. When you read one of
                these, nothing has been bought yet.
              </p>

              <dl
                className={`mt-5 overflow-hidden rounded-xl border ${RULE} divide-y ${DIVIDE}`}
              >
                <MetaRow
                  label="When it applies"
                  value="A planned trade that, with the previous six months of dealing, reaches 1% of the company's shares or 50bn won"
                />
                <MetaRow
                  label="How far ahead"
                  value="At least 30 days before the window opens"
                />
                <MetaRow
                  label="The window"
                  value="30 days or less, and the trade must land at 70% to 130% of the declared amount"
                />
                <MetaRow
                  label="If they change their mind"
                  value="The plan can be withdrawn, and about one in ten is. Withdrawals are shown next to the plan they cancel"
                />
              </dl>

              <p className="mt-5 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
                Because the threshold is a share of the company rather than a
                cash amount, the people who file are mostly controlling
                shareholders and large holders, not rank-and-file managers. That
                makes it a different population from the director buys on the
                other market pages, and it is worth reading it as one.
              </p>

              <p className="mt-4 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
                We lead this page with the declarations rather than the
                completed purchases that follow them. The declaration is the
                moment something is learned; the filing that confirms it, weeks
                later, tells you only that a plan already on the record was
                carried out.
              </p>
            </SeoSection>
          ) : null}

          <SeoSection
            aside="The parts worth knowing before you lean on any of it."
            id="limits"
            index={stepOf("limits")}
            title="Where the method stops"
            total={CONTENTS.length}
          >
            <LimitsLedger />
          </SeoSection>

          {related.length > 0 ? (
            <SeoSection title="Read next">
              <RelatedCards
                items={related.map((e) => ({
                  to: learnPath(e.slug),
                  title: e.term,
                  description: e.description,
                }))}
              />
            </SeoSection>
          ) : null}

          <p className="mt-8 text-[13.5px] leading-[1.6] text-foreground/60">
            Prefer to see it applied?{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              to="/"
            >
              Open today’s filings
            </Link>{" "}
            and the walkthrough on the homepage runs a real recent purchase
            through all {CHECK_COUNT_WORD} checks, one at a time.
          </p>
        </div>
      </SeoPageShell>
    </DefaultLayout>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-4 py-3">
      <dt className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/45">
        {label}
      </dt>
      <dd className="text-right text-[14px] leading-[1.5] text-foreground/85">
        {value}
      </dd>
    </div>
  );
}
