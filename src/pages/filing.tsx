/** One disclosure, one permanent URL — /dealings/d-1825cd96b288f7e1.
 *
 *  The atomic unit of the product, and the page a stranger is most likely to
 *  arrive on: a filing URL is what gets shared, cited and linked. So it has two
 *  jobs at once — be a complete, honest record of one purchase, and be the best
 *  argument the site makes for the app.
 *
 *  The composition follows from that, and the ORDER is the argument:
 *
 *    what happened  ->  what it did  ->  how we judged it  ->  what's behind it
 *
 *  1. `FilingStage` — the dark hero the research family shares (the story
 *     page's stage is the model): the headline, what was paid and what it has
 *     done since as the figure band, and the price chart inside the panel with
 *     the trade and the disclosure marked. The gap between those two markers
 *     is the single most under-appreciated fact about insider filings and it
 *     is the one thing a static table can never show.
 *  2. The dated basis under the stage, and the share control beside it.
 *  3. `RatingChecks` — the six checks, each expandable to what it asks and what
 *     we found here. This is the method demonstrated on a real filing rather
 *     than described in the abstract, which is why it sits on this page rather
 *     than being a link to /how-it-works.
 *  4. `AnalysisPreview` — the findings themselves, for and against, each with
 *     its source and each gated on click. The ask.
 *
 *  The reference table comes last, because it is the part a reader consults
 *  rather than reads. It is numbered with the rest on desktop (2026-09-19):
 *  every section of a research page carries its counter.
 *
 *  On a PHONE the numbered run renders as a list of hairline rows instead of
 *  stacked sections — each opens its body in the house bottom sheet — because
 *  stacked, the cluster calendar and the checks put screens of scroll between
 *  the stage and the written analysis. Same sections, same order of
 *  argument reversed (written material first), authored once in `sections`
 *  and rendered by whichever layout the viewport picks.
 *
 *  WHAT IS DELIBERATELY ABSENT is decided in shared/filings.js. Read that
 *  header before adding anything from `analysis`: the thesis, the evidence
 *  detail and the risks stay in the app, and showing a crawler more than a
 *  visitor is cloaking rather than a clever workaround.
 *
 *  ---------------------------------------------------------------------------
 *  Two routes, one page: `share`
 *  ---------------------------------------------------------------------------
 *
 *  /t/{id} renders this same component with `share`. That route is the link a
 *  tweet points at and the Universal Link iOS intercepts, so it reaches two
 *  audiences the canonical URL never does: unfurl crawlers, and people with no
 *  app on a phone who have never heard of us.
 *
 *  It used to be a separate 458-line hand-written HTML page in
 *  functions/t/[id].js that never booted the SPA — which meant no navbar, no
 *  dark mode, no market switcher, no floating install bar, no broker rail, no
 *  links to anything else on the site, and a card-in-a-box layout that shared
 *  no design language with the product it was selling. Every improvement made
 *  to the filing page for a year landed on /dealings/{id} and none of it
 *  reached the URL that actually receives cold traffic.
 *
 *  So the two are one component now, and `share` only ADDS: the arrival hero
 *  (the filing as the push notification it would have been), and a directory
 *  section pointing at the rest of the site. It changes nothing about what the
 *  page publishes except `analysis.summary`, which with the discretion gate on
 *  appears on the share route alone. Since 2026-09-19 it is the stage's
 *  labelled standfirst wherever it may be published, rather than a quoted excerpt inside
 *  the analysis section.
 *  The share route canonicalises to /dealings/{id}, so the two are never
 *  competing documents.
 *
 *  ---------------------------------------------------------------------------
 *  Two markets, one page: `market`
 *  ---------------------------------------------------------------------------
 *
 *  Added 2026-08-22. /us/dealings/{id} and /us/t/{id} render this same
 *  component against a `UsDealing`. The US half existed as data long before it
 *  had a page — the wire type already carried `analysis` in the identical shape
 *  UK rows use, precisely so "the same renderers apply on the frontend" — but
 *  /us/t/{id} was a bare redirect to the App Store, so a shared US trade had
 *  nowhere to land and the reply-radar work had no per-trade link to send
 *  anyone to.
 *
 *  Everything market-dependent goes through `filingFamily(market)`
 *  (shared/filing-family.js): which field holds the consideration, how a share
 *  price is written, where the insider's name and role live, what to call the
 *  transaction. Everything else is market-blind because the wire shapes are
 *  genuinely the same on both sides — `analysis`, `cluster`, `buy_style` and
 *  `live_performance` are one contract, so `analysisShape`, `evidenceHeadlines`,
 *  `clusterSentence` and the rest are called directly on either row type.
 *
 *  Do NOT add `market === "us"` branches in this file. If a new fact differs by
 *  market it belongs in the family, where adding it forces both implementations
 *  at once — which is what stops a US page quietly rendering a UK sentence.
 */
