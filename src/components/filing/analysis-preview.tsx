/** What the analysis found — gated, or in full.
 *
 *  Two renderers behind one component, chosen by `DISCRETION_ENABLED`. With the
 *  gate on, `AnalysisPreview` below: headlines as locks, counts for what stays
 *  in the app. With it off, `OpenCase`, the whole analysis as prose and
 *  hairline rows on the page's own type scale.
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
import type { Analysis, Dealing, EvidencePoint, UsDealing } from "@/types/ddbx";
import type { AnalysisShape, EvidenceHeadline } from "../../../shared/filings";

import { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  LockClosedIcon,
} from "@heroicons/react/20/solid";

import { AnalysisUnlockModal } from "@/components/discretion/analysis-unlock-modal";
import { StoreGlyph } from "@/components/store-glyph";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { DISCRETION_ENABLED } from "@/lib/discretion";
import { appHrefForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";

const RULE = "border-hairline dark:border-separator";
const LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45";

/** Direction styling. The site already owns a colour for each side of an
 *  argument, and the whole point of the section is that the assessment argues
 *  both ways — rendering the two halves identically hid the only structural
 *  fact the list carries. */
const SIDE = {
  for: {
    heading: "Why this is interesting",
    rule: "bg-positive/40",
    ink: "text-positive",
  },
  against: {
    heading: "Why it might not be",
    rule: "bg-negative/40",
    ink: "text-negative",
  },
} as const;

/* ─── Discretion off ─────────────────────────────────────────────────────── */

/** The side's heading: the house eyebrow in the side's own ink, after a short
 *  rule in the same colour. The only colour in the section, and it means one
 *  thing: which way the finding points. */
function SideHeading({ d, count }: { d: "for" | "against"; count: number }) {
  return (
    <p className={`flex items-center gap-2.5 ${LABEL} ${SIDE[d].ink}`}>
      <span aria-hidden className={`h-px w-6 shrink-0 ${SIDE[d].rule}`} />
      {SIDE[d].heading}
      <span className="text-foreground/35">· {count}</span>
    </p>
  );
}

/** A cited source, set as the small print it is. */
function Source({
  label,
  url,
}: {
  label?: string | null;
  url?: string | null;
}) {
  if (!label) return null;

  return (
    <p className="mt-2 text-[12px] leading-[1.5] text-foreground/45">
      {url ? (
        <a
          className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground/70 hover:underline"
          href={url}
          rel="nofollow noopener noreferrer"
          target="_blank"
        >
          {label}
          <ArrowTopRightOnSquareIcon aria-hidden className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        label
      )}
    </p>
  );
}

/** One finding as a hairline row: the claim left, what stands behind it and
 *  its source right. The shape of `RowList`, one step down in scale, because
 *  an evidence headline is a sentence rather than a four-word claim and at
 *  24px a list of them reads as a stack of banners. */
