import type { BrokerOffer } from "@/lib/api";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";

import { BrokerLogo, BrokerVisitLink, OfferBadge } from "./broker-ui";

import { api } from "@/lib/api";
import { isAffiliateLink } from "@/lib/brokers";

/** Floating broker unit for the company pages.
 *
 *  A company page is the highest-intent surface on the site: someone reading
 *  "four directors bought £7.5m of this" is one step from wanting to own it.
 *  This is the step — a persistent, dismissible prompt to open an account,
 *  with whatever sign-up offer the broker is currently running.
 *
 *  Desktop only. Mobile already carries the floating app-download CTA from
 *  DefaultLayout, and stacking two floating prompts on a small screen is how
 *  you get neither tapped — the page renders <BrokerInline> in the flow there
 *  instead.
 *
 *  Tagging: the CTA is a BrokerVisitLink, so it inherits the per-broker GA4
 *  event (cta_visit_freetrade …), the placement label, the affiliate rel and
 *  the affiliate marker used everywhere else. Dismissals are tracked too —
 *  a unit people close immediately is worth knowing about.
 */

const DISMISS_KEY = "ddbx.brokerFloat.dismissed";

/** Top pick first, then editorial rank — same ordering the compare grid and
 *  the review rail use, so the company pages promote the same platform the
 *  rest of the site does rather than picking a favourite of their own. */
export function pickPromoted(brokers: BrokerOffer[]): BrokerOffer | null {
  const ordered = [...brokers].sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER;

    return ra - rb || a.name.localeCompare(b.name);
  });

  return ordered[0] ?? null;
}

/** Loads the promoted broker for a market. Returns null while loading, and on
 *  any failure — a broken promo unit should simply not appear. Brokers are a
 *  UK-only directory today, so other markets get nothing. */
export function usePromotedBroker(market: string): BrokerOffer | null {
  const [broker, setBroker] = useState<BrokerOffer | null>(null);

  useEffect(() => {
    if (market !== "UK") return;
    let live = true;

    api
      .brokers("UK")
      .then((all) => live && setBroker(pickPromoted(all)))
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [market]);

  return broker;
}

function Headline({ company }: { company: string }) {
  return (
    <p className="text-[13px] font-semibold leading-snug text-foreground">
      Want to own {company}?
    </p>
  );
}

/** Compliance line. Shown on both variants — the disclosure has to sit at the
 *  point of engagement, not only in the footer. */
function Small({ broker }: { broker: BrokerOffer }) {
  return (
    <p className="mt-2.5 text-[10px] leading-snug text-foreground/45">
      <span className="font-semibold text-foreground/60">Ad</span> · Capital at
      risk.{isAffiliateLink(broker) ? " We may earn a commission." : ""}
    </p>
  );
}

export function BrokerFloat({
  broker,
  company,
}: {
  broker: BrokerOffer | null;
  company: string;
}) {
  const [dismissed, setDismissed] = useState(true);

  // Read the dismissal after mount rather than during render: the pre-rendered
  // HTML has no access to sessionStorage, and defaulting to "dismissed" means
  // the unit never flashes in before we know it should be hidden.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!broker || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — it'll come back next page, which is acceptable */
    }
  };

  return (
    <aside
      aria-label={`Invest with ${broker.name}`}
      className="hidden lg:block fixed bottom-6 right-6 z-40 w-[310px] rounded-2xl border border-[#e3d9c9] bg-[#fffdf9]/95 p-4 shadow-[0_10px_40px_rgba(60,40,20,0.13)] backdrop-blur-md dark:border-white/10 dark:bg-surface/95"
    >
      <button
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-foreground/30 transition-colors hover:bg-black/5 hover:text-foreground/70 dark:hover:bg-white/10"
        data-ga-event="broker_float_dismiss"
        data-ga-label={broker.slug}
        type="button"
        onClick={close}
      >
        <XMarkIcon className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2.5 pr-6">
        <BrokerLogo broker={broker} size={28} />
        <Headline company={company} />
      </div>

      {broker.offer_headline && (
        <OfferBadge className="mt-3" text={broker.offer_headline} />
      )}

      <p className="mt-2.5 text-[12px] leading-[1.5] text-foreground/60">
        {broker.tagline}
      </p>

      <BrokerVisitLink
        broker={broker}
        className="mt-3 w-full"
        placement="company_float"
      >
        Start investing with {broker.name}
      </BrokerVisitLink>

      <Small broker={broker} />
    </aside>
  );
}

/** In-flow twin of the float, for mobile and as a mid-article break on
 *  desktop. Same broker, same offer, same tagging — different placement label
 *  so the two can be compared in GA. */
export function BrokerInline({
  broker,
  company,
  className,
  placement = "company_inline",
}: {
  broker: BrokerOffer | null;
  company: string;
  className?: string;
  placement?: string;
}) {
  if (!broker) return null;

  return (
    <aside
      aria-label={`Invest with ${broker.name}`}
      className={`rounded-2xl border border-[#e3d9c9] bg-[#fffdf9] p-5 dark:border-white/10 dark:bg-surface ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrokerLogo broker={broker} size={34} />
          <div>
            <Headline company={company} />
            <p className="mt-1 text-[12.5px] leading-snug text-foreground/60">
              {broker.tagline}
            </p>
          </div>
        </div>
        <BrokerVisitLink broker={broker} placement={placement} size="lg">
          Start investing with {broker.name}
        </BrokerVisitLink>
      </div>
      {broker.offer_headline && (
        <OfferBadge className="mt-3" text={broker.offer_headline} />
      )}
      <Small broker={broker} />
    </aside>
  );
}
