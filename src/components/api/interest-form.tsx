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
 *  is invisible on cream. Colours here are therefore fixed values: literals, or
 *  the fixed brand tokens (`ink`, `brand-brown`), which carry one value in both
 *  modes. */
/** The field skin: label INSIDE the box, above the value.
 *
 *  It was a stack of mono-uppercase labels sitting above bordered inputs, and
 *  it read as stock. Two separate reasons, worth keeping apart:
 *
 *  1. Labels outside. A label above a box is two objects with a gap between
 *     them, so five fields are ten objects and a lot of vertical air, and the
 *     eye has to re-pair each label with its box on the way down. Inside the
 *     box, a field is one object: the label is a caption ON the thing it names.
 *     It also means an empty field is never a mystery box the way a
 *     placeholder-only field is, and nothing shifts when you start typing.
 *  2. Mono. `font-mono` uppercase is the site's EYEBROW device — a static label
 *     you read once (section kickers, stat keys, table headers). A form control
 *     is not that. Borrowing the eyebrow for it made a filing-cabinet form and
 *     spent the device's meaning at the same time. Sans, sentence case, small
 *     and quiet: it's a caption, not a heading.
 *
 *  `focus-within` moves the border, so the whole shell lights rather than an
 *  inner rectangle no one can see.
 *
 *  The shell is `rounded-xl`, not a capsule: the capsule is the site's chip
 *  shape and these are inputs. See components/chip.ts. */
const SHELL =
  "rounded-xl border border-black/15 bg-white/70 px-4 pb-2.5 pt-2.5 transition-colors focus-within:border-brand-brown/60";

const FIELD_LABEL = "block text-[11.5px] font-medium leading-none text-ink/45";

/* 16px on mobile, 15px from `sm` up: below 16 iOS Safari zooms the page the
   moment a field takes focus, and we no longer suppress that with a viewport
   lock (see index.html). */
const CONTROL =
  "mt-2 w-full bg-transparent text-base sm:text-[15px] leading-[1.4] text-ink placeholder:text-ink/30 focus:outline-none";

/** BUTTON_FILLED's light-mode half, hardcoded — see the note above. */
const SUBMIT_FILL =
  "bg-ink text-white hover:bg-[#2a2118] disabled:hover:bg-ink";

/** The one thing a `<select>` needs that an `<input>` doesn't: a chevron. The
 *  native one goes with `appearance-none`, and without a replacement the
 *  control is a box of text that gives no sign it can be opened. */
function Chevron() {
  return (
    <svg
      aria-hidden="true"
      // Aligned to the SELECT's line, not to the shell's centre: the shell also
      // holds the label above, so centring on it would float the chevron above
      // the text it belongs to.
      className="pointer-events-none absolute bottom-[13px] right-4 h-3.5 w-3.5 text-ink/35"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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
        {/* This one KEEPS the mono eyebrow: it's a status heading you read
            once, which is exactly what that device is for. */}
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown">
          Request received
        </p>
        <p className="mt-3 text-[16px] leading-[1.55] text-ink">
          Thanks. We&rsquo;ll be in touch within two working days with scope and
          pricing for what you described.
        </p>
      </div>
    );
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={SHELL}>
          <label className={FIELD_LABEL} htmlFor="api-name">
            Name
          </label>
          <input
            required
            autoComplete="name"
            className={CONTROL}
            id="api-name"
            name="name"
            placeholder="Jane Okafor"
            type="text"
          />
        </div>
        <div className={SHELL}>
          <label className={FIELD_LABEL} htmlFor="api-email">
            Work email
          </label>
          <input
            required
            autoComplete="email"
            className={CONTROL}
            id="api-email"
            name="email"
            placeholder="jane@fund.com"
            type="email"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={SHELL}>
          <label className={FIELD_LABEL} htmlFor="api-company">
            Company
          </label>
          <input
            autoComplete="organization"
            className={CONTROL}
            id="api-company"
            name="company"
            placeholder="Optional"
            type="text"
          />
        </div>
        <div className={`${SHELL} relative`}>
          <label className={FIELD_LABEL} htmlFor="api-use-case">
            Use case
          </label>
          <select
            required
            className={`${CONTROL} appearance-none pr-7`}
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
          <Chevron />
        </div>
      </div>

      {/* The markets picker gets the same shell as the fields around it. It is
          a control with a label like any other, and left as a bare row of
          chips under a floating caption it was the one thing on the form with
          no box, which read as an afterthought rather than as a question. */}
      <div className={SHELL}>
        <span className={FIELD_LABEL}>Markets of interest</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {MARKETS.map((m) => {
            const on = markets.includes(m);

            return (
              <button
                key={m}
                aria-pressed={on}
                // Sentence case, sans: these are toggles you press, not the
                // uppercase mono chips that label a rating. Capsule shape is
                // retained because that part IS the chip system.
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  on
                    ? "border-brand-brown/50 bg-brand-brown/12 text-brand-brown"
                    : "border-black/15 text-ink/60 hover:border-black/30 hover:text-ink/80"
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

      <div className={SHELL}>
        <label className={FIELD_LABEL} htmlFor="api-message">
          What are you building?
        </label>
        <textarea
          className={`${CONTROL} resize-y`}
          id="api-message"
          name="message"
          placeholder="A sentence or two is plenty. It’s what we quote against."
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
      <p className="text-[12.5px] text-ink/50">
        We reply within two working days. No newsletter, no onward sharing.
      </p>
    </form>
  );
}