function EvidenceRows({ points }: { points: EvidencePoint[] }) {
  return (
    <ul className={`mt-4 border-t ${RULE}`}>
      {points.map((p, i) => (
        <li
          key={`${i}-${p.headline}`}
          className={`grid gap-x-10 gap-y-2 border-b ${RULE} py-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:py-6`}
        >
          <h4 className="text-balance text-[16.5px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground sm:text-[18px]">
            {p.headline}
          </h4>
          <div className="min-w-0">
            {p.detail ? (
              <p className="max-w-[58ch] text-[14.5px] leading-[1.65] text-foreground/70">
                {p.detail}
              </p>
            ) : null}
            <Source label={p.source_label} url={p.source_url} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The whole assessment, nothing withheld, on the page's own type scale.
 *
 *  Until 2026-09-19 this handed the analysis to the drawer's `AnalysisSection`
 *  inside a white card, on the argument that the two surfaces should read the
 *  same. They still say the same things in the same order; what changed is the
 *  treatment, because the drawer's tone-tinted accordion plates and bulleted
 *  risks were the last card-and-pill furniture on a page that is otherwise
 *  flat ground, prose and hairline rows. The drawer keeps its own version.
 *
 *  The thesis is set as prose at the story body's measure and size, because it
 *  is prose. The findings for and against, and the risks, are rows.
 *
 *  Two omissions, both deliberate. The summary is not printed here because
 *  with discretion off it is already the stage's standfirst, and the checklist
 *  and rationale are not because the page gives the six checks a numbered
 *  section of their own.
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
  const confidence = Number.isFinite(analysis.confidence)
    ? Math.round(analysis.confidence * 100)
    : null;

  return (
    <div>
      <p className={LABEL}>
        {confidence != null ? `${confidence}% stated confidence` : "Assessment"}
        {analysis.catalyst_window
          ? ` · ${analysis.catalyst_window} catalyst window`
          : ""}
      </p>

      {analysis.thesis_points.length > 0 ? (
        <div className="mt-5 max-w-[62ch] space-y-4">
          {analysis.thesis_points.map((p, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-[17px] leading-[1.6] text-foreground/90"
                  : "text-[15px] leading-[1.7] text-foreground/80"
              }
            >
              {p}
            </p>
          ))}
        </div>
      ) : null}

      {(["for", "against"] as const).map((d) => {
        const points =
          d === "for" ? analysis.evidence_for : analysis.evidence_against;

        if (points.length === 0) return null;

        return (
          <div key={d} className="mt-10">
            <SideHeading count={points.length} d={d} />
            <EvidenceRows points={points} />
          </div>
        );
      })}

      {analysis.key_risks.length > 0 ? (
        <div className="mt-10">
          <p className={LABEL}>Key risks · {analysis.key_risks.length}</p>
          <ol className={`mt-4 border-t ${RULE}`}>
            {analysis.key_risks.map((r, i) => (
              <li
                key={i}
                className={`flex gap-5 border-b ${RULE} py-4 sm:py-5`}
              >
                <span className="mt-[3px] shrink-0 font-mono text-[11px] font-semibold tabular-nums tracking-[0.16em] text-foreground/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="max-w-[62ch] text-[15px] leading-[1.65] text-foreground/80">
                  {r}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* The ask, at read-out.
          The page still terminates with `AppCtaBand`, and two filled asks in
          one document is how a page starts reading as a funnel — so this one
          is deliberately the quieter object: a hairline rule and a single
          button, not a second dark slab. It earns its place by position
          rather than weight. Someone who has just read a full written case
          is the most qualified reader this page produces.

          What it claims matters more than usual here, because the gated
          version's argument ("the rest is in the app") is now false — they
          have just had all of it. The honest remainder is timing and
          follow-up: the app reaches you the day a filing lands. */}
      <div className="mt-10">
        <p className="text-[16px] font-semibold leading-[1.35] text-foreground">
          Get the next one the day it files.
        </p>
        <p className="mt-1 max-w-[58ch] text-[14px] leading-[1.6] text-foreground/60">
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
    <div>
      <div>
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
          <div key={d} className="mt-8">
            <SideHeading count={rows.length} d={d} />

            {/* Hairline rows, not tinted pills: the headline is the row,
                the lock sits at its right end, the citation under it. The
                whole row is the gate's button. */}
            <ul className={`mt-4 border-t ${RULE}`}>
              {rows.map((e) => (
                <li
                  key={`${e.direction}-${e.headline}`}
                  className={`border-b ${RULE} py-4 sm:py-5`}
                >
                  <button
                    className="group flex w-full items-start gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown/40"
                    data-ga-event="cta_analysis_row"
                    data-ga-label={`Analysis row · ${deal.id}`}
                    type="button"
                    onClick={() => openGate(e.headline)}
                  >
                    <span className="min-w-0 flex-1 text-balance text-[16.5px] font-semibold leading-[1.3] tracking-[-0.015em] text-foreground transition-colors group-hover:text-foreground/70 sm:text-[18px]">
                      {e.headline}
                    </span>
                    <LockClosedIcon
                      aria-hidden
                      className="mt-1 h-4 w-4 shrink-0 text-foreground/25 transition-colors group-hover:text-foreground/50"
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
                  <Source label={e.label} url={e.url} />
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
