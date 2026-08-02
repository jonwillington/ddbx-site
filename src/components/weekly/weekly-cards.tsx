/** The digest's cards, rendered.
 *
 *  A `WeeklyCard` already carries its own editorial copy — eyebrow, headline,
 *  subhead — written by the pipeline. This component's whole job is to present
 *  that copy and the stats behind it, and specifically NOT to write any of its
 *  own: the digest is the one surface on the site whose prose is authored
 *  upstream, and a component that paraphrased it would put two voices on one
 *  page.
 *
 *  So there is no per-kind copy here. There is per-kind LAYOUT, because a
 *  "week in numbers" card wants a stat row and a "biggest cheque" card wants a
 *  named subject, but every string on screen comes from the card.
 */
import type { WeeklyCard } from "@/types/ddbx";

import { Link } from "react-router-dom";

import { filingPath, money } from "../../../shared/filings.js";

import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { StatTiles } from "@/components/seo/stat-tiles";
import { companyPath, displayTicker } from "@/lib/company";

const RULE = "border-hairline dark:border-separator";

export function WeeklyCards({
  cards,
  currency = "GBP",
}: {
  cards: WeeklyCard[];
  currency?: string;
}) {
  return (
    <div className="mt-8">
      {cards.map((card, i) => (
        <article
          key={`${card.kind}-${i}`}
          className={`${i > 0 ? `mt-8 border-t ${RULE} pt-8` : ""}`}
        >
          {/* The card's own eyebrow, cased down to the house spec. The pipeline
              emits it upper-case ("BIGGEST CHEQUE") and the CSS does the
              uppercasing, so shouting it twice is avoided. */}
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown dark:text-brand-tan">
            {card.copy.eyebrow}
          </p>
          <h3 className="mt-2 text-balance text-[19px] font-semibold leading-[1.25] tracking-[-0.015em] text-foreground sm:text-[22px]">
            {card.copy.headline}
          </h3>
          {card.copy.subhead ? (
            <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.65] text-foreground/70">
              {card.copy.subhead}
            </p>
          ) : null}

          <CardBody card={card} currency={currency} />
        </article>
      ))}
    </div>
  );
}

function CardBody({ card, currency }: { card: WeeklyCard; currency: string }) {
  if (card.kind === "week_in_numbers" && card.stats) {
    const s = card.stats;

    // No "total value" tile. The card's own headline IS the total ("£3.87m of
    // insider buying"), so a tile beside it restated the same figure — and at a
    // different precision, because the headline is authored to two decimals and
    // `money` rounds millions to one. Two numbers for one quantity, disagreeing
    // by £30k, in the same viewport.
    return (
      <StatTiles
        className="mt-5"
        cols={3}
        stats={[
          { label: "Buys", value: s.buy_count ?? 0, primary: true },
          { label: "Companies", value: s.company_count ?? 0 },
          { label: "Insiders", value: s.insider_count ?? 0 },
        ]}
      />
    );
  }

  // Every other card kind that names a filing gets the subject plus whatever
  // else it cited, as links. The digest is the only place on the site that
  // picks out individual filings editorially, and now that each has a page
  // those picks are the strongest internal links we publish.
  const rows = [card.subject, ...(card.related ?? [])].filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <ul className={`mt-5 border-t ${RULE}`}>
      {rows.map((r) => (
        <li
          key={r!.dealing_id}
          className={`flex items-center gap-3 border-b ${RULE} py-2.5`}
        >
          {r!.ticker ? (
            <CompanyLogo className="shrink-0" size={22} ticker={r!.ticker} />
          ) : null}
          <span className="min-w-0 flex-1">
            <Link
              className="text-[13.5px] text-foreground/85 underline-offset-4 hover:underline"
              to={filingPath(r!.dealing_id)}
            >
              {r!.insider_name}
              {r!.insider_role ? `, ${r!.insider_role}` : ""}
            </Link>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-foreground/45">
              {r!.ticker ? (
                <Link to={companyPath(r!.ticker)}>
                  <TickerPill ticker={displayTicker(r!.ticker)} />
                </Link>
              ) : null}
              <span>{r!.company}</span>
            </span>
          </span>
          <span className="shrink-0 text-right text-[13px] tabular-nums text-foreground/70">
            {money(r!.value ?? 0, currency)}
            <span className="mt-0.5 block text-[12px] text-foreground/45">
              {r!.disclosed_date}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
