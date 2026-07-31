/** /how-it-works — the methodology, as a page with a URL.
 *
 *  The explanation existed before this; it just wasn't reachable. The good
 *  version — MarketExplainerExperience, a six-scene walkthrough that runs a
 *  real filing through the checks — is a modal behind a button on the market
 *  hero. It has no URL, so it can't be linked to from an email, shared into a
 *  thread, cited by anyone writing about us, or indexed. /download never names
 *  the six checks at all, and the glossary explains ten regulatory concepts
 *  without once explaining ours. The single most-asked question about this
 *  product had no address.
 *
 *  This page is that address, and it is deliberately the boring shape: the
 *  standard SeoPageShell document, the same grammar as the sector hubs and the
 *  glossary. The walkthrough keeps its atmosphere and its worked example — this
 *  is the version you can read without JavaScript, print, or send to someone.
 *  Both read from src/lib/methodology.ts, so they cannot drift.
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
import type { Rating } from "@/types/ddbx";

import { useMemo } from "react";
import { Link } from "react-router-dom";

import { entryBySlug, learnPath, ownerForHost } from "../../shared/glossary.js";

import {
  CoverageTiles,
  FeedGrid,
  OutcomeCoverage,
} from "@/components/how-it-works/coverage-panel";
import {
  PipelineDiagram,
  StepNode,
} from "@/components/how-it-works/pipeline-diagram";
import { RatingBadge } from "@/components/rating-badge";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import DefaultLayout from "@/layouts/default";
import { approx, count, useCoverage } from "@/lib/coverage";
import { marketCopyFor } from "@/lib/markets/market-copy";
import { marketForPath } from "@/lib/markets/registry";
import {
  CHECKS,
  CHECK_COUNT_WORD,
  PIPELINE,
  RATING_SCALE,
} from "@/lib/methodology";

const EYEBROW = "Methodology";
const RULE = "border-hairline dark:border-separator";
const DIVIDE = "divide-black/[0.06] dark:divide-white/[0.08]";

/** The numbered run, in reading order. Kept as data because it drives two
 *  things that have to agree: the contents strip at the top and the `NN / 07`
 *  counter on each section rule. Hand-numbering those was how the page would
 *  eventually end up with two section fives. */
