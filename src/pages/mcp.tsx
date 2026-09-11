import type { ComponentType, SVGProps } from "react";

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import { ApiFaq } from "@/components/api/api-faq";
import { CodeTabs } from "@/components/api/code-tabs";
import { Path } from "@/components/api/endpoint-table";
import { RequestAccessModal } from "@/components/api/request-access-modal";
import { useAppHandoff } from "@/components/app-handoff-modal";
import { BUTTON_RADIUS } from "@/components/button";
import { CHIP_BASE, CHIP_HAIRLINE, CHIP_SIZE } from "@/components/chip";
import { Reveal } from "@/components/download/reveal";
import { SectionHeader } from "@/components/download/section-header";
import { ComparisonTable } from "@/components/mcp/comparison-table";
import { LiveSample } from "@/components/mcp/live-sample";
import { UrlCopy } from "@/components/mcp/url-copy";
import { RelatedCards } from "@/components/seo/related-cards";
import DefaultLayout from "@/layouts/default";
import { appHrefForMarket } from "@/lib/app-store";
import { MCP_URL } from "@/lib/mcp";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { usePinnedTheme } from "@/lib/use-pinned-theme";

/** `/mcp` — ddbx as a connector for AI assistants. Cross-market by
 *  construction: one page, no market prop, no discretion gating (it is a sales
 *  page). Not in the navbar; linked from /developers.
 *
 *  PERMANENTLY DARK, like /developers, and for the same reasons: it is the
 *  API's technical sibling, and the objects that carry it (the address field,
 *  the live response panel, the set-up snippets) are all `Terminal`, which
 *  exists only in the dark palette. Pinning also keeps the two developer
 *  surfaces reading as one family when a visitor moves between them. The same
 *  consequences follow and are handled the same way: `usePinnedTheme("dark")`
 *  restores the visitor's theme on unmount, `Navbar` hides the toggle here,
 *  and the closing panel inverts to cream, written in fixed colours only.
 *
 *  HONESTY, which is this page's whole design problem. The connector serves
 *  the thin tier: who, what, when, how much, the rating LABEL, sector,
 *  cluster, and a link. It does NOT serve the written analysis. So the page
 *  says so, in a numbered section of its own, rather than letting a reader
 *  connect it and feel short-changed. The daily recap is the one piece of
 *  prose it does serve, and the page says that too.
 *
 *  The API is described exactly as /developers describes it and no further:
 *  one licensed, authenticated, supported product, access by request. Nothing
 *  here implies a free tier or an open endpoint. The connector is free; it is
 *  a different thing, not a tier.
 *
 *  Copy: house style (HOUSE_STYLE_RULES in ddbx-data/worker/llm/prompts.ts).
 *  No em-dashes, British spelling, curly apostrophes, plain sentences.
 *  "AI assistant" is unavoidable on a page about connecting one; the
 *  vendor names are the products a reader owns, not our pipeline. */

const SECTION = "mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20";
const TOTAL = 4;

/** Hero proof cards. Each figure carries the line that stops it being a bare
 *  number. All four are facts about the connector as deployed. */
const FACTS = [
  { k: "Cost", v: "Free", note: "No plan, no card, no trial to expire." },
  { k: "Sign-in", v: "None", note: "Paste the address. That is the setup." },
  {
    k: "Markets",
    v: "5",
    note: "UK, US, Sweden, Netherlands, US Congress.",
  },
  {
    k: "Per question",
    v: "50",
    note: "Filings at most in one answer, newest first.",
  },
];

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/** Things a reader can actually ask. Each names the tool that answers it, so
 *  a technical reader sees the mapping and a layman sees the question. Every
 *  one is answerable with the six tools as deployed: nothing here needs a
 *  filter the server does not have. */
