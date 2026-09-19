import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUpIcon } from "@heroicons/react/24/outline";

import { CompanyLogo } from "@/components/company-logo";
import { ShareRow } from "@/components/share-row";

/** Shell mode's sticky page header (experiment, lib/nav-mode).
 *
 *  With no masthead across the top, a reader scrolled deep into a page has
 *  nothing telling them where they are. This bar slides in at the top of the
 *  sheet once the page's own <h1> has scrolled out, and names it.
 *
 *  It reads the title from the DOM rather than taking a prop so it works on
 *  every page without touching them: the first <h1> inside #main. Pages load
 *  their heading after a fetch, so a MutationObserver waits for it and
 *  re-resolves on each navigation. An h1 carrying `data-logo` (a company's
 *  storage key) gets that company's mark beside the name. The share row sits
 *  at the right, so a reader deep in a page can send it on without scrolling
 *  back to the one under its headline.
 *
 *  Fixed rather than sticky, over the sheet's top edge (--shell-l/--shell-r,
 *  globals.css). It sits at z-34, just under the frame mask, so the mask
 *  rounds its top corners for free. */
export function ShellPageHeader({ enabled }: { enabled: boolean }) {
  const { pathname } = useLocation();
  const [title, setTitle] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
    setTitle(null);
    setLogo(null);
    if (!enabled) return;
    const main = document.getElementById("main");

    if (!main) return;

    let io: IntersectionObserver | null = null;
    let current: HTMLElement | null = null;

    const attach = () => {
      const h1 = main.querySelector("h1");

      if (!h1 || h1 === current) return;
      current = h1;
      setTitle((h1.textContent ?? "").replace(/\s+/g, " ").trim() || null);
      setLogo(h1.getAttribute("data-logo"));
      io?.disconnect();
      io = new IntersectionObserver(
        ([entry]) => {
          // Only "scrolled past", not "not yet reached": a heading below the
          // fold on first paint must not bring the bar in.
          setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        },
        { rootMargin: "-64px 0px 0px 0px" },
      );
      io.observe(h1);
    };

    attach();
    const mo = new MutationObserver(attach);

    mo.observe(main, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io?.disconnect();
    };
  }, [pathname, enabled]);

  if (!enabled || !title) return null;

  return (
    <div
      aria-hidden={!shown}
      className={clsx(
        "fixed left-[var(--shell-l)] right-[var(--shell-r)] top-3 z-[34] hidden h-[52px] items-center gap-3 border-b border-black/[0.06] bg-[#fcfbf9]/85 px-6 backdrop-blur-xl backdrop-saturate-150 transition-[opacity,transform] duration-200 dark:border-white/[0.07] dark:bg-background/85 xl:flex",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      {logo ? <CompanyLogo link={false} size={28} ticker={logo} /> : null}
      <span className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </span>
      <ShareRow
        reddit
        className="ml-auto"
        context="shell-header"
        size="sm"
        title={title}
        // The path alone: the query carries view state (?nav=, ?panel=)
        // the recipient shouldn't land on.
        url={pathname}
      />
      <button
        aria-label="Back to top"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
        tabIndex={shown ? 0 : -1}
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
