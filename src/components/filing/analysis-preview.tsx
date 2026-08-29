/** What the analysis found — gated, or in full.
 *
 *  Two renderers behind one component, chosen by `DISCRETION_ENABLED`. With the
 *  gate on, `AnalysisPreview` below: headlines as locks, counts for what stays
 *  in the app. With it off, `OpenCase`, which hands the whole analysis to the
 *  drawer's own `AnalysisSection` so the two surfaces agree.
 *
 *  Everything from here to `OpenCase` is the reasoning behind the GATED
 *  version, which is the one with a design problem to solve.
 *
 *  ---------------------------------------------------------------------------
 *  What this replaced, and why
 *  ---------------------------------------------------------------------------
 *
 *  Three sections used to describe the same document without ever showing it:
 *
 *    1. `AssessmentPanel` — four counts as large numerals ("4 pieces of
 *       evidence for", "3 pieces against"), each behind a lock;
 *    2. a collapsed "see the N sources" list under it, whose link text was
 *       every evidence HEADLINE — already published, just filed as a citation;
 *    3. on the share route, a written summary of the argument the other two
 *       were counting.
 *
 *  So the page stated the shape of the case twice and its substance once, in
 *  the place a reader was least likely to open. The counts were also the
 *  clearest instance of the repetition problem: rendering "4 evidence for" in
 *  40px type directly above a list of those four is telling someone what they
 *  can see.
 *
 *  Now there is one section. The headlines are the content — they were public
 *  already (shared/filings.js `evidenceHeadlines` has that argument) — each is
 *  a click target, and each carries its own source link. Only what is genuinely
 *  invisible is counted: the thesis points and the key risks, whose text stays
 *  in the app.
 *
 *  ---------------------------------------------------------------------------
 *  Why the headline is a button and not a disclosure
 *  ---------------------------------------------------------------------------
 *
 *  Because there is nothing under it to disclose. An accordion that opens onto
 *  a paywall is a worse experience than a lock that says so: the first promises
 *  content and withdraws it, the second is honest about the trade before the
 *  click. The lock icon on every row is the affordance, and the gate quotes the
 *  line back before it asks.
 */
import type { Analysis, Dealing, UsDealing } from "@/types/ddbx";
import type { AnalysisShape, EvidenceHeadline } from "../../../shared/filings";

import { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  LockClosedIcon,
} from "@heroicons/react/20/solid";