const QUESTIONS: { Icon: Icon; q: string; tool: string; note: string }[] = [
  {
    Icon: ChartBarIcon,
    q: "What have UK directors been buying this week?",
    tool: "search_dealings · UK",
    note: "The newest rated purchases, with who bought, how much and the rating.",
  },
  {
    Icon: BuildingOffice2Icon,
    q: "Has anyone at Tesco bought shares recently?",
    tool: "get_company · TSCO",
    note: "One company’s recent insider dealings, a line on the business, and its ddbx page.",
  },
  {
    Icon: CalendarDaysIcon,
    q: "What did ddbx make of today’s filings?",
    tool: "get_daily_summary",
    note: "The written daily recap for the UK or US, with the filings it cites.",
  },
  {
    Icon: UserGroupIcon,
    q: "Were several insiders buying the same company?",
    tool: "search_dealings · cluster",
    note: "Each filing says whether other insiders bought inside the same window.",
  },
  {
    Icon: BuildingLibraryIcon,
    q: "Which members of Congress bought shares last month?",
    tool: "search_dealings · USG",
    note: "STOCK Act disclosures, with the member’s seat and the amount band.",
  },
  {
    Icon: ChatBubbleLeftRightIcon,
    q: "Show me Form 4 purchases at GameStop since June.",
    tool: "search_dealings · US · GME",
    note: "Open-market buys only, filtered by ticker and disclosure date.",
  },
];

/** What the connector sends and what stays behind the link. Two lists, one
 *  honest boundary. The right-hand list is the paid product and the reason
 *  the page can afford to give the left-hand one away. */
const IN_THE_ANSWER = [
  "Who traded, and their role",
  "Buy or sell, and the transaction type",
  "Trade date and disclosure date",
  "Shares, price and value, in the filing’s own currency",
  "The ddbx rating: significant, noteworthy, minor or routine",
  "Sector",
  "Whether other insiders bought too, and how many",
  "A link to the filing’s ddbx page",
];

const BEHIND_THE_LINK = [
  "The thesis: why this purchase matters, or does not",
  "Evidence for and evidence against",
  "Key risks",
  "The six-check rating checklist",
  "Return and alpha since disclosure",
];

/** Per-client set-up. Menu labels drift, so each snippet is short and the
 *  address does the work. Written as plain steps rather than prose: a reader
 *  with the settings screen open wants a list to follow, not a paragraph. */
const SNIPPETS = [
  {
    label: "ChatGPT",
    title: "Settings → Apps & Connectors",
    meta: "Developer mode",
    code: `1. Open Settings, then Apps & Connectors
2. Turn on Developer mode
3. Choose Create, and paste the address
   ${MCP_URL}
4. Authentication: None
5. Save. Ask: "What did UK directors buy this week?"`,
  },
  {
    label: "Claude",
    title: "Settings → Connectors",
    meta: "web and desktop",
    code: `1. Open Settings, then Connectors
2. Choose Add custom connector
3. Name it ddbx and paste the address
   ${MCP_URL}
4. Add. It needs no sign-in.
5. Ask: "Has anyone at Barclays bought shares lately?"`,
  },
  {
    label: "Claude Code",
    title: "Terminal",
    meta: "one command",
    code: `claude mcp add --transport http ddbx ${MCP_URL}

# then, inside a session:
# > what did ddbx make of today's US filings?`,
  },
  {
    label: "Cursor / VS Code",
    title: "MCP settings",
    meta: "remote HTTP server",
    code: `// Add a remote (HTTP) MCP server. Cursor: mcp.json;
// VS Code: .vscode/mcp.json. No headers, no token.
{
  "servers": {
    "ddbx": { "type": "http", "url": "${MCP_URL}" }
  }
}`,
  },
];

