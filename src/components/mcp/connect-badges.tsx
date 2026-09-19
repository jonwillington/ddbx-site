import type { ComponentType, SVGProps } from "react";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/16/solid";

import { BUTTON_RADIUS } from "@/components/button";
import { CloseButton } from "@/components/close-button";
import { UrlCopy } from "@/components/mcp/url-copy";
import {
  ClaudeLogo,
  CursorLogo,
  OpenAILogo,
  VsCodeLogo,
} from "@/components/mcp/vendor-logos";
import {
  CLAUDE_CODE_COMMAND,
  CURSOR_INSTALL_URL,
  MCP_SNIPPETS,
  VSCODE_INSTALL_URL,
} from "@/lib/mcp-setup";

/** "Use ddbx in …" — the MCP connector as a row of badges at the foot of the
 *  sidebar rail.
 *
 *  Only the two editors can actually install from a link. ChatGPT and Claude
 *  have no deep link that adds a custom connector, so their badges open a
 *  popover with the address, a copy button and that product's steps; Claude
 *  Code's copies its one-line command. The editors' popovers lead with the
 *  install link and keep the manual snippet under it, because a custom scheme
 *  does nothing when the app is missing.
 *
 *  Each badge takes an optional `href`. When ChatGPT's or Claude's directory
 *  listing is approved, set it to the listing and the badge becomes a plain
 *  link: a one-line change.
 *
 *  Each pill pairs the product's own mark with its name (vendor-logos.tsx):
 *  it names the product the reader is choosing, and claims no partnership. The popover is the terminal palette in both
 *  themes, as the connector is everywhere else (/mcp is permanently dark). */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface Badge {
  id: string;
  label: string;
  icon: Icon;
  /** Index into MCP_SNIPPETS: the steps this popover shows. */
  snippet: number;
  /** A directory listing, once approved. Set → the badge is a link. */
  href?: string;
  /** One-click install handler (editors only). */
  install?: { href: string; app: string };
  /** What the copy field holds. Defaults to the connector address. */
  copy?: { value: string; label: string };
}

const BADGES: Badge[] = [
  { id: "chatgpt", label: "ChatGPT", icon: OpenAILogo, snippet: 0 },
  { id: "claude", label: "Claude", icon: ClaudeLogo, snippet: 1 },
  {
    id: "claude-code",
    label: "Claude Code",
    icon: ClaudeLogo,
    snippet: 2,
    copy: { value: CLAUDE_CODE_COMMAND, label: "Claude Code command" },
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: CursorLogo,
    snippet: 3,
    install: { href: CURSOR_INSTALL_URL, app: "Cursor" },
  },
  {
    id: "vscode",
    label: "VS Code",
    icon: VsCodeLogo,
    snippet: 3,
    install: { href: VSCODE_INSTALL_URL, app: "VS Code" },
  },
];

const PILL =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-[5px] text-[12px] font-medium transition-colors";

export function ConnectBadges({ className = "" }: { className?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const open = BADGES.find((b) => b.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  return (
    <div ref={wrapRef} className={clsx("relative", className)}>
      <p className="px-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
        Use ddbx in
      </p>
      <ul className="mt-2 flex flex-wrap gap-1">
        {BADGES.map((b) => {
          const Glyph = b.icon;
          const current = b.id === openId;
          const pillClass = clsx(
            PILL,
            current
              ? "border-transparent bg-ink text-white dark:bg-white dark:text-ink"
              : "border-black/[0.08] text-foreground/80 hover:bg-black/[0.04] hover:text-foreground dark:border-white/[0.09] dark:hover:bg-white/[0.05]",
          );
          const inner = (
            <>
              <Glyph className="h-3.5 w-3.5 shrink-0" />
              {b.label}
            </>
          );

          return (
            <li key={b.id}>
              {b.href ? (
                <a
                  aria-label={`Use ddbx in ${b.label}`}
                  className={pillClass}
                  data-ga-event="mcp_badge"
                  data-ga-label={`Sidebar ${b.id}`}
                  href={b.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {inner}
                </a>
              ) : (
                <button
                  aria-controls="mcp-connect-popover"
                  aria-expanded={current}
                  aria-label={`Use ddbx in ${b.label}`}
                  className={pillClass}
                  data-ga-event="mcp_badge"
                  data-ga-label={`Sidebar ${b.id}`}
                  type="button"
                  onClick={() => setOpenId(current ? null : b.id)}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {open && <Popover badge={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** Hangs off the rail's right edge, bottom-aligned with the badges, so it
 *  opens over the page sheet rather than inside a 216px column. */
function Popover({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const snippet = MCP_SNIPPETS[badge.snippet];

  return (
    <div
      aria-label={`Use ddbx in ${badge.label}`}
      className="absolute bottom-0 left-[calc(100%+22px)] z-50 w-[360px] overflow-hidden rounded-2xl bg-[oklch(15%_0.018_55)] shadow-xl ring-1 ring-white/[0.08]"
      id="mcp-connect-popover"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-amber">
            {snippet.title}
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[15px] font-semibold text-[#fcfbf9]">
            <badge.icon className="h-4 w-4 shrink-0" />
            Use ddbx in {badge.label}
          </p>
        </div>
        <CloseButton size="sm" tone="dark" onClick={onClose} />
      </div>

      <div className="space-y-3 px-4 pb-4 pt-3">
        {badge.install && (
          <a
            className={`flex w-full items-center justify-center gap-1.5 ${BUTTON_RADIUS} bg-white px-3 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-white/90`}
            data-ga-event="mcp_install"
            data-ga-label={`Sidebar ${badge.id}`}
            href={badge.install.href}
          >
            Install in {badge.install.app}
            <ArrowTopRightOnSquareIcon aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}

        {badge.install && (
          <p className="text-[12px] leading-[1.5] text-white/45">
            Nothing happened? Add it by hand:
          </p>
        )}

        <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/[0.04] px-3 py-2.5 font-mono text-[11.5px] leading-[1.6] text-[#fcfbf9]/85">
          {snippet.code}
        </pre>

        <UrlCopy
          gaLabel={`Sidebar ${badge.id}`}
          label={badge.copy?.label}
          size="sm"
          value={badge.copy?.value}
        />

        <p className="text-[12px] leading-[1.5] text-white/45">
          Free, read-only, no sign-in.{" "}
          <Link
            className="text-white/70 underline decoration-white/25 underline-offset-2 hover:text-white"
            to="/mcp"
            onClick={onClose}
          >
            What your assistant gets
          </Link>
        </p>
      </div>
    </div>
  );
}
