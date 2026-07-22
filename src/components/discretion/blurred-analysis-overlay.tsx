import { LockClosedIcon } from "@heroicons/react/20/solid";

import { AppStoreBadge } from "@/components/app-store-badge";

const DEFAULT_BENEFITS = [
  "Full breakdown on every director deal — thesis, evidence, risks",
  "Real-time alerts the moment a director buys",
  "Track every director's record across the FTSE",
];

interface BlurredAnalysisOverlayProps {
  title?: string;
  body?: string;
  benefits?: string[];
  footnote?: string;
  /** App icon shown above the title — per-market where one ships (see
   *  IOS_APP_LOGO_BY_MARKET); the shared brand mark otherwise. */
  logoSrc?: string;
}

export function BlurredAnalysisOverlay({
  title = "Unlock the full analysis",
  body = "You've used today's free analysis on the web. The DDBX app gives you the full read on every deal — for free.",
  benefits = DEFAULT_BENEFITS,
  footnote = "Free on iOS · No account required",
  logoSrc = "/ios-app-logo.svg",
}: BlurredAnalysisOverlayProps) {
  return (
    // Just the card — the caller positions it (the gated drawer centers it in
    // a locked, non-scrolling viewport).
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#e8e0d5] dark:border-separator bg-[#faf7f2]/95 dark:bg-surface/95 backdrop-blur-md shadow-2xl px-6 py-6 text-center">
      {/* The thing being sold, at poster size: the app icon itself, padlocked
          in the corner. Sells harder than an abstract lock glyph. */}
      <span className="relative mb-4 inline-block">
        <img
          alt=""
          className="h-20 w-20 rounded-[1.25rem] border border-black/10 shadow-lg dark:border-white/10"
          src={logoSrc}
        />
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a140d] text-white ring-2 ring-[#faf7f2] dark:bg-white dark:text-[#1a140d] dark:ring-surface">
          <LockClosedIcon className="h-3.5 w-3.5" />
        </span>
      </span>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted leading-relaxed mb-4">{body}</p>
      <ul className="text-left text-sm space-y-1.5 mb-5">
        {benefits.map((line) => (
          <li key={line} className="flex items-start gap-2 text-foreground/80">
            <span className="text-[#5a4128] dark:text-[#ad9479] mt-0.5">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <AppStoreBadge size="md" />
      <p className="text-[11px] text-muted/60 mt-3">{footnote}</p>
    </div>
  );
}
