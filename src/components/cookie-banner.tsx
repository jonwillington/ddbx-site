import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { useCookieConsent } from "@/lib/cookie-consent";
import { useRailPresent } from "@/lib/rail-presence";

type Phase = "hidden" | "visible" | "exiting" | "gone";
const EXIT_DURATION_MS = 350;

export function CookieBanner() {
  const navigate = useNavigate();
  const { needsConsent, accept } = useCookieConsent();

  // Pages that render a fixed 20rem right rail reserve `lg:mr-80` for it
  // (DefaultLayout `drawerRight`). The layout reports that here so the banner
  // centres within the content column instead of drifting under the rail —
  // and stays truly centred on rail-less pages.
  const hasRightSidebar = useRailPresent();
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
      className={`fixed inset-x-0 bottom-4 z-50 hidden md:flex justify-center px-4 pointer-events-none transition-[transform,opacity] ease-out ${hasRightSidebar ? "lg:right-80" : ""} ${inView ? "translate-y-0 opacity-100 duration-300" : "translate-y-24 opacity-0 duration-300"}`}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-separator bg-[#f5f0e8]/95 dark:bg-background/95 backdrop-blur-md shadow-lg px-4 py-2 text-xs text-foreground/70">
        <span>We hate this banner as much as you do.</span>
        <button
          className="underline underline-offset-2 text-foreground/50 hover:text-foreground/80 transition-colors"
          onClick={() => navigate("/cookies")}
        >
          Details
        </button>
        <button
          className={`${BUTTON_RADIUS} ${BUTTON_FILLED} px-3 py-1 text-xs font-medium transition-colors`}
          onClick={handleAgree}
        >
          Agree to cookies
        </button>
      </div>
    </div>
  );
}
