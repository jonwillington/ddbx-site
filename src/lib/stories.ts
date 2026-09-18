import type { StoryKind } from "@/types/ddbx";

/** Resolving the `ddbx://` link scheme that story bodies carry.
 *
 *  A story is rendered by the website AND (later) natively by the iOS and
 *  Android apps, so its body cannot hold absolute ddbx.uk URLs: an app reader
 *  tapping one would be thrown out to Safari for a page the app already has.
 *  The body carries a reference instead and each client resolves it:
 *
 *    ddbx://filing/UK/<id>    -> /t/<id>           (app: filing detail)
 *    ddbx://filing/US/<id>    -> /us/t/<id>        (app: filing detail)
 *    ddbx://company/UK/<key>  -> /company/<key>    (app: company screen)
 *    ddbx://company/US/<key>  -> /us/company/<key>
 *
 *  Anything else stays an external link and opens in a new tab.
 */
export interface ResolvedLink {
  href: string;
  /** True when this is one of ours and should route in-app rather than open a
   *  new tab. */
  internal: boolean;
}

export function resolveStoryLink(raw: string): ResolvedLink {
  if (!raw.startsWith("ddbx://")) return { href: raw, internal: false };

  const parts = raw.slice("ddbx://".length).split("/");
  const [type, market, ...rest] = parts;
  const id = rest.join("/");
  if (!type || !market || !id) return { href: raw, internal: false };

  const us = market.toUpperCase() === "US";
  if (type === "filing") {
    return { href: us ? `/us/t/${id}` : `/t/${id}`, internal: true };
  }
  if (type === "company") {
    const key = id.toLowerCase();
    return {
      href: us ? `/us/company/${key}` : `/company/${key}`,
      internal: true,
    };
  }
  return { href: raw, internal: false };
}

/** What each trigger is called on the page. The internal kind names are
 *  operator vocabulary; these are what a reader sees. */
export const STORY_KIND_LABEL: Record<StoryKind, string> = {
  winner: "Since the buy",
  sector_cluster: "Across an industry",
  accumulation: "Buying again",
  scorecard: "Our call, marked",
  forensic: "What the filing shows",
  underwater: "Underwater",
};

export const storyPath = (id: string) => `/stories/${id}`;
