/** What each mobile section row shows of itself before it is opened.
 *
 *  The rows used to carry a one-line description of their content ("4
 *  findings for, 3 against, with sources"), which read as a table of
 *  contents: accurate, and no reason to tap (Jon, 2026-09-28: "i now dont see
 *  the value"). A row now carries a SAMPLE of what is behind it instead — the
 *  lead finding verbatim, the six checks as marks — so the reader can see the
 *  analysis is real before they open it.
 *
 *  Nothing here publishes anything new. Evidence headlines are already public
 *  on every filing page (see `evidenceHeadlines` in shared/filings.js); the
 *  checklist is the rating's own published scorecard. The detail under each
 *  headline stays in the sheet, and behind the gate where it applies.
 */
import type { RatingChecklist } from "@/types/ddbx";
import type { AnalysisShape, EvidenceHeadline } from "../../../shared/filings";

import { CheckIcon, XMarkIcon } from "@heroicons/react/20/solid";

import { CHECKS } from "../../../shared/methodology.js";

import { NewsSourceLogo } from "@/components/news-source-logo";

/** The most distinct source hosts, in the order the case cites them. */
function sourceHosts(evidence: EvidenceHeadline[]): string[] {
  const seen = new Set<string>();

  for (const e of evidence) {
    if (!e.url) continue;
    try {
      seen.add(new URL(e.url).hostname.replace(/^www\./, ""));
    } catch {
      // A malformed URL is simply not a mark.
    }
  }

  return [...seen];
}

/** One dot per finding: filled for, hollow against. Ink, not
 *  positive/negative — those are reserved for price direction, and an
 *  argument against a buy is not a loss. */
function Tally({
  count,
  tone,
  label,
}: {
  count: number;
  tone: "for" | "against";
  label: string;
}) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-flex gap-0.5">
        {Array.from({ length: Math.min(count, 8) }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${tone === "for" ? "bg-foreground/70" : "border border-foreground/50"}`}
          />
        ))}
      </span>
      <span className="text-body tabular-nums text-foreground/75">
        {count} {label}
      </span>
    </span>
  );
}

/** The analysis row's sample: the lead finding for, quoted, over the shape of
 *  the case and the sources it cites. */
export function AnalysisRowPreview({
  evidence,
  shape,
}: {
  evidence: EvidenceHeadline[];
  shape: AnalysisShape;
}) {
  // The strongest-reading finding for: the first one carrying a figure (a
  // NAV discount, a fall, a size) over the first one listed, which is often
  // the seniority point the checks row already states.
  const fors = evidence.filter((e) => e.direction === "for");
  const lead =
    fors.find((e) => /\d/.test(e.headline)) ?? fors[0] ?? evidence[0] ?? null;
  const hosts = sourceHosts(evidence);
  const shown = hosts.slice(0, 4);

  return (
    <>
      {lead ? (
        <p className="mt-3 text-subheading font-semibold text-foreground">
          “{lead.headline}”
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Tally count={shape.for} label="for" tone="for" />
        <Tally count={shape.against} label="against" tone="against" />
        {shown.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-flex gap-1">
              {shown.map((h) => (
                <NewsSourceLogo key={h} domain={h} size="body" />
              ))}
            </span>
            <span className="text-body tabular-nums text-foreground/75">
              {hosts.length} {hosts.length === 1 ? "source" : "sources"}
            </span>
          </span>
        ) : null}
      </div>
    </>
  );
}

/** The checks row's sample: all six, marked met or not, by their short
 *  labels. Two columns so the six land as three full rows. */
export function ChecksRowPreview({
  checklist,
}: {
  checklist: RatingChecklist;
}) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
      {CHECKS.map((c) => {
        const met = Boolean(checklist[c.key as keyof RatingChecklist]);
        const Icon = met ? CheckIcon : XMarkIcon;

        return (
          <li
            key={c.key}
            className={`flex min-w-0 items-start gap-1.5 text-body ${met ? "text-foreground/85" : "text-foreground/40"}`}
          >
            <Icon
              aria-hidden
              className={`mt-0.5 h-4 w-4 shrink-0 ${met ? "text-foreground" : "text-foreground/30"}`}
            />
            <span>{c.label}</span>
            <span className="sr-only">{met ? "met" : "not met"}</span>
          </li>
        );
      })}
    </ul>
  );
}