const CONTENTS = [
  { id: "coverage", label: "What we’ve read" },
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
        cta={{
          headline: "You've read the method. Watch it run.",
          body: `The checks above are applied to every ${copy.insiderTerm} purchase disclosed on ${copy.exchangeShortName}, the day it files. The app is where the results land — rated, with the reasoning attached, before the story reaches anyone else.`,
          gaLabel: "How it works",
          marketId: appMarketId,
          screenshotSlot: "analysis",
        }}
        eyebrow={EYEBROW}
        standfirst={`Several hundred ${copy.insiderTermPlural} disclose share dealings every month, and almost none of them mean anything. This is what we do with them — how a filing becomes a rating, what the ${CHECK_COUNT_WORD} checks behind that rating actually test, how much we have put through it, and where the method stops. Every figure below is counted from the database rather than written into the page.`}
        standfirstSize="lede"
        title={`How we rate ${
          copy.insiderTerm === "director" ? "a director’s" : "an insider’s"
        } share purchase`}
      >
        {/* The thesis, before the machinery. A reader who wants one paragraph
            gets it here and can stop. */}
        <p className="mt-6 rounded-2xl border border-hairline bg-sheet px-5 py-4 text-[15px] leading-[1.6] text-foreground/85 dark:border-white/[0.07] dark:bg-surface">
          {copy.insiderTermPlural.charAt(0).toUpperCase() +
            copy.insiderTermPlural.slice(1)}{" "}
          know their companies better than the market does. When one of them
          buys shares with their own money, at the price anyone else could have
          paid, that is worth a look. The difficulty is that the same disclosure
          regime that surfaces those purchases also surfaces the grants, the
          vestings and the option exercises they are buried in — so the work is
          almost entirely in the sorting.
        </p>

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
          aside="Counted from the database, not written into the page."
          id="coverage"
          index={stepOf("coverage")}
          title="What we’ve read so far"
          total={CONTENTS.length}
        >
          <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            A method is only worth what it has been applied to, so here is the
            size of the thing. Five disclosure feeds, each read in its own
            format: {count(coverage.totals.disclosures)} disclosure records,{" "}
            {count(coverage.totals.triage_decisions)} first-pass sorting
            decisions, of which {count(coverage.totals.triage_llm)} were made by
            a model and the rest by fixed rules, and{" "}
            {count(coverage.totals.analyses)} full written analyses. The price
            history behind every chart and every return on the site runs to{" "}
            {count(coverage.prices.observations)} daily closes across{" "}
            {count(coverage.prices.tickers)} tickers, back to{" "}
            {coverage.prices.first_date?.slice(0, 4) ?? "2016"}.
          </p>

          <CoverageTiles data={coverage} source={source} />
          <FeedGrid data={coverage} />

          <p className="mt-7 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            The feeds are not equivalent and the grid is laid out so you can see
            that rather than take our word for it. A US, Swedish or Dutch row is
            a single transaction line from a filing that may hold several; a
            congressional row is an amount band rather than a price, sorted by
            fixed rules rather than by a model. The open-market count on each
            card is a floor: it counts the rows a classifier has confirmed were
            bought on the market, so the remainder is “not confirmed” rather
            than “not a buy”.
          </p>
        </SeoSection>

        <SeoSection
          aside="Filing to rating, in six stages."
          id="pipeline"
          index={stepOf("pipeline")}
          title="What happens to a disclosure"
          total={CONTENTS.length}
        >
          <PipelineDiagram />

          {/* The diagram numbers its stages in badges; the prose underneath
              used to number them again in a different visual language, inline
              in the heading, which read as two unrelated lists about the same
              six things. Same badge, ruled rows, one sequence. */}
          <ol className={`mt-9 border-t ${RULE}`}>
            {PIPELINE.map((stage, i) => (
              <li key={stage.id} className={`border-b ${RULE} py-5`}>
                <div className="flex gap-4">
                  <StepNode index={i} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-[16px] font-semibold leading-[1.35] tracking-[-0.015em] text-foreground">
                        {stage.title}
                      </h3>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-brand-brown dark:text-brand-tan">
                        {stage.meta}
                      </p>
                    </div>
                    <p className="mt-2.5 max-w-[62ch] text-[15px] leading-[1.7] text-foreground/80">
                      {stage.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </SeoSection>

        <SeoSection
          aside="Applied in this order, to every purchase that reaches the read."
          id="checks"
          index={stepOf("checks")}
          title={`The ${CHECK_COUNT_WORD} checks`}
          total={CONTENTS.length}
        >
          <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            Each check is a yes or no. They are not weighted against each other
            and there is no score to average — a purchase clears them or it
            doesn’t, and the count of what it cleared is published on the filing
            itself, so you can see which ones it missed rather than taking the
            rating on trust.
          </p>

          <ol className={`mt-6 border-t ${RULE}`}>
            {CHECKS.map((check, i) => (
              <li key={check.key} className={`border-b ${RULE} py-6`}>
                <div className="flex gap-4">
                  <span className="mt-0.5">
                    <StepNode index={i} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold leading-[1.35] tracking-[-0.015em] text-foreground">
                      {check.question}
                    </h3>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/40">
                      {check.label}
                    </p>
                    <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.7] text-foreground/85">
                      {check.body}
                    </p>
                    <p className="mt-2.5 max-w-[62ch] text-[14px] leading-[1.7] text-foreground/60">
                      {check.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </SeoSection>

        <SeoSection
          aside="What the label on a filing is telling you."
          id="ratings"
          index={stepOf("ratings")}
          title="The four ratings"
          total={CONTENTS.length}
        >
          {/* The real badge, not a mono word set to look like one. These are
              the four objects a reader will meet on every filing in the app,
              and a page that describes them in a different visual language
              than the product uses has made the reader learn them twice. The
              taper in size and fill is itself part of the explanation. */}
          <dl className={`border-t ${RULE}`}>
            {RATING_SCALE.map((r) => (
              <div
                key={r.rating}
                className={`grid gap-x-6 gap-y-2 border-b ${RULE} py-4 sm:grid-cols-[9rem_minmax(0,1fr)]`}
              >
                <dt className="flex items-start">
                  <RatingBadge rating={r.rating as Rating} />
                </dt>
                <dd className="max-w-[58ch] text-[14.5px] leading-[1.65] text-foreground/80">
                  {r.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </SeoSection>

        <SeoSection
          aside={`Built for ${copy.regionName}.`}
          id="sources"
          index={stepOf("sources")}
          title="Where the filings come from"
          total={CONTENTS.length}
        >
          {/* The exchange is left to the table below rather than named here as
              well: for the UK `regulatorFullName` already contains the venue
              ("London Stock Exchange RNS filings"), so interpolating both put
              "London Stock Exchange" in the sentence twice. */}
          <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            Markets don’t disclose the same way, and a pipeline that pretends
            they do gets the vocabulary wrong before it gets anything else
            wrong. In {copy.regionName} that means reading{" "}
            {copy.regulatorFullName}, filed by the people local rules call{" "}
            {copy.insiderTermPlural} — in their own format, standardised here,
            and never a third party’s summary of them.
          </p>

          <dl
            className={`mt-5 overflow-hidden rounded-xl border ${RULE} divide-y ${DIVIDE}`}
          >
            <MetaRow label="Exchange" value={copy.exchangeFullName} />
            <MetaRow label="Disclosures" value={copy.regulatorFullName} />
            <MetaRow
              label="Who files"
              value={
                copy.insiderNote
                  ? `${copy.insiderTermPlural} — ${copy.insiderNote}`
                  : copy.insiderTermPlural
              }
            />
            <MetaRow
              label="Checked"
              value="Every 15 minutes, through the trading day"
            />
          </dl>
        </SeoSection>

        <SeoSection
          aside="The evidence behind the last stage, at its real size."
          id="measured"
          index={stepOf("measured")}
          title="What we can measure, and how much of it there is"
          total={CONTENTS.length}
        >
          <p className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            The last stage of the pipeline follows a rated buy and scores it
            against the index, which is the only way a rating ever gets checked
            rather than argued about. It runs on the two rated markets, the
            United Kingdom and the United States, and has measured{" "}
            {count(coverage.outcomes.events)} buys between them. The count thins
            out fast as the horizon lengthens:
          </p>

          <OutcomeCoverage data={coverage} />

          <p className="mt-5 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            Both legs of every one of those returns are market closes off the
            same price series, entry and exit, rather than the price the insider
            filed — a ratio of two closes is unit-free, which removes an entire
            class of error around splits, currency and depositary ratios. Each
            is stored beside its benchmark over the identical window, so what we
            keep is the difference against the market rather than the raw
            direction. Rows that look wrong are flagged and kept, never dropped,
            because quietly discarding the ugly ones biases a sample in exactly
            the direction that flatters us.
          </p>

          <p className="mt-4 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
            Read the shape of that table honestly and it says the thirty-day
            evidence is real and the one-year evidence barely exists yet. That
            is the whole reason performance figures elsewhere on the site are
            described as a small sample rather than as a track record.
          </p>

          {/* Rendered only when the research database answered. The `research`
              field is nullable precisely so this section can be absent rather
              than claim "0 insider transactions from 0 filings", which is the
              one thing worse than saying nothing. */}
          {coverage.research ? (
            <p className="mt-4 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
              The checks themselves are tuned against a much larger offline
              panel: {approx(coverage.research.transactions)} insider
              transactions from {approx(coverage.research.filings)} US Form 4
              filings since {coverage.research.first_filing?.slice(0, 4)}, held
              in a separate database and never served as content here. It is US
              filings because that is where a corpus of this size can be had in
              bulk; what it calibrates is the shape of the checks, which are the
              same six in every market. A change to a check has to survive that
              panel before it ships.
            </p>
          ) : null}
        </SeoSection>

        <SeoSection
          aside="The parts worth knowing before you lean on any of it."
          id="limits"
          index={stepOf("limits")}
          title="Where the method stops"
          total={CONTENTS.length}
        >
          {/* Cards rather than a bulleted list. Five caveats set as run-in bold
              paragraphs is the shape of small print a reader skims past, and
              these are the paragraphs on the page most worth not skimming. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {LIMITS.map((limit) => (
              <div
                key={limit.title}
                className="rounded-xl border border-hairline bg-sheet px-4 py-3.5 dark:border-white/[0.07] dark:bg-surface"
              >
                <h3 className="text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
                  {limit.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-foreground/65">
                  {limit.body}
                </p>
              </div>
            ))}
          </div>
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
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** The caveats, stated plainly rather than buried in small print.
 *
 *  A methodology page that only lists strengths is marketing wearing a lab
 *  coat, and every one of these is a question a careful reader arrives with.
 *  Answering them here is also the cheapest defence against the page being
 *  read as a performance claim, which is the one reading we can't afford. */
const LIMITS: { title: string; body: string }[] = [
  {
    title: "A rating is a reading, not a recommendation",
    body: "It describes how well a purchase clears six specific tests. It is not advice, not a price target, and carries no view on whether the shares are worth buying at today’s price.",
  },
  {
    title: "The checks are judgements, and judgements can be wrong",
    body: "Seniority, conviction and context are all assessed rather than measured, and a check can be marked wrongly in either direction. Every rating is published with the reasoning and the sources behind it precisely so you can disagree with it.",
  },
  {
    title: "We only see what gets disclosed",
    body: "The pipeline reads filings. An insider who buys through a structure that doesn’t require disclosure, or a market that files late, is invisible to it — and a disclosure can arrive days after the trade it describes.",
  },
  {
    title: "The record behind it is still short",
    body: "Ratings are scored against what the shares did next, but that scoring covers a fraction of what we hold and is concentrated at thirty days. The section above shows the exact shape of it. Treat any performance figure on the site as a description of a small sample.",
  },
  {
    title: "The checklist moves",
    body: "As the record builds, what each check looks for gets adjusted, which means a filing’s rating can change after publication. That is deliberate — a fixed checklist would be easier to describe and worse at its job.",
  },
];

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
