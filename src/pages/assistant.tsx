import type { ReactNode } from "react";

import { Link } from "react-router-dom";

import { LiveSample } from "@/components/mcp/live-sample";
import { UrlCopy } from "@/components/mcp/url-copy";
import { RelatedCards } from "@/components/seo/related-cards";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";
import DefaultLayout from "@/layouts/default";
import { CLAUDE_CODE_COMMAND } from "@/lib/mcp-setup";
import { BEHIND_THE_LINK, IN_THE_ANSWER } from "@/lib/mcp-copy";

/** `/claude` and `/chatgpt` — one page per assistant, for the people who
 *  search "<assistant> insider buying" rather than "MCP connector".
 *
 *  Both render the same connector as /mcp and say so; they differ in the
 *  steps, the example questions and the caveats that are true of that
 *  assistant alone. They are NOT in the navbar (footer and /mcp link to them),
 *  and they sit on the light shell the rest of the SEO family uses rather than
 *  the pinned-dark /mcp, because they are explainers that arrive from search,
 *  not the API's technical sibling.
 *
 *  HONESTY, as on /mcp. The connector serves the thin tier and says so in its
 *  own section. Two further rules specific to these pages:
 *  - No claim of a directory listing or partnership. The steps add ddbx by hand
 *    as a custom connector, and that is all the page says it is.
 *  - No claim about which plan a menu appears on. Vendors move those; the page
 *    says menus drift and the address does not.
 *
 *  Vendor names are nominative: they name the product the reader owns. Copy
 *  follows house style (HOUSE_STYLE_RULES in ddbx-data/worker/llm/prompts.ts). */

export type AssistantId = "claude" | "chatgpt";

interface Assistant {
  id: AssistantId;
  name: string;
  path: string;
  /** The page's h1. */
  title: string;
  standfirst: ReactNode;
  stepsTitle: string;
  stepsSub: string;
  steps: ReactNode[];
  /** Shown under the steps: the one thing that trips this assistant's
   *  readers up. */
  stepsNote: ReactNode;
  prompts: { q: string; note: string }[];
  faq: { q: string; a: ReactNode }[];
  sibling: { to: string; title: string; description: string };
}

const ADDRESS = "Paste the address above";

const CLAUDE: Assistant = {
  id: "claude",
  name: "Claude",
  path: "/claude",
  title: "Ask Claude about insider share buying",
  standfirst: (
    <>
      ddbx is a free connector for Claude. Add one address and Claude can look
      up which directors and insiders have been buying shares in their own
      companies, how ddbx rated each purchase, and where the full analysis is.
      No sign-in, no key.
    </>
  ),
  stepsTitle: "Add ddbx to Claude",
  stepsSub:
    "Menus move; the address does not. Whatever Claude calls the screen, the job is to paste the address and choose no sign-in.",
  steps: [
    "Open Claude on the web or desktop, then Settings and Connectors.",
    "Choose Add custom connector.",
    <>
      Name it <strong>ddbx</strong> and paste the address above.
    </>,
    "Add it. There is nothing to sign in to.",
    "Start a chat and ask a question from the list below.",
  ],
  stepsNote: (
    <>
      Using Claude Code in a terminal? One command does it:{" "}
      <code className="font-mono text-caption">{CLAUDE_CODE_COMMAND}</code>
    </>
  ),
  prompts: [
    {
      q: "What have UK directors been buying this week?",
      note: "The newest rated purchases, with who bought, how much and the rating.",
    },
    {
      q: "Has anyone at Barclays bought shares lately?",
      note: "One company’s recent insider dealings, with a link to its ddbx page.",
    },
    {
      q: "What did ddbx make of today’s US filings?",
      note: "The written daily recap, with the filings it cites.",
    },
    {
      q: "Which members of Congress bought shares last month?",
      note: "STOCK Act disclosures, with the amount band.",
    },
    {
      q: "Were several insiders buying the same company?",
      note: "Each filing says whether other insiders bought in the same window.",
    },
  ],
  faq: [
    {
      q: "Is there a Claude integration I can install from a directory?",
      a: "You add ddbx yourself as a custom connector, using the address on this page. That takes a minute and needs no account with us. The steps are above.",
    },
    {
      q: "Does Claude need a ddbx account?",
      a: "No. The connector is free, read-only and has no sign-in. What it does not carry is the written analysis behind each rating, which is in the app and on each filing’s page.",
    },
    {
      q: "Can I trust what Claude tells me about a filing?",
      a: "The figures come from the filing and the rating is ours, so those are exact. The sentences around them are Claude’s own, and assistants do paraphrase. Every answer carries a link to the filing’s ddbx page. Read that before acting on anything. None of it is investment advice.",
    },
    {
      q: "Does it work in Claude Code and the desktop app?",
      a: "Yes. It is a standard remote MCP server, so anything that can add one can use it. Claude Code takes the one-line command above.",
    },
  ],
  sibling: {
    to: "/chatgpt",
    title: "ddbx for ChatGPT",
    description: "The same connector, with the ChatGPT steps.",
  },
};

