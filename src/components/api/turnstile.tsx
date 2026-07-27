import { useEffect, useRef, useState } from "react";

/** Cloudflare Turnstile widget, rendered only when a site key is configured.
 *
 *  Wired ahead of the key existing on purpose. The worker's
 *  `POST /api/api-interest` verifies a token only when `TURNSTILE_SECRET` is
 *  set, so provisioning is meant to be a two-secret config change. Without
 *  this component that change would be a TRAP: setting the server secret while
 *  the form sent no token would make every submission 400 with "challenge
 *  failed" — the one conversion point on the page, broken by a dashboard edit
 *  with no deploy and no obvious cause.
 *
 *  With both halves in place the rollout is: set VITE_TURNSTILE_SITE_KEY here,
 *  `wrangler secret put TURNSTILE_SECRET` there. Either alone is still safe —
 *  key without secret renders a widget the server ignores; secret without key
 *  is the only broken combination, which is why this ships first.
 *
 *  The script is loaded lazily and once, rather than in index.html, so visitors
 *  to every other page never pay for it.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");

    el.src = SCRIPT_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("turnstile script failed"));
    document.head.appendChild(el);
  });

  return scriptPromise;
}

/** Renders the challenge and hands the token up. Renders nothing at all when
 *  no site key is set. `theme="light"` because this sits in the cream closing
 *  band, not on the page's dark body. */
export function Turnstile({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !hostRef.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(hostRef.current, {
          sitekey: SITE_KEY,
          theme: "light",
          callback: (token) => onToken(token),
          "error-callback": () => {
            setFailed(true);
            onToken(null);
          },
          "expired-callback": () => onToken(null),
        });
      })
      .catch(() => {
        // Script blocked (extension, network). The server's other four spam
        // layers still apply, so let the submission through rather than
        // stranding a real person behind a challenge that can't load.
        setFailed(true);
        onToken(null);
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;

  return (
    <div>
      <div ref={hostRef} />
      {failed ? (
        <p className="mt-2 text-[12.5px] text-ink/45">
          Verification could not load. You can still submit.
        </p>
      ) : null}
    </div>
  );
}
