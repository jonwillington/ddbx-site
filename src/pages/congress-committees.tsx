/** The committee index — /congress/committees.
 *
 *  Eleven cards, not 116. The roster lists 116 distinct assignments once
 *  subcommittees are counted; the rating engine maps a sector jurisdiction for
 *  eleven House committees, and those are the only ones with anything to say.
 *  The list comes from /api/gov-committees rather than a copy here, so this
 *  page cannot claim a lane the scorer does not apply.
 *
 *  The Senate gap is stated on the page. An all-House list with no explanation
 *  invites the reader to conclude that senators do not trade, which is the
 *  opposite of true — 14 of the 75 members we hold filings for are senators.
 */
import type { GovCommitteesResponse, GovMemberSummary } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  committeePath,
  committeeSlug,
  CONGRESS_SOURCE,
  listSentence,
  membersOnCommittee,
  shortCommittee,
} from "../../shared/congress.js";

import { R } from "@/components/congress/congress-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { congressIndexCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";

export default function CongressCommitteesPage() {
  const [lanes, setLanes] = useState<GovCommitteesResponse | null>(null);
  const [members, setMembers] = useState<GovMemberSummary[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    Promise.all([api.govCommittees(), api.govMembers()])
      .then(([c, m]) => {
        if (!live) return;
        setLanes(c);
        setMembers(m.members);
        setFailed(false);
      })
      .catch(() => {
        if (!live) return;
        setLanes({ committees: [], chambers_modelled: ["house"] });
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, []);

  // Ranked by how many tracked members sit on each: the committee with the most
  // filers is the one a reader is most likely to be looking for, and an
  // alphabetical list of eleven committee names is a list nobody scans.
  const ranked = useMemo(
    () =>
      [...(lanes?.committees ?? [])]
        .map((c) => ({
          ...c,
          members: membersOnCommittee(members, c.committee),
        }))
        .sort((a, b) => b.members.length - a.members.length),
    [lanes, members],
  );

  const senators = members.filter((m) => m.chamber === "senate").length;

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        crumbs={[
          { label: "Congress", to: "/congress" },
          { label: "Committees" },
        ]}
        cta={{
          body: congressIndexCta.body,
          gaLabel: "Congress committees index",
          headline: congressIndexCta.headline,
          marketId: "us",
          screenshotSlot: "analysis",
        }}
        eyebrow="Congress directory"
        loading={lanes === null}
        skeleton={<SeoSkeleton rows={8} variant="ruled-list" />}
        standfirst="A committee’s jurisdiction is the clearest public fact about which industries a member is closest to. These are the House committees whose sector jurisdiction we map, with the members of each who have disclosed stock purchases."
        standfirstSize="lede"
        title="Congressional committees and the sectors they oversee"
      >
        {failed ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the committee list just now. That’s a fault at our
            end rather than an empty register — try again shortly.
          </p>
        ) : (
          <>
            <SeoSection
              aside={`${ranked.length} committees, ranked by how many members with filings sit on each.`}
              index={1}
              title="Committees we map"
              total={2}
            >
              <ul className="mt-4 border-t border-hairline dark:border-separator">
                {ranked.map((c) => (
                  <li
                    key={c.committee}
                    className="border-b border-hairline dark:border-separator"
                  >
                    <Link
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 transition-colors hover:bg-foreground/[0.02]"
                      to={committeePath(committeeSlug(c.committee))}
                    >
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-medium text-foreground">
                          {shortCommittee(c.committee)}
                        </span>
                        <span className={`mt-0.5 block ${R.label}`}>
                          Oversees{" "}
                          {listSentence(c.sectors.map((s) => s.toLowerCase()))}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-foreground/60">
                        {c.members.length}{" "}
                        {c.members.length === 1 ? "member" : "members"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SeoSection>

            <SeoSection
              aside="Why there are no Senate committees on this page."
              index={2}
              title="What this list leaves out"
              total={2}
            >
              <p className={`mt-4 max-w-[62ch] ${R.body}`}>
                Our jurisdiction map covers House committees only, so no Senate
                committee has a page here. That is a gap in what we model, not a
                statement about the Senate: {senators} of the members whose
                filings we hold sit in it, and their purchases are recorded in
                full on their own pages. The same applies to subcommittees,
                which we do not map a jurisdiction for and therefore do not
                publish.
              </p>
              <p className={`mt-3 max-w-[62ch] ${R.body}`}>
                A member sitting on a committee that oversees a sector is a
                matter of public record. It is not evidence that any purchase
                was informed by it, and nothing on these pages should be read
                that way.
              </p>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: "/congress/members",
                    title: "Every tracked member",
                    description:
                      "The full directory of members with disclosed purchases, most recently active first.",
                  },
                  {
                    to: "/congress",
                    title: "Latest congressional filings",
                    description:
                      "The live feed of purchases as they are disclosed, rated.",
                  },
                  {
                    to: "/learn/stock-act",
                    title: "What the STOCK Act requires",
                    description:
                      "The 45-day window, what has to be disclosed, and what does not.",
                  },
                  {
                    to: "/sectors",
                    title: "Sectors",
                    description:
                      "The same eleven sectors, seen through corporate insider buying instead.",
                  },
                ]}
              />
            </SeoSection>

            <p className={`mt-8 max-w-[62ch] ${R.label} leading-[1.6]`}>
              {CONGRESS_SOURCE}
            </p>
          </>
        )}
      </SeoPageShell>
    </DefaultLayout>
  );
}
