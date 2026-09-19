import type { BrokerOffer } from "@/lib/api";

import { BrokerLogo, BrokerVisitLink } from "@/components/brokers/broker-ui";
import { isAffiliateLink, isOfferLive } from "@/lib/brokers";

/** The broker ask, as one quiet row under the stage.
 *
 *  It was a floating white card beside the record, sticky, with a filled
 *  button in it: the loudest object on the page after the h1, and a second
 *  column that squeezed everything else. The stage is the page's one dark
 *  object now, so the ask steps down to a hairline row in the page's own
 *  ground and a grey button. Still the first thing under the verdict, which is
 *  the high-intent moment it exists for, and on every width, so the mobile
 *  twin it used to need is gone too.
 *
 *  The disclosure travels with the button, not the footer.
 */
export function CompanyBrokerRow({
  broker,
  ticker,
  company,
  className = "",
}: {
  broker: BrokerOffer | null;
  ticker: string;
  company: string;
  className?: string;
}) {
  if (!broker) return null;

  return (
    <aside
      aria-label={`Invest in ${company} with ${broker.name}`}
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-hairline py-4 dark:border-separator ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <BrokerLogo broker={broker} size={36} />
        <div className="min-w-0">
          <p className="text-body font-medium leading-snug text-foreground/85">
            Want to own {company}?{" "}
            <span className="text-foreground/55">
              {isOfferLive(broker) && broker.offer_headline
                ? broker.offer_headline
                : broker.tagline}
            </span>
          </p>
          <p className="mt-1 text-caption leading-snug text-foreground/45">
            <span className="font-semibold text-foreground/60">Ad</span> ·
            Capital at risk.
            {isAffiliateLink(broker) ? " We may earn a commission." : ""}
          </p>
        </div>
      </div>
      <BrokerVisitLink
        broker={broker}
        className="shrink-0"
        placement="company_inline"
        variant="grey"
      >
        Buy {ticker} with {broker.name}
      </BrokerVisitLink>
    </aside>
  );
}
