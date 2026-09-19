/** Per-director profile page. Market-aware: /directors/:id stays a UK-only
 *  alias for back-compat; /:market/directors/:id is the canonical path going
 *  forward. UK + US + SE + NL all live as of 2026-05-21.
 *
 *  Rebuilt onto `SeoPageShell` on 2026-08-03, because this was the family's
 *  worst page and every one of its faults came from being outside the shell:
 *
 *  1. **It stated numbers it did not have.** `hit_rate_pct` arrives as `0` when
 *     no pick carries a performance mark (the `total === 0` branch in
 *     ddbx-data's `getDirector`), so the page published "HIT RATE 0%" — a
 *     specific, damning claim about a person — on the strength of no data at
 *     all, above four em-dashes. A missing figure now says it is missing, and
 *     says when it will arrive.
 *  2. **It named a company and showed nothing of it.** The subtitle read
 *     "Director · 3i Group (III)" as plain text with no mark, no link and no
 *     route to the issuer's own record.
 *  3. **It was bare content.** Below "Prior picks" there was whitespace and
 *     then the footer. A director page is a long-tail entry point — the reader
 *     most likely to land on one has never heard of ddbx — and it explained
 *     neither what the product is nor how to read the thing it was showing
 *     them. Every static page is a selling tool; see `SeoSection` and
 *     `investigations/2026-08-03-static-page-rules.md`.
 *  4. **It had no way back.** Reached from a filing or a list, the only exit
 *     was the browser chrome.
 *
 *  The empty-performance case is the DEFAULT here, not an edge: returns are
 *  measured from the disclosure-day close at 3/6/12/24-month horizons, so a
 *  director whose only filing is recent has nothing to show for three months
 *  and that is correct rather than broken. The page says so in those words.
 */
import type { MarketDealing } from "@/lib/markets/types";
import type { RelatedCard } from "@/components/seo/related-cards";
import type { BoardRow as BoardRowModel } from "@/components/boards/board-model";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ClockIcon } from "@heroicons/react/24/outline";

import { filingPath } from "../../shared/filings.js";
import { usFilingPath } from "../../shared/filings-us.js";

import { appHrefForMarket } from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { BackLink } from "@/components/back-link";
import { CompanyLogo } from "@/components/company-logo";
import { Illustration } from "@/components/illustration";
import { MarketDetailDrawer } from "@/components/market/market-detail-drawer";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { direction } from "@/components/boards/board-model";
import { BENCHMARK, useBoardPrices } from "@/components/boards/board-prices";
import { BuySparkline } from "@/components/boards/buy-sparkline";
import { AlphaCell, PaidWorthNow } from "@/components/boards/paid-worth-now";
import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/skeleton";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoSection } from "@/components/seo/section";
import { StatTiles } from "@/components/seo/stat-tiles";
import { TickerPill } from "@/components/ticker-pill";
import { panel } from "@/components/ui/panel";
import DefaultLayout from "@/layouts/default";
import {
  api,
  type DirectorDetail,
  type EuDirectorDetail,
  type UsDirectorDetail,
} from "@/lib/api";
import { companyPath, displayTicker } from "@/lib/company";
import { useRememberPage } from "@/lib/search/history";
import {
  marketForPath,
  type MarketRegistryEntry,
} from "@/lib/markets/registry";
import { toMarketDealing as toUkMarketDealing } from "@/lib/markets/uk";
import {
  groupRows as groupUsRows,
  toMarketDealing as toUsMarketDealing,
} from "@/lib/markets/us";
import {
  groupRows as groupSeRows,
  toMarketDealing as toSeMarketDealing,
} from "@/lib/markets/sweden";
import { toMarketDealing as toNlMarketDealing } from "@/lib/markets/netherlands";

type AnyDirectorDetail = DirectorDetail | UsDirectorDetail | EuDirectorDetail;

/** The shortest horizon any return is measured at. A pick disclosed today has
 *  no mark until this many days have passed, which is what the waiting banner
 *  counts down to. Mirrors `avg_return_by_horizon["3m"]` in ddbx-data's
 *  `getDirector`, which averages the 90-day performance rows. */
const FIRST_HORIZON_DAYS = 90;

/** Resolved picks required before a rate is published as a PERCENTAGE.
 *
 *  `hit_rate_pct` is a fraction of however many picks happen to carry a mark,
 *  so one resolved purchase that went up renders "HIT RATE 100%" against a
 *  named person — a claim about their judgement resting on a single trade.
 *  That is the same defect as the "HIT RATE 0%" this page was rebuilt to fix in
 *  August, pointing the other way, and pooling a person's name variants (which
 *  the API now does) makes it more reachable rather than less.
 *
 *  Four, raised from three on 2026-09-16. Beating the index is roughly a coin
 *  flip across the whole record (55.7% UK, 61.8% US), so a perfect score over
 *  three purchases happens by chance about one time in six; over four it is one
 *  in ten. Below the floor the count is still shown — "3 resolved purchases" is
 *  a fact we have — but never divided into a percentage. */
