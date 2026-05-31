import type { ClusterInfo } from "@/types/ddbx";

import { UserGroupIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

import { Tooltip } from "@/components/tooltip";

/** Cluster signal chip — surfaced when 2+ insiders bought the same issuer in a
 *  short window (computed server-side; see ClusterInfo). Rendered as a neutral
 *  badge (group icon + "Cluster") with a hover tooltip explaining what it
 *  means. Returns null when there's no cluster, so callers can drop it in
 *  unconditionally. */

const BASE =
  "inline-flex items-center justify-center gap-1 rounded-md border border-transparent whitespace-nowrap px-2 py-0.5 text-[11px] font-medium bg-[#e8e0d5] text-[#5a4128] dark:bg-surface-secondary dark:text-foreground/75";

const TOOLTIP =
  "This purchase is part of a wider trend of insiders buying this stock.";

export function ClusterChip({
  cluster,
  className,
}: {
  cluster?: ClusterInfo | null;
  className?: string;
}) {
  if (!cluster) return null;

  return (
    <Tooltip className={clsx("inline-flex", className)} content={TOOLTIP}>
      <span className={BASE}>
        <UserGroupIcon className="h-3 w-3 shrink-0" />
        Cluster
      </span>
    </Tooltip>
  );
}
