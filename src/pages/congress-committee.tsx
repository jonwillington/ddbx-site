/** One committee — /congress/committees/financial-services.
 *
 *  The page that answers a question no filing feed can: not "what did this
 *  member buy" but "who on the committee that oversees banks has been buying
 *  banks". The overlap is the story shape, and it is the only page in the
 *  family whose subject is a body rather than a person, which also makes it the
 *  safest to write.
 *
 *  ONLY THE MODELLED COMMITTEES EXIST HERE. The rating engine maps jurisdiction
 *  for eleven House committees; the roster lists 116 distinct assignments once
 *  subcommittees are counted. Publishing all 116 would be a doorway-page set
 *  built on a jurisdiction we do not model, so the route resolves against
 *  /api/gov-committees and everything else is a clean not-found. The
 *  chamber caveat is stated on the page rather than left to be inferred from an
 *  all-House list.
 */
import type {
  GovCommitteesResponse,
  GovDealing,
  GovMemberSummary,
} from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  bandCompact,
  committeeLeadSentence,
  committeeMeetsBar,
  committeePath,
  committeeSlug,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  COMMITTEE_ROWS,
  listSentence,
  membersOnCommittee,
  MIN_COMMITTEE_MEMBERS,
  shortCommittee,
} from "../../shared/congress.js";
import { sectorPath, sectorByLabel } from "../../shared/sectors.js";

import { FilingsBoard, MemberRow, R } from "@/components/congress/congress-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { congressIndexCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";

