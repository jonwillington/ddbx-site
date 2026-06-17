import { LockClosedIcon } from "@heroicons/react/24/outline";

import { AppStoreBadge } from "@/components/app-store-badge";

const DEFAULT_BENEFITS = [
  "Full AI breakdown on every director deal — thesis, evidence, risks",
  "Real-time alerts the moment a director buys",
  "Track every director's record across the FTSE",
];

interface BlurredAnalysisOverlayProps {
  title?: string;
  body?: string;
  benefits?: string[];
  footnote?: string;
}

export function BlurredAnalysisOverlay({
  title = "Unlock the full analysis",
  body = "You've used today's free analysis on the web. The DDBX app gives you the full read on every deal — for free.",
  benefits = DEFAULT_BENEFITS,
  footnote = "Free on iOS · No account required",
}: BlurredAnalysisOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center pt-12 px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-[#e8e0d5] dark:border-separator bg-[#faf7f2]/95 dark:bg-surface/95 backdrop-blur-md shadow-2xl px-6 py-6 text-center">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#5a4128]/10 text-[#5a4128] dark:text-[#ad9479] mb-4">
          <LockClosedIcon className="w-5 h-5" />
        </span>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {body}
        </p>
        <ul className="text-left text-sm space-y-1.5 mb-5">
          {benefits.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2 text-foreground/80"
            >
              <span className="text-[#5a4128] dark:text-[#ad9479] mt-0.5">
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <AppStoreBadge size="md" />
        <p className="text-[11px] text-muted/60 mt-3">
          {footnote}
        </p>
      </div>
    </div>
  );
}
