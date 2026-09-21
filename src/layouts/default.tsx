import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AU, CA, EU, GB, US } from "country-flag-icons/react/3x2";

import { AppDrawer } from "@/components/app-drawer";
import { AppComingSoonModal } from "@/components/app-coming-soon-modal";
import { StoreCta } from "@/components/store-cta";
import { glass } from "@/components/ui/glass";
import { NewsSourceLogo } from "@/components/news-source-logo";
import { Navbar } from "@/components/navbar";
import { SideNav } from "@/components/side-nav";
import { NAV_SIDEBAR } from "@/lib/nav-mode";
import { ShellPageHeader } from "@/components/shell-page-header";
import {
  MarketChooserModal,
  type MarketChoice,
} from "@/components/market-chooser-modal";
import {
  buildAppChoices,
  COMING_SOON_APPS,
  IOS_APP_LOGO_BY_MARKET,
  storeUrlForMarketId,
} from "@/lib/app-store";
import { useDownloadCopy } from "@/lib/download/copy";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { marketContactEmail, marketForPath } from "@/lib/markets/registry";
import { footerGroups } from "@/lib/site-nav";
import { FooterTrail } from "@/components/footer-trail";
import { setRailPresent } from "@/lib/rail-presence";
import { useFloatingCtaSuppressed } from "@/lib/floating-cta";
import { smartBannerReplacesFloatingCta } from "@/lib/smart-banner";

type LegalPage = "privacy" | "cookies" | "terms" | "contact" | null;

/** Per-market X (Twitter) accounts, surfaced in the "who to follow" chooser.
 *  The same MarketChooserModal pattern drives the app-store chooser — see
 *  `APP_CHOICES` in `@/lib/app-store`. */
const FOLLOW_CHOICES: MarketChoice[] = [
  {
    id: "uk",
    Flag: GB,
    logoSrc: IOS_APP_LOGO_BY_MARKET.uk,
    label: "ddbx.uk",
    description: "UK director dealings · @ddbxuk",
    href: "https://x.com/ddbxuk",
  },
  {
    id: "us",
    Flag: US,
    logoSrc: IOS_APP_LOGO_BY_MARKET.us,
    label: "ddbx.us",
    description: "US insiders & Congress · @ddbxus",
    href: "https://x.com/ddbxus",
  },
  {
    id: "eu",
    Flag: EU,
    logoSrc: IOS_APP_LOGO_BY_MARKET.eu,
    label: "ddbx.eu",
    description: "Europe",
    comingSoon: true,
  },
  {
    id: "au",
    Flag: AU,
    logoSrc: IOS_APP_LOGO_BY_MARKET.au,
    label: "ddbx.au",
    description: "Australia",
    comingSoon: true,
  },
  {
    id: "ca",
    Flag: CA,
    logoSrc: IOS_APP_LOGO_BY_MARKET.ca,
    label: "ddbx.ca",
    description: "Canada",
    comingSoon: true,
  },
];

const LEGAL_LINKS: {
  label: string;
  page: Exclude<LegalPage, null>;
  path: string;
}[] = [
  { label: "Contact", page: "contact", path: "/contact" },
  { label: "Privacy Policy", page: "privacy", path: "/privacy" },
  { label: "Cookie Policy", page: "cookies", path: "/cookies" },
  { label: "Terms & Conditions", page: "terms", path: "/terms" },
];

function pathToLegalPage(pathname: string): LegalPage {
  if (pathname === "/contact") return "contact";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/cookies") return "cookies";
  if (pathname === "/terms") return "terms";

  return null;
}

const LEGAL_TITLES: Record<Exclude<LegalPage, null>, string> = {
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
  terms: "Terms & Conditions",
  contact: "Contact",
};

function LegalDrawer({
  page,
  onClose,
}: {
  page: LegalPage;
  onClose: () => void;
}) {
  return (
    <AppDrawer
      bodyClassName="px-6 py-6 text-sm leading-relaxed text-foreground/70 space-y-4"
      maxWidthClass="max-w-lg"
      open={page !== null}
      title={page ? LEGAL_TITLES[page] : ""}
      onClose={onClose}
    >
      {page === "privacy" && <PrivacyContent />}
      {page === "cookies" && <CookieContent />}
      {page === "terms" && <TermsContent />}
      {page === "contact" && <ContactContent />}
    </AppDrawer>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-body font-semibold text-foreground/90">
      {children}
    </h3>
  );
}

