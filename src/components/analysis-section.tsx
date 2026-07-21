import type { Analysis } from "@/types/ddbx";

import { EvidenceTable } from "@/components/evidence-table";
import { RatingBadge } from "@/components/rating-badge";
import { RatingChecklistView } from "@/components/rating-checklist-view";

/** Shared analysis block rendered inside every market's DetailBody. UK and
 *  US used to keep their own copies of this; the only divergence was that
 *  US wrapped it in a bordered card. The lighter UK look wins — the drawer
 *  is already a card. */
export function AnalysisSection({ analysis }: { analysis: Analysis }) {
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

      {analysis.checklist && (
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

      {analysis.rating_rationale && (
        <p className="text-xs italic text-muted leading-relaxed border-t border-black/[0.06] dark:border-white/[0.08] pt-3">
          {analysis.rating_rationale}
        </p>
      )}
    </div>
  );
}
