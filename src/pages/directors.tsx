/** The insider directory — /directors (UK) and /us/directors (SEC Form 4).
 *
 *  This path rendered the US Congress preview until 2026-09-16. `/congress` had
 *  been a live alias for it for months, and `/directors/:id` has always meant a
 *  UK insider, so the bare path was answering for the one market a reader
 *  typing it would not expect. Reclaiming it gives the per-insider pages the
 *  hub they never had: until now nothing linked to them in crawlable HTML and
 *  they were absent from the sitemap, so the whole family had no route in.
 *
 *  The publishing bar lives in `shared/directors.js` and is applied by three
 *  things — this page, the pre-render Function and the sitemap — so a person is
 *  never advertised in one place and withheld in another. Everyone we hold a
 *  purchase for is LISTED here; the bar only decides whose page is indexable.
 *
 *  MARKET-AWARE, one implementation. /directors is UK, /us/directors is the SEC
 *  Form 4 directory. The two markets differ in what the rows MEAN rather than
 *  in how they are listed — a UK row is a board director at their own company,
 *  and a US row is as likely to be an investment vehicle filing as a
 *  ten-percent owner — so the copy changes and the shape does not.
 */
import type { DirectorIndexRow } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  directorMeetsBar,
  directorPath,
  INDEX_ROWS,
  MIN_DIRECTOR_BUYS,
} from "../../shared/directors.js";
import { usInsiderDisplayName } from "../../shared/us-names.js";

import { CompanyLogo } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { StatTiles } from "@/components/seo/stat-tiles";
import { directorIndexCta } from "@/components/seo/cta-copy";
import { R } from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { api } from "@/lib/api";
import { cleanCompanyName, displayTicker } from "@/lib/company";
import { displayCompany } from "@/lib/display-name";
import { marketForPath } from "@/lib/markets/registry";

/** What the two markets call their filers, and what the page promises. The US
 *  directory cannot borrow the UK's title: its biggest filers are Cascade
 *  Investment, HRT Financial and Donegal Mutual, so "directors who buy shares
 *  in their own companies" would be plainly false. */
const COPY = {
  uk: {
    eyebrow: "Insider directory",
    title: "UK directors who buy shares in their own companies",
    standfirst:
      "Every UK director and senior manager we hold a disclosed open-market purchase for. Each page shows what they bought in their own company, what they paid, and how each purchase has done since it was disclosed.",
    noun: "insiders",
    filer: "insider",
    rule: "UK rules oblige a director or senior manager to disclose dealings in their own company’s shares within days, and every purchase counted here comes from that public record.",
  },
  us: {
    eyebrow: "Form 4 directory",
    title: "US insiders who buy shares in their own companies",
    standfirst:
      "Every officer, director and ten-percent owner we hold a disclosed open-market purchase for, from SEC Form 4 filings. Each page shows what they bought, what they paid, and how each purchase has done since it was disclosed.",
    noun: "insiders",
    filer: "insider",
    rule: "US rules oblige an officer, director or ten-percent owner to file a Form 4 within two business days of dealing in their own company’s shares, and every purchase counted here comes from that public record. A ten-percent owner is often a fund or a holding company rather than an individual, and those file here too.",
  },
} as const;