const FAQ = [
  {
    q: "What is MCP?",
    a: "The Model Context Protocol, an open standard that lets an assistant call outside tools while it talks to you. ddbx publishes one address that speaks it. Once your assistant has that address it can look things up on ddbx by itself, and tell you what it found in ordinary sentences.",
  },
  {
    q: "Is it really free?",
    a: "Yes. No account, no key, no charge, and nothing to cancel. The connector carries facts that are already public on this site, fifty filings at a time, read-only. What it does not carry is the written analysis, which is the part ddbx charges for.",
  },
  {
    q: "Why doesn’t it hand over the analysis?",
    a: (
      <>
        Because the analysis is the product. Every rated filing on ddbx has a
        written case behind it: the thesis, the evidence for and against, the
        key risks and the checklist it was scored on. That lives in the app and
        on each filing&rsquo;s page. A connector is a bulk, machine-readable
        channel, so it carries the facts and the rating and links you to the
        reasoning. The daily recap is the one piece of writing it does serve,
        because it is already public here and posted every day.
      </>
    ),
  },
  {
    q: "Which markets does it cover?",
    a: "Filings from the UK, the US, Sweden, the Netherlands and the US Congress. Company look-ups (one issuer’s recent insider activity) and the daily recap are available for the UK and US, the two markets with company pages and a daily recap.",
  },
  {
    q: "How fresh is it?",
    a: "As fresh as the site and the apps: it reads from the same pipeline, which polls each regulator’s feed through the trading day. A filing appears in the connector the moment it appears on ddbx, and its rating follows once the screen has run.",
  },
  {
    q: "Can I trust what the assistant says?",
    a: "The figures come from the filing itself, and the rating is ours, so those are exact. The sentences around them are the assistant’s own, and assistants do paraphrase. Every answer carries a link to the filing’s ddbx page; read that before acting on anything. None of it is investment advice.",
  },
  {
    q: "Can I build a product on it?",
    a: (
      <>
        The connector is for personal use through an assistant, fifty filings at
        a time. A product wants the full record, page sizes sized to the job,
        and a licence that says what you may pass on. That is the{" "}
        <Link
          className="text-brand-amber underline-offset-2 hover:underline"
          to="/developers"
        >
          ddbx API
        </Link>
        , which is a separate, licensed product, access by request.
      </>
    ),
  },
];

function Tick() {
  return (
    <span
      aria-hidden
      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-amber"
    />
  );
}

function Lock() {
  return (
    <span
      aria-hidden
      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full border border-white/40"
    />
  );
}

