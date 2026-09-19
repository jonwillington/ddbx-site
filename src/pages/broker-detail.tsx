/** One broker review — /brokers/:slug.
 *
 *  Built on the board grammar the research pages share (/insider-index,
 *  /reports, the stories): the object first, then the evidence, then the
 *  small print.
 *
 *  1. The stage. A dark panel carrying the h1 over the review's proof object,
 *     which for a platform is what it costs: the estimated yearly bill at the
 *     reader's chosen balance, and the same bill for the field average and the
 *     cheapest rival, drawn as bars. The affiliate disclosure is the panel's
 *     top strip and the visit button sits in the panel beside the headline,
 *     so the disclosure is on screen whenever the commercial link is. Ratings
 *     and protection go in the caption strip.
 *  2. The basis line: what the estimate assumes and when the figures were
 *     checked.
 *  3. Numbered sections, each on the page ground: verdict, app, fees,
 *     platform, offer, questions, other platforms, guides. A section with
 *     nothing to say (no screenshots, no live offer, no guides) is left out
 *     and the count closes up, rather than rendering an empty frame.
 *  4. Sources and disclaimers, then the shell's terminal ask.
 *
 *  Colour carries meaning only: positive/negative for for/against in the
 *  verdict, brand amber for this platform's bar on the stage. No per-broker
 *  brand graphics.
 *
 *  The token map for the rest of the /brokers tree (`R`) lives in
 *  broker-page-ui.tsx; this page no longer uses its sheet.
 */
import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { GiftIcon } from "@heroicons/react/20/solid";

import {
  CATEGORIES,
  categoryMeetsBar,
  categoryPath,
} from "../../shared/broker-categories.js";

import { BrokerNavAside } from "@/components/brokers/broker-aside";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { Stage, StageFooter } from "@/components/ui/stage";
import { eyebrow } from "@/components/ui/eyebrow";
import { glass } from "@/components/ui/glass";
import { panel } from "@/components/ui/panel";
import { StageTitle } from "@/components/ui/stage-header";
import {
  BrokerComplianceNote,
  BrokerLogo,
  BrokerVisitLink,
} from "@/components/brokers/broker-ui";
import { CostBars, SourceNote } from "@/components/brokers/broker-page-ui";
import {
  BoardRow,
  BoardRowHeader,
  BoardRowList,
} from "@/components/boards/board-row";
import { StageFigures } from "@/components/boards/stage-figures";
import DefaultLayout from "@/layouts/default";
import { ShareRow } from "@/components/share-row";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { brokerGuideCta } from "@/components/seo/cta-copy";
import { Skeleton } from "@/components/skeleton";
import appShots from "@/data/broker-app-screenshots.json";
import { api, type BrokerOffer } from "@/lib/api";
import {
  BROKER_DISCLOSURE,
  COST_POTS,
  estAnnualCost,
  fmtMoney,
  fmtMoneyRound,
  fmtPct,
  fmtPotLabel,
  fmtVerifiedDate,
  isAffiliateLink,
  isOfferLive,
  platformFeeSummary,
} from "@/lib/brokers";

const BODY = "text-lede text-foreground/75";
const KICKER = eyebrow("quiet");

/* The hero is the board-stage material, as every hero in the family draws
   it: <Stage> and its caption strip, components/ui/stage.tsx. STRIP is the
   same strip's type, for the disclosure line along its top. */
const STRIP =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3.5 text-small text-white/65";

type AppShotsEntry = {
  appId: number;
  appName: string;
  appUrl: string;
  /** mzstatic base URLs — append a size rendition like /600x1300bb.webp. */
  screenshots: string[];
};

