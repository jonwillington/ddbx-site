/** One member of Congress — /congress/members/nancy-pelosi-p000197.
 *
 *  The differentiated page in the family, and the reason the family exists.
 *  Capitol Trades and Quiver publish the trade; what they do not publish is the
 *  committee jurisdiction the purchase sits inside, and we generate that on
 *  every row already (`rating_explain`, from the same map this page reads).
 *
 *  The composition is deliberately in this order and no other:
 *
 *    identity  ->  how to read this  ->  the numbers  ->  the lane  ->  filings
 *
 *  The qualifications come BEFORE the figures. On a page about a named sitting
 *  legislator the caveat is not small print at the bottom, it is the frame the
 *  numbers have to be read inside — a reader who sees "835 purchases" before
 *  learning that all 835 arrived in eighteen bulk account filings has already
 *  formed the wrong impression, and a grey line under the table will not undo
 *  it. See `HowToRead` in components/congress/congress-ui.tsx.
 *
 *  Every sentence on the page that qualifies something comes from
 *  shared/congress.js, so the crawler's pre-render and the hydrated page cannot
 *  drift into saying different things about a real person.
 */
import type {
  GovCommitteesResponse,
  GovDirectorDetail,
  GovMemberSummary,
} from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  advisorNote,
  bandCompact,
  bioguideFromSlug,
  bulkNote,
  committeePath,
  committeeSlug,
  concentrationNote,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  laneSentence,
  lateNote,
  memberLeadSentence,
  memberMeetsBar,
  memberPathFor,
  MEMBER_ROWS,
  ownerNote,
  shortCommittee,
  unmodelledLaneNote,
} from "../../shared/congress.js";

import {
  FilingsBoard,
  HowToRead,
  IssuerList,
  LanePanel,
  MemberSeatLine,
  MemberTitle,
  R,
} from "@/components/congress/congress-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { Skeleton } from "@/components/skeleton";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { congressMemberCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";

/** The detail response reshaped into the summary the shared sentences take.
 *
 *  `GovDirectorDetail` nests the roster fields under `reporter` while
 *  `GovMemberSummary` flattens them, and every sentence helper is written
 *  against the flat shape because the directory needs them too. One adapter
 *  here beats two sets of sentence functions. */
function toSummary(d: GovDirectorDetail): GovMemberSummary {
  return {
    id: d.id,
    name: d.reporter.name,
    chamber: d.reporter.chamber,
    party: d.reporter.party,
    state: d.reporter.state,
    district: d.reporter.district,
    photo_url: d.reporter.photo_url,
    committees: (d.reporter.committees ?? []).filter(
      (c) => !/^Subcommittee\b/i.test(c),
    ),
    stats: d.stats,
  };
}