function ContactContent() {
  const { pathname } = useLocation();
  const email = marketContactEmail(pathname);

  return (
    <p>
      Get in touch at{" "}
      <a
        className="text-foreground/90 underline underline-offset-2 hover:text-foreground"
        href={`mailto:${email}`}
      >
        {email}
      </a>
      .
    </p>
  );
}

function PrivacyContent() {
  return (
    <>
      <p>Last updated: 21 September 2026</p>
      <p>
        DDBX (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the
        website ddbx.uk. This Privacy Policy explains how we collect, use, and
        protect information when you visit our site.
      </p>

      <SectionTitle>Information we collect</SectionTitle>
      <p>
        We collect minimal personal data. When you browse the site, our hosting
        provider (Cloudflare) may automatically log standard request metadata
        including your IP address, browser type, referring page, and pages
        visited. We do not require account registration and do not collect
        names, email addresses, or payment information.
      </p>

      <SectionTitle>How we use information</SectionTitle>
      <p>
        Any information collected is used solely for operating and improving the
        site, monitoring for abuse or technical issues, and understanding
        aggregate usage patterns. We do not sell, rent, or share personal data
        with third parties for marketing purposes.
      </p>

      <SectionTitle>Data storage and security</SectionTitle>
      <p>
        Data is processed and stored via Cloudflare&apos;s global network
        infrastructure. We employ reasonable technical measures to protect data
        against unauthorised access, but no method of electronic transmission or
        storage is completely secure.
      </p>

      <SectionTitle>Third-party services</SectionTitle>
      <p>
        The site is hosted on Cloudflare Pages and uses Cloudflare Workers for
        API functionality. Cloudflare&apos;s own privacy policy governs their
        processing of network-level data. We use Google Analytics 4 for
        aggregate usage statistics; it sets an analytics cookie when you arrive.
        Accepting the cookie banner additionally loads the X (Twitter) Ads
        conversion pixel (to measure ad-driven installs). See the Cookie Policy
        for details.
      </p>

      <SectionTitle>AI assistant connector</SectionTitle>
      <p>
        We run a read-only connector at api.ddbx.uk/mcp that AI assistants such
        as ChatGPT and Claude can call on your behalf. It needs no account and
        receives only the request the assistant sends, not your conversation.
        For each request we record the kind of client (for example
        &quot;ChatGPT&quot; or &quot;Claude&quot;), which tool was called, the
        market asked about, whether it succeeded and how long it took. We do
        not record your prompt, search terms, tickers, filing ids, IP address
        or full browser string.
      </p>
      <p>
        To prevent abuse, requests are rate-limited per IP address. The address
        is used in the moment to apply the limit and is not stored by us.
        Cloudflare may log request metadata as described above, and we keep
        operational logs for up to seven days.
      </p>

      <SectionTitle>Your rights</SectionTitle>
      <p>
        Under the UK GDPR, you have the right to access, correct, or request
        deletion of any personal data we hold. Since we collect minimal data and
        do not maintain user accounts, most requests can be addressed by
        clearing your browser cookies. For any data-related enquiries, please
        contact us via X (Twitter) @ddbxuk.
      </p>

      <SectionTitle>Changes to this policy</SectionTitle>
      <p>
        We may update this policy from time to time. Material changes will be
        noted on this page with a revised &quot;last updated&quot; date.
      </p>
    </>
  );
}

function CookieContent() {
  return (
    <>
      <p>Last updated: 2 August 2026</p>
      <p>
        This Cookie Policy explains how DDBX uses cookies and similar
        technologies when you visit ddbx.uk.
      </p>

      <SectionTitle>What are cookies?</SectionTitle>
      <p>
        Cookies are small text files placed on your device by websites you
        visit. They are widely used to make websites work efficiently and to
        provide information to site operators.
      </p>

      <SectionTitle>Strictly necessary</SectionTitle>
      <p>
        These are always on. They are needed for the site to work and do not
        require your consent.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Cloudflare security cookies</strong>, set by our hosting
          provider to identify trusted traffic and protect against malicious
          visitors.
        </li>
        <li>
          <strong>Local preferences</strong>, small <code>localStorage</code>{" "}
          entries remembering things like your selected theme, market, and which
          deal cards you have opened today. These never leave your browser.
        </li>
      </ul>

      <SectionTitle>Analytics</SectionTitle>
      <p>These are set when you arrive, before you interact with the banner.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Google Analytics 4</strong>, aggregate usage statistics (which
          pages are viewed, roughly where visitors come from). It sets an
          analytics cookie so repeat visits from the same browser are counted
          once rather than as new people each time. We do not send it your name,
          email, or anything you type into the site, and Google&apos;s
          advertising signals are switched off, so the data is not used to
          personalise ads.
        </li>
      </ul>

      <SectionTitle>Marketing (requires consent)</SectionTitle>
      <p>
        Not loaded at all until you click{" "}
        <strong>&quot;Agree to cookies&quot;</strong> on the banner.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>X (Twitter) conversion pixel</strong>, measures whether
          visitors arriving from X ads go on to install the app or sign up.
          Loaded from <code>static.ads-twitter.com</code>.
        </li>
      </ul>
      <p>
        We do not use display-advertising cookies, retargeting networks, or
        cross-site tracking beyond the conversion pixel above.
      </p>

      <SectionTitle>Changing your mind</SectionTitle>
      <p>
        Cleared site data or a fresh browser will show the banner again, and the
        marketing pixel goes back to not loading. To re-trigger the banner on
        the same browser, visit any page with <code>?cookies=reset</code>{" "}
        appended to the URL.
      </p>
      <p>
        To opt out of the analytics cookie, use your browser&apos;s cookie
        controls or its Do Not Track / tracker-blocking settings, or install
        Google&apos;s official{" "}
        <a
          className="underline underline-offset-2"
          href="https://tools.google.com/dlpage/gaoptout"
          rel="noreferrer noopener"
          target="_blank"
        >
          Analytics opt-out add-on
        </a>
        . Clearing site data removes it too.
      </p>

      <SectionTitle>Changes to this policy</SectionTitle>
      <p>
        If we introduce new categories of cookies in the future, we will update
        this page and, where required, ask for consent before setting them.
      </p>
    </>
  );
}

function TermsContent() {
  const { pathname } = useLocation();
  const email = marketContactEmail(pathname);

  return (
    <>
      <p>Last updated: 1 April 2026</p>
      <p>
        By accessing and using ddbx (&quot;the Service&quot;, whether at
        ddbx.uk, ddbx.us, or in the ddbx mobile apps), you agree to be bound by
        these Terms &amp; Conditions. If you do not agree, please do not use the
        Service.
      </p>

      <SectionTitle>Nature of the service</SectionTitle>
      <p>
        The Site provides AI-generated analysis and ratings of UK director share
        dealings, sourced from publicly available regulatory disclosures. All
        content is produced by automated systems and is provided for
        informational and educational purposes only.
      </p>

      <SectionTitle>Not financial advice</SectionTitle>
      <p>
        Nothing on this Site constitutes personal financial advice, a
        recommendation to buy or sell any security, or an invitation to invest.
        Ratings, signals, and commentary are generated by AI models and may
        contain errors, omissions, or outdated information. You should always
        conduct your own research and seek independent professional advice
        before making any investment decision.
      </p>

      <SectionTitle>No warranty</SectionTitle>
      <p>
        The Site and its contents are provided on an &quot;as is&quot; and
        &quot;as available&quot; basis without warranties of any kind, whether
        express or implied. We do not guarantee the accuracy, completeness,
        reliability, or timeliness of any information displayed. Data may be
        delayed, incomplete, or contain errors introduced during automated
        processing.
      </p>

      <SectionTitle>Limitation of liability</SectionTitle>
      <p>
        To the fullest extent permitted by law, DDBX and its operators shall not
        be liable for any direct, indirect, incidental, special, or
        consequential damages arising from your use of, or inability to use, the
        Site or any reliance on its contents. This includes, without limitation,
        any losses from investment decisions made with reference to information
        on the Site.
      </p>

      <SectionTitle>Intellectual property</SectionTitle>
      <p>
        All original content, design, and code on the Site are the property of
        DDBX. Director dealing data is sourced from public regulatory filings.
        You may not reproduce, distribute, or create derivative works from the
        Site&apos;s content without prior written permission, except for
        personal, non-commercial use.
      </p>

      <SectionTitle>Availability</SectionTitle>
      <p>
        We aim to keep the Site available continuously but do not guarantee
        uninterrupted access. The Site may be temporarily unavailable due to
        maintenance, updates, or circumstances beyond our control.
      </p>

      <SectionTitle>Community content and conduct</SectionTitle>
      <p>
        The ddbx apps let users post comments and other content (&quot;user
        content&quot;) and interact with other users. There is zero tolerance
        for objectionable content or abusive behaviour. By posting, you agree
        not to submit content that is unlawful, harassing, threatening, hateful,
        defamatory, obscene, or otherwise objectionable, and not to abuse,
        harass, or impersonate other users.
      </p>
      <p>
        You can report objectionable content and block abusive users from within
        the apps. We review reports and remove objectionable content, ejecting
        users who post it, within 24 hours. We may remove any user content and
        suspend or terminate any account at our discretion. You are solely
        responsible for the content you post. To report content or a user, use
        the in-app report and block controls or contact us at{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>

      <SectionTitle>Governing law</SectionTitle>
      <p>
        These terms are governed by the laws of England and Wales. Any disputes
        shall be subject to the exclusive jurisdiction of the courts of England
        and Wales.
      </p>

      <SectionTitle>Changes to these terms</SectionTitle>
      <p>
        We reserve the right to modify these terms at any time. Continued use of
        the Site after changes are posted constitutes acceptance of the revised
        terms.
      </p>
    </>
  );
}

export default function DefaultLayout({
  children,
  drawerRight,
  ticker,
  hideMobileCta,
  hidePageHeader,
  shellRail = true,
}: {
  children: React.ReactNode;
  drawerRight?: boolean;
  ticker?: React.ReactNode;
  /** Suppress the floating mobile "Download app" CTA — used on pages that
   *  have their own primary mobile action (e.g. the broker "Visit" bar). */
  hideMobileCta?: boolean;
  /** Shell mode only: suppress the sticky page header, for pages whose own
   *  sticky bar already names what you're looking at (the market feed's
   *  filter bar). */
  hidePageHeader?: boolean;
  /** Shell mode only: whether the page's fixed right rail becomes the shell's
   *  right panel (from 1440). False for pages that already carry an in-sheet
   *  side panel doing the rail's job (company), where both would squeeze the
   *  record to ~500px. */
  shellRail?: boolean;
}) {
  // A surface with its own app ask (the winners interstitial) holds the
  // floating trial button away while it is on screen — see lib/floating-cta.
  const floatingCtaSuppressed = useFloatingCtaSuppressed();
  // …and in `solo` mode the whole bar stands down for Apple's Smart App
  // Banner, which is the point of that mode: two install bars sandwiching a
  // phone screen is the thing the trial is meant to avoid, not add to. Resolved
  // once (module-level flag + a UA sniff, neither of which changes mid-session)
  // so this can't flip between renders and animate the bar out.
  const [bannerOwnsInstallCta] = useState(smartBannerReplacesFloatingCta);
  const location = useLocation();
  const navigate = useNavigate();

  // Tell globally-mounted overlays (cookie banner) whether this page reserves
  // the fixed right rail, so they can centre within the content column.
  useEffect(() => {
    setRailPresent(Boolean(drawerRight));
    // Shell mode: the frame, page header and centred overlays read the
    // sheet's right edge from --shell-r, which widens when a rail is present.
    if (NAV_SIDEBAR) {
      document.documentElement.classList.toggle(
        "shell-rail",
        Boolean(drawerRight) && shellRail,
      );
    }

    return () => setRailPresent(false);
  }, [drawerRight, shellRail]);

  const [followOpen, setFollowOpen] = useState(false);
  // Which store the chooser was opened for: "ios"/"android" when the visitor
  // clicked a specific badge, "auto" when they clicked a store-agnostic CTA and
  // the device sniff should decide, false when closed. Tracking the intent is
  // what stops the Google Play badge listing App Store links on desktop, where
  // there's no device to sniff.
  const [appsOpen, setAppsOpen] = useState<false | "auto" | "ios" | "android">(
    false,
  );
  const legalPage = pathToLegalPage(location.pathname);
  const platform = useDevicePlatform();
  // The floating mobile install bar's copy. English on every route except the
  // /zh-hk download pages, which render this layout inside a
  // `DownloadCopyProvider` — that bar is their primary tap target on a phone,
  // so it has to speak the page's language even though the rest of the site
  // chrome (navbar, footer, legal drawers) stays English.
  const t = useDownloadCopy();
  // Direct store link for the market that owns this route + the visitor's
  // device, so the mobile floating CTA jumps straight to the right listing
  // (iOS → App Store, Android → Play) instead of opening the chooser.
  // Undefined — app-less markets (SE/NL on iOS) and platforms with no
  // truthful listing (US on Android) — falls back to the chooser, which
  // shows honest per-market availability.
  const floatMarketId = marketForPath(
    location.pathname,
    typeof window === "undefined" ? undefined : window.location.hostname,
  ).id;
  // A market whose app is coming soon (SE/NL/KR) gets no store link at all —
  // storeUrlForMarketId would hand Android the UK app — and the bar opens the
  // coming-soon modal instead.
  const comingSoonApp = COMING_SOON_APPS[floatMarketId];
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const directAppUrl = comingSoonApp
    ? undefined
    : storeUrlForMarketId(floatMarketId, platform);
  const closeLegal = useCallback(() => {
    navigate("/");
  }, [navigate]);
  const openLegal = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  return (
    <div
      // overflow-x-clip absorbs the ~scrollbar-width overspill from sections
      // that break out of the centred column with `FULL_BLEED` (100vw). `clip`
      // and not `hidden`: hidden would make this a scroll container and kill
      // every position:sticky on the site. See @/components/full-bleed.
      // The bottom padding is the fixed mobile install bar's clearance. Its
      // solid block — button, caption, safe-area — is ~96px; at the old 5rem
      // the footer's last line finished flush under the caption with nothing
      // between them, so the page never looked scrolled-to-the-end. 7rem
      // leaves a clear gap at the bottom of the scroll.
      // …and in `solo` mode there is no bar to clear, so the reservation goes
      // with it — otherwise every page ends in 7rem of empty ground.
      className={`relative flex flex-col min-h-screen overflow-x-clip bg-page dark:bg-background ${bannerOwnsInstallCta ? "" : "pb-[calc(7rem+env(safe-area-inset-bottom))]"} md:pb-0 ${drawerRight ? "lg:mr-80" : ""} ${NAV_SIDEBAR ? `xl:mr-0 xl:bg-[var(--shell-frame)] xl:pl-[236px] ${drawerRight && shellRail ? "min-[1440px]:pr-[300px]" : ""}` : ""}`}
    >
      {/* First focusable thing on every page. Off-screen until it takes focus,
          then it parks itself over the navbar — otherwise a keyboard visitor
          tabs the whole masthead, market switcher and ticker before reaching
          the content, on every single navigation. */}
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-brand-amber dark:focus:bg-brand-amber dark:focus:text-ink dark:focus:ring-ink"
        href="#main"
      >
        Skip to content
      </a>
      {/* The navbar floats: the sticky wrapper carries the inset (so the bar
          detaches from the viewport edges and page content scrolls beneath it
          through the gutters) and the Navbar itself is the glass capsule. */}
      {NAV_SIDEBAR && (
        <>
          <SideNav />
          {/* The frame. The page scrolls with the window (sticky, scroll
              listeners and anchors all assume it), so the sheet can't be a
              fixed box with its own scroller. Instead this fixed, empty
              rounded rect paints the frame colour OUTSIDE itself (see
              .shell-frame) — content passes under it and the four corners
              stay put at every scroll position. */}
          <div aria-hidden className="shell-frame hidden xl:block" />
          <ShellPageHeader enabled={!hidePageHeader} />
        </>
      )}
      <div
        className={`sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4 ${NAV_SIDEBAR && !ticker ? "xl:hidden" : ""}`}
      >
        {/* The bar floats, so the inset above it is a window onto the page —
            rows slid through that 12/16px slot and were read as a stripe of
            chopped content pinned to the top of the screen. Cap the slot with
            the page ground so content ends at a clean edge and the capsule
            reads as sitting on the page rather than on its own offcuts.

            Flat page colour with a crisp edge, NOT a gradient fade: a fade
            here would be exactly the dissolve tenet 1 rules out. It stops at
            the capsule's top edge, so what passes UNDER the bar still shows
            through the glass — the blur keeps something to work on. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-page dark:bg-background md:h-4"
        />
        <div className={NAV_SIDEBAR ? "xl:hidden" : undefined}>
          <Navbar />
        </div>
        {ticker && (
          <div
            className={`mx-auto mt-2 max-w-[1280px] rounded-card ${glass()}`}
          >
            <div className="flex items-stretch px-4 md:px-5">{ticker}</div>
          </div>
        )}
      </div>
      {/* tabIndex -1 so the skip link actually moves focus here rather than
          only moving the scroll position; scroll-mt clears the sticky header,
          which would otherwise cover the top of what we just jumped to — now
          derived from the capsule's own height (--nav-clear, globals.css)
          rather than a 96px guess that happened to be generous. */}
      {/* Shell mode (experiment, lib/nav-mode): page and footer sit in one
          rounded sheet on the frame. Below xl — and in top-bar mode — this is
          display:contents and the layout is exactly as before. */}
      <div
        className={
          NAV_SIDEBAR
            ? "contents xl:mx-3 xl:my-3 xl:flex xl:flex-grow xl:flex-col xl:overflow-clip xl:bg-page xl:dark:bg-background"
            : "contents"
        }
      >
        <main
          className="mx-auto w-full max-w-[1280px] px-4 md:px-6 flex-grow pt-8 scroll-mt-[var(--nav-clear)] outline-none"
          id="main"
          tabIndex={-1}
        >
          {children}
        </main>
        {/* The footer is a raised sheet on the page, not a band ruled off from it:
          a bordered box inside the content column, sitting on a soft warm wash.
          The box's own edge and shadow do the separating the old full-width
          `border-t` did. FooterTrail covers this whole <footer> rather than a
          strip under the box, so the padding here is what the wash ramps
          across. The band field this replaced needed a lot of it to be read
          as a composition; a wash only needs enough not to end in an edge. */}
        <footer className="relative w-full pt-14 pb-10 md:pt-20 md:pb-14 shell:xl:pt-12! shell:xl:pb-10!">
          <div className="shell:xl:hidden">
            <FooterTrail />
          </div>
          <div className="relative mx-auto w-full max-w-[1280px] px-4 md:px-6">
            <div className="rounded-card border border-hairline bg-sheet px-5 py-8 md:px-8 md:py-10 shadow-lift text-caption text-foreground/45 dark:border-white/7 dark:bg-surface shell:xl:rounded-none! shell:xl:border-x-0! shell:xl:border-b-0! shell:xl:bg-transparent! shell:xl:px-0! shell:xl:pb-0! shell:xl:shadow-none!">
              {/* The wordmark is a cell of the ruled band, not a masthead floating
              above it — on desktop it takes the left rail beside the index;
              below lg it stacks inside the same rules. Floating it above the
              band made it read as a stray object between the page and the
              footer. Only ruled underneath now the footer is a box: the band's
              old top rule ran parallel to the box's own edge a few millimetres
              below it, which read as a double border. */}
              <div className="mb-6 border-b border-separator/50 pb-6 lg:flex lg:items-start">
                <div className="mb-6 lg:mb-0 lg:w-44 lg:shrink-0">
                  <img
                    alt="ddbx"
                    className="h-7 max-w-[90px] opacity-70 dark:invert"
                    src="/logo.svg"
                  />
                </div>
                <FooterNav />
              </div>

              <p>
                Disclaimer: The information, ratings, signals, commentary, and
                any related content provided on this website are for general
                informational and educational purposes only and are not intended
                to be financial advice, investment advice, tax advice, legal
                advice, or a recommendation to buy, sell, or hold any security
                or financial instrument.
              </p>
              <p className="mt-2">
                Nothing on this site constitutes personal advice or takes
                account of your individual objectives, financial situation, risk
                tolerance, or needs. You should always conduct your own research
                and, where appropriate, seek advice from a qualified and
                regulated financial professional before making any investment
                decision.
              </p>
              <p className="mt-2">
                Past performance, hypothetical performance, and model outputs
                are not reliable indicators of future results. Market conditions
                can change rapidly, data may be delayed or incomplete, and no
                guarantee is made as to the accuracy, completeness, or
                timeliness of any content provided.
              </p>
              <p className="mt-2">
                By using this website, you acknowledge that any reliance on the
                information is at your own risk and that the operators, authors,
                and contributors of this site are not liable for any direct,
                indirect, incidental, or consequential loss arising from use of,
                or reliance on, the content.
              </p>
              <p className="mt-2">
                This site is not an offer or solicitation in any jurisdiction
                where such offer or solicitation would be unlawful. Investing
                involves risk, including the possible loss of capital.
              </p>
              <p className="mt-2">
                Logos provided by{" "}
                <a
                  className="underline underline-offset-2 hover:text-foreground/70 transition-colors"
                  href="https://logo.dev"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <NewsSourceLogo
                    className="mr-1"
                    domain="logo.dev"
                    size="caption"
                  />
                  Logo.dev
                </a>
                .
              </p>
              {/* Legal links + social/app links.
              The X mark used to sit with the store badges on the right, where
              it was a 14px glyph pinned between two large full-colour vendor
              lockups and read as an artefact of them rather than a link of its
              own. It belongs with the other things you can click through to —
              the end of the link row, interpunct-separated like the rest of
              it — leaving the right side to the two store badges alone. */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-separator/50">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  {LEGAL_LINKS.map(({ label, page, path }) => (
                    <Fragment key={page}>
                      <button
                        className="text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2 text-left"
                        onClick={() => openLegal(path)}
                      >
                        {label}
                      </button>
                      <span aria-hidden className="text-foreground/20">
                        ·
                      </span>
                    </Fragment>
                  ))}

                  {/* A real <a>, not a router link: /sitemap.xml is served by a
                  Pages Function, so the SPA has no route for it. */}
                  <a
                    className="text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2"
                    data-ga-event="nav_footer_sitemap"
                    href="/sitemap.xml"
                  >
                    Sitemap
                  </a>
                  <span aria-hidden className="text-foreground/20">
                    ·
                  </span>

                  {/* Router link, unlike Sitemap above — /status is a real SPA
                  route, and a full page load would throw away the probe
                  results the visitor is about to watch arrive. */}
                  <Link
                    className="text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2"
                    data-ga-event="nav_footer_status"
                    to="/status"
                  >
                    Status
                  </Link>
                  <span aria-hidden className="text-foreground/20">
                    ·
                  </span>

                  <button
                    aria-label="Follow on X (Twitter)"
                    className="flex items-center text-foreground/60 hover:text-foreground transition-colors"
                    data-ga-event="cta_footer_follow_x"
                    type="button"
                    onClick={() => setFollowOpen(true)}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-3 h-3 fill-current shrink-0"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.861L1.254 2.25H8.08l4.257 5.625zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <StoreCta
                    className="hover:opacity-85"
                    data-ga-event="cta_footer_download"
                    data-ga-label="Footer Google Play"
                    size="md"
                    store="android"
                    variant="badge"
                    onClick={() => setAppsOpen("android")}
                  />
                  <StoreCta
                    className="hover:opacity-85"
                    data-ga-event="cta_footer_download"
                    data-ga-label="Footer App Store"
                    size="md"
                    store="ios"
                    variant="badge"
                    onClick={() => setAppsOpen("ios")}
                  />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Persistent mobile download CTA — an always-reachable tap target. When
       *  the route's market has a live app it jumps straight to that App Store
       *  listing (UK site → UK app, US → US app); app-less markets (SE/NL) fall
       *  back to the chooser. Hidden from `md` up, where the footer CTA and
       *  hero suffice.
       *
       *  The button sits in a contained glass capsule — the navbar's material,
       *  inset from the screen edges — rather than over the gradient-and-mask
       *  scrim it used to fade out of: design-language tenet 1 rules out
       *  scrims, and the capsule keeps what scrolls beneath legible the same
       *  way the navbar does. Nothing fixed covers the bottom viewport edge
       *  any more, so iOS 26 Safari tints its toolbar from the page itself
       *  (body background), not from an overlay that had to be kept in step
       *  with THEME_COLOR by hand. Its block — capsule, button, caption,
       *  safe-area — still fits the 7rem reservation on the layout root. */}
      <div
        className={`pointer-events-none fixed bottom-0 inset-x-0 z-40 md:hidden transition-[opacity,transform,visibility] duration-300 ease-out ${hideMobileCta || bannerOwnsInstallCta ? "hidden" : ""} ${
          // Slid away, not removed: it comes back the moment the suppressing
          // surface scrolls off, and a button that pops in is worse than one
          // that returns. `invisible` so the slid-away button can't be tapped
          // through the gap.
          floatingCtaSuppressed ? "invisible translate-y-6 opacity-0" : ""
        }`}
      >
        <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className={`pointer-events-auto rounded-card p-2.5 ${glass()}`}>
            {directAppUrl ? (
              // Live-app market (UK/US): lead with the offer, not the mechanic —
              // "Start your free trial" converts better than "Download the app".
              <StoreCta
                block
                data-ga-event="cta_floating_trial"
                data-ga-label="Floating mobile CTA"
                href={directAppUrl}
                size="lg"
              >
                <span>{t.startTrial}</span>
              </StoreCta>
            ) : (
              // App-less market: no trial to offer. A coming-soon market opens
              // its modal (UK/US apps + waitlist); anything else the chooser.
              <StoreCta
                block
                data-ga-event="cta_floating_download_chooser"
                data-ga-label="Floating mobile CTA"
                size="lg"
                onClick={() =>
                  comingSoonApp ? setComingSoonOpen(true) : setAppsOpen("auto")
                }
              >
                <span>Download the app</span>
              </StoreCta>
            )}
            <p className="mt-2 text-center text-caption text-foreground/55">
              {directAppUrl
                ? t.floatingTrialNote
                : comingSoonApp
                  ? `The ${comingSoonApp} app is coming soon.`
                  : "Start your 7-day free trial."}
            </p>
          </div>
        </div>
      </div>

      <AppComingSoonModal
        marketId={floatMarketId}
        open={comingSoonOpen}
        placement="Floating mobile CTA"
        onClose={() => setComingSoonOpen(false)}
      />

      <LegalDrawer page={legalPage} onClose={closeLegal} />

      <MarketChooserModal
        choices={FOLLOW_CHOICES}
        open={followOpen}
        subtitle="Each account posts the trades for its own markets."
        title="Choose who you want to follow"
        onClose={() => setFollowOpen(false)}
      />

      <MarketChooserModal
        choices={buildAppChoices(
          platform,
          appsOpen === "auto" || appsOpen === false ? null : appsOpen,
        )}
        open={appsOpen !== false}
        // Named explicitly on the Play route, because that's the list where
        // rows are greyed out (only the UK flavour is on Play today) and an
        // unexplained "Coming soon" reads as broken rather than honest.
        subtitle={
          appsOpen === "android"
            ? "Get it on Google Play. The UK app is live today."
            : "Get the app for your market."
        }
        title="Download the ddbx app"
        onClose={() => setAppsOpen(false)}
      />
    </div>
  );
}

