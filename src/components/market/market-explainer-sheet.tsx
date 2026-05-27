import { SparklesIcon } from "@heroicons/react/24/outline";

import { AppDrawer } from "@/components/app-drawer";
import { marketCopyFor } from "@/lib/markets/market-copy";

/** "What are we looking for?" — the explainer opened from the hero button.
 *  Web sibling of the iOS LogoSheet. Three parts: why insider buys matter, how
 *  the market is localised (exchange / regulator / filer noun), and the
 *  six-point checklist a buy is scored against. The checklist mirrors
 *  RatingChecklist in ddbx-data (worker/db/types.ts) and the iOS
 *  RatingChecklist.labels — same six checks UK/US/EU all use, so the copy
 *  describes the shared methodology rather than any one market's pipeline. */
export function MarketExplainerSheet({
  open,
  onClose,
  marketId,
}: {
  open: boolean;
  onClose: () => void;
  marketId: string;
}) {
  const c = marketCopyFor(marketId);
  const insidersTitle =
    c.insiderTermPlural.charAt(0).toUpperCase() + c.insiderTermPlural.slice(1);

  // The six checks, in the order they're scored. Mirrors CHECKLIST_KEYS in
  // ddbx-data/worker/pipeline/analyze.ts; labels match the iOS sheet.
  const checklist: { title: string; body: string }[] = [
    {
      title: "Open-market buy",
      body: "They paid for the shares themselves on the open market. Not an option grant, a vesting, or an internal transfer.",
    },
    {
      title: "Senior insider",
      body: "The buyer is a CEO, CFO, or a board member close to the business, not a junior name on the register.",
    },
    {
      title: "Meaningful conviction",
      body: "The amount is large relative to what they earn, so it reads as a real commitment rather than a token.",
    },
    {
      title: "No scheme or plan",
      body: "Nothing mechanical explains the timing: no dividend reinvestment, no pre-arranged trading plan, no contractual or tax deadline.",
    },
    {
      title: "Supporting context",
      body: "Either there is news that makes the timing make sense, or nothing public argues against it. A buy in a quiet period can be the strongest kind.",
    },
    {
      title: "No major counter-signal",
      body: "Nothing serious points the other way: no other insiders selling at the same time, no open investigation, no sign the business is still getting worse.",
    },
  ];

  return (
    <AppDrawer
      maxWidthClass="max-w-lg"
      open={open}
      subtitle={c.exchangeFullName}
      title="What are we looking for?"
      onClose={onClose}
    >
      <div className="space-y-7">
        {/* Thesis */}
        <p className="text-[15px] leading-relaxed text-foreground/90">
          {insidersTitle} know their companies better than the market does. When
          one buys shares with their own money, it is worth paying attention to.
        </p>

        {/* Localisation */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Built for {c.regionName}</h3>
          <p className="text-sm leading-relaxed text-foreground/70">
            Markets do not file the same way. {c.regionName} discloses through{" "}
            {c.regulatorFullName}, on {c.exchangeFullName}, by the people local
            rules call {c.insiderTermPlural}. We read those filings in their own
            format and standardise them here.
          </p>
          <dl className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <MetaRow label="Exchange" value={c.exchangeFullName} />
            <MetaRow label="Disclosures" value={c.regulatorFullName} />
            <MetaRow
              label="Who files"
              value={
                c.insiderNote
                  ? `${c.insiderTermPlural} — ${c.insiderNote}`
                  : c.insiderTermPlural
              }
            />
          </dl>
        </section>

        {/* The six-point checklist */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">The six-point checklist</h3>
          <p className="text-sm leading-relaxed text-foreground/70">
            Six things we look for in any {c.insiderTerm} purchase. A buy that
            clears all six is what we rate highest; the more it misses, the
            further it sinks down the list.
          </p>
          <ol className="space-y-3">
            {checklist.map((item, i) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6b5038]/12 text-xs font-semibold text-[#6b5038] dark:bg-[#c4a882]/15 dark:text-[#c4a882]">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground/70">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Still tuning */}
        <section className="flex gap-3 rounded-xl border border-[#6b5038]/20 bg-[#6b5038]/[0.06] p-4 dark:border-[#c4a882]/25 dark:bg-[#c4a882]/[0.08]">
          <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#6b5038] dark:text-[#c4a882]" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold">Still tuning</h3>
            <p className="text-sm leading-relaxed text-foreground/70">
              The checklist is not fixed. As we see which buys actually go on to
              perform, we adjust what each check looks for, so a buy&apos;s
              rating can change over time.
            </p>
          </div>
        </section>
      </div>
    </AppDrawer>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-right text-sm text-foreground/85">{value}</dd>
    </div>
  );
}
