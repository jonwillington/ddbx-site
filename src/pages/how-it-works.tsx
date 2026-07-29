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

import { useMemo } from "react";
import { Link } from "react-router-dom";

import { entryBySlug, learnPath, ownerForHost } from "../../shared/glossary.js";

import { PipelineDiagram } from "@/components/how-it-works/pipeline-diagram";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import DefaultLayout from "@/layouts/default";
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
const FOOTNOTE =
  "Information only, not investment advice. A rating describes how a purchase reads against our checks — it is not a forecast, and past disclosures are not a guide to what any share will do next.";

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
        footnote={FOOTNOTE}
        standfirst={`Several hundred ${copy.insiderTermPlural} disclose share dealings every month, and almost none of them mean anything. This is what we do with them — how a filing becomes a rating, what the ${CHECK_COUNT_WORD} checks behind that rating actually test, and where the method stops.`}
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

        <SeoSection
          aside="Filing to rating, in six stages."
          id="pipeline"
          title="What happens to a disclosure"
        >
          <PipelineDiagram />

          <ol className="mt-9 space-y-7">
            {PIPELINE.map((stage, i) => (
              <li key={stage.id}>
                <h3 className="text-[15px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
                  <span className="mr-2 font-mono text-[12px] font-semibold text-brand-brown dark:text-brand-tan">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {stage.title}
                </h3>
                <p className="mt-2 max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80">
                  {stage.body}
                </p>
              </li>
            ))}
          </ol>
        </SeoSection>

        <SeoSection
          aside="Applied in this order, to every purchase that reaches the read."
          id="checks"
          title={`The ${CHECK_COUNT_WORD} checks`}
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
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-brown/25 bg-sheet font-mono text-[10.5px] font-semibold text-brand-brown dark:border-brand-tan/30 dark:bg-surface dark:text-brand-tan">
                    {i + 1}
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
          title="The four ratings"
        >
          <dl className={`border-t ${RULE}`}>
            {RATING_SCALE.map((r) => (
              <div
                key={r.rating}
                className={`grid gap-x-6 gap-y-1.5 border-b ${RULE} py-4 sm:grid-cols-[9rem_minmax(0,1fr)]`}
              >
                <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-brown dark:text-brand-tan">
                  {r.rating}
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
          title="Where the filings come from"
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
          aside="The parts worth knowing before you lean on any of it."
          id="limits"
          title="Where the method stops"
        >
          <ul className="space-y-4">
            {LIMITS.map((limit) => (
              <li
                key={limit.title}
                className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80"
              >
                <span className="font-semibold text-foreground">
                  {limit.title}.
                </span>{" "}
                {limit.body}
              </li>
            ))}
          </ul>
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

/** The caveats, stated plainly rather than buried in the footnote.
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
    body: "Ratings are scored against what the shares did next, but the stored history only goes back so far, so the feedback loop is thinner than it will be. Treat any performance figure on the site as a description of a small sample.",
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