export default function CongressMemberPage() {
  const { slug } = useParams<{ slug: string }>();
  const bioguide = useMemo(() => bioguideFromSlug(slug ?? ""), [slug]);

  const [detail, setDetail] = useState<GovDirectorDetail | null>(null);
  const [lanes, setLanes] = useState<GovCommitteesResponse | null>(null);
  const [others, setOthers] = useState<GovMemberSummary[]>([]);
  // Three states, not two: "loading", "loaded" and "this member is not one we
  // hold" are different pages, and an outage must not render as the last of
  // them. A page that says "we have no filings for this member" because a
  // request failed is a false statement about a named person.
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "failed">(
    "loading",
  );

  useEffect(() => {
    if (!bioguide) {
      setStatus("missing");

      return;
    }

    let live = true;

    setStatus("loading");
    api
      .govMember(bioguide)
      .then((d) => {
        if (!live) return;
        setDetail(d);
        setStatus("ok");
      })
      .catch((err: Error) => {
        if (!live) return;
        setStatus(/\b404\b/.test(err.message) ? "missing" : "failed");
      });

    // The lane map and the directory are page furniture rather than the
    // subject, so their failures are silent: a member page missing its
    // "other members" rail is degraded, and one that refuses to render
    // because a secondary call failed is broken.
    api
      .govCommittees()
      .then((c) => live && setLanes(c))
      .catch(() => {});
    api
      .govMembers()
      .then((r) => live && setOthers(r.members))
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [bioguide]);

  const laneMap = useMemo(
    () =>
      new Map((lanes?.committees ?? []).map((c) => [c.committee, c.sectors])),
    [lanes],
  );

  const member = detail ? toSummary(detail) : null;

  // Members sharing a committee — the strongest onward link on the page,
  // because it is the only one that follows the page's own argument.
  //
  // Above the missing/failed early return: hooks must run in the same order on
  // every render, and `member` is null on both of those paths so the memo is
  // already returning [].
  const peers = useMemo(() => {
    if (!member) return [];
    const mine = new Set(member.committees);

    return others
      .filter(
        (o) => o.id !== member.id && o.committees.some((c) => mine.has(c)),
      )
      .slice(0, 4);
  }, [member, others]);

  if (status === "missing" || status === "failed") {
    return (
      <DefaultLayout drawerRight>
        <SeoRail marketId="us" placement="congress_rail" />
        <SeoPageShell
          crumbs={[
            { label: "Congress", to: "/congress" },
            { label: "Members", to: "/congress/members" },
            { label: status === "missing" ? "Not found" : "Unavailable" },
          ]}
          eyebrow="Congress member"
          standfirst={
            status === "missing"
              ? "We publish a page for every member with a filing on record. That isn’t one of them — either they haven’t filed a purchase in the period we hold, or the address is wrong."
              : "We couldn’t load this member’s filings just now. That’s a fault at our end rather than an empty record."
          }
          title={
            status === "missing"
              ? "We don’t hold filings for that member"
              : "Couldn’t load this member"
          }
        >
          <SeoSection
            aside="Members with disclosed purchases on record."
            title="Browse the directory"
          >
            <RelatedCards
              cols={2}
              items={[
                {
                  to: "/congress/members",
                  title: "Every tracked member",
                  description:
                    "The members whose purchase filings we hold, most recently active first.",
                },
                {
                  to: "/congress/committees",
                  title: "By committee",
                  description:
                    "Which committees oversee which sectors, and who on them has been buying.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const s = member?.stats;
  const lane = member ? laneSentence(member) : null;
  const laneLine = member ? (lane ?? unmodelledLaneNote(member)) : "";
  const publishable = memberMeetsBar(member);

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        crumbs={[
          { label: "Congress", to: "/congress" },
          { label: "Members", to: "/congress/members" },
          { label: member?.name ?? "Member" },
        ]}
        cta={
          member && publishable
            ? {
                body: congressMemberCta(member.name).body,
                gaLabel: `Congress member · ${member.id}`,
                headline: congressMemberCta(member.name).headline,
                marketId: "us",
                screenshotSlot: "analysis",
              }
            : false
        }
        eyebrow="Congress member"
        loading={status === "loading"}
        skeleton={
          <>
            <div className="mt-6 flex items-start gap-5">
              <Skeleton className="h-[84px] w-[84px] rounded-2xl" />
              <div className="flex-1">
                <Skeleton className="h-[30px] w-2/3 max-w-[18ch]" />
                <Skeleton className="mt-3 h-[14px] w-1/3 max-w-[14ch]" />
              </div>
            </div>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={8} variant="ruled-list" />
          </>
        }
        // The portrait rides INSIDE the h1 alongside the name (see MemberTitle).
        // The alternative — an identity block with its own h1 under the shell's
        // — put two h1s carrying the same name on the page.
        title={member ? <MemberTitle member={member} /> : "Member"}
      >
        {member && s ? (
          <>
            <MemberSeatLine member={member} />

            {detail?.reporter.bio ? (
              <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                {detail.reporter.bio}
              </p>
            ) : null}

            <p className={`mt-4 max-w-[62ch] ${R.body}`}>
              {memberLeadSentence(member)}
            </p>

            {/* Before the numbers, on purpose. See the file header. */}
            <HowToRead
              lead={advisorNote(detail?.reporter.profile)}
              notes={[
                bulkNote(member),
                concentrationNote(member),
                ownerNote(member),
                lateNote(member),
              ]}
            />

            <StatTiles
              className="mt-7"
              cols={4}
              note={CONGRESS_NOTICE}
              stats={[
                {
                  label: "Disclosed band",
                  value: bandCompact(s.total_min, s.total_max),
                  primary: true,
                },
                { label: "Filings", value: s.filing_docs },
                { label: "Purchases", value: s.filings },
                { label: "Companies", value: s.issuers },
              ]}
            />

            <SeoSection
              aside="Which of their committees oversee the sectors they bought in."
              index={1}
              title="Committees and jurisdiction"
              total={3}
            >
              <LanePanel
                committees={member.committees}
                laneLine={laneLine}
                lanes={laneMap}
              />
            </SeoSection>

            <SeoSection
              aside={
                detail && detail.dealings.length < s.filings
                  ? `Most recent ${Math.min(detail.dealings.length, MEMBER_ROWS)} of ${s.filings}. Every figure above covers all ${s.filings}.`
                  : "Every purchase on record, newest first."
              }
              index={2}
              title="Disclosed purchases"
              total={3}
            >
              <FilingsBoard
                rows={(detail?.dealings ?? []).slice(0, MEMBER_ROWS)}
              />
              <p className={`mt-3 max-w-[62ch] ${R.label} leading-[1.6]`}>
                “Since disclosure” is the return from the closing price on the
                day the filing was published — the first price a reader could
                have paid — marked to the latest cached close, not live. Past
                performance is not a reliable indicator of future results.
              </p>
            </SeoSection>

            {detail && detail.top_tickers.length > 0 ? (
              <SeoSection
                aside="Ranked by how often each appears in their filings."
                index={3}
                title="Companies filed on"
                total={3}
              >
                <IssuerList
                  issuers={detail.top_tickers.slice(0, 15)}
                  laneModelled={s.jurisdiction_modelled}
                />
              </SeoSection>
            ) : null}

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  ...member.committees
                    .filter((c) => laneMap.has(c))
                    .slice(0, 2)
                    .map((c) => ({
                      to: committeePath(committeeSlug(c)),
                      title: shortCommittee(c),
                      description: `Everyone on this committee with disclosed purchases, and the sectors it oversees.`,
                    })),
                  ...peers.slice(0, 2).map((p) => ({
                    to: memberPathFor(p),
                    title: p.name,
                    description: `Shares a committee. ${p.stats.filing_docs} filings on record.`,
                  })),
                  {
                    to: "/congress/members",
                    title: "Every tracked member",
                    description:
                      "The full directory, most recently active first.",
                  },
                  {
                    to: "/learn/stock-act",
                    title: "What the STOCK Act requires",
                    description:
                      "The 45-day window, what has to be disclosed, and what does not.",
                  },
                ]}
              />
            </SeoSection>

            <p className={`mt-8 max-w-[62ch] ${R.label} leading-[1.6]`}>
              {CONGRESS_SOURCE}{" "}
              <Link className="underline underline-offset-4" to="/how-it-works">
                How we put this together
              </Link>
              .
            </p>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