export default function McpPage() {
  usePinnedTheme("dark");
  const [askOpen, setAskOpen] = useState(false);
  const platform = useDevicePlatform();
  // The UK app is the canonical client (the US app sells the US feed alone),
  // and the closing ask is one button, so it points at the UK listing.
  // Desktop clicks go through the handoff modal per the acquisition rules;
  // phones keep the direct store link.
  const appHref = appHrefForMarket("uk", platform);
  const handoff = useAppHandoff("uk", appHref, "MCP closing band");

  return (
    <DefaultLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-2 md:pt-6">
        <div className="rounded-3xl border border-white/[0.08] bg-[oklch(19%_0.022_55)] p-6 md:p-10 lg:p-12">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_minmax(0,540px)] lg:gap-14">
            <div>
              <span
                className={`${CHIP_BASE} ${CHIP_HAIRLINE} ${CHIP_SIZE.lg} bg-brand-amber/15 text-brand-amber`}
              >
                MCP connector · Free
              </span>
              <h1 className="mt-6 text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.028em] text-white sm:text-[44px] lg:text-[56px]">
                Ask ChatGPT or Claude about insider buying.
              </h1>
              <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.55] text-white/60">
                ddbx is a connector for AI assistants. Paste one address and
                yours can look up who bought shares in their own company this
                week, how ddbx rated it, and where the analysis is. No sign-in,
                no key, nothing to pay.
              </p>

              <UrlCopy className="mt-8 max-w-[34rem]" gaLabel="MCP hero" />

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-white/50">
                <a
                  className="font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
                  href="#connect"
                >
                  Set it up in your assistant
                </a>
                <a
                  className="font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
                  href="#compare"
                >
                  Connector or API?
                </a>
              </div>
            </div>

            <LiveSample />
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-8 sm:grid-cols-4 lg:mt-12">
            {FACTS.map((s) => (
              <div
                key={s.k}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5"
              >
                <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  {s.k}
                </dt>
                <dd className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-white">
                  {s.v}
                </dd>
                <p className="mt-2 text-[12px] leading-[1.45] text-white/40">
                  {s.note}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 01 What you can ask ──────────────────────────────────────────── */}
      <section className={`${SECTION} pt-16 md:pt-24`}>
        <SectionHeader
          index={1}
          kicker="What you can ask"
          sub="Insider dealings are public filings, but reading them means knowing where the register is and what a Form 4 code means. Your assistant now knows both. Ask in plain words."
          title="Six questions it answers well."
          tone="dark"
          total={TOTAL}
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {QUESTIONS.map((c, i) => (
            <Reveal key={c.q} delay={(i % 3) * 60}>
              <div className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
                <c.Icon
                  aria-hidden="true"
                  className="h-6 w-6 text-brand-amber"
                  strokeWidth={1.4}
                />
                <h3 className="mt-4 text-[17px] font-semibold leading-snug text-white">
                  &ldquo;{c.q}&rdquo;
                </h3>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-white/55">
                  {c.note}
                </p>
                <p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-brand-tan">
                  {c.tool}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 02 What comes back ───────────────────────────────────────────── */}
      <section className={SECTION}>
        <SectionHeader
          index={2}
          kicker="What comes back"
          sub="The assistant tells you what happened and how ddbx rated it. The reasoning behind the rating stays on ddbx, one link away. Saying so up front beats a reader finding out later."
          title="The facts and the rating. The reasoning is a link away."
          tone="dark"
          total={TOTAL}
        />

        <div className="mt-10 grid gap-x-10 gap-y-4 border-t border-white/[0.12] py-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">
              In the answer
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-white/45">
              Every filing the connector returns carries these.
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {IN_THE_ANSWER.map((t) => (
              <li
                key={t}
                className="flex items-start gap-3 text-[14.5px] leading-[1.5] text-white/80"
              >
                <Tick />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-x-10 gap-y-4 border-t border-white/[0.12] py-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">
              Behind the link
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-white/45">
              On the filing&rsquo;s ddbx page and in the app. Not sent to the
              assistant.
            </p>
          </div>
          <div>
            <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {BEHIND_THE_LINK.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 text-[14.5px] leading-[1.5] text-white/55"
                >
                  <Lock />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-[64ch] text-[13.5px] leading-[1.6] text-white/40">
              One exception: the daily recap. <Path>get_daily_summary</Path>{" "}
              returns ddbx&rsquo;s written summary of the day&rsquo;s UK or US
              filings in full, because it is already published here every day.
              How the rating is arrived at is on{" "}
              <Link
                className="text-white/70 underline-offset-2 hover:text-white hover:underline"
                to="/how-it-works"
              >
                how it works
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── 03 Set it up ─────────────────────────────────────────────────── */}
      <section className={SECTION} id="connect">
        <SectionHeader
          index={3}
          kicker="Set it up"
          sub="Menus move; the address does not. Whatever your assistant calls the screen, the job is to paste this into it and choose no authentication."
          title="One address, pasted once."
          tone="dark"
          total={TOTAL}
        />

        <div className="mt-10 grid gap-x-10 gap-y-6 border-t border-white/[0.12] py-8 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">
              The address
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-white/45">
              Streamable HTTP. No token, no header.
            </p>
          </div>
          <div className="min-w-0">
            <UrlCopy
              className="max-w-[34rem]"
              gaLabel="MCP connect"
              size="sm"
            />
            <CodeTabs className="mt-6" snippets={SNIPPETS} />
            <p className="mt-5 text-[13.5px] leading-[1.6] text-white/40">
              Anything else that speaks remote MCP works the same way: add a
              remote HTTP server at that address. Tools the assistant will see:{" "}
              <Path>search_dealings</Path>, <Path>get_dealing</Path>,{" "}
              <Path>get_company</Path>, <Path>get_daily_summary</Path>,{" "}
              <Path>search</Path> and <Path>fetch</Path>.
            </p>
          </div>
        </div>
      </section>

      {/* ── 04 Connector or API ──────────────────────────────────────────── */}
      <section className={SECTION} id="compare">
        <SectionHeader
          index={4}
          kicker="Connector or API"
          sub="Both read the same pipeline. One is for asking, the other is for building, and the difference is what comes back and under what terms."
          title="Asking is free. Building is licensed."
          tone="dark"
          total={TOTAL}
        />

        <Reveal className="mt-10">
          <ComparisonTable />
        </Reveal>
        <p className="mt-6 max-w-[64ch] text-[13.5px] leading-[1.6] text-white/40">
          The API is described in full on{" "}
          <Link
            className="text-white/70 underline-offset-2 hover:text-white hover:underline"
            to="/developers"
          >
            the developer page
          </Link>
          , with the reference and the request form.
        </p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className={SECTION}>
        <ApiFaq
          items={FAQ}
          standfirst="What MCP is, what the connector does and does not hand over, and how far to trust the sentences around the numbers."
          title="Before you connect"
        />
      </section>

      {/* ── Read next ────────────────────────────────────────────────────── */}
      <section className={`${SECTION} pt-0 md:pt-0`}>
        <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-amber">
          Read next
        </p>
        <RelatedCards
          items={[
            {
              to: "/how-it-works",
              title: "How a filing becomes a rating",
              description:
                "The six checks behind significant, noteworthy, minor and routine.",
            },
            {
              to: "/developers",
              title: "The ddbx API",
              description:
                "The full record, including the written analysis, under licence.",
            },
            {
              to: "/learn",
              title: "Insider dealing, explained",
              description:
                "PDMRs, Form 4, closed periods and the other terms the assistant will use.",
            },
          ]}
        />
      </section>

      {/* ── The ask: cream panel, two doors ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        {/* The page's one polarity flip, held inside the column as a rounded
            panel rather than bled across it (design language, tenet 1). Fixed
            colours only: `.dark` is pinned, so a theme-aware token in here
            would resolve to its dark value on a cream ground.

            Two doors because the connector has two natural next steps and they
            are for different people: a reader who wants the reasoning gets the
            app; a builder gets the API. One filled button, one ghost, so the
            panel still has a single contrasting object. */}
        <div className="rounded-[28px] bg-[#f5f0e8] px-6 py-12 text-ink sm:px-10 md:px-14 md:py-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-brown">
            Want more than the facts?
          </p>
          <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <h2 className="text-balance text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[34px]">
                The reasoning is in the app.
              </h2>
              <p className="mt-4 max-w-[40ch] text-[15.5px] leading-[1.6] text-ink/65">
                Every rated filing carries its thesis, the evidence for and
                against, the key risks and how it has done since. Pushed to your
                phone the day it files.
              </p>
              <a
                className={`mt-7 inline-flex items-center gap-2.5 ${BUTTON_RADIUS} bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2118]`}
                data-ga-event="cta_mcp_band_app"
                data-ga-label="MCP closing band"
                rel="noopener noreferrer"
                target="_blank"
                {...handoff.anchorProps}
              >
                Get the app
              </a>
              <p className="mt-3 text-[12.5px] text-ink/50">
                Free for 7 days, cancel any time.
              </p>
            </div>
            <div className="border-t border-ink/10 pt-10 md:border-l md:border-t-0 md:pl-14 md:pt-0">
              <h2 className="text-balance text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[34px]">
                Building something? That is the API.
              </h2>
              <p className="mt-4 max-w-[40ch] text-[15.5px] leading-[1.6] text-ink/65">
                The full record over JSON, with the written analysis, under a
                licence that says what you may pass on. Tell us what you are
                building and we will come back with scope and a number.
              </p>
              <button
                className={`mt-7 ${BUTTON_RADIUS} bg-ink/[0.07] px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-ink/[0.12]`}
                data-ga-event="cta_mcp_band_request"
                data-ga-label="MCP closing band"
                type="button"
                onClick={() => setAskOpen(true)}
              >
                Request API access
              </button>
              <p className="mt-3 text-[12.5px] text-ink/50">
                Two working days. No newsletter, no onward sharing.
              </p>
            </div>
          </div>
          <p className="mt-12 max-w-[64ch] text-[11.5px] leading-[1.6] text-ink/40">
            Research output, not investment advice. Ratings are not
            recommendations to trade. The connector is provided as is and may
            change; tool names are kept stable where assistants depend on them.
          </p>
        </div>
      </section>

      {handoff.modal}
      <RequestAccessModal open={askOpen} onClose={() => setAskOpen(false)} />
    </DefaultLayout>
  );
}
