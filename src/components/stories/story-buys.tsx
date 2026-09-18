import type { Story, StoryBuy } from "@/types/ddbx";

import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { DeltaBadge } from "@/components/market/market-row";
import { RatingBadge } from "@/components/rating-badge";
import { localeFor, moneyShort } from "@/lib/company-format";
import { resolveStoryLink } from "@/lib/stories";
import type { ReturnBasis } from "@/components/stories/story-stage";

/** The purchases behind a story, as the exhibit the prose argues about.
 *
 *  Above the writing rather than under it. The reader's first question is who
 *  bought, when, at what, and where it is now; the article then argues about
 *  those rows and refers back to them. At the foot it is an appendix nobody
 *  reaches, which is how the filing page and the monthly report both order the
 *  same material: the record first, the argument after.
 *
 *  No logo per row. The company is constant on a story page and was already
 *  drawn beside the headline; twelve identical discs is the data-dump tell.
 *
 *  Delivered order is kept, newest first. Re-sorting by return would be
 *  marketing, and on an accumulation story the consecutive rows carrying the
 *  same name ARE the story.
 */

function priceLabel(b: StoryBuy, market: Story["market"]): string {
  if (b.price == null) return "—";

  return market === "US"
    ? `$${b.price.toFixed(2)}`
    : `${b.price < 10 ? b.price.toFixed(2) : b.price.toFixed(1)}p`;
}

export function StoryBuys({
  story,
  basis,
}: {
  story: Story;
  /** Which "now" the Since buy column means, shared with the stage's toggle so
   *  the page never shows two different ones at once. */
  basis: ReturnBasis;
}) {
  const buys = story.buys;

  if (buys.length === 0) return null;

  const currency = story.market === "US" ? "USD" : "GBP";
  const published = story.published_at
    ? new Date(story.published_at.replace(" ", "T"))
    : null;
  const asOf = (
    basis === "today" || !published ? new Date() : published
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="mt-9">
      <h2 className="border-t border-hairline pt-7 text-[17px] font-semibold text-foreground dark:border-separator">
        The purchases
      </h2>

      <BoardRowHeader
        className="mt-6"
        facts={["Paid", "Value"]}
        lead="date"
        leadLabel="Bought"
        logo={false}
        perf="Since buy"
        subject="Insider"
      />

      <BoardRowList>
        {buys.map((b) => (
          <BoardRow
            key={b.deal_id}
            date={{ iso: b.trade_date, locale: localeFor(story.market) }}
            facts={[
              { label: "Paid", value: priceLabel(b, story.market) },
              {
                label: "Value",
                value: b.value == null ? "—" : moneyShort(b.value, currency),
              },
            ]}
            name={
              <span className="flex flex-wrap items-center gap-2">
                <span>{b.director}</span>
                {b.rating ? (
                  <RatingBadge rating={b.rating as never} />
                ) : null}
              </span>
            }
            perf={
              (basis === "today" ? b.return_pct : b.return_pct_at_publish) !=
              null ? (
                <DeltaBadge
                  value={
                    (basis === "today"
                      ? b.return_pct
                      : b.return_pct_at_publish) as number
                  }
                />
              ) : (
                /* Never an em dash here: a missing mark is a state, and the
                   house style bans the character anyway. */
                <span className="text-[12px] text-foreground/45">
                  No mark yet
                </span>
              )
            }
            secondary={
              b.role ? (
                <span className="text-[13px] text-foreground/60">{b.role}</span>
              ) : undefined
            }
            to={
              resolveStoryLink(`ddbx://filing/${story.market}/${b.deal_id}`)
                .href
            }
          />
        ))}
      </BoardRowList>

      <p className="mt-3 text-[12px] leading-[1.5] text-foreground/45">
        Measured from each buy&rsquo;s trade-date close to the close on {asOf}
        {basis === "today" ? " (today)" : " (the day this published)"}. Prices
        come from the daily panel at both ends, not from the filed price.
      </p>
    </section>
  );
}