const CHATGPT: Assistant = {
  id: "chatgpt",
  name: "ChatGPT",
  path: "/chatgpt",
  title: "Ask ChatGPT about insider share buying",
  standfirst: (
    <>
      ddbx is a free connector for ChatGPT. Add one address and ChatGPT can look
      up which directors and insiders have been buying shares in their own
      companies, how ddbx rated each purchase, and where the full analysis is.
      No sign-in, no key.
    </>
  ),
  stepsTitle: "Add ddbx to ChatGPT",
  stepsSub:
    "Menus move; the address does not. Whatever ChatGPT calls the screen, the job is to paste the address and choose no authentication.",
  steps: [
    "Open ChatGPT, then Settings and Apps & Connectors.",
    "Turn on Developer mode, then choose Create.",
    <>
      Name it <strong>ddbx</strong> and paste the address above.
    </>,
    "Set authentication to None and save.",
    "Start a chat, switch ddbx on for it, and ask a question from the list below.",
  ],
  stepsNote: (
    <>
      Custom connectors sit behind Developer mode, and OpenAI decides which
      plans get it. If you don&rsquo;t see the option, that is why, and nothing
      here is broken.
    </>
  ),
  prompts: [
    {
      q: "What did UK directors buy this week?",
      note: "The newest rated purchases, with who bought, how much and the rating.",
    },
    {
      q: "Has anyone at Tesco bought shares recently?",
      note: "One company’s recent insider dealings, with a link to its ddbx page.",
    },
    {
      q: "Show me Form 4 purchases at GameStop since June.",
      note: "US open-market buys, filtered by ticker and disclosure date.",
    },
    {
      q: "What did ddbx make of today’s UK filings?",
      note: "The written daily recap, with the filings it cites.",
    },
    {
      q: "Which insiders bought shares in Sweden this month?",
      note: "Swedish PDMR notifications, in krona.",
    },
  ],
  faq: [
    {
      q: "Is ddbx an official ChatGPT app?",
      a: "No. It is a public connector that you add yourself as a custom connector, using the address on this page. It is not built by or endorsed by OpenAI.",
    },
    {
      q: "Why can’t I find the Developer mode setting?",
      a: "OpenAI controls which plans and workspaces get custom connectors, and the menu names change. If your account doesn’t offer it, you can still read everything the connector would send on ddbx.uk, free.",
    },
    {
      q: "Does ChatGPT need a ddbx account?",
      a: "No. The connector is free, read-only and has no sign-in. What it does not carry is the written analysis behind each rating, which is in the app and on each filing’s page.",
    },
    {
      q: "Can I trust what ChatGPT tells me about a filing?",
      a: "The figures come from the filing and the rating is ours, so those are exact. The sentences around them are ChatGPT’s own, and assistants do paraphrase. Every answer carries a link to the filing’s ddbx page. Read that before acting on anything. None of it is investment advice.",
    },
  ],
  sibling: {
    to: "/claude",
    title: "ddbx for Claude",
    description: "The same connector, with the Claude steps.",
  },
};

const ASSISTANTS: Record<AssistantId, Assistant> = {
  claude: CLAUDE,
  chatgpt: CHATGPT,
};

const TOTAL = 5;

