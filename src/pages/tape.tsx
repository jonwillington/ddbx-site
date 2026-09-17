/** The global tape — /tape.
 *
 *  Five markets, one list, newest first. The page exists to make one claim
 *  with a picture rather than a sentence: insider filings do not keep London
 *  hours, and a product that reads Seoul, Stockholm, Amsterdam, London and
 *  New York sees a day that a single-market product sleeps through.
 *
 *  Anatomy, per the static-page rules: the shell's own header (eyebrow, h1,
 *  standfirst, notice), then the proof object (`WorldClock`, contained in
 *  its own panel), then the tape, then the four sections every static page
 *  carries: what this is, coverage (which is the educational material here,
 *  because the reader's real question is "what am I looking at from each
 *  country"), how to read a row, and the methodology. RelatedCards and the
 *  terminal ask close it.
 *
 *  The normaliser that maps five wire shapes onto one row lives in
 *  shared/tape.js and is the file to read before changing what a row says.
 *  The pre-render at functions/tape.js draws the same rows from the same
 *  module.
 *
 *  Two of Jon's rules shape the behaviour: one view, no cycling. The clocks
 *  tick and the feeds refresh once a minute, but the list is only ever moved
 *  by the reader pressing the "new filings" pill.
 */
import type { RelatedCard } from "@/components/seo/related-cards";
import type { TapeMarket } from "../../shared/tape";

import { useMemo } from "react";
import { Link } from "react-router-dom";

import {
  formatDayShort,
  formatSessionHours,
  TAPE_MARKETS,
  TAPE_METHODOLOGY,
  todayIn,
} from "../../shared/tape.js";

import { LogoDevAttribution } from "@/components/company-logo";
import { R } from "@/components/sector-ui";
import { tapeCta } from "@/components/seo/cta-copy";
import { SeoPageShell } from "@/components/seo/page-shell";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoSection } from "@/components/seo/section";
import { SeoRail } from "@/components/seo/seo-rail";
import { Skeleton } from "@/components/skeleton";
import { TapeList } from "@/components/tape/tape-list";
import { useTape } from "@/components/tape/use-tape";
import { TAPE_FLAGS, WorldClock } from "@/components/tape/world-clock";
import DefaultLayout from "@/layouts/default";

const CAVEAT =
  "rounded-xl bg-risk/[0.08] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground/70";

const CROSS_LINKS: RelatedCard[] = [
  {
    to: "/how-it-works",
    title: "How a filing is rated",
    description: "The six checks behind a verdict",
  },
  {
    to: "/cluster-buys",
    title: "Cluster buying",
    description: "Where several insiders bought at once",
  },
  {
    to: "/mcp",
    title: "Ask an assistant",
    description: "UK, US and European insider buying, in ChatGPT or Claude",
  },
  {
    to: "/developers",
    title: "The API",
    description: "Build on the data behind this page",
  },
];

const MARKET_NAMES: Record<string, string> = {
  KR: "Korea",
  SE: "Sweden",
  NL: "the Netherlands",
  UK: "the UK",
  US: "the US",
};