export default function CongressCommitteePage() {
  const { slug } = useParams<{ slug: string }>();

  const [lanes, setLanes] = useState<
    GovCommitteesResponse["committees"] | null
  >(null);
  const [members, setMembers] = useState<GovMemberSummary[]>([]);
  const [feed, setFeed] = useState<GovDealing[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    Promise.all([api.govCommittees(), api.govMembers()])
      .then(([c, m]) => {
        if (!live) return;
        setLanes(c.committees);
        setMembers(m.members);
        setFailed(false);
      })
      .catch(() => {
        if (!live) return;
        setLanes([]);
        setFailed(true);
      });

    // The recent-activity board is supporting evidence — its failure leaves
    // the page standing on the roster and the jurisdiction, which is the part
    // that does not go stale.
    api
      .govDealings({ view: "signal", limit: 500 })
      .then((r) => live && setFeed(r.dealings))
      .catch(() => {});

    return () => {
      live = false;
    };
  }, []);

  const lane = useMemo(
    () =>
      (lanes ?? []).find((c) => committeeSlug(c.committee) === slug) ?? null,
    [lanes, slug],
  );

  const onCommittee = useMemo(
    () => (lane ? membersOnCommittee(members, lane.committee) : []),
    [lane, members],
  );

  const memberById = useMemo(
    () => new Map(onCommittee.map((m) => [m.id, m])),
    [onCommittee],
  );

  // In-lane filings from members of this committee: the page's own evidence.
  // Filtered on BOTH the member and the sector, because a committee member
  // buying outside the committee's sectors is not what this page is about.
  const inLane = useMemo(() => {
    if (!lane) return [];
    const sectors = new Set(lane.sectors);

    return feed
      .filter(
        (d) =>
          memberById.has(d.reporter.id) &&
          d.sector_normalized != null &&
          sectors.has(d.sector_normalized),
      )
      .slice(0, COMMITTEE_ROWS);
  }, [feed, lane, memberById]);

  // Above the unknown-committee early return: hooks must run in the same order
  // on every render, and `onCommittee` is already empty when `lane` is null so
  // there is nothing to compute anyway. (Same rule sector.tsx documents.)
  const totals = useMemo(() => {
    const filings = onCommittee.reduce((n, m) => n + m.stats.filing_docs, 0);
    const min = onCommittee.reduce((n, m) => n + m.stats.total_min, 0);
    const max = onCommittee.reduce((n, m) => n + m.stats.total_max, 0);
    const inLaneRows = onCommittee.reduce(
      (n, m) => n + m.stats.in_lane_count,
      0,
    );

    return { filings, min, max, inLaneRows };
  }, [onCommittee]);

  if (lanes !== null && !lane) {
    return (
      <DefaultLayout drawerRight>
        <SeoRail marketId="us" placement="congress_rail" />
        <SeoPageShell
          crumbs={[
            { label: "Congress", to: "/congress" },
            { label: "Committees", to: "/congress/committees" },
            { label: failed ? "Unavailable" : "Not found" },
          ]}
          eyebrow="Committee"
          standfirst={
            failed
              ? "We couldn’t load the committee list just now. That’s a fault at our end."
              : "We publish a page for each committee whose sector jurisdiction we map, eleven House committees. That isn’t one of them."
          }
          title={
            failed
              ? "Couldn’t load this committee"
              : "We don’t map that committee"
          }
        >
          <SeoSection aside="The committees we do map." title="Every committee">
            <RelatedCards
              cols={2}
              items={[
                {
                  to: "/congress/committees",
                  title: "All committees",
                  description:
                    "The eleven House committees whose sector jurisdiction we map.",
                },
                {
                  to: "/congress/members",
                  title: "Every tracked member",
                  description:
                    "The members whose purchase filings we hold, most recently active first.",
                },
              ]}
            />
          </SeoSection>
        </SeoPageShell>
      </DefaultLayout>
    );
  }

  const publishable = lane != null && committeeMeetsBar(onCommittee);

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        crumbs={[
          { label: "Congress", to: "/congress" },
          { label: "Committees", to: "/congress/committees" },
          { label: lane ? shortCommittee(lane.committee) : "Committee" },
        ]}
        cta={{
          body: congressIndexCta.body,
          gaLabel: `Congress committee · ${slug ?? ""}`,
          headline: congressIndexCta.headline,
          marketId: "us",
        }}
        eyebrow="Committee"
        loading={lanes === null}
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={8} variant="ruled-list" />
          </>
        }
        standfirst={
          lane
            ? `The ${lane.committee} has jurisdiction over ${listSentence(lane.sectors.map((x) => x.toLowerCase()))}. This page tracks members of it who have disclosed stock purchases, and which of those purchases fall inside that jurisdiction.`
            : undefined
        }
        standfirstSize="lede"
        title={
          lane
            ? `${shortCommittee(lane.committee)} — members who buy stocks`
            : "Committee"
        }
      >
        {lane ? (
          <>
            {!publishable ? (
              <p className={`mt-8 max-w-[62ch] ${R.body}`}>
                Fewer than {MIN_COMMITTEE_MEMBERS} members of this committee
                have a disclosed purchase on record, which is not enough to
                describe the committee. The members we do hold are listed below.
              </p>
            ) : (
              <p className={`mt-8 max-w-[62ch] ${R.body}`}>
                {committeeLeadSentence(lane, onCommittee)}
              </p>
            )}

            <StatTiles
              className="mt-6"
              cols={4}
              note={CONGRESS_NOTICE}
              stats={[
                {
                  label: "Members filing",
                  value: onCommittee.length,
                  primary: true,
                },
                { label: "Filings", value: totals.filings },
                {
                  label: "Combined band",
                  value: bandCompact(totals.min, totals.max),
                },
                { label: "In-lane purchases", value: totals.inLaneRows },
              ]}
            />

            <SeoSection
              aside="Sitting on a committee that oversees a sector is a matter of public record. It is not evidence that any purchase was informed by it."
              index={1}
              title="What this committee oversees"
              total={3}
            >
              <ul className="mt-4 flex flex-wrap gap-2">
                {lane.sectors.map((sec) => {
                  const s = sectorByLabel(sec);

                  return (
                    <li key={sec}>
                      {s ? (
                        <a
                          className="inline-flex rounded-full border border-hairline px-3 py-1.5 text-[13px] text-foreground/75 transition-colors hover:text-foreground dark:border-separator"
                          href={sectorPath(s.slug)}
                        >
                          {sec}
                        </a>
                      ) : (
                        <span className="inline-flex rounded-full border border-hairline px-3 py-1.5 text-[13px] text-foreground/75 dark:border-separator">
                          {sec}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SeoSection>

            <SeoSection
              aside="Most recently active first."
              index={2}
              title="Members with disclosed purchases"
              total={3}
            >
              <ul className="mt-4 border-t border-hairline dark:border-separator">
                {onCommittee.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </ul>
            </SeoSection>

            <SeoSection
              aside={`Purchases by members of this committee in the sectors it oversees. ${inLane.length === 0 ? "None in the recent window." : `Most recent ${inLane.length}.`}`}
              index={3}
              title="In-lane purchases"
              total={3}
            >
              {inLane.length > 0 ? (
                <FilingsBoard
                  showMember
                  memberBySlug={memberById}
                  rows={inLane}
                />
              ) : (
                <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                  No purchases from members of this committee in its own sectors
                  in the recent filings we hold. Their other purchases are on
                  their individual pages.
                </p>
              )}
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  ...(lanes ?? [])
                    .filter((c) => c.committee !== lane.committee)
                    .slice(0, 2)
                    .map((c) => ({
                      to: committeePath(committeeSlug(c.committee)),
                      title: shortCommittee(c.committee),
                      description: `Oversees ${listSentence(c.sectors.map((x) => x.toLowerCase()))}.`,
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
              {CONGRESS_SOURCE} We map sector jurisdiction for House committees
              only, so no Senate committee has a page here.
            </p>
          </>
        ) : null}
      </SeoPageShell>
    </DefaultLayout>
  );
}