/** The footer's internal link columns.
 *
 *  Before this the footer had no content links at all, so every page on the
 *  site linked onward only through the navbar — which meant several hundred
 *  company pages were reachable from exactly one index page, and the sitemap
 *  was carrying discovery on its own. Links in a site-wide footer are the
 *  cheapest fix for that: they cost no new URLs and they reach every page.
 *
 *  The link set is market-aware and comes from lib/site-nav.ts rather than
 *  being written here, because the related-links blocks on the new landing
 *  pages need the same graph. Rendered as real anchors — the legal links below
 *  are <button> drawer triggers, which is right for a drawer but means a
 *  crawler sees no href for them at all.
 */
function FooterNav() {
  const { pathname } = useLocation();
  const groups = footerGroups(
    pathname,
    typeof window === "undefined" ? undefined : window.location.hostname,
  );

  return (
    <nav
      aria-label="Footer"
      className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:flex lg:min-w-0 lg:flex-1 lg:justify-between lg:gap-x-12"
    >
      {/* Whitespace, not rules. The columns were separated by hairlines on the
          argument that a footer is an index and rules say "columns of a table"
          — but the rows wrap at three widths, so keeping the rule off whichever
          column starts a row took a stack of nth-child overrides, and what
          landed on screen was a half-height line beside a two-link column and
          a full-height one beside an eight-link column. Ragged rules read as a
          bug. Gaps do the same separating job at every width and need no
          exceptions. */}
      {groups.map((group) => (
        <div key={group.title}>
          <h2 className="text-body font-semibold text-foreground/85">
            {group.title}
          </h2>
          <ul className="mt-3 space-y-2">
            {group.links.map((link) => (
              <li key={link.href + link.label}>
                <a
                  className="text-body text-foreground/65 transition-colors hover:text-foreground"
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