import { AnalysisUnlockModal } from "@/components/discretion/analysis-unlock-modal";
import { AnalysisSection } from "@/components/analysis-section";
import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { DISCRETION_ENABLED } from "@/lib/discretion";
import { appHrefForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

const CARD =
  "rounded-3xl border border-hairline bg-white/70 dark:border-border/60 dark:bg-surface-secondary/40";
const LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45";

/** Direction styling. The site already owns a colour for each side of an
 *  argument, and the whole point of the section is that the assessment argues
 *  both ways — rendering the two halves identically hid the only structural
 *  fact the list carries. */
const SIDE = {
  for: {
    heading: "The case for",
    rule: "bg-positive/40",
    ink: "text-positive",
  },
  against: {
    heading: "The case against",
    rule: "bg-negative/40",
    ink: "text-negative",
  },
} as const;

/* ─── Discretion off ─────────────────────────────────────────────────────── */

/** The same section with nothing withheld — and rendered by the same
 *  components the drawer uses.
 *
 *  When discretion mode is off the site is not selling the app, so this stops
 *  describing the analysis and prints it. The first version of this printed it
 *  in a layout invented here: flat rows, "The case for" / "The case against",
 *  a numbered thesis. That produced two designs for one document — the drawer
 *  had collapsible tone-tinted evidence plates under "Why this is interesting"
 *  / "Why it might not be", and someone who reads an analysis in the app and
 *  then lands on a filing page from search met an unfamiliar object saying the
 *  same thing. `AnalysisSection` is now shared by both.
 *
 *  The checklist is the one part suppressed, because the page already gives the
 *  six checks a numbered section of their own with the methodology copy and
 *  what was found for this filing. See `AnalysisSection`.
 *
 *  One asymmetry to know about: the pre-rendered HTML
 *  (`shared/filing-prerender.js`) always carries the gated shape, because it
 *  runs in a Pages Function that cannot see a Vite client flag. That is not the
 *  cloaking split `shared/filings.js` warns about — every visitor and every
 *  JS-executing crawler gets this version, nobody is served a different page by
 *  identity — but it does mean the open case only appears after hydration. */
function OpenCase({
  analysis,
  dealId,
  marketId,
}: {
  analysis: Analysis;
  dealId: string;
  marketId: string;
}) {
  const platform = useDevicePlatform();
  const appHref = appHrefForMarket(marketId, platform);

  return (
    <div className={`mt-4 overflow-hidden ${CARD}`}>
      <div className="p-5 sm:p-6">
        <AnalysisSection
          analysis={analysis}
          showChecklist={false}
          showRationale={false}
        />

        {/* The ask, at read-out.
            The page still terminates with `AppCtaBand`, and two filled asks in
            one document is how a page starts reading as a funnel — so this one
            is deliberately the quieter object: a hairline rule and a single
            button, not a second dark slab. It earns its place by position
            rather than weight. Someone who has just read a full written case
            is the most qualified reader this page produces, and the band is
            several sections below them.

            What it claims matters more than usual here, because the gated
            version's argument ("the rest is in the app") is now false — they
            have just had all of it. The honest remainder is timing and
            follow-up: the app reaches you the day a filing lands, which no
            page a reader has to remember to visit can do. */}
        <div className="mt-8 border-t border-hairline pt-5 dark:border-border/60">
          <p className="text-[14.5px] font-semibold leading-[1.35] text-foreground">
            Get the next one the day it files.
          </p>
          <p className="mt-1 text-[13.5px] leading-[1.55] text-foreground/60">
            This filing is already public record. The app pushes each new rated
            buy as it’s disclosed, with the written case attached.
          </p>
          <a
            className={`mt-4 inline-flex items-center gap-2 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3 text-sm font-semibold transition-colors`}
            data-ga-event="cta_open_case_download"
            data-ga-label={`Open case download · ${dealId}`}
            href={appHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            <StoreGlyph className="h-4 w-4 shrink-0" />
            Download the app
          </a>
          <p className="mt-2 text-[11.5px] text-foreground/45">
            Free for 7 days, cancel any time.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AnalysisPreview({
  deal,
  shape,
  evidence,
  /** The written summary. Passed on the share route only — /dealings withholds
   *  it, see shared/filings.js. */
  summary,
  marketId = "uk",
}: {
  deal: Dealing | UsDealing;
  shape: AnalysisShape;
  evidence: EvidenceHeadline[];
  summary?: string | null;
  marketId?: string;
}) {
  const [gated, setGated] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Discretion off means off everywhere, including here. The gate below is the
  // product posture, not a property of the page — see src/lib/discretion.ts.
  //
  // `summary` is ignored on this path: `AnalysisSection` reads it off the
  // analysis itself, and the share-route-only rule it encodes exists to keep
  // the summary out of a GATED page. With the gate open there is nothing for
  // it to protect.
  if (!DISCRETION_ENABLED && deal.analysis) {
    return (
      <OpenCase analysis={deal.analysis} dealId={deal.id} marketId={marketId} />
    );
  }

  const openGate = (headline: string | null) => {
    setGated(headline);
    setOpen(true);
  };

  const rating = deal.analysis?.rating ?? "significant";
  const sides = (["for", "against"] as const)
    .map((d) => ({ d, rows: evidence.filter((e) => e.direction === d) }))
    .filter((s) => s.rows.length > 0);

  return (
    <div className={`mt-4 overflow-hidden ${CARD}`}>
      <div className="p-5 sm:p-6">
        <p className={`flex items-center gap-2 ${LABEL}`}>
          <LockClosedIcon aria-hidden className="h-3.5 w-3.5" />
          In the app
        </p>
        <p className="mt-3 max-w-[26ch] text-balance text-[22px] font-semibold leading-[1.2] tracking-[-0.022em] text-foreground sm:text-[26px]">
          The written case for and against this buy, rated {rating}.
        </p>

        {/* The summary, share route only. It sits here rather than in its own
            panel near the top of the page because it is a description of THIS
            document — put anywhere else it became a fourth statement of the
            same argument, which is what the section was rebuilt to stop.
            Labelled as an excerpt: these summaries are written for a reader
            who has the full analysis in front of them and refer to it, so a
            dangling "the assessment below" reads as truncation here and would
            have read as a broken reference as the page's standfirst. */}
        {summary ? (
          <figure className="mt-5">
            <figcaption className={LABEL}>From the written analysis</figcaption>
            <blockquote className="mt-2 border-l-2 border-brand-brown/30 pl-4 text-[15.5px] leading-[1.55] text-foreground/85 dark:border-brand-tan/30">
              {summary}
            </blockquote>
          </figure>
        ) : null}

        {sides.map(({ d, rows }) => (
          <div key={d} className="mt-6">
            <p className={`flex items-center gap-2.5 ${LABEL} ${SIDE[d].ink}`}>
              <span
                aria-hidden
                className={`h-px w-6 shrink-0 ${SIDE[d].rule}`}
              />
              {SIDE[d].heading}
            </p>

            <ul className="mt-2.5 space-y-1.5">
              {rows.map((e) => (
                <li key={`${e.direction}-${e.headline}`}>
                  <button
                    className={`group flex w-full items-start gap-3 ${BUTTON_RADIUS} bg-foreground/[0.035] px-4 py-3 text-left transition-colors hover:bg-foreground/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]`}
                    data-ga-event="cta_analysis_row"
                    data-ga-label={`Analysis row · ${deal.id}`}
                    type="button"
                    onClick={() => openGate(e.headline)}
                  >
                    <span className="min-w-0 flex-1 text-[14.5px] leading-[1.45] text-foreground/85">
                      {e.headline}
                    </span>
                    <LockClosedIcon
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-foreground/25 transition-colors group-hover:text-foreground/50"
                    />
                    <span className="sr-only">Read this in the app</span>
                  </button>

                  {/* The citation, outside the button rather than inside it.
                      A third-party URL is publishable in full and is the
                      evidence that the case was researched rather than
                      inferred from the filing — but it is a different
                      destination from the gate, and nesting one interactive
                      element in another gives a keyboard user one target for
                      two actions. */}
                  {e.label ? (
                    <p className="mt-1 pl-4 text-[12px] leading-[1.5] text-foreground/45">
                      {e.url ? (
                        <a
                          className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground/70 hover:underline"
                          href={e.url}
                          rel="nofollow noopener noreferrer"
                          target="_blank"
                        >
                          {e.label}
                          <ArrowTopRightOnSquareIcon
                            aria-hidden
                            className="h-3 w-3 shrink-0"
                          />
                        </a>
                      ) : (
                        e.label
                      )}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Counted, not listed — because unlike the headlines above there is
            nothing of these on the page to see. No large numerals: the
            evidence rows are the offer now, and a 40px figure beside them
            competes with the thing it is supporting. */}
        <p className="mt-6 text-[13.5px] leading-[1.6] text-foreground/60">
          The app adds the {shape.thesis}-point thesis behind this rating
          {shape.risks > 0
            ? `, the ${shape.risks} key ${shape.risks === 1 ? "risk" : "risks"} weighed against it`
            : ""}
          , and the detail under every line above.
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-foreground/45">
          {shape.confidence != null
            ? `Written with ${shape.confidence}% stated confidence`
            : "Written with a stated confidence"}
          {shape.window ? `, over a ${shape.window} catalyst window` : ""}.
        </p>

        <button
          className={`mt-5 ${BUTTON_RADIUS} bg-foreground/[0.06] px-4 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.1]`}
          data-ga-event="cta_filing_assessment"
          data-ga-label="Filing assessment panel"
          type="button"
          onClick={() => openGate(null)}
        >
          Read the full case in the app
        </button>
      </div>

      <AnalysisUnlockModal
        gaLabel={`Analysis unlock · ${deal.id}`}
        headline={gated}
        marketId={marketId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
