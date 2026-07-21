import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

import { chip } from "@/components/chip";
import { Tooltip } from "@/components/tooltip";

/** Comment-count chip — hints that readers are discussing this trade in the
 *  app, where the conversation actually lives. The web shows the count but not
 *  the thread, so the tooltip points to the app. Returns null when there's
 *  nothing to tease (count 0), so callers drop it in unconditionally. See
 *  src/lib/comment-counts.ts for how the count is derived. */

const BASE = `${chip()} bg-black/[0.06] text-muted dark:bg-white/[0.08] dark:text-foreground/55`;

export function CommentCountChip({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (!count || count <= 0) return null;

  const tooltip =
    count === 1
      ? "1 person is discussing this trade in the app."
      : `${count} people are discussing this trade in the app.`;

  return (
    <Tooltip className={clsx("inline-flex", className)} content={tooltip}>
      <span className={BASE}>
        <ChatBubbleLeftEllipsisIcon className="h-3 w-3 shrink-0" />
        {count}
      </span>
    </Tooltip>
  );
}
