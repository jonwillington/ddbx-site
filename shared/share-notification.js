// The push notification a filing would have arrived as, in words.
//
// One string set, two consumers, and that is the whole point of putting it
// here. functions/t/[id].js uses it for the og:description a share link
// unfurls with; src/pages/filing.tsx renders it inside a real notification
// card at the top of the share arrival. A reader who taps a tweet therefore
// sees the same sentence in the unfurl preview and on the page it opens, which
// is the cheapest possible way to make the landing feel like the right one.
//
// It is also the product demo. The argument the share page has to make is
// "the app would have told you about this the day it filed", and an alert
// showing THIS filing makes that argument better than a sentence claiming it.
//
// Copy follows HOUSE_STYLE_RULES (canonical in
// ddbx-data/worker/llm/prompts.ts): no em-dashes, specific numbers and dates,
// plain declarative sentences, and never a word about how the rating was
// produced. A notification that mentions triage or a model is describing the
// system rather than the trade.

import { cleanName } from "./filings.js";
import { filingFamily } from "./filing-family.js";

/** Ratings, in the order a reader should care. Legacy aliases included: rows
 *  analysed before the rename still carry the old vocabulary and a share link
 *  to one of them must not fall through to "NEW FILING". */
const RATING_TAG = {
  significant: "SIGNIFICANT",
  very_interesting: "SIGNIFICANT",
  noteworthy: "NOTEWORTHY",
  interesting: "NOTEWORTHY",
  minor: "MINOR",
  somewhat: "MINOR",
  routine: "ROUTINE",
  not_interesting: "ROUTINE",
};

/** The six checks, by key. Order is irrelevant here (only the count is used),
 *  but the list has to match shared/methodology.js or the denominator lies. */
const CHECK_KEYS = [
  "open_market_buy",
  "senior_insider",
  "meaningful_conviction",
  "no_alternative_explanation",
  "supporting_context_found",
  "no_major_counter_signal",
];

/** "2026-08-04" -> "4 Aug". Notification-length, so no year: an alert is about
 *  something that just happened and a year on it reads as an archive entry.
 *  Exported because the card's timestamp slot wants the same treatment — the
 *  raw ISO date sat where iOS shows "now" and read as a database field.
 *  Returns the raw string on anything unparseable rather than "Invalid Date". */
export function shortDate(iso) {
  const t = Date.parse(`${iso}T00:00:00Z`);

  if (!Number.isFinite(t)) return String(iso ?? "");

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(t));
}

/** "STAF.L" -> "STAF". */
const bare = (t) => String(t ?? "").replace(/\.L$/i, "");

/** The notification for one filing: `{ tag, lead, body }`.
 *
 *  ONE supporting fact after the purchase sentence, never two. A real push
 *  notification is two lines on a lock screen, and the version that carried
 *  both the cluster and the check count ran to four. The cluster wins where
 *  there is one: breadth is the rarer fact, and the check count is a click
 *  away on the same page. */
export function shareNotification(d, market = "UK") {
  if (!d) return null;
  // The formatter family owns everything market-dependent here: which field
  // holds the consideration, which currency describes it, and where the
  // insider's name and role live (`director` on a UK row, `reporter` on a US
  // one). It also pins the currency rather than reading `d.currency` — on a
  // UK-pipeline row `value_gbp` is the canonical GBP-equivalent (FX-converted
  // at the trade-date rate) while `currency` is the currency of the ORIGINAL
  // RNS, and passing the second to describe the first prints "$108k" for a
  // £107,818 buy.
  const fam = filingFamily(market);

  const name = cleanName(d.company) || bare(d.ticker) || "A company";
  const ticker = bare(d.ticker);
  const who = fam.insider(d);
  const insider = who.name || "An insider";
  const role = who.role ? `, ${who.role},` : "";
  const amount = fam.money(fam.value(d));
  // UK rows carry `tx_type`; US rows say the same thing with
  // `acquired_disposed`, since a Form 4 "D" can be a sale, a gift or a
  // disposition to the issuer.
  const verb =
    d.tx_type === "sell" || d.acquired_disposed === "D" ? "sold" : "bought";

  const sentences = [
    `${insider}${role} ${verb} ${amount} on ${shortDate(d.trade_date)}.`,
  ];

  const cluster = d.cluster;
  const checklist = d.analysis?.checklist;

  if (cluster?.count && cluster.count >= 2) {
    sentences.push(
      `${cluster.count} insiders here bought inside ${cluster.window_days} days.`,
    );
  } else if (checklist) {
    const met = CHECK_KEYS.filter((k) => checklist[k]).length;

    sentences.push(`${met} of ${CHECK_KEYS.length} checks met.`);
  }

  return {
    // No rating is a real state, not a gap: an unanalysed row still filed, and
    // "NEW FILING" says so without implying a verdict we haven't reached.
    tag: RATING_TAG[d.analysis?.rating] ?? "NEW FILING",
    lead: ticker ? `${ticker} · ${name}` : name,
    body: sentences.join(" "),
  };
}

/** The same notification as one flat line, for an og:description. */
export function shareNotificationLine(d, market = "UK") {
  const n = shareNotification(d, market);

  return n ? `${n.lead}. ${n.body}` : null;
}
