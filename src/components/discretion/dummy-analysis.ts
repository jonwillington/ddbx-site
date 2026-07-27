import type { Analysis } from "@/types/ddbx";

// Stand-in Analysis object substituted into gated rows so downstream code
// sees "an analysis exists" and routes the drawer into its locked state.
//
// ⚠ It must NEVER contain realistic financial prose. An earlier version held
// an invented write-up ("margin recovery is tracking ahead of plan", fake
// sources) which rendered — blurred but present in the DOM — under a real
// issuer's name. The gated drawer now draws a textless silhouette
// (GatedAnalysisShape), so nothing here should render at all; if a future
// surface does render it, these strings make no claim about any company.
const IN_THE_APP = "Available in the DDBX app.";

export const DUMMY_ANALYSIS: Analysis = {
  rating: "noteworthy",
  confidence: 0.72,
  catalyst_window: "6m",
  summary: IN_THE_APP,
  thesis_points: [IN_THE_APP, IN_THE_APP, IN_THE_APP],
  evidence_for: [
    {
      headline: IN_THE_APP,
      detail: IN_THE_APP,
      source_label: "DDBX app",
      source_url: "https://ddbx.uk/download",
    },
  ],
  evidence_against: [
    {
      headline: IN_THE_APP,
      detail: IN_THE_APP,
      source_label: "DDBX app",
      source_url: "https://ddbx.uk/download",
    },
  ],
  key_risks: [IN_THE_APP, IN_THE_APP],
  checklist: {
    open_market_buy: true,
    senior_insider: true,
    meaningful_conviction: true,
    no_alternative_explanation: true,
    supporting_context_found: true,
    no_major_counter_signal: false,
  },
};
