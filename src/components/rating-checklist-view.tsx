import type { RatingChecklist } from "@/types/ddbx";

import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";

import { CHECKS, HOW_IT_WORKS_PATH } from "@/lib/methodology";

/** Kept as a named export because callers outside this file import it for the
 *  labels alone. The list itself is no longer defined here — it used to be a
 *  third independent copy of the six checks, written in a different voice from
 *  the walkthrough's and the drawer's. See src/lib/methodology.ts. */
export const CHECKLIST_LABELS = CHECKS;

/** The six criteria behind a rating, each expandable to its explanation.
 *
 *  The explanations used to live in hover-only tooltips, which meant they
 *  were unreachable on touch — i.e. on most of the site's traffic. They're
 *  now disclosure rows: tap or click a criterion to read why it matters.
 *  iOS solved the same problem by making the checklist a tap-through to a
 *  sheet of per-criterion cards; inline is the web-native equivalent and
 *  keeps the scannable pass/fail column intact.
 */
export function RatingChecklistView({
  checklist,
}: {
  checklist: RatingChecklist;
}) {
  const passed = CHECKLIST_LABELS.filter((c) => checklist[c.key]).length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold">Rating checklist</h3>
        <span className="text-xs text-muted tabular-nums">
          {passed}/{CHECKLIST_LABELS.length} met
        </span>
      </div>
      <ul className="divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
        {CHECKS.map(({ key, label, body }) => {
          const ok = checklist[key];

          return (
            <li key={key}>
              <details className="group/row">
                <summary className="flex items-center gap-3 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span
                    aria-label={ok ? "passed" : "failed"}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0
                      ${
                        ok
                          ? "bg-[#1e6b18]/[0.12] text-[#1e6b18] dark:bg-[#5cd84a]/[0.15] dark:text-[#5cd84a]"
                          : "bg-[#8b2020]/[0.12] text-[#8b2020] dark:bg-[#e84d4d]/[0.15] dark:text-[#e84d4d]"
                      }`}
                  >
                    {ok ? "✓" : "✗"}
                  </span>
                  <span
                    className={`flex-1 min-w-0 text-sm ${ok ? "text-foreground" : "text-foreground/60"}`}
                  >
                    {label}
                  </span>
                  <ChevronDownIcon
                    aria-hidden
                    className="w-4 h-4 shrink-0 text-muted/50 transition-transform duration-200 group-open/row:rotate-180"
                  />
                </summary>
                {/* Aligned under the label, clearing the tick's gutter. */}
                <p className="pl-8 pr-2 pb-3 -mt-0.5 text-xs leading-relaxed text-muted">
                  {body}
                </p>
              </details>
            </li>
          );
        })}
      </ul>
      {/* The rows say what each check is; this is the way through to why each
          one earns its place, and to the pipeline that produced the ticks. */}
      <p className="mt-3 text-xs text-muted">
        <Link
          className="underline underline-offset-4 hover:text-foreground"
          to={HOW_IT_WORKS_PATH}
        >
          How we rate a purchase
        </Link>
      </p>
    </div>
  );
}
