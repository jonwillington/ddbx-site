/** The glossary — /learn (index) and /learn/:slug (entry).
 *
 *  Content lives in shared/glossary.js so functions/learn/[slug].js renders the
 *  same words. Two things about this family are load-bearing:
 *
 *  1. Every entry has ONE owning domain. UK/EU regulatory terms belong to
 *     ddbx.uk, US ones to ddbx.us, and jurisdiction-free concepts get a single
 *     owner rather than being published on both. Otherwise the same text exists
 *     at three URLs across three domains, competing with itself.
 *
 *  2. Every entry that honestly can ends with live filings. A definition of
 *     "PDMR" on its own loses to the FCA handbook and Wikipedia; the same
 *     definition followed by the PDMR purchases disclosed this week is
 *     something only we can publish. Entries where no honest example exists —
 *     closed periods, 10b5-1 plans — set liveData to null rather than forcing
 *     one.
 */
import type { GlossaryEntry } from "../../shared/glossary";
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  entriesForHost,
  entryBySlug,
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

import { money, R, useSectorMarket } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";

/** Host the browser is on. On localhost and preview builds nothing owns the
 *  glossary, so the index falls back to showing everything rather than
 *  rendering an empty page in development. */
function useHost(): string {
  return typeof window === "undefined" ? "" : window.location.hostname;
}

export function LearnIndexPage() {
  const host = useHost();
  const owned = entriesForHost(host);
  const entries: GlossaryEntry[] = owned.length > 0 ? owned : ENTRIES;

  return (
    <DefaultLayout>
      <div className="mx-auto w-full max-w-[860px] pb-16">
        <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          Understanding insider dealing
        </h1>
        <p className={`mt-4 max-w-[62ch] ${R.body}`}>
          What the filings mean, which disclosures are actually purchases, and
          how much a director buying their own shares really tells you.
        </p>

        <ul className={`mt-10 border-t ${R.rule}`}>
          {entries.map((e) => (
            <li key={e.slug} className={`border-b ${R.rule} py-5`}>
              <Link
                className="text-[17px] font-semibold tracking-[-0.01em] text-foreground underline-offset-4 hover:underline"
                to={learnPath(e.slug)}
              >
                {e.title}
              </Link>
              <p className={`mt-1.5 max-w-[62ch] ${R.body}`}>{e.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </DefaultLayout>
  );
}

export default function LearnEntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const entry = useMemo(() => entryBySlug(slug ?? ""), [slug]);
  const host = useHost();
  const owner = ownerForHost(host);

  if (!entry) {
    return (
      <DefaultLayout>
        <p className="mx-auto max-w-3xl py-20 text-base text-foreground/65">
          We haven’t written that one.{" "}
          <Link className="underline" to="/learn">
            See every explainer
          </Link>
          .
        </p>
      </DefaultLayout>
    );
  }

  // Reached on a domain that doesn't own this entry — the edge already
  // canonicalises and noindexes it, so all the page owes the reader is a way
  // across to the copy that does belong here.
  const foreign = owner !== null && owner !== entry.owner;

  return (
    <DefaultLayout>
      <article className="mx-auto w-full max-w-[860px] pb-16">
        <nav className={`${R.label} pt-2`}>
          <Link className="hover:text-foreground/70" to="/learn">
            Learn
          </Link>
          <span className="mx-1.5 opacity-40">/</span>
          <span>{entry.term}</span>
        </nav>

        <h1 className="mt-5 text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[38px]">
          {entry.title}
        </h1>

        {foreign && (
          <p className={`mt-4 ${R.label} leading-[1.6]`}>
            This is a {entry.owner === "uk" ? "UK/EU" : "US"} concept — the
            canonical version lives on{" "}
            {entry.owner === "uk" ? "ddbx.uk" : "ddbx.us"}.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {entry.body.map((para) => (
            <p key={para} className={`max-w-[64ch] ${R.body}`}>
              {para}
            </p>
          ))}
        </div>

        {entry.liveData && (
          <LiveExamples
            heading={entry.liveHeading ?? "Recent examples"}
            kind={entry.liveData}
          />
        )}

        <section className={`mt-10 border-t ${R.rule} pt-7`}>
          <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-foreground">
            Related
          </h2>
          <ul className="mt-4 space-y-1.5">
            {entry.related
              .map((s) => entryBySlug(s))
              .filter((e): e is GlossaryEntry => Boolean(e))
              .map((e) => (
                <li key={e.slug}>
                  <Link
                    className="text-[14.5px] text-foreground/85 underline-offset-4 hover:underline"
                    to={learnPath(e.slug)}
                  >
                    {e.title}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </article>
    </DefaultLayout>
  );
}

/** Real filings under the concept just described. The part of the entry that
 *  isn't a dictionary. */
function LiveExamples({
  kind,
  heading,
}: {
  kind: "clusters" | "open-market" | "recent";
  heading: string;
}) {
  const market = useSectorMarket();
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

    return [...pool]
      .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))
      .slice(0, 6);
  }, [rows, kind, market.id]);

  // Nothing honest to show — render nothing rather than an empty heading.
  if (rows !== null && examples.length === 0) return null;

  return (
    <section className={`mt-10 border-t ${R.rule} pt-7`}>
      <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-foreground">
        {heading}
      </h2>
      {rows === null ? (
        <div className="mt-4 h-24 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <ul className={`mt-4 border-t ${R.rule}`}>
          {examples.map((d, i) => (
            <li
              key={d.id ?? i}
              className={`flex items-baseline justify-between gap-4 border-b ${R.rule} py-2.5`}
            >
              <span className="min-w-0">
                <Link
                  className="text-[14px] text-foreground/85 underline-offset-4 hover:underline"
                  to={companyPath(d.ticker ?? "")}
                >
                  {cleanCompanyName(d.company ?? "") ||
                    displayTicker(d.ticker ?? "")}
                </Link>
                <span className={`mt-0.5 block ${R.label}`}>
                  {buyPerson(d) ?? "—"} · {d.trade_date}
                  {d.cluster?.tier && ` · ${d.cluster.tier} cluster`}
                </span>
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-foreground/70">
                {money(buyValue(d), market.symbol)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