import type { ReactNode } from "react";
import type { Dealing, UsDealing } from "@/types/ddbx";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/20/solid";

import { CHECKS } from "../../shared/methodology.js";
import {
  analysisShape,
  evidenceHeadlines,
  clusterSentence,
  cleanName,
  disclosureLagDays,
  FILING_NOTICE,
  filingMeetsBar,
  shares,
} from "../../shared/filings.js";
import { filingFamily } from "../../shared/filing-family.js";
import { shareNotificationLine } from "../../shared/share-notification.js";
import { sectorByLabel, sectorPath } from "../../shared/sectors.js";
import { usInsiderDisplayName } from "../../shared/us-names.js";

import {
  ContextCards,
  RatingChecks,
  TrialNudge,
} from "@/components/filing/filing-ui";
import {
  FilingStage,
  FilingStageSkeleton,
  longDate,
} from "@/components/filing/filing-stage";
import { IssuerBuys } from "@/components/filing/issuer-buys";
import { AnalysisPreview } from "@/components/filing/analysis-preview";
import {
  FilingSectionRows,
  type FilingSectionEntry,
} from "@/components/filing/filing-section-rows";
import { DISCRETION_ENABLED } from "@/lib/discretion";
import { useMediaQuery } from "@/lib/use-media-query";
import { ClusterPanel } from "@/components/filing/cluster-panel";
import { ShareArrivalCard } from "@/components/filing/share-arrival";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { ShareRow } from "@/components/share-row";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { RelatedCards } from "@/components/seo/related-cards";
import { CompanyLogo } from "@/components/company-logo";
import { api } from "@/lib/api";
import { cleanCompanyName, companyPath, displayTicker } from "@/lib/company";
import { displayCompany } from "@/lib/display-name";
import { useRememberPage } from "@/lib/search/history";

const RULE = "border-hairline dark:border-separator";
const R = {
  body: "text-[14px] leading-[1.65] text-foreground/70",
};

