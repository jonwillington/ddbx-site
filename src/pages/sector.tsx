/** One sector's insider buying — /sectors/:slug.
 *
 *  The layer between /companies (one flat index of several hundred issuers) and
 *  the company pages themselves. Its job is partly structural — crawl
 *  distribution and a footer destination — and partly editorial: it publishes
 *  the sector's median alpha, which requires holding both the filings and the
 *  benchmark-relative marks, and is therefore the part of this page nobody else
 *  can reproduce.
 *
 *  Deliberately NOT a filtered list of filings with a sector name on top. The
 *  aggregate figures, the concentration disclosure and the ranked companies
 *  are the content; recent buys are the evidence under it.
 */
import type { Dealing, UsDealing } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { fetchDealingsWindow } from "../../shared/dealings-feed.js";
import { filingPath } from "../../shared/filings.js";
import {
  dealPerson,
  dealValue,
  leadSentence,
  sectorBySlug,
  sectorByLabel,
  sectorMeetsBar,
  sectorPath,
  sectorRollup,
  windowStart,
  MIN_BUYS,
  RECENT_BUYS,
  SECTORS,
  TOP_COMPANIES,
} from "../../shared/sectors.js";

import {
  money,
  R,
  SectorFigures,
  signedPct,
  alphaClass,
  useSectorMarket,
} from "@/components/sector-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { RelatedCards } from "@/components/seo/related-cards";
import { MeterBar } from "@/components/seo/meter-bar";
import { sectorCta } from "@/components/seo/cta-copy";
import { TrackingNotice } from "@/components/seo/tracking-notice";
import { CompanyLogo, LogoDevAttribution } from "@/components/company-logo";
import { TickerPill } from "@/components/ticker-pill";
import { ClusterChip } from "@/components/cluster-chip";
import { API_BASE } from "@/lib/api";
import {
  companyPath,
  cleanCompanyName,
  cleanInsiderName,
  displayTicker,
} from "@/lib/company";
import { formatDisclosedCompact } from "@/lib/dealing-dates";