export default function BrokerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [brokers, setBrokers] = useState<BrokerOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .brokers("UK")
      .then(setBrokers)
      .catch((reason) => setError((reason as Error).message));
  }, []);

  const broker = useMemo(
    () => brokers?.find((item) => item.slug === slug) ?? null,
    [brokers, slug],
  );

  // Failed and missing are different states (static-page rules): a fetch
  // that fell over is our fault and says so; a slug we don't review is the
  // reader's link. Both leave by the same door, the full directory.
  if (error || (brokers && !broker)) {
    return (
      <DefaultLayout>
        <SeoPageShell
          crumbs={[
            { label: "Broker reviews", to: "/brokers" },
            { label: error ? "Unavailable" : "Not found" },
          ]}
          cta={false}
          error={
            error
              ? {
                  what: "this review",
                  detail: `That’s a fault at our end rather than a missing review (${error}). Try a refresh in a moment, or browse every platform we cover.`,
                }
              : null
          }
          eyebrow="Broker review"
          standfirst="We review the UK trading platforms most readers ask about. This isn’t one of them yet, or the link is wrong."
          title="We don’t have a review for that platform"
        >
          <SeoSection
            more={{ to: "/brokers", label: "See all brokers" }}
            title="Browse instead"
          >
            <p className="max-w-measure text-body text-foreground/70">
              Every platform we cover, ranked on fees, features and FSCS
              protection, with its own full review.
            </p>
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  return <BrokerReview broker={broker} brokers={brokers} />;
}

/** The review, or its loading geometry when `broker` is still null. One
 *  component for both so the stage and the sections stand in the same place
 *  while the fetch is in flight as they do once it lands. */
function BrokerReview({
  broker: b,
  brokers,
}: {
  broker: BrokerOffer | null;
  brokers: BrokerOffer[] | null;
}) {
  // One balance for the whole page, as the story page has one return basis:
  // the stage's toggle sets it and the other-platform rows follow it, so a
  // "£8 a year" on the stage and a figure on a row are the same question.
  const [pot, setPot] = useState<number>(COST_POTS[1]);

  return (
    <DefaultLayout drawerRight hideMobileCta>
      {b && brokers ? <BrokerNavAside brokers={brokers} current={b} /> : null}

      <div className="pb-24 lg:pb-0">
        <SeoPageShell
          titleInHero
          crumbs={
            b
              ? [{ label: "Broker reviews", to: "/brokers" }, { label: b.name }]
              : undefined
          }
          cta={
            b
              ? {
                  ...brokerGuideCta,
                  gaLabel: `Broker review · ${b.slug}`,
                  marketId: "uk",
                  media: "none",
                }
              : false
          }
          eyebrow="Broker review"
          hero={
            b && brokers ? (
              <ReviewStage
                broker={b}
                brokers={brokers}
                pot={pot}
                onPot={setPot}
              />
            ) : (
              <StageSkeleton />
            )
          }
          loading={!b || !brokers}
          skeleton={<SeoSkeleton rows={6} variant="doc-sections" />}
          title={b ? `${b.name} review` : ""}
          width="wide"
        >
          {b && brokers ? (
            <ReviewBody broker={b} brokers={brokers} pot={pot} />
          ) : null}
        </SeoPageShell>
      </div>

      {b ? <MobileVisitBar broker={b} /> : null}
    </DefaultLayout>
  );
}

/** The broker formatters answer "—" for a fee we don't have. That is a dash
 *  in a figure slot, which the static-page rules forbid, so rows say so. */
function orUnstated(value: string): string {
  return value === "—" ? "Not stated" : value;
}

/* ─── The stage ─────────────────────────────────────────────────────────── */

/** Where the platform's bill sits against the other platforms at this
 *  balance, in words. Ties count as neither cheaper nor dearer, so a free
 *  platform among other free ones is "joint cheapest", never "cheaper than
 *  none". */
function rankSentence(mine: number, rivals: number[]): string {
  const n = rivals.length;
  const cheaper = rivals.filter((v) => v < mine - 0.005).length;
  const dearer = rivals.filter((v) => v > mine + 0.005).length;

  if (cheaper === 0 && dearer === n)
    return `Cheapest of all ${n + 1} platforms`;
  if (cheaper === 0) return `Joint cheapest of ${n + 1} platforms`;

  // Say the larger side: "cheaper than 2 of 18" undersells what is really
  // "dearer than 15 of 18", and reads as praise it isn't.
  return dearer >= cheaper
    ? `Cheaper than ${dearer} of the other ${n} platforms`
    : `Dearer than ${cheaper} of the other ${n} platforms`;
}

function ReviewStage({
  broker: b,
  brokers,
  pot,
  onPot,
}: {
  broker: BrokerOffer;
  brokers: BrokerOffer[];
  pot: number;
  onPot: (pot: number) => void;
}) {
  const mine = estAnnualCost(b.fees, pot);
  const rivals = brokers
    .filter((item) => item.slug !== b.slug)
    .map((item) => ({
      name: item.name,
      total: estAnnualCost(item.fees, pot).total,
    }));
  const average =
    rivals.reduce((total, item) => total + item.total, 0) /
    Math.max(rivals.length, 1);
  const cheapest = rivals.length
    ? rivals.reduce((best, item) => (item.total < best.total ? item : best))
    : null;
  const bars = [
    { label: b.name, value: mine.total, primary: true },
    ...(rivals.length ? [{ label: "Platform average", value: average }] : []),
    ...(cheapest
      ? [{ label: `Cheapest: ${cheapest.name}`, value: cheapest.total }]
      : []),
  ];

  // The header's fee figures. A fee we don't have is left out rather than set
  // as a dash in 26px type; the full schedule below says "not published".
  const accounts = [b.accounts.stocks_isa && "ISA", b.accounts.sipp && "SIPP"]
    .filter(Boolean)
    .join(" + ");
  const figures = [
    { k: "Platform fee", v: platformFeeSummary(b.fees) },
    { k: "UK trades", v: fmtMoney(b.fees.trade_commission_uk_gbp) },
    { k: "FX fee", v: fmtPct(b.fees.fx_fee_pct) },
    { k: "Tax wrappers", v: accounts },
  ].filter((f) => f.v && f.v !== "—");

  const ratings = [
    { label: "App Store", value: b.trust.app_store_rating },
    { label: "Google Play", value: b.trust.play_store_rating },
    { label: "Trustpilot", value: b.trust.trustpilot_rating },
  ].filter(
    (item): item is { label: string; value: number } => item.value != null,
  );

  const offer = isOfferLive(b) ? b.offer_headline : null;

  return (
    <Stage>
      {/* The disclosure is the panel's first line: it is on screen whenever
          the visit button below it is, at every width. */}
      <p className={`${STRIP} border-b border-rule-stage !text-white/60`}>
        <span>
          <span className="font-semibold text-white/85">Ad.</span>{" "}
          {BROKER_DISCLOSURE.replace(/^Ad\. /, "")}
        </span>
      </p>

      <div className="grid gap-x-12 gap-y-9 px-6 pt-7 sm:px-8 sm:pt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div className="min-w-0">
          <SectionEyebrow tone="stage">
            {`Review · Updated ${fmtVerifiedDate(b.last_verified)}`}
          </SectionEyebrow>

          <BrokerLogo broker={b} className="mt-5 !rounded-card" size={80} />

          <StageTitle className="mt-5">{b.name}</StageTitle>
          <p className="mt-3 max-w-[52ch] text-lede text-white/65">
            {b.tagline}
          </p>

          <StageFigures items={figures} />

          {/* The ask, sized to its content. The dark scope flips the filled
              button to its white-on-dark form without forking its tokens. */}
          <div className="dark mt-8">
            {offer ? (
              <p className="mb-3 flex max-w-[52ch] items-start gap-2 text-body font-medium text-brand-amber">
                <GiftIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {offer}.{" "}
                  <a
                    className="font-normal text-white/55 underline underline-offset-2 hover:text-white/80"
                    href="#offer"
                  >
                    Terms apply
                  </a>
                </span>
              </p>
            ) : null}
            <BrokerVisitLink broker={b} placement="verdict" size="lg" />
            <p className="mt-2.5 text-caption text-white/45">
              Capital at risk.
              {isAffiliateLink(b) ? " We may earn a commission." : ""}
            </p>
          </div>
        </div>

        {/* The verdict figure: what this platform would cost, at a balance
            the reader picks. */}
        <div className="min-w-0 lg:justify-self-end lg:text-right">
          <p className="micro text-white/45">
            Estimated cost a year on £{pot.toLocaleString("en-GB")}
          </p>
          {/* Proportional figures at this size; tabular loosens them. */}
          <p className="mt-1 text-figure-xl normal-nums text-white">
            {fmtMoneyRound(mine.total)}
          </p>
          <p className="mt-2 text-lede font-medium text-white/85">
            {rankSentence(
              mine.total,
              rivals.map((r) => r.total),
            )}
          </p>
          <p className="mt-1.5 text-small tabular-nums text-white/50">
            Platform {fmtMoneyRound(mine.platform)} · Dealing{" "}
            {fmtMoneyRound(mine.dealing)} · FX {fmtMoneyRound(mine.fx)}
          </p>
          <div className="mt-5 flex lg:justify-end">
            <div className="flex rounded-full border border-white/12 bg-white/[0.06] p-0.5">
              {COST_POTS.map((value) => (
                <button
                  key={value}
                  aria-pressed={pot === value}
                  className={`rounded-full px-3.5 py-1.5 text-small font-medium transition-colors ${
                    pot === value
                      ? "bg-white text-[#1a140d]"
                      : "text-white/65 hover:text-white"
                  }`}
                  type="button"
                  onClick={() => onPot(value)}
                >
                  {fmtPotLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The comparison, full width under the header, the way every stage
          puts its object. Only this platform's bar carries the hue. */}
      <div className="mt-9 border-t border-rule-stage px-6 pb-8 pt-6 sm:px-8">
        <p className="micro text-white/45">
          Against the other {rivals.length} platforms we review
        </p>
        <CostBars className="mt-5" rows={bars} tone="stage" />
      </div>

      <StageFooter>
        <span>
          {ratings.length
            ? ratings
                .map((item) => `${item.label} ${item.value.toFixed(1)}`)
                .join(" · ")
            : "No app-store rating published"}
        </span>
        <span className="text-white/45">
          {[
            b.trust.regulator && `${b.trust.regulator} regulated`,
            b.trust.fscs_protected
              ? "FSCS protected to £85,000"
              : "Not listed as FSCS protected",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </StageFooter>
    </Stage>
  );
}

/** The stage at its arrived geometry, before the record lands. */
function StageSkeleton() {
  return (
    <Stage aria-busy="true">
      <span className="sr-only">Loading the review</span>
      <div className={`${STRIP} border-b border-rule-stage`}>
        <Skeleton className="h-[12px] w-4/5 max-w-[620px]" />
      </div>
      <div className="grid gap-x-12 gap-y-9 px-6 pt-7 sm:px-8 sm:pt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <Skeleton className="h-[11px] w-56" />
          <Skeleton className="mt-5 h-[80px] w-[80px] rounded-card" />
          <Skeleton className="mt-5 h-[46px] w-64" />
          <Skeleton className="mt-4 h-[15px] w-full max-w-[460px]" />
          <Skeleton className="mt-2 h-[15px] w-3/5 max-w-[300px]" />
          <StageFigures reserve items={[]} />
          <Skeleton className="mt-8 h-[44px] w-48 rounded-control" />
        </div>
        <div className="lg:justify-self-end">
          <Skeleton className="h-[10px] w-48 lg:ml-auto" />
          <Skeleton className="mt-3 h-[76px] w-36 lg:ml-auto" />
          <Skeleton className="mt-3 h-[16px] w-56 lg:ml-auto" />
        </div>
      </div>
      <div className="mt-9 space-y-3 border-t border-rule-stage px-6 pb-8 pt-6 sm:px-8">
        <Skeleton className="h-[10px] w-52" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[12px] w-full" />
        ))}
      </div>
      <StageFooter>
        <Skeleton className="h-[13px] w-3/5 max-w-[420px]" />
      </StageFooter>
    </Stage>
  );
}

/* ─── Under the stage ───────────────────────────────────────────────────── */

function ReviewBody({
  broker: b,
  brokers,
  pot,
}: {
  broker: BrokerOffer;
  brokers: BrokerOffer[];
  pot: number;
}) {
  const faqs = makeFaqs(b);
  const shots = (appShots as Record<string, AppShotsEntry>)[b.slug];
  const related = brokers.filter((item) => item.slug !== b.slug).slice(0, 5);
  // The badge is what makes a platform a member of a category ranking, so it's
  // the honest test for "appears in". categoryMeetsBar keeps the review from
  // pointing at a guide that's below MIN_BROKERS, which the pre-render
  // noindexes and the page renders as an apology.
  const guides = CATEGORIES.filter(
    (c) => b.badges.includes(c.badge) && categoryMeetsBar(c, brokers),
  );
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  // The numbered run, built from what this record actually has, so a
  // platform with no screenshots or no live offer closes the count up
  // instead of skipping a number.
  const sections: Array<{
    key: string;
    node: (i: number, n: number) => ReactNode;
  }> = [
    ...(b.pros.length || b.cons.length
      ? [
          {
            key: "verdict",
            node: (i: number, n: number) => (
              <SeoSection
                aside="What works and what holds it back, from the fee schedule and the platform’s own terms."
                id="verdict"
                index={i}
                title="The verdict"
                total={n}
              >
                <Verdict cons={b.cons} pros={b.pros} />
              </SeoSection>
            ),
          },
        ]
      : []),
    ...(shots?.screenshots.length
      ? [
          {
            key: "app",
            node: (i: number, n: number) => (
              <SeoSection
                aside={`${shots.appName}, as it appears on the App Store.`}
                id="app"
                index={i}
                title="Inside the app"
                total={n}
              >
                <AppShots broker={b} entry={shots} />
              </SeoSection>
            ),
          },
        ]
      : []),
    {
      key: "fees",
      node: (i, n) => (
        <SeoSection
          aside={b.fees.fee_model}
          id="costs"
          index={i}
          title="What it charges"
          total={n}
        >
          <FeeSchedule broker={b} />
        </SeoSection>
      ),
    },
    {
      key: "platform",
      node: (i, n) => (
        <SeoSection
          aside="The accounts, the investments you can hold in them, the tools, and who protects the money."
          id="platform"
          index={i}
          title="The platform"
          total={n}
        >
          <Platform broker={b} />
        </SeoSection>
      ),
    },
    ...(isOfferLive(b) && b.offer_headline
      ? [
          {
            key: "offer",
            node: (i: number, n: number) => (
              <SeoSection
                aside="For new customers. It can change or end at any time."
                id="offer"
                index={i}
                title="The current offer"
                total={n}
              >
                <Offer broker={b} />
              </SeoSection>
            ),
          },
        ]
      : []),
    {
      key: "faq",
      node: (i, n) => (
        <SeoSection id="faq" index={i} title="Questions and answers" total={n}>
          <div className={`border-t border-rule`}>
            {faqs.map((item) => (
              <details key={item.question} className={`group border-b border-rule`}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-title text-foreground transition-colors hover:text-foreground/70 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDownIcon className="mt-1 h-5 w-5 shrink-0 text-foreground/35 transition-transform group-open:rotate-180" />
                </summary>
                <p className={`max-w-measure pb-6 ${BODY}`}>{item.answer}</p>
              </details>
            ))}
          </div>
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            type="application/ld+json"
          />
        </SeoSection>
      ),
    },
    ...(related.length
      ? [
          {
            key: "related",
            node: (i: number, n: number) => (
              <SeoSection
                aside={`Five more reviews, each with the same yearly estimate on £${pot.toLocaleString("en-GB")}.`}
                index={i}
                more={{
                  to: "/brokers",
                  label: `Compare all ${brokers.length} platforms`,
                }}
                title="Other platforms"
                total={n}
              >
                <BoardRowHeader
                  className="mt-0"
                  facts={["Platform fee", "UK trades", "FX fee"]}
                  figure="A year"
                  lead="none"
                  subject="Platform"
                />
                <BoardRowList>
                  {related.map((item) => (
                    <BoardRow
                      key={item.slug}
                      facts={[
                        {
                          label: "Platform fee",
                          value: orUnstated(platformFeeSummary(item.fees)),
                        },
                        {
                          label: "UK trades",
                          value: orUnstated(
                            fmtMoney(item.fees.trade_commission_uk_gbp),
                          ),
                        },
                        {
                          label: "FX fee",
                          value: orUnstated(fmtPct(item.fees.fx_fee_pct)),
                        },
                      ]}
                      figure={{
                        value: fmtMoneyRound(
                          estAnnualCost(item.fees, pot).total,
                        ),
                        unit: `on ${fmtPotLabel(pot)}`,
                        srLabel: "Estimated cost a year",
                      }}
                      logo={<BrokerLogo broker={item} size={56} />}
                      name={item.name}
                      secondary={item.tagline}
                      to={`/brokers/${item.slug}`}
                    />
                  ))}
                </BoardRowList>
              </SeoSection>
            ),
          },
        ]
      : []),
    // The other direction of the guide→review link: a reader who landed on the
    // review can reach the rankings this platform is in.
    ...(guides.length
      ? [
          {
            key: "guides",
            node: (i: number, n: number) => (
              <SeoSection
                aside={`The rankings ${b.name} is part of.`}
                index={i}
                title="Guides it appears in"
                total={n}
              >
                <BoardRowList>
                  {guides.map((c) => (
                    <BoardRow
                      key={c.slug}
                      name={c.h1}
                      secondary={c.description}
                      to={categoryPath(c.slug)}
                    />
                  ))}
                </BoardRowList>
              </SeoSection>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* The basis line: what the stage's estimate is, and how fresh. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <p className="max-w-[78ch] text-small text-foreground/45">
          Estimate assumes 12 monthly purchases over a year, split between UK
          and US shares, with FX on the overseas half. Fee caps, subscription
          tiers and fund charges are not modelled, and a fee the platform
          doesn’t publish counts as nothing. Figures checked against {b.name}’s
          own pages on {fmtVerifiedDate(b.last_verified)}. Not investment
          advice; capital at risk.
        </p>
        <ShareRow
          context="broker-detail"
          label="Share"
          title={`${b.name} review`}
          url={`/brokers/${b.slug}`}
        />
      </div>

      {b.summary ? (
        <p className="mt-9 max-w-measure text-subheading leading-normal text-foreground/90">
          {b.summary}
        </p>
      ) : null}

      {sections.map((section, i) => (
        <div key={section.key}>{section.node(i + 1, sections.length)}</div>
      ))}

      <SeoSection title="Sources and small print">
        <div className="max-w-[78ch] space-y-4">
          <SourceNote brokers={[b]} />
          <BrokerComplianceNote />
        </div>
      </SeoSection>
    </>
  );
}

/* ─── Sections ──────────────────────────────────────────────────────────── */

function Verdict({ pros, cons }: { pros: string[]; cons: string[] }) {
  const groups = [
    { title: "What works", items: pros, tone: "for" as const },
    { title: "What holds it back", items: cons, tone: "against" as const },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title}>
          <p className={`pb-3 ${KICKER}`}>
            {g.title} · {g.items.length}
          </p>
          <ul className={`border-t border-rule`}>
            {g.items.map((item) => (
              <li
                key={item}
                className={`flex gap-4 border-b border-rule py-4 text-lede text-foreground/85`}
              >
                <span
                  aria-label={g.tone === "for" ? "For" : "Against"}
                  className={`w-3 shrink-0 font-mono text-lede font-semibold ${
                    g.tone === "for" ? "text-positive" : "text-negative"
                  }`}
                >
                  {g.tone === "for" ? "+" : "−"}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The broker's own App Store screenshots, hotlinked from Apple's CDN at
 *  render sizes. Data is baked in by scripts/fetch-app-screenshots.mjs. The
 *  strip scrolls inside its own panel, so nothing runs off the page edge. */
function AppShots({
  broker: b,
  entry,
}: {
  broker: BrokerOffer;
  entry: AppShotsEntry;
}) {
  return (
    <div className={`overflow-hidden ${panel()}`}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 p-4 [-webkit-overflow-scrolling:touch]">
        {entry.screenshots.map((base, index) => (
          <img
            key={base}
            alt={`${b.name} app screenshot ${index + 1}`}
            className={`h-[300px] w-auto shrink-0 snap-start rounded-card border border-rule bg-background`}
            decoding="async"
            loading="lazy"
            src={`${base}/300x650bb.webp`}
            srcSet={`${base}/300x650bb.webp 1x, ${base}/600x1300bb.webp 2x`}
          />
        ))}
      </div>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-rule px-4 py-3 text-small text-foreground/55`}
      >
        <span>{entry.screenshots.length} screens · scroll for more</span>
        <a
          className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
          href={entry.appUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {entry.appName} on the App Store
        </a>
      </div>
    </div>
  );
}

/** A label-and-value hairline row: the grammar the fee schedule and the
 *  platform groups share. */
function FactRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-rule py-3.5 sm:grid-cols-[14rem_minmax(0,1fr)]`}
    >
      <dt className="text-body text-foreground/60">{label}</dt>
      <dd className="text-right text-lede font-semibold tabular-nums text-foreground sm:text-left">
        {children}
      </dd>
    </div>
  );
}

function FeeSchedule({ broker: b }: { broker: BrokerOffer }) {
  const rows: [string, string | null][] = [
    ["Platform fee", platformFeeSummary(b.fees)],
    ["UK share trade", fmtMoney(b.fees.trade_commission_uk_gbp)],
    ["US share trade", fmtMoney(b.fees.trade_commission_us_gbp)],
    ["Fund dealing", fmtMoney(b.fees.fund_dealing_gbp)],
    ["FX fee", fmtPct(b.fees.fx_fee_pct)],
    ["Minimum deposit", fmtMoney(b.fees.min_deposit_gbp)],
    ["Inactivity fee", b.fees.inactivity_fee_note],
  ];
  // "Not published" rather than a dash: the rows are the schedule as we
  // found it, and a missing figure is a finding, not a blank.
  const shown = rows.map(([label, value]) => [
    label,
    value == null || value === "—" ? null : value,
  ]) as [string, string | null][];

  return (
    <div className="max-w-[860px]">
      <dl className={`border-t border-rule`}>
        {shown.map(([label, value]) => (
          <FactRow key={label} label={label}>
            {value ?? (
              <span className="font-normal text-foreground/40">
                Not published
              </span>
            )}
          </FactRow>
        ))}
      </dl>
      {b.fees.platform_fee_note ? (
        <p className="mt-4 max-w-measure text-small text-foreground/55">
          {b.fees.platform_fee_note}
        </p>
      ) : null}
    </div>
  );
}

/** The tick is `live` (status), not `positive` (direction) — as broker-ui's
 *  `Tick`. */
function YesNo({ value }: { value: boolean }) {
  return value ? (
    <CheckIcon
      aria-label="Yes"
      className="h-4 w-4 shrink-0 text-live"
      strokeWidth={2.5}
    />
  ) : (
    <span className="text-small font-normal text-foreground/35">No</span>
  );
}

function Platform({ broker: b }: { broker: BrokerOffer }) {
  const groups: { label: string; items: [string, boolean | null][] }[] = [
    {
      label: "Accounts",
      items: [
        ["General investment account", b.accounts.gia],
        ["Stocks & Shares ISA", b.accounts.stocks_isa],
        ["SIPP", b.accounts.sipp],
        ["Lifetime ISA", b.accounts.lisa],
        ["Junior ISA", b.accounts.jisa],
      ],
    },
    {
      label: "Investments",
      items: [
        ["UK shares", b.assets.uk_shares],
        ["US shares", b.assets.us_shares],
        ["Global shares", b.assets.global_shares],
        ["ETFs", b.assets.etfs],
        ["Funds", b.assets.mutual_funds],
        ["Investment trusts", b.assets.investment_trusts],
        ["Fractional shares", b.assets.fractional_shares],
        ["Bonds & gilts", b.assets.bonds_gilts],
      ],
    },
    {
      label: "Features",
      items: [
        ["Auto-invest", b.trust.auto_invest],
        ["Dividend reinvestment", b.trust.dividend_reinvestment],
        ["Interest on cash", b.trust.interest_on_cash],
        ["Web platform", b.trust.web_platform],
        ["Mobile app", b.trust.mobile_app],
      ],
    },
  ];
  const protection: [string, string | null][] = [
    ["FSCS", b.trust.fscs_protected ? "Protected up to £85,000" : "Not listed"],
    ["Regulated by", b.trust.regulator],
    ["Founded", b.trust.year_founded ? String(b.trust.year_founded) : null],
    ["Headquarters", b.trust.headquarters],
  ];

  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
      {groups.map((group) => {
        const items = group.items.filter(
          (item): item is [string, boolean] => item[1] != null,
        );

        if (!items.length) return null;

        return (
          <div key={group.label}>
            <p className={`pb-3 ${KICKER}`}>{group.label}</p>
            <ul className={`border-t border-rule`}>
              {items.map(([label, value]) => (
                <li
                  key={label}
                  className={`flex items-center justify-between gap-4 border-b border-rule py-3 text-lede`}
                >
                  <span
                    className={
                      value ? "text-foreground/85" : "text-foreground/45"
                    }
                  >
                    {label}
                  </span>
                  <YesNo value={value} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div>
        <p className={`pb-3 ${KICKER}`}>Protection</p>
        <ul className={`border-t border-rule`}>
          {protection
            .filter((item): item is [string, string] => item[1] != null)
            .map(([label, value]) => (
              <li
                key={label}
                className={`flex items-baseline justify-between gap-4 border-b border-rule py-3 text-lede`}
              >
                <span className="text-foreground/60">{label}</span>
                <span className="text-right font-medium text-foreground/85">
                  {value}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function Offer({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div
      className={`grid gap-x-10 gap-y-5 border-y border-rule py-7 sm:py-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}
    >
      <div>
        <p className="flex items-start gap-3 text-balance text-subheading font-semibold text-foreground">
          <GiftIcon className="mt-1 h-5 w-5 shrink-0 text-brand-brown dark:text-brand-tan" />
          <span>{b.offer_headline}</span>
        </p>
        <div className="mt-5 pl-8">
          <BrokerVisitLink broker={b} placement="offer" size="lg" />
          <p className="mt-2.5 text-caption text-foreground/45">
            Capital at risk.
            {isAffiliateLink(b) ? " We may earn a commission." : ""}
          </p>
        </div>
      </div>
      {b.offer_terms ? (
        <div className="min-w-0 sm:pt-1">
          <p className={KICKER}>Terms</p>
          <p className={`mt-2 max-w-measure ${BODY}`}>{b.offer_terms}</p>
        </div>
      ) : null}
    </div>
  );
}

function MobileVisitBar({ broker: b }: { broker: BrokerOffer }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 ${glass()} border-x-0 border-b-0 px-4 py-3 lg:hidden`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <BrokerLogo broker={b} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-foreground">
            {b.name}
          </p>
          <p className="truncate text-caption text-foreground/50">
            Capital at risk
            {isAffiliateLink(b) ? " · We may earn a commission" : ""}
          </p>
        </div>
        <BrokerVisitLink broker={b} placement="mobile_bar" />
      </div>
    </div>
  );
}

function makeFaqs(b: BrokerOffer) {
  // fmtMoney/fmtPct render a zero as the table word "Free", which doesn't
  // survive being dropped into a sentence — so the charges answer builds its
  // own clauses rather than interpolating the formatters.
  const uk = b.fees.trade_commission_uk_gbp;
  const fx = b.fees.fx_fee_pct;
  const dealing =
    uk === 0
      ? "UK share trades carry no commission"
      : uk == null
        ? "UK dealing commission isn’t published"
        : `UK share trades cost ${fmtMoney(uk)}`;
  const currency =
    fx === 0
      ? "there’s no charge to convert currency on overseas trades"
      : fx == null
        ? "the currency conversion charge isn’t published"
        : `converting currency on an overseas trade costs ${fmtPct(fx)}`;

  return [
    {
      question: `Does ${b.name} offer a Stocks & Shares ISA?`,
      answer: b.accounts.stocks_isa
        ? `Yes. ${b.name} offers a Stocks & Shares ISA.${b.accounts.isa_note ? ` ${b.accounts.isa_note}` : ""}`
        : `No. ${b.name} does not currently offer a Stocks & Shares ISA.`,
    },
    {
      question: `Does ${b.name} offer a SIPP?`,
      answer: b.accounts.sipp
        ? `A self-invested personal pension is available.${b.accounts.sipp_note ? ` ${b.accounts.sipp_note}` : ""}`
        : `No. ${b.name} does not currently offer a SIPP.`,
    },
    {
      question: `Is ${b.name} FSCS protected?`,
      answer: b.trust.fscs_protected
        ? `Yes. Eligible money and investments held with ${b.name} are protected by the FSCS up to £85,000 if the firm fails.`
        : `${b.name} is not listed as FSCS protected. Check the provider for current details.`,
    },
    {
      question: `How much does ${b.name} charge?`,
      answer: `${b.name}’s platform fee is ${platformFeeSummary(b.fees)}. ${dealing}, and ${currency}.`,
    },
    {
      question: `Can I buy fractional shares with ${b.name}?`,
      answer: b.assets.fractional_shares
        ? `Fractional shares are available, so you can buy part of a share rather than a whole one.`
        : `No. ${b.name} does not currently offer fractional shares.`,
    },
  ];
}
