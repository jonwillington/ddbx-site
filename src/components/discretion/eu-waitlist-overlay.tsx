import type { FormEvent } from "react";

import { useRef, useState } from "react";
import { LockClosedIcon } from "@heroicons/react/20/solid";

import { CompanyLogo } from "@/components/company-logo";
import { Turnstile } from "@/components/api/turnstile";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { API_BASE } from "@/lib/api";

/** The gate card for markets with no app behind the gate (NL/SE today).
 *
 *  These markets used to show the standard BlurredAnalysisOverlay, whose
 *  store badges resolved to the UK App Store — a Dutch reader was asked to
 *  install a UK-framed product to unlock Dutch analysis. The withheld thing
 *  had no matching product behind it.
 *
 *  So the ask is now the truthful one: the EU app is coming — register and
 *  we'll tell you when it ships. Same card chrome as the analysis overlay,
 *  same spam layers as the API interest form (honeypot, time floor,
 *  Turnstile when configured, plus the worker's rate limit), posting to the
 *  worker's /app-waitlist.
 */
export function EuWaitlistOverlay({
  marketId,
  ticker,
  body = "There's no ddbx app for this market yet. The EU app is on the way — register and we'll email you the day it ships.",
}: {
  /** Waitlist market tag stored with the registration ("nl", "se"). */
  marketId: string;
  /** Ticker of the locked deal — the padlocked poster logo. */
  ticker?: string;
  body?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "sending" || state === "done") return;

    const honeypot = new FormData(e.currentTarget).get("company_url");

    setState("sending");
    try {
      const res = await fetch(`${API_BASE}/app-waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          market: marketId,
          company_url: String(honeypot ?? ""),
          elapsed_ms: Date.now() - mountedAt.current,
          turnstile_token: turnstileToken,
          source_path:
            typeof window === "undefined"
              ? undefined
              : window.location.pathname,
          referrer: typeof document === "undefined" ? "" : document.referrer,
        }),
      });

      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[#e8e0d5] dark:border-separator bg-[#faf7f2]/95 dark:bg-surface/95 backdrop-blur-md shadow-2xl px-6 py-6 text-center">
      <span className="relative mb-4 inline-block">
        {ticker ? (
          <CompanyLogo className="shadow-lg" size={80} ticker={ticker} />
        ) : (
          <img
            alt=""
            className="h-20 w-20 rounded-[1.25rem] border border-black/10 shadow-lg dark:border-white/10"
            src="/ios-app-logo.svg"
          />
        )}
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white ring-2 ring-[#faf7f2] dark:bg-white dark:text-ink dark:ring-surface">
          <LockClosedIcon className="h-3.5 w-3.5" />
        </span>
      </span>

      <h3 className="text-lg font-semibold mb-1">
        This analysis lives in the app
      </h3>

      {state === "done" ? (
        <p className="text-sm text-muted leading-relaxed">
          You&apos;re on the list. We&apos;ll email you when the EU app is ready
          — nothing else, no newsletter.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted leading-relaxed mb-4">{body}</p>

          <form className="space-y-3" onSubmit={submit}>
            {/* Honeypot — only a bot fills a visually hidden field. */}
            <div aria-hidden className="absolute left-[-9999px] top-auto">
              <label htmlFor="eu-waitlist-company-url">Company URL</label>
              <input
                autoComplete="off"
                id="eu-waitlist-company-url"
                name="company_url"
                tabIndex={-1}
                type="text"
              />
            </div>

            {/* `you@example.com` is a format example, not a name — it vanishes
                the moment anything is typed. The real label rides along hidden
                so the field still announces as one. */}
            <label className="block">
              <span className="sr-only">Email address</span>
              <input
                required
                autoComplete="email"
                className="w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-base sm:text-sm text-ink outline-none placeholder:text-ink/35 focus:border-brand-brown/50 focus:ring-2 focus:ring-brand-brown/25 dark:border-white/15 dark:bg-white/[0.06] dark:text-foreground dark:placeholder:text-foreground/35"
                inputMode="email"
                name="email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <Turnstile onToken={setTurnstileToken} />

            <button
              className={`w-full ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60`}
              data-ga-event="cta_eu_waitlist_register"
              data-ga-label={`EU waitlist · ${marketId}`}
              disabled={state === "sending"}
              type="submit"
            >
              {state === "sending" ? "Registering…" : "Register for the EU app"}
            </button>
          </form>

          {state === "error" ? (
            <p className="mt-2.5 text-[12.5px] text-negative">
              That didn&apos;t go through — please try again.
            </p>
          ) : (
            <p className="mt-2.5 text-[11px] text-muted/60">
              One email when it launches. That&apos;s it.
            </p>
          )}
        </>
      )}
    </div>
  );
}
