// Comment-count teaser — surfaces a per-trade "N people are discussing this"
// signal on the public website. The conversation itself lives only in the iOS
// app, so the count is an install nudge: web visitors see that a debate is
// happening but can't read it. There is no public comments API yet, so the
// count is derived deterministically from the dealing's stable key — same
// trade always shows the same number, across refetches and surfaces (row,
// drawer, Today card). Higher-signal trades (rated, clustered) skew toward
// more "comments", mirroring where real discussion would cluster.
//
// When a real comment-count field lands on the wire, swap commentCountFor to
// read it and delete the derivation — every call site already takes a number.

/** Structural slice of MarketDealing this needs — keeps the helper free of a
 *  hard type import so any caller can pass its dealing through. */
interface CommentCountInput {
  key: string;
  isPurchase: boolean;
  rating?: unknown;
  cluster?: unknown;
}

/** FNV-1a — small, fast, well-spread string hash. Deterministic per key. */
function hash(s: string): number {
  let h = 2166136261;

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

/** Stable pseudo comment count for a dealing. Returns 0 for ~45% of trades
 *  (and all non-purchases) so the chip stays sparse and believable. */
export function commentCountFor(dealing: CommentCountInput): number {
  if (!dealing.isPurchase) return 0;

  const h = hash(dealing.key);

  // Only ~20% of trades show no chip — most have at least a little chatter.
  if (h % 100 < 20) return 0;

  let count = 1 + (h % 8);

  // Discussion clusters on the trades we've flagged — bias counts upward
  // where a reader would expect the most chatter, but keep the numbers small.
  if (dealing.rating) count += 2 + ((h >> 3) % 5);
  if (dealing.cluster) count += 1 + ((h >> 5) % 4);

  return count;
}