export default function FilingPage({
  share = false,
  market = "UK",
}: {
  share?: boolean;
  market?: "UK" | "US";
}) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fam = filingFamily(market);
  const us = market === "US";
  // A row the reader clicked in a list arrives with the navigation (see
  // `filingSeed`), and a filing already read this session is in the cache:
  // either renders the page on the first frame, the way the drawer used to
  // open, while the fetch below refreshes it underneath.
  const initial = id ? seededFiling(id, location.state) : null;
  const [deal, setDeal] = useState<Dealing | UsDealing | null>(initial);
  // "missing" and "failed" are different pages: an outage must not render as
  // "this filing does not exist".
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "failed">(
    initial ? "ok" : "loading",
  );
  // The numbered run renders two ways: the full stacked sections on md+, and
  // a row list that opens each section in the bottom sheet below it. A JS
  // branch rather than CSS visibility because the bodies must MOUNT exactly
  // once — hidden-but-mounted would fetch the price chart twice. Same
  // breakpoint AppDrawer keys its own direction on, so whenever the rows are
  // the layout, the sheet they open is the bottom variant.
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (!id) {
      setStatus("missing");

      return;
    }

    let live = true;
    const seeded = seededFiling(id, location.state);

    // Seeded: show it now and refresh quietly. A failed refresh leaves the
    // seeded record standing rather than replacing a page with an error.
    if (seeded) {
      setDeal(seeded);
      setStatus("ok");
    } else {
      setDeal(null);
      setStatus("loading");
    }
    (us ? api.usDealing(id) : api.dealing(id))
      .then((d) => {
        if (!live) return;
        FILING_CACHE.set(id, d);
        setDeal(d);
        setStatus("ok");
      })
      .catch((err: Error) => {
        if (!live || seeded) return;
        setStatus(/\b404\b/.test(err.message) ? "missing" : "failed");
      });

    return () => {
      live = false;
    };
    // location.state is read once per id: it is the seed for THIS navigation.
  }, [id, us]);

  const evidence = useMemo(() => (deal ? evidenceHeadlines(deal) : []), [deal]);
  const shape = useMemo(() => (deal ? analysisShape(deal) : null), [deal]);

  const context = useMemo(() => {
    if (!deal) return [];
    // Cluster is NOT here: it has its own panel below, drawn from the issuer's
    // filings. Leaving a summary card alongside it put two statements of the
    // same fact on screen, with different numbers.
    const out: { label: string; value: ReactNode; body: string }[] = [];
    const b = deal.buy_style;

    if (b?.kind && b.kind !== "neutral") {
      const off = Math.abs(Math.round((b.drawdown_from_high_pct || 0) * 100));
      const contrarian = b.kind === "contrarian";
      // The arrow states the price direction the words already describe, so
      // the pair reads at a glance. Muted rather than text-negative/positive:
      // "into weakness" is the price's direction, not the signal's — a
      // contrarian buy is if anything the more interesting kind, and a red
      // arrow would score it as a bad mark.
      const DirIcon = contrarian ? ArrowDownRightIcon : ArrowUpRightIcon;

      out.push({
        label: "Buy style",
        value: (
          <span className="inline-flex items-center gap-1.5">
            {contrarian ? "Into weakness" : "Into strength"}
            <DirIcon
              aria-hidden
              className="h-[18px] w-[18px] shrink-0 text-foreground/40"
            />
          </span>
        ),
        body: contrarian
          ? `Bought ${off}% below the trailing ${b.window_days}-day high. Leaning into a drawdown rather than chasing one.`
          : `Bought at or near the trailing ${b.window_days}-day high, with the price already running.`,
      });
    }

    return out;
  }, [deal]);

  // Into the search palette's "recently viewed", named by issuer and filer.
  useRememberPage(
    deal
      ? {
          kind: "filing",
          label: us
            ? displayCompany(deal.company, deal.ticker)
            : cleanCompanyName(deal.company),
          sub:
            "reporter" in deal
              ? usInsiderDisplayName(deal.reporter.name)
              : deal.director.name,
          ticker: deal.ticker,
          market: us ? "US" : "UK",
        }
      : null,
  );

  if (status === "missing" || status === "failed") {
    return (
      <DefaultLayout drawerRight>
        <SeoRail marketId={fam.marketId} placement="filing_rail" />
        <SeoPageShell
          crumbs={[{ label: "Filings" }, { label: "Not found" }]}
          eyebrow="Disclosure"
          standfirst={
            status === "missing"
              ? "Every disclosure we hold has a permanent address. This isn’t one of them, so the link is either wrong or points at a filing from before we started recording."
              : "We couldn’t load this filing just now. That’s a fault at our end rather than a missing record."
          }
          title={
            status === "missing"
              ? "We don’t hold that filing"
              : "Couldn’t load this filing"
          }
        >
          <SeoSection aside="Where to go instead." title="Browse the record">
            <RelatedCards
              cols={2}
              items={[
                {
                  to: "/companies",
                  title: "Every company",
                  description:
                    "Each issuer with disclosed insider buying, and the filings behind it.",
                },
                {
                  to: "/biggest-buys",
                  title: "The biggest buys",
                  description:
                    "The largest open-market purchases insiders have made in their own companies.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const hasCluster = !!(deal?.cluster?.count && deal.cluster.count >= 2);
  const lag = deal ? disclosureLagDays(deal) : null;
  const sector = deal?.sector_normalized
    ? sectorByLabel(deal.sector_normalized)
    : null;
  const analysed = filingMeetsBar(deal);
  // Only read inside the `deal ?` block below, but computed alongside the other
  // derived values so the record grid stays a flat list of rows.
  const insider = deal ? fam.insider(deal) : { name: "", role: null };
  // Empty rather than "Filing" while loading: every slot that would have
  // shown the word renders a skeleton instead (see `title` and the trailing
  // crumb below) — a placeholder word flashing before the record arrives is
  // copy the page never meant to publish.
  const name = deal
    ? cleanName(deal.company) || displayTicker(deal.ticker)
    : "";
  // Filings that didn't clear the screen carry no written analysis, but they
  // do carry the reason they were passed over — and a reader who followed a
  // "+121% since disclosure" card is owed that rather than a page that simply
  // stops after the record.
  const screenedOut = !analysed && !!deal?.triage?.reason;

  // The first nudge's lead, computed rather than stock: most readers arrive
  // from a tweet or a search result days after the fact, and "you are N days
  // behind" is the one true sentence that makes the app's timing argument on
  // their own filing. Falls back to the plain claim inside the first two days,
  // when the count would undercut itself.
  const daysSince = deal
    ? Math.max(
        0,
        Math.round(
          (Date.now() - Date.parse(`${deal.disclosed_date}T00:00:00Z`)) /
            86_400_000,
        ),
      )
    : 0;
  const lagLead =
    daysSince >= 2
      ? `You’re reading this ${daysSince} days after it was disclosed. App readers had it that day.`
      : "App readers get every filing the day it’s disclosed, as an alert.";
  // One lead per slot, themed to the section it precedes — except the first
  // nudge to render, which always carries the lag line above, because it is
  // the strongest sentence the page has and every variant of the page (with
  // or without a cluster, screened or rated) should open its asking with it.
  const themedLead: Record<string, string> = {
    context: hasCluster
      ? "When another insider joins a cluster like this, the app flags the new buy as it lands."
      : "The app reads this context on every buy, the day it arrives.",
    screened:
      "Filings that clear this screen arrive in the app written up in full.",
    checks:
      "Every buy in the app has been through these six checks before you see it.",
    analysis:
      "A written case like this travels with every rated buy in the app.",
  };

  // ── The numbered run, authored once as data ────────────────────────────
  //
  // Numbered run over the sections that make the argument. The reference
  // table and "read next" sit outside it — a counter on an appendix suggests
  // it is part of the read.
  //
  // Built from the sections that will actually render, rather than counted by
  // hand: a filing with no cluster and no context used to get a Context
  // section whose entire content was a sentence saying there was nothing to
  // put in it, kept only so the numbering added up. Nothing to say is a
  // reason to say nothing — the run renumbers itself instead.
  //
  // ONE list, TWO layouts. Desktop renders these as the stacked SeoSection
  // run with the nudges threaded between; mobile renders them as hairline
  // rows opening the bottom sheet (FilingSectionRows). The bodies live here
  // and nowhere else, so the two layouts cannot drift.
  //
  // `hint` is the row's one-liner and the drawer subtitle; `aside` stays the
  // desktop section's fuller qualifier. Every figure in a hint is a number
  // the page actually holds — the static-page rules apply inside the drawer
  // exactly as they do on the open page.
  type FilingSection = FilingSectionEntry & { aside: ReactNode };
  const sections: FilingSection[] = [];

  if (deal) {
    if (context.length > 0 || hasCluster) {
      // The detector's window, in words a reader uses. 14 and 30 are the two
      // spans it runs; anything else is stated as a count of days rather
      // than rounded to a phrase it does not match.
      const windowDays = deal.cluster?.window_days ?? 14;
      const windowWord =
        windowDays === 14
          ? "two weeks"
          : windowDays === 30
            ? "a month"
            : `${windowDays} days`;

      sections.push({
        key: "context",
        title: hasCluster ? "They were not the only one" : "Context",
        // No "cluster", "window" or "breadth" (Jon, 2026-09-19: "very hard
        // to understand"). The detector's count is stated here, once, and
        // the panel below counts purchases from the filings it loads.
        aside: hasCluster
          ? `${deal.cluster?.count} insiders at ${name} bought shares within ${windowWord} of each other. One insider buying can mean many things. Several buying at the same time is harder to explain away.`
          : "What else was happening around this purchase.",
        hint: hasCluster
          ? `${deal.cluster?.count} insiders bought within ${windowWord} of each other.`
          : "What else was happening around this purchase.",
        body: (
          <>
            {/* The cluster, drawn from the issuer's own filings, above the
                summary cards. It renders null when the co-buyers cannot be
                loaded, so the cards below are always the floor. */}
            <ClusterPanel
              deal={deal}
              fallback={clusterSentence(deal) ?? ""}
              market={market}
            />
            <ContextCards items={context} />
          </>
        ),
      });
    }

    if (screenedOut) {
      sections.push({
        key: "screened",
        title: "Why there is no analysis of this one",
        aside:
          "Every disclosure is screened before anything is written about it. This one was not taken further, and this is the reason it was given at the time.",
        hint: "The screening judgement, as it was made on the day.",
        body: (
          <>
            <p className={`mt-4 max-w-[62ch] ${R.body}`}>
              {deal.triage?.reason}
            </p>
            <p className={`mt-4 max-w-[62ch] ${R.body}`}>
              That is a judgement made on the day it filed, on what was known
              then, not a view on the company, and not a prediction. The price
              since is the chart at the top of the page, and it is why this
              filing can appear among the best performers with nothing written
              about it.
            </p>
          </>
        ),
      });
    }

    if (analysed && deal.analysis?.checklist) {
      const checklist = deal.analysis.checklist;
      const met = CHECKS.filter((c) => checklist[c.key]).length;

      sections.push({
        key: "checks",
        title: `Why this was rated ${deal.analysis.rating}`,
        aside:
          "The same six checks every purchase is scored against, answered for this one.",
        hint: `${met} of ${CHECKS.length} checks met.`,
        body: (
          <RatingChecks checklist={checklist} deal={deal} market={market} />
        ),
      });
    }

    if (analysed && shape) {
      sections.push({
        key: "analysis",
        title: "What the analysis found",
        aside: DISCRETION_ENABLED
          ? "Every finding the assessment reached, for and against, with the source behind each. The reasoning under them is in the app."
          : "The whole assessment: the thesis, every finding for and against with the source behind each, and the risks weighed against them.",
        hint: `${shape.for} findings for, ${shape.against} against, with sources.`,
        body: (
          <AnalysisPreview
            deal={deal}
            evidence={evidence}
            marketId={fam.marketId}
            shape={shape}
            // Never printed here any more: wherever the page may publish the
            // summary (share route, or discretion off) it is the stage's
            // standfirst, and a second statement of it two screens down is
            // the repetition this section was rebuilt to stop.
            summary={null}
          />
        ),
      });
    }
  }

  // The row list runs in reverse: the argument reads context → checks →
  // analysis, but a reader tapping rows wants the written material first, so
  // the mobile list leads with the analysis (or, on a screened filing, the
  // screening reason) and ends on the context. The rows
  // renumber themselves in their own order — the desktop counters are never
  // on screen at the same time.
  const mobileSections = [...sections].reverse().map((s) => ({
    ...s,
    // The ask still meets the reader at the pause after the content — at the
    // foot of each sheet, in the section's own words, as it does between the
    // stacked sections on desktop.
    drawerFoot: themedLead[s.key] ? (
      <TrialNudge lead={themedLead[s.key]} marketId={fam.marketId} />
    ) : undefined,
  }));

  // The analysis summary, where the page may publish it — the share route, or
  // anywhere with discretion off (the rule shared/filings.js sets and
  // AnalysisPreview enforces). The stage sets it as a labelled standfirst
  // under a headline composed from the filing's own fields.
  const summary =
    deal && analysed && (share || !DISCRETION_ENABLED)
      ? deal.analysis?.summary?.trim() || null
      : null;
  const asOf = deal?.live_performance?.as_of ?? null;

  // The reference grid, numbered as the run's last section on desktop and set
  // inline after the rows on a phone (it is two screens of short facts, not
  // something to open in a sheet).
  //
  // A GRID, NOT TEN FULL-WIDTH ROWS. As `label ......... value` across the
  // whole 860px measure every pair had 500px of empty carpet between its two
  // halves. Two columns, not three: there are ten fields, so two divides
  // evenly and every row of the grid is full. Two up on the phone as well;
  // long values wrap inside their own cell.
  const recordBody = deal ? (
    <dl className={`mt-4 grid grid-cols-2 gap-x-6 border-t ${RULE} sm:gap-x-8`}>
      <Row label="Insider" value={insider.name} />
      <Row label="Role" value={insider.role ?? "—"} />
      <Row
        label="Company"
        value={
          <Link
            className="underline underline-offset-4"
            to={companyPath(deal.ticker)}
          >
            {name}
          </Link>
        }
      />
      <Row label="Shares" value={shares(deal.shares)} />
      {/* A US leg can be footnote-priced rather than stating a price
            (distributions, complex transactions), where a UK row always
            carries one. An em dash is the honest cell; a fabricated
            $0.00 is not. */}
      <Row label="Price paid" value={fam.sharePrice(deal) ?? "—"} />
      {/* Currency is pinned by the family, never read from
            `deal.currency` — see the note on `sharePrice` in
            shared/filings.js. On a UK row `value_gbp` is the
            FX-converted canonical figure while `currency` describes the
            original RNS. */}
      <Row
        label="Consideration"
        value={fam.value(deal) == null ? "—" : fam.money(fam.value(deal))}
      />
      <Row
        label="Traded"
        value={longDate(deal.trade_date, market, { weekday: true })}
      />
      <Row
        label="Disclosed"
        value={longDate(deal.disclosed_date, market, { weekday: true })}
      />
      <Row
        label="Disclosure lag"
        value={
          lag == null
            ? "—"
            : lag === 0
              ? "Same day"
              : `${lag} ${lag === 1 ? "day" : "days"}`
        }
      />
      <Row label="Transaction" value={fam.transactionLabel(deal)} />
    </dl>
  ) : null;

  const totalSections = sections.length + 1;

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId={fam.marketId} placement="filing_rail" />
      <SeoPageShell
        titleInHero
        /* No visible crumbs (Jon, 2026-09-19): the bar above the stage read
           as chrome between the reader and the filing. The stage's eyebrow
           and company link carry the way back, and the BreadcrumbList
           JSON-LD is emitted by the pre-render (shared/prerender.js), not
           from this prop, so search keeps it. */
        cta={{
          body: "This page is one filing. The app is the running feed: every disclosure the day it files, already rated, with the written case attached and an alert when the price moves after a buy you’re following.",
          gaLabel: `${share ? "Share" : "Filing"} · ${id ?? ""}`,
          headline: "Every filing, the day it files.",
          marketId: fam.marketId,
        }}
        eyebrow={share ? "Shared filing" : "Disclosure"}
        hero={
          // The notification, above the crumbs — the share route's one job
          // above the fold. Only once the row has arrived: an empty card slot
          // that later pushes the whole document down is the loading
          // behaviour the shell exists to prevent.
          share && deal ? (
            <ShareArrivalCard deal={deal} marketId={fam.marketId} />
          ) : undefined
        }
        loading={status === "loading"}
        skeleton={
          <>
            <div className={share ? "mt-6" : "pt-2"}>
              <FilingStageSkeleton />
            </div>
            <Skeleton className="mt-5 h-[12px] w-[70%] rounded" />
            <SeoSkeleton rows={6} variant="ruled-list" />
          </>
        }
        /* The stage carries the h1, the eyebrow and the standfirst (hence
           `titleInHero` above), so the shell prints none of its own header
           furniture. `title` still names the page for the shell. */
        title={name}
      >
        {deal ? (
          <>
            <div className="mt-6">
              <FilingStage
                deal={deal}
                eyebrow={share ? "Shared filing" : "Disclosure"}
                market={market}
                sector={sector}
                summary={summary}
              />
            </div>

            {/* The dated basis, then the share control: the two pieces of
                small print every stage in the family sets directly under its
                panel. Share is always /t/{id}, on BOTH routes: the canonical
                page's readers are sharing the filing, not the URL they happen
                to be reading it at, and the share route is the one with the
                unfurl card and the Universal Link. The text is the same
                sentence the unfurl carries, so a tweet and its preview agree. */}
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <p className="max-w-[62ch] text-[12.5px] leading-[1.6] text-foreground/45">
                {asOf
                  ? `Marked to the close on ${longDate(asOf, market)}. `
                  : ""}
                {FILING_NOTICE}
              </p>
              {id ? (
                <ShareRow
                  className="shrink-0"
                  context={us ? "filing-us" : "filing"}
                  title={
                    shareNotificationLine(deal, market) ??
                    fam.leadSentence(deal)
                  }
                  url={fam.sharePath(id)}
                />
              ) : null}
            </div>

            {/* DESKTOP: the stacked numbered run, with the ask threaded
                between the sections rather than inside any of them, so the
                reader meets it at each natural pause in the argument, never
                mid-checklist. Each slot carries its own lead, but every one
                ends on the identical trial terms.

                MOBILE: the same sections as one screen of hairline rows, each
                opening its body in the bottom sheet. The threaded nudges
                collapse to a single one after the rows, carrying the lag line
                (the strongest sentence the page has); the themed leads ride
                at the foot of each sheet instead. */}
            {isDesktop ? (
              sections.map((s, i) => (
                <Fragment key={s.key}>
                  {i > 0 ? (
                    <div className="mt-12">
                      <TrialNudge
                        lead={i === 1 ? lagLead : themedLead[s.key]}
                        marketId={fam.marketId}
                      />
                    </div>
                  ) : null}
                  <SeoSection
                    aside={s.aside}
                    index={i + 1}
                    title={s.title}
                    total={totalSections}
                  >
                    {s.body}
                  </SeoSection>
                </Fragment>
              ))
            ) : sections.length > 0 ? (
              <>
                <FilingSectionRows sections={mobileSections} />
                <div className="mt-6">
                  <TrialNudge lead={lagLead} marketId={fam.marketId} />
                </div>
              </>
            ) : null}

            <SeoSection
              aside="The filing, as it was disclosed."
              index={isDesktop ? totalSections : undefined}
              title="The record"
              total={isDesktop ? totalSections : undefined}
            >
              {recordBody}
            </SeoSection>

            <IssuerBuys company={name} deal={deal} market={market} />

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: companyPath(deal.ticker),
                    title: `Every filing at ${name}`,
                    description:
                      "The issuer's full record: who has bought, how much, and how those purchases have done.",
                    // The issuer's own mark rather than the generic company
                    // glyph: this card points at one specific company and the
                    // logo is the fastest way to say which.
                    media: <CompanyLogo size={32} ticker={deal.ticker} />,
                  },
                  ...(sector
                    ? [
                        {
                          to: sectorPath(sector.slug),
                          title: `${sector.label} insider buying`,
                          description:
                            "The sector's twelve-month picture, and how its buys have performed against the market.",
                        },
                      ]
                    : []),
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
                ]}
              />
            </SeoSection>

            {/* Share-route only. "Read next" above is contextual, this
                company, this sector, this method — and it is the right list
                for a reader who arrived on the filing deliberately.
                A reader who arrived from a tweet has no idea the rest of this
                exists, and the single most common thing they do next is
                leave. So the share route also gets a front door — but four
                doors, not eight. The full sitemap sat here once and, stacked
                on "Read next", made twelve link cards between the last content
                and the terminal ask: the strongest CTA on the page buried two
                screens deep in navigation. The footer already carries every
                surface; this section carries the four a cold reader might
                actually want next. */}
            {share ? (
              <SeoSection
                aside="A filing is the smallest thing here. These are the standing surfaces it sits inside."
                title="The rest of ddbx"
              >
                <RelatedCards
                  cols={2}
                  items={[
                    {
                      to: "/",
                      title: "Today’s disclosures",
                      description: `The live feed: everything ${us ? "US" : "UK"} insiders have filed, newest first.`,
                    },
                    {
                      to: "/weekly",
                      title: "This week in filings",
                      description:
                        "What insiders bought week by week, written up each Monday.",
                    },
                    {
                      to: "/compare",
                      title: "Where to actually buy shares",
                      description: `${us ? "US" : "UK"} trading platforms compared on cost, with the fees stated rather than summarised.`,
                    },
                    {
                      to: "/learn",
                      title: "The vocabulary",
                      description: us
                        ? "Form 4, 10b5-1, Section 16: what the terms in a filing mean, in plain words."
                        : "PDMR, RNS, closed periods: what the terms in a filing mean, in plain words.",
                    },
                  ]}
                />
              </SeoSection>
            ) : null}
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}

/** Filings read this session, by id. Stepping back to one (or across to it
 *  from the other-buys list and back) renders at once. */
const FILING_CACHE = new Map<string, Dealing | UsDealing>();

/** The navigation state a list passes when it opens a filing page: the wire
 *  row it already holds. See `lib/filing-nav.ts`. */
function seededFiling(id: string, state: unknown): Dealing | UsDealing | null {
  const seed = (state as { filingSeed?: Dealing | UsDealing } | null)
    ?.filingSeed;

  if (seed && seed.id === id && isFullRow(seed)) return seed;

  return FILING_CACHE.get(id) ?? null;
}

/** A lite window row (`fields=lite`) keeps only the rating from `analysis`;
 *  seeding the page with one would render a rated filing with no checks and
 *  no findings until the fetch landed. Rated rows must carry the summary. */
function isFullRow(d: Dealing | UsDealing): boolean {
  const a = d.analysis as { rating?: unknown; summary?: unknown } | null;

  return !a || !a.rating || typeof a.summary === "string";
}

/** One cell of the record grid: label over value, both left-set.
 *
 *  Left-set rather than the label-left/value-right split it replaced. In a
 *  three-column grid a right-aligned value sits against the NEXT column's
 *  label, which reads as a pair that isn't one; stacking removes the ambiguity
 *  and lets a long value ("Person Closely Associated with the CFO") wrap inside
 *  its own cell instead of pushing its label out of the column. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`min-w-0 border-b ${RULE} py-3`}>
      <dt className="text-[11.5px] leading-none text-foreground/45">{label}</dt>
      <dd className="mt-1.5 break-words text-[14px] leading-[1.4] text-foreground/85">
        {value}
      </dd>
    </div>
  );
}
