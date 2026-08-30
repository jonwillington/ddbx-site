/** The glossary — /learn (index) and /learn/:slug (entry).
 *
 *  Content lives in shared/glossary.js so functions/learn/[slug].js and
 *  functions/learn/index.js render the same words. Three things about this
 *  family are load-bearing:
 *
 *  1. Every entry has ONE owning domain. UK/EU regulatory terms belong to
 *     ddbx.uk, US ones to ddbx.us, and jurisdiction-free concepts get a single
 *     owner rather than being published on both. Otherwise the same text exists
 *     at three URLs across three domains, competing with itself.
 *
 *  2. Ownership decides the DATA too, not just the URL. The live examples under
 *     an entry come from the market that owns it — /learn/form-4 shows Form 4
 *     purchases whichever domain served it, because a US concept illustrated
 *     with UK RNS filings in pounds is simply wrong, and the reader who
 *     followed a link from ddbx.uk is the one most likely to be misled by it.
 *     The rail is the deliberate exception: the data follows the entry, the
 *     commercial furniture follows the reader — see useRailMarketId.
 *
 *  3. Every entry that honestly can ends with live filings. A definition of
 *     "PDMR" on its own loses to the FCA handbook and Wikipedia; the same
 *     definition followed by the PDMR purchases disclosed this week is
 *     something only we can publish. Entries where no honest example exists —
 *     closed periods, 10b5-1 plans — set liveData to null rather than forcing
 *     one, and lean on a term-specific CTA instead.
 */
import type { GlossaryEntry } from "../../shared/glossary";
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  canonicalUrlForEntry,
  entriesForHost,
  entryBySlug,
  formatUpdated,
  groupEntries,
  learnPath,
  ownerForHost,
  ENTRIES,
} from "../../shared/glossary.js";
import {
  isEligibleBuy,
  buyPerson,
  buyValue,
} from "../../shared/leaderboard.js";
import { windowStart } from "../../shared/sectors.js";

import { money, R } from "@/components/sector-ui";
import { ClusterChip } from "@/components/cluster-chip";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { learnCta, learnIndexCta } from "@/components/seo/cta-copy";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { Skeleton } from "@/components/skeleton";
import { TickerPill } from "@/components/ticker-pill";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import {
  cleanCompanyName,
  cleanInsiderName,
  companyPath,
  displayTicker,
} from "@/lib/company";
import {
  compareDealingsNewestFirst,
  formatDisclosedCompact,
} from "@/lib/dealing-dates";
import { marketForPath } from "@/lib/markets/registry";

const EYEBROW = "Glossary";

/** The feed an entry's examples come from, chosen by the entry's owner rather
 *  than by the domain the request landed on. See the header, point 2. */
const MARKET = {
  uk: { id: "UK" as const, symbol: "£" },
  us: { id: "US" as const, symbol: "$" },
};

/** Host the browser is on. On localhost and preview builds nothing owns the
 *  glossary, so the index falls back to showing everything rather than
 *  rendering an empty page in development. */
function useHost(): string {
  return typeof window === "undefined" ? "" : window.location.hostname;
}

/** Market for the rail — the READER's, resolved from the domain exactly as the
 *  sector and report pages resolve theirs, and deliberately NOT the entry's
 *  owner.
 *
 *  `SeoRail` reads `"uk"` as "render the affiliate broker directory", which is
 *  UK-only editorial. Choosing that market from the entry meant `ddbx.us` and
 *  `ddbx.eu` served UK platform links on the seven UK-owned entries, while a UK
 *  reader on the three US-owned ones lost the broker rail and got US App Store
 *  buttons instead. Ownership decides the data, not the furniture.
 *
 *  The full market id, uncoerced: `ddbx.eu` resolves to `se`, which is the part
 *  that keeps the UK affiliate directory off that host, and `SeoRail` takes any
 *  id (its StoreButtons fall back to the UK app for SE and NL). `/learn` has no
 *  market-prefixed route, so the host is the only signal — hence the "/" path,
 *  which also keeps localhost and preview builds on the UK rail. */
function useRailMarketId(): string {
  return useMemo(
    () =>
      marketForPath(
        "/",
        typeof window === "undefined" ? undefined : window.location.hostname,
      ).id,
    [],
  );
}

