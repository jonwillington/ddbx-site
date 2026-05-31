import type { MonthlySummary } from "@/types/ddbx";

import { Prose } from "./monthly-prose";

/** The month overview — headline + intro. The macro backdrop is rendered as a
 *  separate section (its own mobile accordion) by the recap modal. */
export function MonthlyNarrative({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold leading-snug text-balance">
        {summary.headline}
      </h3>
      {summary.intro && <Prose text={summary.intro} />}
    </div>
  );
}
