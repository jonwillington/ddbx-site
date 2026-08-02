/** The tracked-member directory — /congress/members.
 *
 *  The hub the member pages hang off, and the answer to the crawl-distribution
 *  problem the sector hubs were built to solve on the company side: without it
 *  every member page would be reachable only from a filing row.
 *
 *  Two editorial decisions worth knowing:
 *
 *  1. **Ordered by most recent filing, not by size.** A directory of people
 *     should lead with who is filing now. Ranking by disclosed band would put a
 *     single 320-line account disclosure at the top of a page that reads as a
 *     league table, which is the wrong page.
 *  2. **Members below the publishing bar are still listed.** They render and
 *     they link; their own pages carry noindex until they cross it. Hiding them
 *     would make the directory disagree with the filings that name them.
 */
import type { GovMemberSummary } from "@/types/ddbx";

import { useEffect, useMemo, useState } from "react";

import {
  bandCompact,
  CONGRESS_NOTICE,
  CONGRESS_SOURCE,
  memberMeetsBar,
  MIN_MEMBER_FILINGS,
} from "../../shared/congress.js";

import { MemberRow, R } from "@/components/congress/congress-ui";
import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import { SeoSkeleton } from "@/components/seo/skeletons";
import { RelatedCards } from "@/components/seo/related-cards";
import { StatTiles } from "@/components/seo/stat-tiles";
import { congressIndexCta } from "@/components/seo/cta-copy";
import { api } from "@/lib/api";

export default function CongressMembersPage() {
  const [members, setMembers] = useState<GovMemberSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    api
      .govMembers()
      .then((r) => {
        if (!live) return;
        setMembers(r.members);
        setFailed(false);
      })
      .catch(() => {
        if (!live) return;
        setMembers([]);
        setFailed(true);
      });

    return () => {
      live = false;
    };
  }, []);

  const rows = members ?? [];

  const totals = useMemo(() => {
    const filings = rows.reduce((n, m) => n + m.stats.filing_docs, 0);
    const min = rows.reduce((n, m) => n + m.stats.total_min, 0);
    const max = rows.reduce((n, m) => n + m.stats.total_max, 0);
    const issuers = new Set<string>();

    // Issuer counts are per member, so a true distinct-issuer total isn't
    // derivable from this payload. Summing them would double-count every
    // widely-held name — so the tile states filings and members, which are
    // exact, and leaves the issuer count to the pages that can compute it.
    void issuers;

    return { filings, min, max, published: rows.filter(memberMeetsBar).length };
  }, [rows]);

  const { house, senate } = useMemo(
    () => ({
      house: rows.filter((m) => m.chamber === "house"),
      senate: rows.filter((m) => m.chamber === "senate"),
    }),
    [rows],
  );

  return (
    <DefaultLayout drawerRight>
      <SeoRail marketId="us" placement="congress_rail" />
      <SeoPageShell
        crumbs={[{ label: "Congress", to: "/congress" }, { label: "Members" }]}
        cta={{
          body: congressIndexCta.body,
          gaLabel: "Congress members index",
          headline: congressIndexCta.headline,
          marketId: "us",
          screenshotSlot: "analysis",
        }}
        eyebrow="Congress directory"
        loading={members === null}
        skeleton={
          <>
            <SeoSkeleton rows={4} variant="stat-tiles" />
            <SeoSkeleton rows={12} variant="ruled-list" />
          </>
        }
        standfirst="Every member of Congress with a disclosed stock purchase on record, from the House Clerk and Senate filings. Each page shows the purchases, the value bands and which of the member’s committees oversee the sectors they bought in."
        standfirstSize="lede"
        title="Members of Congress who file stock purchases"
      >
        {failed ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t load the directory just now. That’s a fault at our end
            rather than an empty register — try again shortly.
          </p>
        ) : (
          <>
            <StatTiles
              className="mt-8"
              cols={4}
              note={CONGRESS_NOTICE}
              stats={[
                { label: "Members", value: rows.length, primary: true },
                { label: "Filings", value: totals.filings },
                {
                  label: "Combined band",
                  value: bandCompact(totals.min, totals.max),
                },
                { label: "With a page", value: totals.published },
              ]}
            />
            <p className={`mt-3 max-w-[62ch] ${R.label} leading-[1.6]`}>
              A member gets an indexable page once we hold {MIN_MEMBER_FILINGS}{" "}
              separate filings for them. The rest are listed here and their
              pages render, but they stay out of search until there is enough on
              record to describe.
            </p>

            <SeoSection
              aside={`${house.length} members, most recently active first.`}
              index={1}
              title="House"
              total={2}
            >
              <ul
                className={`mt-4 border-t border-hairline dark:border-separator`}
              >
                {house.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </ul>
            </SeoSection>

            <SeoSection
              aside={`${senate.length} members. We map committee jurisdiction for House committees only, so Senate pages carry the filings without a lane.`}
              index={2}
              title="Senate"
              total={2}
            >
              <ul
                className={`mt-4 border-t border-hairline dark:border-separator`}
              >
                {senate.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </ul>
            </SeoSection>

            <SeoSection aside="Where to go from here." title="Read next">
              <RelatedCards
                cols={2}
                items={[
                  {
                    to: "/congress/committees",
                    title: "By committee",
                    description:
                      "Which committees oversee which sectors, and who on them has been buying.",
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
                    to: "/companies",
                    title: "Browse companies",
                    description:
                      "Every issuer we hold filings for, corporate insiders included.",
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