/** Entries this host publishes, or all of them where nothing is owned. */
function useEntries(host: string): GlossaryEntry[] {
  const owned = entriesForHost(host);

  return owned.length > 0 ? owned : ENTRIES;
}

/** The index's grouped list, also used by the not-found state — a reader who
 *  hit a dead slug wants the contents page, not an apology. */
function EntryList({ entries }: { entries: GlossaryEntry[] }) {
  const groups = groupEntries(entries);

  return (
    <div className="mt-10">
      {groups.map((g) => (
        <section key={g.id} className="mt-9 first:mt-0">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
            {g.label}
          </h2>
          <ul className={`mt-3 border-t ${R.rule}`}>
            {g.entries.map((e) => (
              <li key={e.slug} className={`border-b ${R.rule}`}>
                {/* The whole row is the target. A 17px underlined title with
                    inert description text beneath it gave the list a ~20px
                    tap area and no hover affordance on the part of the row a
                    reader actually points at. */}
                <Link
                  className="-mx-3 block rounded-lg px-3 py-4 transition-colors hover:bg-foreground/[0.03] dark:hover:bg-white/[0.04]"
                  to={learnPath(e.slug)}
                >
                  <span className="block text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                    {e.title}
                  </span>
                  <span className="mt-1.5 block max-w-[62ch] text-[14px] leading-[1.65] text-foreground/60">
                    {e.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function LearnIndexPage() {
  const host = useHost();
  const entries = useEntries(host);
  const railMarketId = useRailMarketId();
  // The band's store links are a UK/US choice — those are the two listings —
  // so an EU reader is offered the UK app rather than nothing.
  const ctaMarketId = ownerForHost(host) === "us" ? "us" : "uk";

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={railMarketId}
        placement="learn_index_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={{
          ...learnIndexCta,
          gaLabel: "Learn · index",
          marketId: ctaMarketId,
        }}
        eyebrow={EYEBROW}
        standfirst="What the filings mean, which disclosures are actually purchases, and how much a director buying their own shares really tells you."
        standfirstSize="lede"
        title="Understanding insider dealing"
      >
        <EntryList entries={entries} />
      </SeoPageShell>
    </DefaultLayout>
  );
}

export default function LearnEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const entry = useMemo(() => entryBySlug(slug ?? ""), [slug]);
  const host = useHost();
  const owner = ownerForHost(host);
  const fallbackEntries = useEntries(host);
  const railMarketId = useRailMarketId();

  if (!entry) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={railMarketId}
          placement="learn_index_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          eyebrow={EYEBROW}
          standfirst="That explainer doesn’t exist. It may have been renamed. Everything we’ve written is below."
          title="We haven’t written that one"
        >
          <EntryList entries={fallbackEntries} />
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  // Reached on a domain that doesn't own this entry — the edge already
  // canonicalises and noindexes it, so all the page owes the reader is a way
  // across to the copy that does belong here.
  const foreign = owner !== null && owner !== entry.owner;
  const canonical = canonicalUrlForEntry(entry);
  // Entry-specific line where the glossary supplies one — "know the moment the
  // window reopens" sells harder on /learn/closed-period than the generic
  // fallback — otherwise the family default built from the entry's own term.
  const cta = entry.cta ?? learnCta(entry.ctaTerm ?? entry.term.toLowerCase());
  const [lede, ...rest] = entry.body;

  const related = entry.related
    .map((s) => entryBySlug(s))
    .filter((e): e is GlossaryEntry => Boolean(e));

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={railMarketId}
        placement="learn_entry_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        crumbs={[{ label: "Learn", to: "/learn" }, { label: entry.term }]}
        cta={{
          ...cta,
          gaLabel: `Learn · ${entry.slug}`,
          // The one place the band and the rail disagree, deliberately: the
          // app offered is the one that covers the concept being explained.
          // The UK app has no Form 4 data, so /learn/form-4 offers the US app
          // whichever domain served it.
          marketId: entry.owner === "us" ? "us" : "uk",
        }}
        eyebrow={EYEBROW}
        notice={
          <>
            <p className="text-[11px] leading-[1.6] text-foreground/45">
              Last reviewed {formatUpdated(entry.updated)}
            </p>
            {foreign && canonical ? (
              // A warning set in the same faint grey as a caption isn't a
              // warning, and one that names the other domain without linking
              // to it asks the reader to retype a URL.
              <p className="mt-3 rounded-xl border border-hairline bg-sheet px-4 py-3 text-[13px] leading-[1.6] text-foreground/70 dark:border-white/[0.07] dark:bg-surface">
                This is a {entry.owner === "uk" ? "UK/EU" : "US"} concept. The
                canonical version lives on{" "}
                <a
                  className="font-medium text-foreground underline underline-offset-4"
                  href={canonical}
                >
                  {entry.owner === "uk" ? "ddbx.uk" : "ddbx.us"}
                </a>
                .
              </p>
            ) : null}
          </>
        }
        title={entry.title}
      >
        {/* The definition on its own, before the argument starts. A reader who
            wanted one sentence gets it without reading four paragraphs, and
            it's the unit a search result can lift whole. */}
        <p className="mt-6 rounded-2xl border border-hairline bg-sheet px-5 py-4 text-[15px] leading-[1.6] text-foreground/85 dark:border-white/[0.07] dark:bg-surface">
          {entry.oneLiner}
        </p>

        <div className="mt-7">
          {/* The opening paragraph carries the page's thesis, so it's set as
              one — the body that follows steps back a size rather than running
              at a flat 14px from the h1 down. */}
          <p className="max-w-[64ch] text-[16.5px] leading-[1.6] tracking-[-0.006em] text-foreground/85">
            {lede}
          </p>
          <div className="mt-4 space-y-4">
            {rest.map((para) => (
              <p
                key={para}
                className="max-w-[64ch] text-[15px] leading-[1.7] text-foreground/80"
              >
                {para}
              </p>
            ))}
          </div>
        </div>

        {entry.liveData ? (
          <LiveExamples
            heading={entry.liveHeading ?? "Recent examples"}
            kind={entry.liveData}
            owner={entry.owner}
          />
        ) : null}

        {related.length > 0 ? (
          <SeoSection title="Related">
            <RelatedCards
              items={related.map((e) => ({
                // Owner-aware, matching the pre-render: a related entry this
                // domain doesn't publish is linked absolutely at the host that
                // does, rather than to a path that would land on a noindexed
                // duplicate of it here.
                to:
                  owner !== null && e.owner !== owner
                    ? (canonicalUrlForEntry(e) ?? learnPath(e.slug))
                    : learnPath(e.slug),
                // The entry's term, not its SEO title. "MAR Article 19" is a
                // label you can scan; "MAR Article 19: managers' transactions
                // explained" is a headline that clamps to two lines in a card.
                title: e.term,
                description: e.description,
              }))}
            />
          </SeoSection>
        ) : null}

        {entry.sources && entry.sources.length > 0 ? (
          <SeoSection
            aside="The primary instrument, not our summary of it."
            title="Sources"
          >
            <ul className="space-y-2">
              {entry.sources.map((s) => (
                <li key={s.url}>
                  <a
                    className="text-[14.5px] text-foreground/85 underline underline-offset-4 hover:text-foreground"
                    href={s.url}
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </SeoSection>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** A row honest to print under a heading about purchases.
 *
 *  `api.dealingsWindow` serves the raw UK feed: disposals as well as buys, plus
 *  the scheme awards, placings and option exercises that carry
 *  `is_open_market_buy === false`. Unfiltered, "Recent PDMR purchases" printed
 *  sells and share allotments as bare money figures — the exact mistake
 *  /learn/open-market-buy spends four paragraphs telling readers not to make.
 *
 *  Softer than `isEligibleBuy`, deliberately: a row we can't price yet (the
 *  flag is `null`) is kept, because these are six illustrations of a concept
 *  rather than a leaderboard, and the strict test would empty the section in a
 *  quiet week. US rows pass through — /api/us-dealings is already restricted to
 *  Form 4 code-P acquisitions upstream, and they carry no `tx_type` to test. */
function isPurchase(d: Dealing | UsDealing): boolean {
  if (!("tx_type" in d)) return true;

  return d.tx_type === "buy" && d.is_open_market_buy !== false;
}

/** Real filings under the concept just described. The part of the entry that
 *  isn't a dictionary.
 *
 *  No ranking meter here, deliberately: these are examples of a concept, and a
 *  bar chart implies the biggest one is the most illustrative, which it isn't.
 */
function LiveExamples({
  kind,
  heading,
  owner,
}: {
  kind: "clusters" | "open-market" | "recent";
  heading: string;
  /** The ENTRY's owner. Not the host's — see the file header. */
  owner: "uk" | "us";
}) {
  const market = MARKET[owner];
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);

  useEffect(() => {
    let live = true;
    const since = windowStart(new Date());
    const load: Promise<Array<Dealing | UsDealing>> =
      market.id === "US"
        ? api.usDealings({ since, limit: 1000 }).then((r) => r.dealings)
        : api.dealingsWindow(since, 1000);

    load.then((d) => live && setRows(d)).catch(() => live && setRows([]));

    return () => {
      live = false;
    };
  }, [market.id]);

  const examples = useMemo(() => {
    let pool = rows ?? [];

    if (kind === "clusters") pool = pool.filter((d) => d.cluster);
    if (kind === "open-market")
      pool = pool.filter((d) => isEligibleBuy(d, market.id));
    if (kind === "recent") pool = pool.filter(isPurchase);

    // By the date the row actually prints. Disclosure lags the trade by days in
    // the UK and up to two business days on a Form 4, so sorting on trade_date
    // under a heading that says "most recent" rendered a visible date column
    // that wasn't in order. The window bound is a disclosed_date too.
    return [...pool].sort(compareDealingsNewestFirst).slice(0, 6);
  }, [rows, kind, market.id]);

  const loading = rows === null;

  // Gate the whole section, heading included. An entry whose filter matches
  // nothing — a quiet week for clusters — must render no trace of a section
  // rather than a heading standing over nothing.
  if (!loading && examples.length === 0) return null;

  return (
    <SeoSection
      aside="The six most recent from the last twelve months."
      title={heading}
    >
      <ul className={`border-t ${R.rule}`}>
        {loading
          ? Array.from({ length: 6 }, (_, i) => (
              // Row-shaped, so arriving data fills the list in rather than
              // replacing one short block with 300px of rows.
              <li
                key={i}
                aria-busy="true"
                className={`flex items-center gap-4 border-b ${R.rule} py-3`}
              >
                <Skeleton circle className="shrink-0" h={22} w={22} />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-[14px] w-2/5 max-w-[200px]" />
                  <Skeleton className="mt-2 h-[11px] w-3/5 max-w-[260px]" />
                </div>
                <Skeleton className="h-[15px] w-14 shrink-0" />
              </li>
            ))
          : examples.map((d, i) => (
              <ExampleRow key={d.id ?? i} deal={d} symbol={market.symbol} />
            ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <Link
          className="text-[13.5px] font-medium text-foreground underline-offset-4 hover:underline"
          to="/biggest-buys"
        >
          See all recent purchases &rarr;
        </Link>
        <LogoDevAttribution />
      </div>
    </SeoSection>
  );
}

/** One example filing. Same row grammar as the leaderboard minus the rank and
 *  the meter — logo, name, ticker, who and when, what it cost. */
function ExampleRow({
  deal: d,
  symbol,
}: {
  deal: Dealing | UsDealing;
  symbol: string;
}) {
  const ticker = displayTicker(d.ticker ?? "");
  const name = cleanCompanyName(d.company ?? "") || ticker;
  const person = cleanInsiderName(buyPerson(d) ?? "");

  return (
    <li className={`flex items-baseline gap-4 border-b ${R.rule} py-3`}>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <CompanyLogo size={22} ticker={d.ticker ?? ""} />
          <Link
            className="truncate text-[14.5px] font-medium text-foreground underline-offset-4 hover:underline"
            title={name}
            to={companyPath(d.ticker ?? "")}
          >
            {name}
          </Link>
          <TickerPill ticker={ticker} />
          <ClusterChip cluster={d.cluster} />
        </span>
        <span className={`mt-1 block truncate ${R.label}`} title={person}>
          {person || "—"} &middot; {formatDisclosedCompact(d.disclosed_date)}
        </span>
      </span>

      <span className="shrink-0 text-[14.5px] font-semibold tabular-nums text-foreground">
        {money(buyValue(d), symbol)}
      </span>
    </li>
  );
}