export default function DirectorsIndexPage() {
  const location = useLocation();
  const market = marketForPath(location.pathname);
  const marketId = market.id === "us" ? "us" : "uk";
  const copy = COPY[marketId];
  const [rows, setRows] = useState<DirectorIndexRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    setRows(null);
    setFailed(false);
    api
      .directorsIndex(marketId)
      .then((r) => live && setRows(r.directors ?? []))
      .catch(() => live && setFailed(true));

    return () => {
      live = false;
    };
  }, [marketId]);

  const totals = useMemo(() => {
    const all = rows ?? [];

    return {
      buys: all.reduce((n, r) => n + r.buys, 0),
      published: all.filter(directorMeetsBar).length,
      resolved: all.filter((r) => r.resolved > 0).length,
    };
  }, [rows]);

  // TWO LISTS, NOT ONE RANKED BY RECENCY.
  //
  // The API returns most-recently-active first, and on a market where most
  // insiders have filed once that put a run of "1 purchase · — measured" at
  // the top of the page: honest, and a poor account of what the directory is
  // for. The people whose pages actually say something are the ones who clear
  // the bar, so they lead, and the bar stops being a sentence in the small
  // print and becomes the visible structure of the page.
  //
  // Both lists keep the API's recency order within themselves.
  // EDGAR files names SHOUTED and surname-first, and issuer names shouted.
  // The UK feed needs neither treatment, so both are market-gated rather than
  // applied to every row on the way in.
  const personName = (n: string) =>
    marketId === "us" ? usInsiderDisplayName(n) : n;
  // `displayCompany` is the house treatment and already knows the two US
  // traps: an issuer whose whole name IS its ticker stays capitalised (IMI, not
  // Imi), and everything else is recased only if it was shouted. It does leave
  // "PPG INDUSTRIES INC" as "Ppg Industries Inc" — that is what the US market
  // list has always shown, so the directory matches it rather than inventing a
  // second convention for the same issuer.
  const issuerName = (n: string, ticker: string) =>
    marketId === "us" ? displayCompany(n, ticker) : cleanCompanyName(n);

  const { qualified, others } = useMemo(() => {
    const all = rows ?? [];

    return {
      qualified: all.filter(directorMeetsBar),
      others: all.filter((r) => !directorMeetsBar(r)).slice(0, INDEX_ROWS),
    };
  }, [rows]);

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId={marketId} placement="directors_rail" />
      <SeoPageShell
        crumbs={[{ label: "Insiders" }]}
        cta={{
          body: directorIndexCta.body,
          gaLabel: "Director index",
          headline: directorIndexCta.headline,
          marketId,
        }}
        eyebrow={copy.eyebrow}
        loading={rows === null && !failed}
        skeleton={
          <>
            <SeoSkeleton rows={3} variant="stat-tiles" />
            <SeoSkeleton rows={12} variant="ruled-list" />
          </>
        }
        standfirst={copy.standfirst}
        standfirstSize="lede"
        title={copy.title}
      >
        {failed ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the directory just now. That’s a fault at our end
            rather than an empty register. Try again shortly.
          </p>
        ) : (
          <>
            <StatTiles
              className="mt-8"
              cols={3}
              stats={[
                {
                  label: "Insiders",
                  primary: true,
                  value: (rows ?? []).length,
                },
                { label: "Purchases", value: totals.buys },
                { label: "With a measured return", value: totals.resolved },
              ]}
            />
            <p className={`mt-3 max-w-[62ch] ${R.label} leading-[1.6]`}>
              An {copy.filer} gets an indexable page once we hold{" "}
              {MIN_DIRECTOR_BUYS} purchases for them and at least one has been
              held long enough to measure a return. Everyone we hold a purchase
              for is listed below and every page renders — the bar only decides
              who we put in front of a search engine, because a page of “not
              enough data yet” is a poor first impression of the product.
            </p>

            <SeoSection
              aside={`${qualified.length} insiders, most recently active first.`}
              index={1}
              title="Insiders with a measured record"
              total={3}
            >
              <BoardRowHeader
                className=""
                facts={["Purchases", "Measured"]}
                lead="none"
                subject="Insider"
              />
              <BoardRowList>
                {qualified.map((d) => (
                  <BoardRow
                    key={d.id}
                    badge={<TickerPill ticker={displayTicker(d.ticker)} />}
                    facts={[
                      { label: "Purchases", value: d.buys },
                      { label: "Measured", value: d.resolved || "—" },
                    ]}
                    logo={<CompanyLogo size={56} ticker={d.ticker} />}
                    name={personName(d.name)}
                    secondary={
                      <>
                        {issuerName(d.company, d.ticker)}
                        {d.spellings > 1 ? (
                          <span className="text-foreground/40">
                            {" "}
                            · {d.spellings} filed spellings
                          </span>
                        ) : null}
                      </>
                    }
                    to={directorPath(d.id, marketId)}
                  />
                ))}
              </BoardRowList>
            </SeoSection>

            <SeoSection
              aside={
                others.length < (rows ?? []).length - qualified.length
                  ? `The first ${others.length} of ${(rows ?? []).length - qualified.length}. The rest are reachable from their own filings.`
                  : `${others.length} insiders whose record is too thin to measure yet.`
              }
              index={2}
              title="Also on record"
              total={3}
            >
              <p className={`mb-5 max-w-[62ch] ${R.body}`}>
                We hold a purchase for each of these, but not yet enough of a
                record to describe. Their pages render and say exactly what is
                missing and when it will arrive — they are simply not put in
                front of a search engine until then.
              </p>
              <BoardRowList>
                {others.map((d) => (
                  <BoardRow
                    key={d.id}
                    badge={<TickerPill ticker={displayTicker(d.ticker)} />}
                    logo={<CompanyLogo size={56} ticker={d.ticker} />}
                    name={personName(d.name)}
                    secondary={issuerName(d.company, d.ticker)}
                    to={directorPath(d.id, marketId)}
                  />
                ))}
              </BoardRowList>
            </SeoSection>

            <SeoSection
              aside="What a director purchase is, and what it is not."
              index={3}
              title="Reading this directory"
              total={3}
            >
              <div className={`max-w-[66ch] space-y-3 ${R.body}`}>
                <p>{copy.rule}</p>
                <p>
                  Only <strong>open-market purchases</strong> count: shares
                  bought with the person’s own money at the price anyone else
                  could have paid. Grants, option exercises and vestings are
                  excluded, because a director receiving shares has made no
                  decision about the price.
                </p>
                <p>
                  “Measured” counts the purchases held long enough for a return
                  to exist. Returns run from the closing price on the day the
                  filing was disclosed — the first price a reader could have
                  paid — at three, six, twelve and twenty-four months. A
                  purchase disclosed last week has nothing to show, and the page
                  says so rather than printing a zero.
                </p>
                {marketId === "uk" ? (
                  <p>
                    A director filing under several spellings of their name is
                    one person here, and their page says which spellings it
                    pooled.
                  </p>
                ) : (
                  <p>
                    Each {copy.filer} is keyed on their SEC central index key,
                    so filings under different spellings of one name are one
                    person here without guesswork.
                  </p>
                )}
                <p>
                  None of this is advice, and past performance is not a reliable
                  indicator of future results.
                </p>
              </div>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                items={[
                  {
                    description:
                      "The biggest insider purchases on record, ranked by what they spent.",
                    title: "Biggest buys",
                    to:
                      marketId === "us" ? "/us/biggest-buys" : "/biggest-buys",
                  },
                  {
                    description:
                      "Every company with a disclosed director purchase, and who bought.",
                    title: "Companies",
                    to: marketId === "us" ? "/us/companies" : "/companies",
                  },
                  {
                    description:
                      "How a filing is rated, and what the ratings mean.",
                    title: "How ddbx works",
                    to: "/how-it-works",
                  },
                ]}
              />
            </SeoSection>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}
