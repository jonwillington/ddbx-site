import type { Analysis } from "@/types/ddbx";

import { EvidenceTable } from "@/components/evidence-table";
import { RatingBadge } from "@/components/rating-badge";
import { RatingChecklistView } from "@/components/rating-checklist-view";

/** Shared analysis block rendered inside every market's DetailBody. UK and
 *  US used to keep their own copies of this; the only divergence was that
 *  US wrapped it in a bordered card. The lighter UK look wins — the drawer
 *  is already a card.
 *
 *  Also the analysis block on the per-filing pages when discretion is off, so
 *  the two surfaces reading the same document read the same way. That page
 *  built its own version first and the result was two designs for one thing:
 *  flat rows against the drawer's collapsible tone-tinted plates, "The case
 *  for" against "Why this is interesting". A reader who has used the app and
 *  then lands on a filing page from search should recognise what they're
 *  looking at.
 *
 *  `showChecklist` and `showRationale` are the two things that page turns
 *  off, and not for style: it already devotes a numbered section to the six
 *  checks with the methodology copy and what was found for this filing, which
 *  is strictly more than the compact view here. Rendering both put the same
 *  six ticks on the page twice — and the rationale paragraph ("all six
 *  checklist items pass…") is a prose restatement of that same section,
 *  arriving two screens after it. */
export function AnalysisSection({
  analysis,
  showChecklist = true,
  showRationale = true,
}: {
  analysis: Analysis;
  showChecklist?: boolean;
  showRationale?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RatingBadge rating={analysis.rating} />
        <span className="text-xs text-muted">
          {(analysis.confidence * 100).toFixed(0)}% confidence ·{" "}
          {analysis.catalyst_window} catalyst
        </span>
      </div>

      {analysis.summary && (
        <p className="text-xl font-semibold leading-snug text-foreground/90">
          {analysis.summary}
        </p>
      )}

      {showChecklist && analysis.checklist && (
        <RatingChecklistView checklist={analysis.checklist} />
      )}

      {analysis.thesis_points.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Thesis</h3>
          <div className="space-y-3">
            {analysis.thesis_points.map((p, i) => (
              <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        <EvidenceTable
          points={analysis.evidence_for}
          title="Why this is interesting"
          tone="for"
        />
        <EvidenceTable
          points={analysis.evidence_against}
          title="Why it might not be"
          tone="against"
        />
      </div>

      {analysis.key_risks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Key risks</h4>
          <ul className="text-sm list-disc pl-5 text-foreground/90 space-y-1 marker:text-risk">
            {analysis.key_risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {showRationale && analysis.rating_rationale && (
        <p className="text-xs italic text-muted leading-relaxed border-t border-black/[0.06] dark:border-white/[0.08] pt-3">
          {analysis.rating_rationale}
        </p>
      )}
    </div>
  );
}