export default function SectorPage() {
  const { slug } = useParams<{ slug: string }>();
  const sector = useMemo(() => sectorBySlug(slug ?? ""), [slug]);
  const market = useSectorMarket();
  const [rows, setRows] = useState<Array<Dealing | UsDealing> | null>(null);
  const [complete, setComplete] = useState(true);
  // Third state, distinct from "below the bar": an outage used to render
  // "fewer than 5 disclosed purchases in this sector", which is a claim about
  // the sector produced by a failed request.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const since = windowStart(new Date());

    // One code path, two feeds: UK rows come back as `Dealing`, US as
    // `UsDealing`, and everything downstream reads only the fields both share
    // (ticker, trade_date, sector_normalized, live_performance) plus the
    // value accessor in shared/sectors.js that knows about value_gbp vs value.
    //
    // Paged rather than one capped request: the API returns at most 1,000 rows
    // and the UK window crosses that during 2026, at which point a single call
    // silently drops the oldest filings — and a sector page missing the start
    // of its own window states a median drawn from the wrong sample.
    fetchDealingsWindow({ apiBase: API_BASE, market: market.id, since })
      .then(
        (r: { dealings: Array<Dealing | UsDealing>; complete: boolean }) => {
          if (!live) return;
          setRows(r.dealings);
          setComplete(r.complete);
          setFailed(false);
        },
      )
      .catch(() => {
        if (!live) return;
        setRows([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [market.id]);

  const { row, deals } = useMemo(() => {
    if (!sector) return { row: null, deals: [] };
    const mine = (rows ?? []).filter(
      (d) => sectorByLabel(d.sector_normalized ?? "")?.slug === sector.slug,
    );

    return {
      row: sectorRollup(mine)[0] ?? null,
      deals: mine,
    };
  }, [rows, sector]);

  // Companies ranked by the value bought in them, which is the ordering that
  // answers "who in this sector are insiders backing".
  //
  // Above the unknown-sector early return, not below it: hooks have to run in
  // the same order on every render, and `deals` is already empty when `sector`
  // is null so there's nothing to compute anyway.
  const companies = useMemo(() => {
    const byTicker = new Map<
      string,
      { ticker: string; company: string; value: number; buys: number }
    >();

    for (const d of deals) {
      if (!d.ticker) continue;
      const entry = byTicker.get(d.ticker) ?? {
        ticker: d.ticker,
        company: d.company ?? d.ticker,
        value: 0,
        buys: 0,
      };

      entry.value += dealValue(d);
      entry.buys += 1;
      byTicker.set(d.ticker, entry);
    }

    return [...byTicker.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_COMPANIES);
  }, [deals]);

  // The other ten sectors, richest first, so the onward rail is ranked rather
  // than alphabetical — the same ordering the index uses. Above the early
  // return for the same reason `companies` is: hook order can't vary.
  const others = useMemo(() => {
    if (!sector) return [];
    const byValue = new Map(
      sectorRollup(rows ?? []).map((r) => [r.sector.slug, r]),
    );

    return SECTORS.filter((s) => s.slug !== sector.slug)
      .map((s) => ({ sector: s, agg: byValue.get(s.slug) ?? null }))
      .sort((a, b) => (b.agg?.value ?? 0) - (a.agg?.value ?? 0));
  }, [rows, sector]);

  // Through the shell rather than a bare paragraph, as /learn does for an
  // unknown slug: the reader gets the family header and the eleven sectors we
  // do publish instead of a dead end with one link out of it. The edge already
  // noindexes this URL, so this is purely a reader fix.
  if (!sector) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail
          marketId={market.id === "US" ? "us" : "uk"}
          placement="sector_rail"
          ukHeading="Start investing"
        />
        <SeoPageShell
          crumbs={[
            { label: "Sectors", to: "/sectors" },
            { label: "Not found" },
          ]}
          eyebrow="Sector hub"
          standfirst="We normalise every filing into eleven sectors, and that isn’t one of them, the name may have changed. All eleven are below."
          title="We don’t track that sector"
        >
          <SeoSection
            aside="The eleven normalised sectors every filing is sorted into."
            title="Every sector"
          >
            <RelatedCards
              cols={3}
              items={SECTORS.map((s) => ({
                to: sectorPath(s.slug),
                title: s.label,
                description: s.framing,
              }))}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const recent = [...deals]
    .sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1))
    .slice(0, RECENT_BUYS);
  // Bars in the companies list scale to the biggest holding in this sector, so
  // the list reads as a share of the sector rather than against some absolute.
  const topCompanyValue = companies.length > 0 ? companies[0].value : 0;
  const publishable = Boolean(row) && sectorMeetsBar(row);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId={market.id === "US" ? "us" : "uk"}
        placement="sector_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        crumbs={[{ label: "Sectors", to: "/sectors" }, { label: sector.label }]}
        cta={{
          body: sectorCta(sector.label).body,
          gaLabel: `Sector · ${sector.slug}`,
          headline: sectorCta(sector.label).headline,
          marketId: market.id === "US" ? "us" : "uk",
        }}
        eyebrow="Sector hub"
        loading={rows === null}
        notice={
          <>
            <TrackingNotice />
            {!complete && !failed && (
              <p className={`mt-2 ${R.label} leading-[1.6]`}>
                We couldn’t load the whole period, so these figures may be
                missing older purchases.
              </p>
            )}
          </>
        }
        skeleton={
          // `TOP_COMPANIES` (20) and `RECENT_BUYS` (12) are caps, not counts:
          // a sector just over the publishing bar renders three company rows
          // and five filings, so standing them in drew ~2,300px of skeleton
          // that then collapsed. 8 and 6 read closer to the median sector.
          // The lead-paragraph bars come first because the loaded page opens
          // with the lead sentence, not the tiles.
          <>
            <div className="mt-8">
              <Skeleton className="h-[14px] w-full max-w-[52ch]" />
              <Skeleton className="mt-2 h-[14px] w-4/5 max-w-[42ch]" />
            </div>
            <SeoSkeleton rows={5} variant="stat-tiles" />
            <SeoSkeleton rows={8} variant="ruled-list" />
            <SeoSkeleton rows={6} variant="ruled-list" />
          </>
        }
        standfirst={sector.framing}
        standfirstSize="lede"
        title={
          <>
            {sector.label}, {market.label} insider buying
          </>
        }
      >
        {failed ? (
          // Not "this sector is quiet" — we don't know that. "Other sectors"
          // below still renders, so the reader has somewhere to go.
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the filings just now, so there are no figures to
            show for {sector.label.toLowerCase()}. That’s a fault at our end
            rather than a quiet twelve months. Try again shortly.
          </p>
        ) : !publishable ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            Fewer than {MIN_BUYS} disclosed purchases in this sector over the
            last twelve months, not enough to draw anything from.{" "}
            <Link className="underline underline-offset-4" to="/sectors">
              See the sectors that are active
            </Link>
            .
          </p>
        ) : (
          <>
            {/* The sector's thesis in numbers, before any list of it. This
                sentence is also the page's meta description, from the same
                function — it used to exist only in the pre-render, so a crawler
                read a summary no visitor ever saw. */}
            <p className={`mt-8 max-w-[62ch] ${R.body}`}>
              {leadSentence(row!, market.id)}
            </p>

            <SectorFigures className="mt-5" market={market} row={row!} />

            <p className={`mt-3 max-w-[62ch] ${R.label} leading-[1.6]`}>
              Rolling twelve months. Median alpha is the middle buy’s return
              against the market, measured from the disclosure-day close, the
              first price a reader could have paid, not from the insider’s own
              entry.
            </p>

            <SeoSection
              aside={`Top ${Math.min(TOP_COMPANIES, companies.length)} by value bought`}
              title="Companies insiders backed"
            >
              <ul className={`border-t ${R.rule}`}>
                {companies.map((c) => (
                  <li
                    key={c.ticker}
                    className={`flex items-start gap-3 border-b ${R.rule} py-3`}
                  >
                    <CompanyLogo
                      className="mt-0.5"
                      size={22}
                      ticker={c.ticker}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <Link
                          className="truncate text-[14.5px] font-medium text-foreground underline-offset-4 hover:underline"
                          to={companyPath(c.ticker)}
                        >
                          {cleanCompanyName(c.company) ||
                            displayTicker(c.ticker)}
                        </Link>
                        <TickerPill ticker={displayTicker(c.ticker)} />
                      </span>
                      <span className={`mt-1 block ${R.label}`}>
                        {c.buys} {c.buys === 1 ? "buy" : "buys"}
                      </span>
                      <MeterBar
                        className="mt-2 max-w-[22rem]"
                        max={topCompanyValue}
                        value={c.value}
                      />
                    </span>
                    <span className="shrink-0 text-right text-[14px] font-semibold tabular-nums text-foreground">
                      {money(c.value, market.symbol)}
                    </span>
                  </li>
                ))}
              </ul>
            </SeoSection>

            <SeoSection
              aside={`The ${Math.min(RECENT_BUYS, recent.length)} most recent filings in this sector`}
              title="Recent buys"
            >
              <ul className={`border-t ${R.rule}`}>
                {recent.map((d, i) => {
                  const lp = d.live_performance;
                  const alpha =
                    lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade ?? null;
                  const ticker = displayTicker(d.ticker ?? "");

                  return (
                    <li
                      key={d.id ?? i}
                      className={`flex items-start gap-3 border-b ${R.rule} py-3`}
                    >
                      <CompanyLogo
                        className="mt-0.5"
                        size={22}
                        ticker={d.ticker ?? ""}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <Link
                            className="truncate text-[14.5px] font-medium text-foreground underline-offset-4 hover:underline"
                            to={companyPath(d.ticker ?? "")}
                          >
                            {cleanCompanyName(d.company ?? "") || ticker}
                          </Link>
                          <TickerPill ticker={ticker} />
                          <ClusterChip cluster={d.cluster} />
                        </span>
                        <span className={`mt-1 block truncate ${R.label}`}>
                          {cleanInsiderName(dealPerson(d) ?? "") || "—"}{" "}
                          &middot;{" "}
                          {formatDisclosedCompact(
                            d.disclosed_date || d.trade_date,
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[14px] font-semibold tabular-nums text-foreground">
                          {money(dealValue(d), market.symbol)}
                        </span>
                        <span
                          className={`mt-0.5 block text-[13px] tabular-nums ${alphaClass(alpha == null ? null : alpha / 100)}`}
                        >
                          {signedPct(alpha == null ? null : alpha / 100)}
                        </span>
                      </span>
                      {/* The filing itself. Each of these rows IS one
                          disclosure with a permanent page of its own, and the
                          only link on the row went to the issuer — so the most
                          specific thing on screen was the one thing you could
                          not open. A separate control rather than wrapping the
                          row, because the company name is already a link and
                          links do not nest. UK only: `/dealings/:id` is a UK
                          pipeline route. */}
                      {market.id === "UK" && d.id ? (
                        <Link
                          aria-label={`Open this filing at ${cleanCompanyName(d.company ?? "") || ticker}`}
                          className="mt-0.5 shrink-0 rounded-md p-1 text-foreground/25 outline-none transition-colors hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-brand-brown/40"
                          to={filingPath(d.id)}
                        >
                          <ArrowRightIcon aria-hidden className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </SeoSection>
          </>
        )}

        <SeoSection
          aside="Ranked by value bought over the same twelve months."
          title="Other sectors"
        >
          <RelatedCards
            cols={3}
            items={others.map(({ sector: s, agg }) => ({
              to: sectorPath(s.slug),
              title: s.label,
              description: agg
                ? `${money(agg.value, market.symbol)} across ${agg.buys} ${agg.buys === 1 ? "buy" : "buys"}`
                : "No disclosed buys in the window",
            }))}
          />
        </SeoSection>

        <LogoDevAttribution className="mt-8" />
      </SeoPageShell>
    </DefaultLayout>
  );
}
