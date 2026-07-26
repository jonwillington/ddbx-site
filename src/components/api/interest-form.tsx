import { useCallback, useRef, useState } from "react";

import { Turnstile } from "./turnstile";

import { BUTTON_RADIUS } from "@/components/button";
import { API_BASE } from "@/lib/api";

/** "Request access" form — the page's one conversion point.
 *
 *  Built from native elements. The site ships no form components at all (two
 *  `<input>`s exist site-wide, both search pills), so there is nothing to
 *  reuse and no reason to pull in HeroUI's just for this. The field skin
 *  extends the search-pill precedent in `market-filter-bar.tsx`: accent-brown
 *  border on focus, no ring. Rectangular rather than capsule — a capsule is
 *  the site's chip shape, and these are inputs.
 *
 *  Lives in the closing band, which is CREAM on this otherwise-dark page. The
 *  site's grammar is "one contrasting object per page, and that object is the
 *  ask"; on a dark page that inverts rather than disappears. So these are
 *  light-surface fields.
 *
 *  Spam handling is layered and all of it is cheap:
 *   - a honeypot (`company_url`) that only a bot fills,
 *   - a time-to-submit floor — a human cannot read and complete this in <2.5s,
 *   - server-side validation, capping and per-IP rate limiting.
 *  Cloudflare Turnstile is the fourth layer and is fully wired on both sides.
 *  It renders only when VITE_TURNSTILE_SITE_KEY is set and is verified only
 *  when the worker has TURNSTILE_SECRET, so turning it on is a two-secret
 *  config change with no deploy. Both halves ship together deliberately:
 *  setting the server secret while the client sent no token would 400 every
 *  submission. See components/api/turnstile.tsx.
 */

const MARKETS = ["UK", "US", "Sweden", "Netherlands", "Congress"] as const;

const USE_CASES = [
  { value: "fund", label: "Fund / systematic strategy" },
  { value: "fintech", label: "Fintech or brokerage product" },
  { value: "research", label: "Research or media" },
  { value: "personal", label: "Personal investing" },
  { value: "other", label: "Something else" },
];

/** ⚠ Every class in this file is written WITHOUT a `dark:` variant, on purpose.
 *
 *  `/api` pins `.dark` on <html> for the whole route, but this form lives in
 *  the closing band, which is cream. So the theme-aware tokens (`text-negative`,
 *  BUTTON_FILLED, `bg-surface`, …) would all resolve to their DARK values on a
 *  light surface — BUTTON_FILLED in particular inverts to a white fill, which
 *  is invisible on cream. Colours here are therefore literal. */
const FIELD =
  "w-full rounded-xl border border-black/15 bg-white/70 px-4 py-3 text-[15px] text-[#1a140d] placeholder:text-[#1a140d]/35 transition-colors focus:border-[#5a4128]/60 focus:outline-none";

/** BUTTON_FILLED's light-mode half, hardcoded — see the note above. */
const SUBMIT_FILL =
  "bg-[#1a140d] text-white hover:bg-[#2a2118] disabled:hover:bg-[#1a140d]";

const LABEL =
  "mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1a140d]/50";

type Status = "idle" | "sending" | "done" | "error";

export function InterestForm() {
  const [markets, setMarkets] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // Null until the challenge solves, and null again when it expires. Only
  // meaningful when a site key is configured; the server ignores it otherwise.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onToken = useCallback((t: string | null) => setTurnstileToken(t), []);
  // Set once on first render; compared at submit to catch instant posts.
  const mountedAt = useRef(Date.now());

  const toggleMarket = (m: string) =>
    setMarkets((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — a real person never sees this field, so anything in it is a
    // bot. Fail silently: telling a scraper why it was rejected just helps it.
    if (String(data.get("company_url") ?? "").trim()) {
      setStatus("done");

      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          use_case: data.get("use_case"),
          volume_estimate: data.get("volume_estimate"),
          message: data.get("message"),
          markets,
          turnstile_token: turnstileToken,
          elapsed_ms: Date.now() - mountedAt.current,
          source_path:
            typeof window !== "undefined" ? window.location.pathname : null,
          referrer:
            typeof document !== "undefined" ? document.referrer || null : null,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setStatus("done");
      window.gtag?.("event", "api_interest_submit");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Email hello@ddbx.uk instead.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#5a4128]">
          Request received
        </p>
        <p className="mt-3 text-[16px] leading-[1.55] text-[#1a140d]">
          Thanks — we&rsquo;ll be in touch within two working days with scope
          and pricing for what you described.
        </p>
      </div>
    );
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="api-name">
            Name
          </label>
          <input
            required
            autoComplete="name"
            className={FIELD}
            id="api-name"
            name="name"
            placeholder="Jane Okafor"
            type="text"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="api-email">
            Work email
          </label>
          <input
            required
            autoComplete="email"
            className={FIELD}
            id="api-email"
            name="email"
            placeholder="jane@fund.com"
            type="email"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="api-company">
            Company
          </label>
          <input
            autoComplete="organization"
            className={FIELD}
            id="api-company"
            name="company"
            placeholder="Optional"
            type="text"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="api-use-case">
            Use case
          </label>
          <select
            required
            className={`${FIELD} appearance-none`}
            defaultValue=""
            id="api-use-case"
            name="use_case"
          >
            <option disabled value="">
              Select one
            </option>
            {USE_CASES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className={LABEL}>Markets of interest</span>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => {
            const on = markets.includes(m);

            return (
              <button
                key={m}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  on
                    ? "border-[#5a4128]/50 bg-[#5a4128]/12 text-[#5a4128]"
                    : "border-black/15 text-[#1a140d]/55 hover:border-black/25"
                }`}
                type="button"
                onClick={() => toggleMarket(m)}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="api-message">
          What are you building?
        </label>
        <textarea
          className={`${FIELD} resize-y`}
          id="api-message"
          name="message"
          placeholder="A sentence or two is plenty — it's what we quote against."
          rows={4}
        />
      </div>

      {/* Honeypot. Hidden from people and from assistive tech; bots fill it. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="company_url">Company URL</label>
        <input
          autoComplete="off"
          id="company_url"
          name="company_url"
          tabIndex={-1}
          type="text"
        />
      </div>

      <Turnstile onToken={onToken} />

      {status === "error" && error ? (
        <p className="text-[13.5px] text-[#8b2020]">{error}</p>
      ) : null}

      <button
        className={`${BUTTON_RADIUS} ${SUBMIT_FILL} w-full px-6 py-3.5 text-[15px] font-semibold transition-colors disabled:opacity-60`}
        data-ga-event="cta_api_request_access"
        data-ga-label="API interest form"
        disabled={status === "sending"}
        type="submit"
      >
        {status === "sending" ? "Sending…" : "Request pricing"}
      </button>
      <p className="text-[12.5px] text-[#1a140d]/50">
        We reply within two working days. No newsletter, no onward sharing.
      </p>
    </form>
  );
}