function Steps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="mt-6 space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-body">
          <span className="eyebrow mt-0.5 w-5 shrink-0 tabular-nums text-foreground/40">
            {i + 1}
          </span>
          <span className="min-w-0">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function List({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {items.map((t) => (
        <li
          key={t}
          className={`flex items-start gap-3 text-body ${
            muted ? "text-foreground/55" : "text-foreground/80"
          }`}
        >
          <span
            aria-hidden
            className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
              muted ? "border border-foreground/30" : "bg-brand-brown"
            }`}
          />
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function AssistantPage({ which }: { which: AssistantId }) {
  const a = ASSISTANTS[which];

  return (
    <DefaultLayout>
      <SeoPageShell
        crumbs={[{ label: "MCP connector", to: "/mcp" }, { label: a.name }]}
        cta={{
          headline: `Want the reasoning behind each rating, not just ${a.name}’s summary?`,
          body: "Every rated filing carries its thesis, the evidence for and against, the key risks and how it has done since, pushed to your phone the day it files.",
          gaLabel: `${a.name} page`,
          marketId: "uk",
        }}
        eyebrow="AI assistants"
        standfirst={a.standfirst}
        standfirstSize="lede"
        title={a.title}
      >
        <div className="mt-8 max-w-[34rem]">
          <UrlCopy gaLabel={`${a.name} hero`} />
          <p className="mt-3 text-small text-foreground/50">
            Free, read-only, no sign-in. {ADDRESS}, then follow the steps below.
          </p>
        </div>

        <SeoSection id="connect" index={1} title={a.stepsTitle} total={TOTAL}>
          <p className="max-w-measure text-body text-foreground/60">
            {a.stepsSub}
          </p>
          <Steps steps={a.steps} />
          <p className="mt-6 max-w-measure text-small text-foreground/55">
            {a.stepsNote}
          </p>
        </SeoSection>

        <SeoSection index={2} title={`What to ask ${a.name}`} total={TOTAL}>
          <p className="max-w-measure text-body text-foreground/60">
            Insider dealings are public filings, but reading them means knowing
            where the register is and what a Form 4 code means. {a.name} now
            knows both. Ask in plain words.
          </p>
          <ul className="mt-6 divide-y divide-rule border-y border-rule">
            {a.prompts.map((p) => (
              <li key={p.q} className="py-4">
                <p className="text-title text-foreground">
                  &ldquo;{p.q}&rdquo;
                </p>
                <p className="mt-1.5 text-body text-foreground/55">{p.note}</p>
              </li>
            ))}
          </ul>
        </SeoSection>

        <SeoSection index={3} title={`What ${a.name} sees`} total={TOTAL}>
          <p className="max-w-measure text-body text-foreground/60">
            This is a live call to the connector, made from your browser as the
            page loads. It is what {a.name} receives when it asks, before it
            puts the answer into sentences.
          </p>
          <div className="mt-6">
            <LiveSample />
          </div>
        </SeoSection>

        <SeoSection
          index={4}
          title="The facts and the rating. The reasoning is a link away."
          total={TOTAL}
        >
          <p className="max-w-measure text-body text-foreground/60">
            The connector is deliberately thin. {a.name} gets what happened and
            how ddbx rated it, and a link to the reasoning. Saying so here beats
            you finding out later.
          </p>
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-title">In the answer</h3>
              <div className="mt-3">
                <List items={IN_THE_ANSWER} />
              </div>
            </div>
            <div>
              <h3 className="text-title">Behind the link</h3>
              <p className="mt-1.5 text-small text-foreground/50">
                On the filing&rsquo;s ddbx page and in the app. Not sent to{" "}
                {a.name}.
              </p>
              <div className="mt-3">
                <List muted items={BEHIND_THE_LINK} />
              </div>
            </div>
          </div>
          <p className="mt-6 max-w-measure text-small text-foreground/50">
            One exception: the daily recap is returned in full, because it is
            already published on ddbx every day. How a rating is arrived at is
            on{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to="/how-it-works"
            >
              how it works
            </Link>
            .
          </p>
        </SeoSection>

        <SeoSection index={5} title="Before you connect" total={TOTAL}>
          <dl className="divide-y divide-rule border-y border-rule">
            {a.faq.map((f) => (
              <div key={f.q} className="py-4">
                <dt className="text-title text-foreground">{f.q}</dt>
                <dd className="mt-1.5 max-w-measure text-body text-foreground/60">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </SeoSection>

        <SeoSection title="Read next">
          <RelatedCards
            items={[
              a.sibling,
              {
                to: "/mcp",
                title: "The MCP connector",
                description:
                  "Every assistant it works with, and how it differs from the API.",
              },
              {
                to: "/learn",
                title: "Insider dealing, explained",
                description:
                  "PDMRs, Form 4, closed periods and the other terms your assistant will use.",
              },
            ]}
          />
        </SeoSection>

        <p className="mt-12 max-w-measure text-caption text-foreground/40">
          {a.name} is a trademark of its owner. ddbx is independent and is not
          affiliated with or endorsed by them. Research output, not investment
          advice. Ratings are not recommendations to trade.
        </p>
      </SeoPageShell>
    </DefaultLayout>
  );
}