function list(ids: string[]): string {
  const names = ids.map((id) => MARKET_NAMES[id] ?? id);

  if (names.length <= 1) return names.join("");

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The skeleton stands at the shape that arrives: a day rule, then rows of
 *  a 56px disc, two lines, and a size on the right. */
function TapeSkeleton() {
  return (
    <div aria-busy="true" className="mt-6">
      <span className="sr-only">Loading the tape…</span>
      <div className={`border-b ${R.rule} pb-2.5 pt-2`}>
        <Skeleton className="h-[14px] w-56" />
      </div>
      <ol>
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} className={`border-b ${R.rule} py-3.5`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <Skeleton circle className="shrink-0" h={56} w={56} />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-[18px] w-1/2 max-w-[240px]" />
                <Skeleton className="mt-2 h-[12px] w-3/5 max-w-[300px]" />
              </div>
              <Skeleton className="mt-1 h-[14px] w-14 shrink-0" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CoverageRow({ market }: { market: TapeMarket }) {
  const Flag = TAPE_FLAGS[market.id];

  return (
    <li
      className={`grid gap-x-8 gap-y-3 border-b ${R.rule} py-6 sm:grid-cols-[14rem_minmax(0,1fr)]`}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <Flag aria-hidden className="h-3.5 w-5 shrink-0 rounded-[2px]" />
          <h3 className="text-[18px] font-semibold leading-[1.2] tracking-[-0.014em] text-foreground">
            {market.name}
          </h3>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-[1.5] text-foreground/55">
          {market.city} · {formatSessionHours(market)} local · {market.currency}
        </p>
      </div>
      <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13.5px] leading-[1.55]">
        <dt className="text-foreground/45">Source</dt>
        <dd className="text-foreground/80">{market.source}</dd>
        <dt className="text-foreground/45">Who files</dt>
        <dd className="text-foreground/80">{market.filers}</dd>
        <dt className="text-foreground/45">On the tape</dt>
        <dd className="text-foreground/80">{market.included}</dd>
        <dt className="text-foreground/45">Timing</dt>
        <dd className="text-foreground/80">{market.cadence}</dd>
        <dt className="text-foreground/45">Verdicts</dt>
        <dd className="text-foreground/80">
          {market.ratings === "layer"
            ? "Rated where the analysis layer has reached the filing; the rest are shown unrated"
            : "None yet. Every row is marked as an unrated market, not an unrated filing"}
        </dd>
      </dl>
    </li>
  );
}

export default function TapePage() {
  const tape = useTape();
  const today = useMemo(() => {
    try {
      return todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      return todayIn("UTC");
    }
  }, []);

  const loading = tape.feeds === null && !tape.down;
  const ready = !loading && !tape.down;
  const markets = new Set(tape.rows.map((r) => r.market)).size;

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId="uk"
        placement="tape_rail"
        ukHeading="Start investing"
      />
      <SeoPageShell
        cta={
          ready
            ? {
                body: tapeCta.body,
                gaLabel: "Global tape",
                headline: tapeCta.headline,
                marketId: "uk",
              }
            : false
        }
        eyebrow="Global tape"
        notice={
          <div className="space-y-2">
            {tape.floor ? (
              <p className="text-[12.5px] leading-[1.5] text-foreground/55">
                The tape holds every filing from {formatDayShort(tape.floor)}:
                the span each market’s feed covers in full, set today by{" "}
                {list(tape.binding)}.
              </p>
            ) : null}
            {tape.failed.length > 0 && !tape.down ? (
              <p className={CAVEAT}>
                The {list(tape.failed)}{" "}
                {tape.failed.length === 1 ? "feed" : "feeds"} did not load, so{" "}
                {list(tape.failed)} {tape.failed.length === 1 ? "is" : "are"}{" "}
                missing from the tape. That is a network problem, not a quiet
                market. The page retries every minute.
              </p>
            ) : null}
            {tape.recovered.length > 0 ? (
              <p className={CAVEAT}>
                {list(tape.recovered)}{" "}
                {tape.recovered.length === 1 ? "is" : "are"} back after failing
                to load. {tape.recovered.length === 1 ? "Its" : "Their"} filings
                are counted in the new-filings button, not yet in the list.
              </p>
            ) : null}
            {tape.stale.length > 0 ? (
              <p className={CAVEAT}>
                {list(tape.stale)} {tape.stale.length === 1 ? "is" : "are"}{" "}
                showing the last good read; the latest refresh could not reach
                that feed.
              </p>
            ) : null}
          </div>
        }
        standfirst={
          <>
            Insider filings from Seoul to New York, merged into one list and
            ordered by when each was disclosed. Sweden and the Netherlands show
            every notification; the UK, US and Korea show purchases only, the US
            and Korea above a size floor. The clocks show which exchanges are
            trading now. Korea files while London sleeps, and a product that
            reads five markets sees a day a single-market product misses.
          </>
        }
        standfirstSize="lede"
        title="Five markets, one tape"
        width="wide"
      >
        <div className="mt-8">
          <WorldClock feeds={tape.feeds} />
        </div>

        {/* New filings found by the minute poll wait here until asked for.
            Sticky under the floating navbar, in the same glass, so it is
            reachable from anywhere in a long tape without moving the tape. */}
        {tape.pending.length > 0 ? (
          <div className="pointer-events-none sticky top-[84px] z-20 mt-6 flex justify-center">
            <button
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-[#f5f0e8]/70 px-4 py-2 text-[13px] font-medium text-foreground shadow-[0_12px_32px_-20px_rgba(90,65,40,0.45)] backdrop-blur-2xl backdrop-saturate-[2.5] outline-none transition-colors hover:bg-[#f5f0e8]/90 focus-visible:ring-2 focus-visible:ring-brand-brown/40 dark:border-white/[0.09] dark:bg-background/70 dark:hover:bg-background/90"
              type="button"
              onClick={tape.showPending}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]"
              />
              {tape.pending.length} new{" "}
              {tape.pending.length === 1 ? "filing" : "filings"} · show
            </button>
          </div>
        ) : null}

        {loading ? (
          <TapeSkeleton />
        ) : tape.down ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            We couldn’t reach any of the five feeds just now. It’s a network
            problem rather than a quiet day across five countries. The page
            retries every minute, and the tape appears here as soon as a feed
            answers.
          </p>
        ) : tape.rows.length === 0 ? (
          <p className={`mt-10 max-w-[62ch] ${R.body}`}>
            The feeds answered and the tape is empty for the days they cover in
            full, which would be a first. The next refresh is a minute away.
          </p>
        ) : (
          <>
            <p className={`mt-6 max-w-[62ch] ${R.body}`}>
              {tape.rows.length} {tape.rows.length === 1 ? "filing" : "filings"}{" "}
              from {markets} {markets === 1 ? "market" : "markets"}, newest
              first. A European notification that reports several transactions
              is one row. Each row states its side, its size in the currency it
              was filed in, and the verdict where one exists.
            </p>
            <TapeList
              lastSeenAt={tape.lastSeenAt}
              rows={tape.rows}
              today={today}
            />
          </>
        )}

        <SeoSection
          aside={
            <p className="text-[12px] leading-[1.5] text-foreground/45">
              One list, five regulators, no conversion.
            </p>
          }
          id="what-this-is"
          title="What this is"
          variant="rail"
        >
          <p className={`max-w-[62ch] ${R.body}`}>
            Company insiders in most developed markets must tell the public when
            they trade their own company’s shares. Each country publishes that
            through its own regulator, in its own format, in its own currency
            and on its own clock. ddbx reads five of those feeds, screens and
            rates the filings in the markets where it runs an analysis layer,
            and publishes them by market. This page is those five lines with the
            walls taken down: one row shape, one order, the whole day. Each line
            carries what its market page carries, which is not every filing
            everywhere; the coverage below says what each one holds.
          </p>
          <p className={`mt-4 max-w-[62ch] ${R.body}`}>
            The point of the merge is the clock. A director in Seoul files
            before London has opened; Stockholm and Amsterdam publish through
            the European afternoon; London’s RNS wave breaks at 07:00; EDGAR
            indexes Form 4s after the New York close. Read one market and you
            read a third of the day. The panel above draws the five sessions in
            your own time so the gaps are visible rather than asserted.
          </p>
        </SeoSection>

        <SeoSection
          aside={
            <p className="text-[12.5px] leading-[1.5] text-foreground/55">
              What each feed carries, when it lands, and whether a verdict can
              exist.
            </p>
          }
          id="coverage"
          index={1}
          title="Market coverage"
          total={3}
        >
          <ol className={`mt-6 border-t ${R.rule}`}>
            {(TAPE_MARKETS as TapeMarket[]).map((m) => (
              <CoverageRow key={m.id} market={m} />
            ))}
          </ol>
        </SeoSection>

        <SeoSection
          aside={
            <p className="text-[12.5px] leading-[1.5] text-foreground/55">
              A row is five facts. This is what each one means and where it
              stops.
            </p>
          }
          id="reading"
          index={2}
          title="Reading the tape"
          total={3}
        >
          <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-[15px] font-semibold text-foreground">
                Side
              </dt>
              <dd className={`mt-1.5 ${R.body}`}>
                Bought or sold, in colour, from the regulator’s own transaction
                type. Grants, exercises and pledges are shown in words with no
                colour: they are disclosures, not decisions to buy at the market
                price. The UK, US and Korean lines carry{" "}
                <Link
                  className="underline underline-offset-4"
                  to="/learn/open-market-buy"
                >
                  open-market purchases
                </Link>{" "}
                only, so a sale never appears for those three; Sweden and the
                Netherlands carry every notification.
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-foreground">
                Disclosed
              </dt>
              <dd className={`mt-1.5 ${R.body}`}>
                The time of day, in the market’s own city, where the regulator
                publishes one. Sweden does. For the UK and US the row shows when
                ddbx first saw the filing, marked “seen”. The Netherlands and
                Korea record only the day, and those rows say so rather than
                borrow a time.
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-foreground">
                Size
              </dt>
              <dd className={`mt-1.5 ${R.body}`}>
                Shares times price, in the currency the filing was made in.
                Nothing is converted, so a Swedish row in kronor sits above a
                Korean row in won and the reader does the sizing. Korean rows
                carry an approximate sterling reading because the server already
                computes one.
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-foreground">
                Verdict
              </dt>
              <dd className={`mt-1.5 ${R.body}`}>
                The same rating the filing page carries, from{" "}
                <Link
                  className="underline underline-offset-4"
                  to="/how-it-works"
                >
                  six published checks
                </Link>
                : significant, noteworthy, minor or routine, or skipped where
                triage set the filing aside. “Not yet rated” means the layer has
                not reached it. “Unrated market” means Korea, where no such
                layer runs.
              </dd>
            </div>
          </dl>
          <p className="mt-6 max-w-[62ch] text-[13px] leading-[1.6] text-foreground/60">
            The rules behind each regime:{" "}
            <Link className="underline underline-offset-4" to="/learn/pdmr">
              PDMR
            </Link>{" "}
            and{" "}
            <Link
              className="underline underline-offset-4"
              to="/learn/mar-article-19"
            >
              MAR article 19
            </Link>{" "}
            for the UK, Sweden and the Netherlands,{" "}
            <Link className="underline underline-offset-4" to="/learn/form-4">
              Form 4
            </Link>{" "}
            for the US, and the{" "}
            <Link
              className="underline underline-offset-4"
              to="/how-it-works#korea-advance-plans"
            >
              advance-declaration regime
            </Link>{" "}
            in Korea.
          </p>
        </SeoSection>

        <SeoSection
          aside={
            <p className="text-[12px] leading-[1.5] text-foreground/45">
              These rules build the tape, and they live in the module that
              builds it.
            </p>
          }
          id="methodology"
          index={3}
          title="How this is put together"
          total={3}
          variant="rail"
        >
          <ul className="space-y-2.5">
            {TAPE_METHODOLOGY.map((line: string) => (
              <li key={line} className={`flex gap-2.5 ${R.body}`}>
                <span
                  aria-hidden
                  className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-foreground/30"
                />
                <span className="max-w-[62ch]">{line}</span>
              </li>
            ))}
          </ul>
        </SeoSection>

        <nav aria-label="More from ddbx" className="mt-9">
          <RelatedCards cols={2} items={CROSS_LINKS} />
        </nav>

        <LogoDevAttribution className="mt-10" />
      </SeoPageShell>
    </DefaultLayout>
  );
}
