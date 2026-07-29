import type { EvidencePoint } from "@/types/ddbx";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/16/solid";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

/** Evidence for / against, as collapsible tone-tinted cards.
 *
 *  Mirrors `EvidenceCard` in the iOS deal detail view: the headline is the
 *  scannable layer and always visible, with the detail and source folded
 *  away behind it. A flat always-expanded list (what this was) makes six
 *  points read as one wall of text, and buries the shape of the argument.
 *
 *  Built on native <details> rather than animated height. iOS landed in the
 *  same place in 1a48712 — animating a text block's own line-count shifts
 *  the lines already on screen, so the expand reads as a lurch. Instant is
 *  correct here; only the chevron transitions.
 */

const TONE = {
  for: {
    icon: "✓",
    text: "text-[#1e6b18] dark:text-[#5cd84a]",
    plate:
      "bg-[#1e6b18]/[0.06] border-[#1e6b18]/[0.14] dark:bg-[#5cd84a]/[0.06] dark:border-[#5cd84a]/[0.16]",
  },
  against: {
    icon: "✗",
    text: "text-[#8b2020] dark:text-[#e84d4d]",
    plate:
      "bg-[#8b2020]/[0.06] border-[#8b2020]/[0.14] dark:bg-[#e84d4d]/[0.06] dark:border-[#e84d4d]/[0.16]",
  },
} as const;

export function EvidenceTable({
  title,
  points,
  tone,
}: {
  title: string;
  points: EvidencePoint[];
  tone: "for" | "against";
}) {
  const t = TONE[tone];

  if (points.length === 0) {
    return (
      <div>
        <h4 className="text-lg font-bold mb-4">{title}</h4>
        <p className="text-xs text-muted italic">None provided.</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-lg font-bold mb-4">{title}</h4>
      <div className="space-y-2">
        {points.map((p, i) => {
          const headline = (p as any).headline ?? (p as any).point ?? "";
          const detail = (p as any).detail ?? "";
          const sourceLabel =
            (p as any).source_label ?? (p as any).source ?? "";
          const sourceUrl: string | undefined = (p as any).source_url;
          // Nothing folded away means nothing to expand — render the plate
          // static rather than offering a chevron that reveals blank space.
          const expandable = Boolean(detail || sourceLabel);

          const body = (
            <>
              {detail && (
                <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">
                  {detail}
                </p>
              )}
              {sourceLabel && (
                <p className="text-xs mt-2">
                  {sourceUrl ? (
                    <a
                      className="inline-flex items-center gap-0.5 text-brand-brown dark:text-[#a88c6e] hover:underline underline-offset-2"
                      href={sourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {sourceLabel}
                      <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted">{sourceLabel}</span>
                  )}
                </p>
              )}
            </>
          );

          const head = (
            <>
              <span className={`${t.text} text-sm leading-relaxed shrink-0`}>
                {t.icon}
              </span>
              <p className="flex-1 min-w-0 text-sm font-semibold leading-snug">
                {headline}
              </p>
            </>
          );

          if (!expandable) {
            return (
              <div
                key={i}
                className={`flex gap-3 rounded-xl border px-3.5 py-3 ${t.plate}`}
              >
                {head}
              </div>
            );
          }

          return (
            <details
              key={i}
              className={`group rounded-xl border px-3.5 py-3 ${t.plate}`}
            >
              <summary className="flex gap-3 cursor-pointer list-none items-start [&::-webkit-details-marker]:hidden">
                {head}
                <ChevronDownIcon
                  aria-hidden
                  className="w-4 h-4 shrink-0 mt-0.5 text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              {/* Indented to clear the icon gutter so the detail aligns
                  under the headline, not under the tick. */}
              <div className="pl-[calc(0.75rem+1ch)]">{body}</div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