const MIN_RESOLVED_FOR_RATE = 4;

function isUsDetail(d: AnyDirectorDetail): d is UsDirectorDetail {
  // UsDirectorDetail.prior_picks carries UsDealing rows (filing_id +
  // transaction_code); Dealing / EuDealing rows don't.
  const first = d.prior_picks[0] as { filing_id?: string } | undefined;

  return first != null && typeof first.filing_id === "string";
}

function isEuDetail(d: AnyDirectorDetail): d is EuDirectorDetail {
  // EuDirectorDetail carries `market` on the response shape; UK/US don't.
  // SE and NL share the same wire shape — discriminate via the `market`
  // field, not the type guard.
  return (d as { market?: string }).market != null;
}

function pct(n: number | null) {
  return `${(n! * 100).toFixed(1)}%`;
}

/** "12 October 2026" — the date a figure becomes available, said in full.
 *  Abbreviated months are for dense tables; this is one date in a sentence and
 *  the reader is being asked to come back for it. */
function longDate(iso: string, locale: string) {
  const t = Date.parse(`${iso}T00:00:00Z`);

  if (!Number.isFinite(t)) return null;

  return new Date(t).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function addDays(iso: string, days: number): string | null {
  const t = Date.parse(`${iso}T00:00:00Z`);

  if (!Number.isFinite(t)) return null;

  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/** Days to each horizon's first mark: the clock a "Not enough data yet" tile is
 *  waiting on, so each one can say when it fills (rule 2). Mirrors the
 *  90/180/365/730-day rows ddbx-data's `getDirector` averages. */
const HORIZON_DAYS = { "3m": 90, "6m": 180, "12m": 365, "24m": 730 } as const;

/** A filing as a board row. The director page lists the same purchases the
 *  boards do, so it states them in the boards' row: company mark, paid → worth
 *  now, the price since the buy against the index, alpha. The figures come off
 *  the server's `live_performance`, the same mark /biggest-buys prints, and
 *  with the same disclosure-first fallback (`buyAlpha` in shared/leaderboard). */
function toRow(d: MarketDealing, i: number): BoardRowModel {
  const lp = d.livePerformance;
  const retPct = lp?.return_pct_disclosed ?? lp?.return_pct_trade ?? null;
  const alphaPct = lp?.alpha_pct_disclosed ?? lp?.alpha_pct_trade ?? null;
  const ret = retPct == null ? null : retPct / 100;
  const alpha = alphaPct == null ? null : alphaPct / 100;
  const value = d.value ?? 0;

  return {
    id: d.key,
    rank: i + 1,
    entry: 1,
    ticker: d.ticker,
    company: d.company,
    person: d.insiderName,
    role: d.insiderRole ?? null,
    tradeDate: d.tradeDate,
    disclosedDate: d.disclosedDate,
    value,
    alpha,
    ret,
    worthNow: ret == null || !(value > 0) ? null : value * (1 + ret),
    dir: direction(alpha),
    clusterCount: null,
    raw: d.raw as BoardRowModel["raw"],
  };
}

/** The filing's own page, or null where the market has none (SE, NL) and the
 *  row opens the drawer instead. US rows are folded tranche groups, so the
 *  page is the primary leg's. */
function rowHref(d: MarketDealing, marketId: string): string | null {
  if (marketId === "uk") return d.id ? filingPath(d.id) : null;
  if (marketId === "us") {
    const id = (d.raw as { primary?: { id?: string } } | null)?.primary?.id;

    return id ? usFilingPath(id) : null;
  }

  return null;
}

/** Per-market adapter for `prior_picks → MarketDealing[]`. UK maps 1:1 from
 *  Dealing; US + SE + NL fold tranche-split legs into RowGroups first, then
 *  map. SE and NL share the EuDealing wire format so they reuse the same
 *  groupRows; only the per-market toMarketDealing differs (Dutch vs Swedish
 *  vocabulary). */
function toMarketDealings(
  market: MarketRegistryEntry,
  detail: AnyDirectorDetail,
): MarketDealing[] {
  if (market.id === "uk" && !isUsDetail(detail) && !isEuDetail(detail)) {
    return detail.prior_picks.map(toUkMarketDealing);
  }
  if (market.id === "us" && isUsDetail(detail)) {
    return groupUsRows(detail.prior_picks).map(toUsMarketDealing);
  }
  if (market.id === "se" && isEuDetail(detail)) {
    return groupSeRows(detail.prior_picks).map(toSeMarketDealing);
  }
  if (market.id === "nl" && isEuDetail(detail)) {
    // groupRows is market-blind — sweden's groupRows handles NL just as well.
    return groupSeRows(detail.prior_picks).map(toNlMarketDealing);
  }

  return [];
}

/** What a stat tile says when there is nothing to say.
 *
 *  Not an em-dash. A dash in a figure slot is the same mark the site uses for
 *  "not applicable", "zero" and "failed to load", so it answers the reader's
 *  question ("is this person any good?") with a symbol that could mean three
 *  things, one of which is damning. Set small on purpose: it is a sentence
 *  standing in for a number, and at 26px it would read as the number. */
/** "A", "A and B", "A, B and C" — names set a shade darker than the sentence
 *  around them so they read as the content rather than as small print. */
function NameList({ names }: { names: { id: string; name: string }[] }) {
  return (
    <>
      {names.map((n, i) => (
        <span key={n.id}>
          {i > 0 ? (i === names.length - 1 ? " and " : ", ") : ""}
          <span className="text-foreground/70">{n.name}</span>
        </span>
      ))}
    </>
  );
}

function NotYet({ from }: { from?: string | null }) {
  return (
    <span className="text-small font-medium leading-snug tracking-normal text-foreground/40">
      {from ? `From ${from}` : "Not enough data yet"}
    </span>
  );
}

export default function DirectorPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const market = marketForPath(location.pathname);
  const platform = useDevicePlatform();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [d, setD] = useState<AnyDirectorDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const useGating = market.config.useGating;
  const gating = useGating ? useGating() : undefined;

  useEffect(() => {
    if (!id) return;
    const fetcher =
      market.id === "us"
        ? api.usDirector(id)
        : market.id === "se"
          ? api.seDirector(id)
          : market.id === "nl"
            ? api.nlDirector(id)
            : api.director(id);

    fetcher
      .then((r) => setD(r as AnyDirectorDetail))
      .catch((e) => setErr((e as Error).message));
  }, [id, market.id]);

  const dealings = useMemo(
    () => (d ? toMarketDealings(market, d) : []),
    [market, d],
  );
  const selectedDealing = useMemo(
    () => dealings.find((x) => x.key === selectedKey) ?? null,
    [dealings, selectedKey],
  );
  const rows = useMemo(() => dealings.map(toRow), [dealings]);

  /** The filings, grouped by issuer.
   *
   *  A director page listed the company on every row, which for 96.7% of
   *  directors means the same logo and the same name repeated down the whole
   *  list — thirteen copies of "Ninety One" under a heading that already says
   *  Ninety One. The company is said ONCE per run instead: by the page header
   *  when there is only one (the overwhelming majority), and by a subhead per
   *  issuer when there is more than one.
   *
   *  Multi-company directors are a real minority rather than a rounding error
   *  — 26 of 787, and a coherent group: plural NEDs and investment-trust
   *  directors sitting on several boards (Katie Bickerstaffe files against
   *  four). So this groups rather than assuming one issuer and hardcoding it.
   *
   *  Groups keep first-appearance order, so the newest filing still leads the
   *  section and the sections themselves run newest-first. */
  const filingGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        ticker: string;
        company: string;
        items: {
          dealing: (typeof dealings)[number];
          row: (typeof rows)[number];
        }[];
      }
    >();

    dealings.forEach((dealing, i) => {
      const key = dealing.ticker;
      const g = groups.get(key);

      if (g) g.items.push({ dealing, row: rows[i] });
      else
        groups.set(key, {
          ticker: dealing.ticker,
          company: dealing.company,
          items: [{ dealing, row: rows[i] }],
        });
    });

    // WITHIN a group, order by the date the column actually shows.
    //
    // The list arrives ordered by DISCLOSED date, which is the right spine for
    // a feed and the date this page measures returns from — but the rows print
    // the TRADE date under a heading that says "Bought". While the company
    // column separated them that mismatch was invisible; grouping puts a
    // director's filings for one issuer side by side, and Katie Bickerstaffe's
    // Barratt Redrow pair then read "6 Mar" above "15 Apr", which looks like a
    // sorting bug rather than what it is: a purchase disclosed 172 days late.
    //
    // So rows sort by what they display. GROUPS keep first-appearance order,
    // which is still disclosure order, so the most recently disclosed issuer
    // still leads. For the 96.7% of directors with one issuer the two orders
    // differ only where a filing was late, which is exactly the case worth
    // getting right.
    for (const g of groups.values()) {
      g.items.sort((a, b) =>
        b.dealing.tradeDate.localeCompare(a.dealing.tradeDate),
      );
    }

    return [...groups.values()];
  }, [dealings, rows]);
  // Sparklines need a benchmark series, which exists for UK and US only. SE
  // and NL rows state their figures without the line rather than draw a
  // price with nothing to measure it against.
  const priceMarket =
    market.id === "uk" ? "UK" : market.id === "us" ? "US" : null;
  const prices = useBoardPrices(priceMarket ? rows : null, priceMarket ?? "UK");
  const bench = priceMarket
    ? prices.get(BENCHMARK[priceMarket].ticker)
    : undefined;

  /** Everything the page needs to decide between "here is the record", "the
   *  record is still maturing" and "we hold nothing yet" — resolved once so
   *  the tiles, the banner and the copy cannot disagree about which it is. */
  const record = useMemo(() => {
    const horizons = d?.avg_return_by_horizon ?? {};
    // The one honest test for whether `hit_rate_pct` means anything. The API
    // computes it over picks that carry a performance row at 90/180/365/730
    // days and returns a bare 0 when none do — the same four horizons these
    // averages are taken from, so all-null averages and a meaningless hit rate
    // are the same condition.
    const marked = Object.values(horizons).some((v) => v != null);
    // The denominator behind `hit_rate_pct`. Optional on the wire: a response
    // predating the field falls back to the old "any horizon resolved" test,
    // which is weaker but never worse than what shipped before it.
    const resolved = d?.resolved_count ?? null;
    // The beat rate has its own denominator: a resolved purchase with no
    // benchmark for its window cannot be scored against one, and counting it as
    // a miss would report a data gap as underperformance.
    const benchmarked = d?.benchmarked_count ?? null;
    const rateIsPublishable =
      resolved != null ? resolved >= MIN_RESOLVED_FOR_RATE : marked;
    const beatIsPublishable =
      benchmarked != null && benchmarked >= MIN_RESOLVED_FOR_RATE;
    // Earliest disclosure we hold for this person: the clock the first return
    // figure is waiting on.
    const earliest = dealings
      .map((x) => x.disclosedDate)
      .filter(Boolean)
      .sort()[0];
    const readyOn = earliest
      ? addDays(earliest.slice(0, 10), FIRST_HORIZON_DAYS)
      : null;

    return {
      earliest: earliest ? earliest.slice(0, 10) : null,
      horizons,
      marked,
      rateIsPublishable,
      beatIsPublishable,
      benchmarked,
      resolved,
      // A date we have already passed is not a promise worth printing: it means
      // the mark is late or the price series is thin, and "available after a
      // date in the past" reads as a bug.
      readyOn:
        readyOn && readyOn > new Date().toISOString().slice(0, 10)
          ? readyOn
          : null,
    };
  }, [d, dealings]);

  /** Spellings OTHER than the one in the URL whose filings are counted into
   *  this record.
   *
   *  The API pools a person's name variants, so the list below can contain
   *  filings the reader will notice are filed under a different string —
   *  "Steve Mogford" on a page titled "Steven Mogford", or a joint
   *  "Hendrik du Toit / Kim McFarland" on du Toit's own page. Left unsaid that
   *  reads as a bug or as sloppiness about whose trades these are. Said plainly
   *  it is the page explaining its own arithmetic. */
  const otherSpellings = useMemo(() => {
    const aliases =
      (
        d as {
          aliases?: {
            id: string;
            name: string;
            buys: number;
            joint: boolean;
          }[];
        } | null
      )?.aliases ?? [];
    const others = aliases.filter((a) => a.name !== d?.name && a.buys > 0);

    // A JOINT filing is not another spelling of this person's name.
    // "Hendrik du Toit and Kim McFarland" names two people. Those purchases are
    // genuinely his and belong in his record, but describing that string as
    // "the same person, spelled differently" tells the reader that Kim
    // McFarland is really Hendrik du Toit. Two different facts, two sentences.
    return {
      variants: others.filter((a) => !a.joint),
      joint: others.filter((a) => a.joint),
    };
  }, [d]);

  /** The issuer this person files against, taken from their own most recent
   *  filing. `DirectorDetail.company` is a name string with no ticker on it, so
   *  a logo and a link to the company page have to come from the picks. */
  const issuer = useMemo(() => {
    const ticker = dealings[0]?.ticker;

    if (!ticker) return null;

    return {
      ticker,
      display: displayTicker(ticker),
      // Company pages exist for UK and US only; SE and NL are data-side
      // markets with no issuer route, and a dead link is worse than a name.
      href:
        market.id === "uk" || market.id === "us" ? companyPath(ticker) : null,
    };
  }, [dealings, market.id]);

  // The rail rides every state, loading and error included: it's fixed and
  // market-derived, so nothing about it waits on the fetch, and reserving the
  // gutter up front stops the article shifting 320px sideways when the
  // director resolves.
  useRememberPage(
    d ? { kind: "insider", label: d.name, sub: d.company } : null,
  );

  const rail = (
    <SeoRail
      marketId={market.id}
      placement="director_rail"
      ukHeading={d ? `Invest in ${d.company}` : undefined}
    />
  );

  const marketId = market.id === "us" ? "us" : "uk";
  const locale = market.config.locale ?? "en-GB";
  const insider = market.id === "uk" ? "director" : "insider";

  if (err)
    return (
      <DefaultLayout drawerRight>
        {rail}
        <SeoPageShell
          back={<BackLink />}
          error={{
            what: "this profile",
            detail:
              "That’s a fault at our end rather than a missing person. Try a refresh in a moment, or browse the record from here.",
          }}
          eyebrow="Insider"
          title="Insider profile"
        >
          <SeoSection aside="Where to go instead." title="Browse the record">
            <RelatedCards cols={2} items={FALLBACK_LINKS} />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );

  const related: RelatedCard[] = [
    ...(issuer?.href
      ? [
          {
            to: issuer.href,
            title: `Every filing at ${d?.company || issuer.display}`,
            description:
              "The issuer's full record: who has bought, how much, and how those purchases have done.",
            media: <CompanyLogo size={32} ticker={issuer.ticker} />,
          },
        ]
      : []),
    ...FALLBACK_LINKS,
  ].slice(0, 4);

  return (
    <DefaultLayout drawerRight>
      {rail}
      <SeoPageShell
        back={<BackLink />}
        crumbs={[
          { label: "Companies", to: "/companies" },
          ...(issuer?.href && d?.company
            ? [{ label: d.company, to: issuer.href }]
            : []),
          { label: d?.name ?? "Insider" },
        ]}
        cta={{
          body: `This page is one ${insider}'s record. The app is the running feed: every disclosure the day it files, already rated, with the written case attached and an alert when the price moves after a buy you're following.`,
          gaLabel: `Director · ${id ?? ""}`,
          headline: "Every filing, the day it files.",
          marketId,
        }}
        eyebrow="Insider"
        loading={!d}
        skeleton={<DirectorSkeleton />}
        standfirst={
          d ? (
            <>
              {d.role}
              {d.company ? ` at ${d.company}` : ""}
              {d.age_band ? `, ${d.age_band}` : ""}
              {d.tenure_years != null
                ? `, ${d.tenure_years} years in post`
                : ""}
              . Every open-market purchase they have disclosed, and how each has
              performed since.
            </>
          ) : undefined
        }
        standfirstSize="lede"
        title={d?.name ?? "Insider"}
      >
        {d ? (
          <>
            {/* THE COMPANY, SHOWN RATHER THAN NAMED.
                The issuer was a word in the subtitle. It is the single most
                useful onward link on the page and the fastest way for a reader
                to place a person they have never heard of. */}
            {issuer ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <CompanyLogo
                  className="shrink-0"
                  size={32}
                  ticker={issuer.ticker}
                />
                {issuer.href ? (
                  <Link
                    className="text-lede font-medium text-foreground underline-offset-4 hover:underline"
                    to={issuer.href}
                  >
                    {d.company || issuer.display}
                  </Link>
                ) : (
                  <span className="text-lede font-medium text-foreground">
                    {d.company || issuer.display}
                  </span>
                )}
                <TickerPill ticker={issuer.display} />
                <span className="text-small text-foreground/45">
                  {dealings.length}{" "}
                  {dealings.length === 1
                    ? "disclosed purchase"
                    : "disclosed purchases"}
                </span>
              </div>
            ) : null}

            {otherSpellings.variants.length > 0 ||
            otherSpellings.joint.length > 0 ? (
              <p className="mt-3 text-small text-foreground/45">
                {otherSpellings.variants.length > 0 ? (
                  <>
                    Includes filings made as{" "}
                    <NameList names={otherSpellings.variants} />. The same
                    person, spelled differently by the filer.{" "}
                  </>
                ) : null}
                {otherSpellings.joint.length > 0 ? (
                  <>
                    Includes purchases disclosed jointly as{" "}
                    <NameList names={otherSpellings.joint} />, where {d.name} is
                    named alongside another PDMR.
                  </>
                ) : null}
              </p>
            ) : null}

            {d.profile && (
              <div className={`mt-6 space-y-3 ${panel({ variant: "inset", size: "roomy" })}`}>
                <div>
                  <h2 className="mb-1 text-small font-semibold">Biography</h2>
                  <p className="text-body text-foreground/80">
                    {d.profile.biography}
                  </p>
                </div>
                <div>
                  <h2 className="mb-1 text-small font-semibold">
                    Track record
                  </h2>
                  <p className="text-body text-foreground/80">
                    {d.profile.track_record_summary}
                  </p>
                </div>
                {d.profile.flags.length > 0 && (
                  <div>
                    <h2 className="mb-1 text-small font-semibold text-negative">
                      Flags
                    </h2>
                    <ul className="list-disc pl-5 text-body text-negative/90">
                      {d.profile.flags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <SeoSection
              aside={
                record.marked
                  ? "Measured from the disclosure-day close, which is the first price a reader could have paid."
                  : "Returns are measured from the disclosure-day close at fixed horizons, so a recent filing has nothing to report yet."
              }
              index={1}
              title="How their buying has done"
              total={2}
            >
              {/* WAITING IS A STATE, AND IT HAS A DATE.
                  Four dashes and a 0% told the reader the person had a record
                  and it was bad. What is actually true is that the clock has
                  not run yet, and we know exactly when it will have. */}
              {!record.marked ? (
                <div className={`mb-4 flex items-center gap-4 ${panel({ variant: "inset", size: "compact" })}`}>
                  {/* The viewfinder over nothing — the same object the market
                      page shows while a session waits on its first filing.
                      Still, not sweeping: nothing on this page is live. The
                      clock it replaces is its floor. */}
                  <Illustration
                    height={56}
                    icon={ClockIcon}
                    iconClassName="h-5 w-5 text-brand-brown dark:text-brand-tan"
                    motion="none"
                    scene="market-scanning"
                  />
                  <p className="text-body text-foreground/70">
                    {dealings.length === 0 ? (
                      <>
                        We hold no disclosed open-market purchases for this{" "}
                        {insider} yet, so there is nothing to measure. The
                        figures fill in with their first filing.
                      </>
                    ) : record.readyOn ? (
                      <>
                        Performance stats will be available after{" "}
                        <strong className="font-semibold text-foreground">
                          {longDate(record.readyOn, locale) ?? record.readyOn}
                        </strong>
                        , three months after the earliest purchase we hold.
                        Nothing here is a judgement on this {insider} yet.
                      </>
                    ) : (
                      <>
                        We don’t hold a price mark for these purchases yet.
                        Nothing here is a judgement on this {insider}.
                      </>
                    )}
                  </p>
                </div>
              ) : null}

              <StatTiles
                cols={5}
                // SAY WHAT THE RATE IS OVER.
                // A percentage with no denominator invites the reader to
                // supply their own, and they will supply a large one. When
                // there are too few marks to publish a rate at all, the count
                // is the honest thing to show in its place.
                note={
                  record.resolved == null || record.resolved === 0
                    ? undefined
                    : record.beatIsPublishable
                      ? `Measured over ${record.resolved} purchase${record.resolved === 1 ? "" : "s"} whose horizon has resolved. ${d.hit_rate_pct.toFixed(0)}% of them rose; beating the index over the same window is the stricter test, and the one that says something about the buyer rather than about the market.`
                      : `${record.resolved} purchase${record.resolved === 1 ? "" : "s"} ${record.resolved === 1 ? "has" : "have"} a resolved horizon so far — too few to state as a rate. Rates appear at ${MIN_RESOLVED_FOR_RATE}.`
                }
                stats={[
                  {
                    label: "Beat the index",
                    primary: true,
                    // NOT `hit_rate_pct` on its own. The API returns a literal
                    // 0 when no pick carries a mark, and "0%" is a claim — and
                    // a rate over one or two marks is a different claim that is
                    // just as unfounded. See MIN_RESOLVED_FOR_RATE.
                    // BEATING THE INDEX, NOT GOING UP.
                    //
                    // The hit rate — did the price rise — was the headline
                    // here until 2026-09-16, and it mostly described the
                    // market: two thirds of all disclosed purchases rose over
                    // this period, so "100%" over a handful of them was very
                    // often just 2026. Beating the benchmark over the identical
                    // window is roughly a coin flip across the whole record,
                    // which is what makes a score on it worth printing. Both
                    // numbers are on the wire; the plain rise rate moves to the
                    // note below, where it reads as context rather than as a
                    // verdict.
                    value: record.beatIsPublishable ? (
                      `${(d.beat_rate_pct ?? 0).toFixed(0)}%`
                    ) : (
                      <NotYet />
                    ),
                  },
                  ...(["3m", "6m", "12m", "24m"] as const).map((h) => {
                    const v = record.horizons[h] ?? null;
                    // When this horizon's first mark lands: the earliest
                    // purchase plus the horizon. A date already passed is a
                    // late mark, not a promise, and says nothing.
                    const due = record.earliest
                      ? addDays(record.earliest, HORIZON_DAYS[h])
                      : null;
                    const from =
                      due && due > new Date().toISOString().slice(0, 10)
                        ? longDate(due, locale)
                        : null;

                    return {
                      label: `Avg ${h}`,
                      tone:
                        v == null
                          ? undefined
                          : v > 0
                            ? ("positive" as const)
                            : v < 0
                              ? ("negative" as const)
                              : undefined,
                      value: v == null ? <NotYet from={from} /> : pct(v),
                    };
                  }),
                ]}
              />
            </SeoSection>

            <SeoSection
              aside={
                dealings.length > 0
                  ? "Newest first. Open one for the price around the buy and the checks it was scored against."
                  : undefined
              }
              index={2}
              title={dealings.length === 1 ? "Their filing" : "Their filings"}
              total={2}
            >
              {dealings.length === 0 ? (
                <p className="text-body text-foreground/70">
                  Nothing on record for this {insider} yet. They appear here the
                  first time they disclose an open-market purchase in their own
                  company.
                </p>
              ) : (
                <>
                  {/* THE BOARDS' ROW, NOT THE DASHBOARD'S TABLE.
                      This list used MarketRow, the market dashboard's
                      eight-column table, which needs the dashboard's width:
                      at the document measure its CONTRARIAN chip printed over
                      the value and the company column showed a logo with no
                      name. The purchases here are the same purchases the
                      boards list, so they take the boards' row. */}
                  {/* THE COMPANY IS SAID ONCE PER RUN, NOT ONCE PER ROW.
                      A single-issuer director (96.7% of them) gets no subhead
                      at all — the page header above already carries the logo,
                      the name and the count, and repeating it here would be
                      the same redundancy one line further down. A plural NED
                      gets one subhead per issuer. Either way the ROWS carry no
                      company, so the subject slot holds the only thing that
                      varies between them: the rating. */}
                  <BoardRowHeader
                    className=""
                    lead="date"
                    leadLabel="Bought"
                    money={priceMarket ? "Paid → worth now" : "Value"}
                    moneyPair={priceMarket != null}
                    named={false}
                    perf="Alpha"
                    // A LABEL OVER AN EMPTY TRACK IS A RULE THAT DOES NOT
                    // FINISH. Only analysed filings carry a rating, and plenty
                    // of directors have none — Katie Bickerstaffe's five
                    // purchases are all unrated — which left a "Rating" heading
                    // over five blank cells. The track is content-sized, so
                    // with nothing in it the column collapses; the heading has
                    // to go with it.
                    subject={
                      dealings.some((x) => x.rating) ? "Rating" : undefined
                    }
                    visual={
                      priceMarket ? "Since the buy, vs the index" : undefined
                    }
                  />
                  {filingGroups.map((group) => {
                    const groupTicker = (
                      market.config.formatTickerDisplay ?? displayTicker
                    )(group.ticker);
                    // Same rule as the header's issuer link: company pages
                    // exist for UK and US only, and a dead link is worse than
                    // a plain name.
                    const companyHref =
                      market.id === "uk" || market.id === "us"
                        ? companyPath(group.ticker)
                        : null;

                    return (
                      <div key={group.ticker}>
                        {filingGroups.length > 1 ? (
                          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-5 first:mt-0 first:border-t-0 first:pt-0 dark:border-border/60">
                            {market.config.enableLogos !== false ? (
                              <CompanyLogo
                                className="shrink-0"
                                size={32}
                                ticker={group.ticker}
                              />
                            ) : null}
                            {companyHref ? (
                              <Link
                                className="text-lede font-semibold text-foreground underline-offset-4 hover:underline"
                                to={companyHref}
                              >
                                {group.company}
                              </Link>
                            ) : (
                              <span className="text-lede font-semibold text-foreground">
                                {group.company}
                              </span>
                            )}
                            <TickerPill ticker={groupTicker} />
                            <span className="text-small text-foreground/45">
                              {group.items.length}{" "}
                              {group.items.length === 1
                                ? "purchase"
                                : "purchases"}
                            </span>
                          </div>
                        ) : null}
                        <BoardRowList>
                          {group.items.map(({ dealing, row: r }) => {
                            const href = rowHref(dealing, market.id);

                            return (
                              <BoardRow
                                key={dealing.key}
                                date={{ iso: dealing.tradeDate, locale }}
                                money={
                                  priceMarket ? (
                                    <PaidWorthNow
                                      row={r}
                                      symbol={priceMarket === "UK" ? "£" : "$"}
                                    />
                                  ) : dealing.value != null ? (
                                    (
                                      market.config.priceFormat
                                        .formatValueCompact ??
                                      market.config.priceFormat.formatValue
                                    )(dealing.value)
                                  ) : undefined
                                }
                                moneyPair={priceMarket != null}
                                perf={<AlphaCell alpha={r.alpha} />}
                                secondary={
                                  dealing.rating ? (
                                    <RatingBadge rating={dealing.rating} />
                                  ) : undefined
                                }
                                to={href ?? undefined}
                                visual={
                                  priceMarket ? (
                                    <span className="block max-w-[240px] xl:max-w-none">
                                      <BuySparkline
                                        bars={prices.get(dealing.ticker)}
                                        bench={bench}
                                        row={r}
                                      />
                                    </span>
                                  ) : undefined
                                }
                                onSelect={
                                  href
                                    ? undefined
                                    : () => setSelectedKey(dealing.key)
                                }
                              />
                            );
                          })}
                        </BoardRowList>
                      </div>
                    );
                  })}
                </>
              )}
            </SeoSection>

            {/* NEVER BARE CONTENT. A director page is a long-tail entry point
                and the reader who lands on one has, by definition, arrived from
                a search for a name rather than for us. Below the record it
                explained neither what this site is nor how to read the figures
                above it. Both, briefly, with the routes onward. */}
            <SeoSection
              aside="What you are looking at, and how to read it."
              title="Reading an insider filing"
            >
              <div className="max-w-measure space-y-4 text-body text-foreground/70">
                <p>
                  ddbx tracks share purchases company insiders make in their own
                  employers. {market.id === "uk" ? "UK" : "US"} rules oblige
                  them to disclose those trades within days, and every filing on
                  this page comes from that public record.
                </p>
                <p>
                  Only{" "}
                  <strong className="font-semibold">
                    open-market purchases
                  </strong>{" "}
                  count here: shares bought with the person’s own money at the
                  price anyone else could have paid. Grants, option exercises
                  and vestings are excluded, because a director receiving shares
                  has made no decision about the price.
                </p>
                <p>
                  <strong className="font-semibold">Hit rate</strong> is the
                  share of a person’s purchases showing a positive return at the
                  longest horizon we hold for each. It is a description of what
                  happened, not a forecast, and on a handful of filings it is a
                  small sample rather than a track record.
                </p>
                <p>
                  Insiders cannot trade during a{" "}
                  <strong className="font-semibold">closed period</strong>, the
                  weeks before results, so the timing of a purchase carries
                  information of its own. That is one of six checks every
                  disclosure is scored against.
                </p>
              </div>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards cols={2} items={related} />
            </SeoSection>
          </>
        ) : null}
      </SeoPageShell>

      <MarketDetailDrawer
        AnalysisOverlay={market.config.AnalysisOverlay}
        DetailBody={market.config.DetailBody}
        DetailPosition={market.config.DetailPosition}
        DummyDetailBody={market.config.DummyDetailBody}
        allDealings={dealings}
        appHref={appHrefForMarket(market.id, platform)}
        dealing={selectedDealing}
        filingHref={market.config.filingHref}
        fmt={market.config.priceFormat}
        formatTickerDisplay={market.config.formatTickerDisplay}
        gating={gating}
        locale={market.config.locale}
        showLogo={market.config.enableLogos !== false}
        onClose={() => setSelectedKey(null)}
      />
    </DefaultLayout>
  );
}

/** Onward links that are true on every director page in every market. The
 *  issuer card is prepended by the caller when there is one. */
const FALLBACK_LINKS: RelatedCard[] = [
  {
    to: "/companies",
    title: "Every company",
    description:
      "Each issuer with disclosed insider buying, and the filings behind it.",
  },
  {
    to: "/how-it-works",
    title: "How a filing becomes a rating",
    description:
      "The six checks in full, what each rating means, and where the method stops.",
  },
  {
    to: "/biggest-buys",
    title: "The biggest buys",
    description:
      "The largest purchases insiders have made in their own companies.",
  },
];

/** Matches the shell's geometry, not the old page's: eyebrow, h1, standfirst,
 *  issuer row, tiles, then a ruled list. A skeleton that describes a different
 *  layout is a redraw wearing a loading state. */
function DirectorSkeleton() {
  return (
    <div aria-busy="true" className="mt-5">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center gap-3">
        <Skeleton circle h={32} w={32} />
        <Skeleton className="h-[15px] w-40" />
        <Skeleton className="h-[18px] w-14 rounded" />
      </div>
      <div className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={panel({ variant: "inset", size: "compact" })}
          >
            <Skeleton className="h-[11px] w-14" />
            <Skeleton className="mt-2 h-[26px] w-16" />
          </div>
        ))}
      </div>
      <div className="mt-12 space-y-3">
        <Skeleton className="h-[34px] w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 rounded-control border border-separator/50 p-4"
          >
            <Skeleton className="h-10 w-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
