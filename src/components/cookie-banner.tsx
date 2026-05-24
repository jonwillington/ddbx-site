import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useCookieConsent } from "@/lib/cookie-consent";

type Phase = "hidden" | "visible" | "exiting" | "gone";
const EXIT_DURATION_MS = 350;

export function CookieBanner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { needsConsent, accept } = useCookieConsent();

  // Market-list pages render a fixed 20rem news sidebar on lg+ and reserve
  // `lg:mr-80` for it; the performance, portfolio and director routes don't.
  // Mirror that here so the banner centres within the content column instead
  // of drifting under the sidebar. (Every market has a news source, so the
  // sidebar is present on all non-excluded routes.)
  const hasRightSidebar =
    !/(?:^|\/)(performance|portfolio|directors)(?:\/|$)/.test(pathname);
  // `hidden` = mounted but translated off-screen, so the next frame can
  // animate it into view. `gone` = unmount.
  const [phase, setPhase] = useState<Phase>(needsConsent ? "hidden" : "gone");

  // Slide in on the next frame so the transition has a from-state to animate
  // from. Without the RAF the browser would render straight at the final
  // position and skip the animation.
  useEffect(() => {
    if (phase !== "hidden") return;
    const id = requestAnimationFrame(() => setPhase("visible"));

    return () => cancelAnimationFrame(id);
  }, [phase]);

  if (phase === "gone") return null;

  const handleAgree = () => {
    setPhase("exiting");
    accept();
    setTimeout(() => setPhase("gone"), EXIT_DURATION_MS);
  };

  const inView = phase === "visible";

  return (
    <div
      aria-hidden={!inView}
      className={`fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none transition-all ease-out ${hasRightSidebar ? "lg:right-80" : ""} ${inView ? "translate-y-0 opacity-100 duration-300" : "translate-y-24 opacity-0 duration-300"}`}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-separator bg-[#f5f0e8]/95 dark:bg-background/95 backdrop-blur-md shadow-lg px-4 py-2 text-xs text-foreground/70">
        <span>We hate this banner as much as you do.</span>
        <button
          className="underline underline-offset-2 text-foreground/50 hover:text-foreground/80 transition-colors"
          onClick={() => navigate("/cookies")}
        >
          Details
        </button>
        <button
          className="rounded-full bg-foreground text-background px-3 py-1 text-xs font-medium hover:opacity-90 transition-opacity"
          onClick={handleAgree}
        >
          Agree to cookies
        </button>
      </div>
    </div>
  );
}
