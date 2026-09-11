import { useEffect, useState } from "react";
import { CheckIcon, ClipboardIcon } from "@heroicons/react/20/solid";

import { BUTTON_RADIUS } from "@/components/button";
import { MCP_URL } from "@/lib/mcp";

/** The connector address with a one-click copy: the hero's whole job.
 *
 *  Vendor menus rename themselves every quarter ("Connectors", "Apps",
 *  "Integrations"), so the only stable instruction is "paste this". The field
 *  is therefore the primary object, set in the terminal palette so it reads as
 *  the technical thing it is, and the button beside it is the one filled
 *  control in the hero. `size="sm"` is for the set-up section further down,
 *  where the address appears again for a reader who has scrolled past the
 *  hero and does not want to scroll back.
 *
 *  Copy state resets after two seconds so a second click gives feedback too.
 *  The fallback path (`execCommand`) covers the http://localhost preview and
 *  any browser that has withdrawn the async clipboard from the page. */
export function UrlCopy({
  size = "md",
  gaLabel,
  className = "",
}: {
  size?: "md" | "sm";
  gaLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
    } catch {
      const ta = document.createElement("textarea");

      ta.value = MCP_URL;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
  };

  const md = size === "md";

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl bg-[oklch(15%_0.018_55)] ring-1 ring-white/[0.08] ${className}`}
    >
      <input
        readOnly
        aria-label="Connector address"
        className={`min-w-0 flex-1 bg-transparent font-mono text-[#f5f0e8]/90 outline-none selection:bg-brand-amber/30 ${
          md
            ? "px-4 py-3.5 text-[14px] sm:text-[15px]"
            : "px-3.5 py-2.5 text-[13px]"
        }`}
        type="text"
        value={MCP_URL}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        aria-live="polite"
        className={`m-1.5 inline-flex shrink-0 items-center gap-1.5 ${BUTTON_RADIUS} font-semibold transition-colors ${
          md
            ? "bg-white px-4 text-[14px] text-ink hover:bg-white/90"
            : "bg-white/[0.08] px-3 text-[12.5px] text-white/85 hover:bg-white/[0.14]"
        }`}
        data-ga-event="mcp_copy_url"
        data-ga-label={gaLabel}
        type="button"
        onClick={copy}
      >
        {copied ? (
          <CheckIcon aria-hidden className="h-4 w-4" />
        ) : (
          <ClipboardIcon aria-hidden className="h-4 w-4" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
