import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AU, CA, EU, GB, US } from "country-flag-icons/react/3x2";

import { AppDrawer } from "@/components/app-drawer";
import { StoreGlyph } from "@/components/store-glyph";
import { Navbar } from "@/components/navbar";
import { StoreBadgeImg } from "@/components/app-store-badge";
import {
  MarketChooserModal,
  type MarketChoice,
} from "@/components/market-chooser-modal";
import {
  buildAppChoices,
  IOS_APP_LOGO_BY_MARKET,
  storeUrlForMarketId,
} from "@/lib/app-store";
import { useDevicePlatform } from "@/lib/use-device-platform";
import { BUTTON_FILLED, BUTTON_RADIUS } from "@/components/button";
import { marketContactEmail, marketForPath } from "@/lib/markets/registry";
import { footerGroups } from "@/lib/site-nav";
import { FooterTrail } from "@/components/footer-trail";
import { setRailPresent } from "@/lib/rail-presence";

/** Shared styling for the floating mobile download CTA — solid pill, rendered
 *  as an `<a>` (direct App Store link) or a `<button>` (chooser fallback). */
const DOWNLOAD_CTA_CLASS = `pointer-events-auto flex w-full items-center justify-center gap-2.5 ${BUTTON_RADIUS} ${BUTTON_FILLED} px-5 py-4 text-base font-semibold shadow-lg transition-colors`;

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
    <h3 className="text-sm font-semibold text-foreground/90 mt-6 mb-2">
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
      <p>Last updated: 1 April 2026</p>
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
        processing of network-level data. We use Google Analytics 4 in
        cookieless consent mode — it sets no cookies and stores no identifiers
        unless you accept the cookie banner. Accepting also loads the X
        (Twitter) Ads conversion pixel (to measure ad-driven installs) — see the
        Cookie Policy for details.
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
      <p>Last updated: 1 April 2026</p>
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
          <strong>Cloudflare security cookies</strong> — set by our hosting
          provider to identify trusted traffic and protect against malicious
          visitors.
        </li>
        <li>
          <strong>Local preferences</strong> — small <code>localStorage</code>{" "}
          entries remembering things like your selected theme, market, and which
          deal cards you have opened today. These never leave your browser.
        </li>
      </ul>

      <SectionTitle>Analytics &amp; marketing (requires consent)</SectionTitle>
      <p>
        Until you click <strong>&quot;Agree to cookies&quot;</strong> on the
        banner, no analytics or marketing cookies are set on your device.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Google Analytics 4</strong> — aggregate usage statistics
          (which pages are viewed, roughly where visitors come from). Before you
          agree it runs in Google&apos;s cookieless consent mode: it sets no
          cookies and stores no identifiers. Agreeing enables its analytics
          cookies.
        </li>
        <li>
          <strong>X (Twitter) conversion pixel</strong> — measures whether
          visitors arriving from X ads go on to install the app or sign up. Not
          loaded at all until you agree. Loaded from{" "}
          <code>static.ads-twitter.com</code>.
        </li>
      </ul>
      <p>
        We do not use display-advertising cookies, retargeting networks, or
        cross-site tracking beyond the conversion pixel above.
      </p>

      <SectionTitle>Changing your mind</SectionTitle>
      <p>
        Cleared site data or a fresh browser will show the banner again. To
        re-trigger it on the same browser, visit any page with{" "}
        <code>?cookies=reset</code> appended to the URL.
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
}: {
  children: React.ReactNode;
  drawerRight?: boolean;
  ticker?: React.ReactNode;
  /** Suppress the floating mobile "Download app" CTA — used on pages that
   *  have their own primary mobile action (e.g. the broker "Visit" bar). */
  hideMobileCta?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Tell globally-mounted overlays (cookie banner) whether this page reserves
  // the fixed right rail, so they can centre within the content column.
  useEffect(() => {
    setRailPresent(Boolean(drawerRight));

    return () => setRailPresent(false);
  }, [drawerRight]);

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
  // Direct store link for the market that owns this route + the visitor's
  // device, so the mobile floating CTA jumps straight to the right listing
  // (iOS → App Store, Android → Play) instead of opening the chooser.
  // Undefined — app-less markets (SE/NL on iOS) and platforms with no
  // truthful listing (US on Android) — falls back to the chooser, which
  // shows honest per-market availability.
  const directAppUrl = storeUrlForMarketId(
    marketForPath(
      location.pathname,
      typeof window === "undefined" ? undefined : window.location.hostname,
    ).id,
    platform,
  );
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
      className={`relative flex flex-col min-h-screen overflow-x-clip bg-[#f5f0e8] dark:bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0 ${drawerRight ? "lg:mr-80" : ""}`}
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
      <div className="sticky top-0 z-40">
        <Navbar />
        {ticker && (
          <div className="w-full border-b border-separator/50 bg-[#f5f0e8]/90 dark:bg-background/80 backdrop-blur-lg">
            <div className="mx-auto max-w-[1280px] px-4 md:px-6 flex items-stretch">
              {ticker}
            </div>
          </div>
        )}
      </div>
      {/* tabIndex -1 so the skip link actually moves focus here rather than
          only moving the scroll position; scroll-mt clears the sticky header,
          which would otherwise cover the top of what we just jumped to. */}
      <main
        className="mx-auto w-full max-w-[1280px] px-4 md:px-6 flex-grow pt-8 scroll-mt-24 outline-none"
        id="main"
        tabIndex={-1}
      >
        {children}
      </main>
      {/* The footer is a raised sheet on the page, not a band ruled off from it:
          a bordered box inside the content column, with the perspective grid
          running away underneath. The box's own edge and shadow do the
          separating the old full-width `border-t` did, and the grid gives the
          bottom of the page a horizon to end on. The wrapper's bottom padding
          is the grid's room — FooterTrail pins itself to the bottom of this
          <footer>, so the two heights are deliberately the same pair. */}
      <footer className="relative w-full pt-14 pb-28 md:pt-20 md:pb-56">
        <FooterTrail />
        <div className="relative mx-auto w-full max-w-[1280px] px-4 md:px-6">
          <div className="rounded-2xl border border-hairline bg-sheet px-5 py-8 md:px-8 md:py-10 shadow-[0_18px_44px_-28px_rgba(90,65,40,0.45),0_1px_2px_rgba(90,65,40,0.03)] text-[10px] leading-4 text-foreground/40 dark:border-white/[0.07] dark:bg-surface dark:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)]">
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
                  className="h-7 max-w-[90px] opacity-40 dark:invert"
                  src="/logo.svg"
                />
              </div>
              <FooterNav />
            </div>

            <p>
              Disclaimer: The information, ratings, signals, commentary, and any
              related content provided on this website are for general
              informational and educational purposes only and are not intended
              to be financial advice, investment advice, tax advice, legal
              advice, or a recommendation to buy, sell, or hold any security or
              financial instrument.
            </p>
            <p className="mt-2">
              Nothing on this site constitutes personal advice or takes account
              of your individual objectives, financial situation, risk
              tolerance, or needs. You should always conduct your own research
              and, where appropriate, seek advice from a qualified and regulated
              financial professional before making any investment decision.
            </p>
            <p className="mt-2">
              Past performance, hypothetical performance, and model outputs are
              not reliable indicators of future results. Market conditions can
              change rapidly, data may be delayed or incomplete, and no
              guarantee is made as to the accuracy, completeness, or timeliness
              of any content provided.
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
                      className="text-foreground/40 hover:text-foreground/70 transition-colors underline underline-offset-2 text-left"
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
                  className="text-foreground/40 hover:text-foreground/70 transition-colors underline underline-offset-2"
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
                  className="text-foreground/40 hover:text-foreground/70 transition-colors underline underline-offset-2"
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
                  className="flex items-center text-foreground/40 hover:text-foreground/70 transition-colors"
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
              <div className="flex items-center gap-4">
                <button
                  aria-label="Get it on Google Play"
                  className="inline-block opacity-80 hover:opacity-100 transition-opacity"
                  data-ga-event="cta_footer_download"
                  data-ga-label="Footer Google Play"
                  type="button"
                  onClick={() => setAppsOpen("android")}
                >
                  <StoreBadgeImg size="sm" store="android" />
                </button>
                <button
                  aria-label="Download on the App Store"
                  className="inline-block opacity-80 hover:opacity-100 transition-opacity"
                  data-ga-event="cta_footer_download"
                  data-ga-label="Footer App Store"
                  type="button"
                  onClick={() => setAppsOpen("ios")}
                >
                  <StoreBadgeImg size="sm" store="ios" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Persistent mobile download CTA — an always-reachable tap target. When
       *  the route's market has a live app it jumps straight to that App Store
       *  listing (UK site → UK app, US → US app); app-less markets (SE/NL) fall
       *  back to the chooser. The button floats over a transparent blur that
       *  fades into the page (no hard bar), so content scrolling beneath it
       *  stays legible. Hidden from `md` up, where the footer CTA and hero
       *  suffice. */}
      <div
        className={`pointer-events-none fixed bottom-0 inset-x-0 z-40 md:hidden ${hideMobileCta ? "hidden" : ""}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#f5f0e8]/85 via-[#f5f0e8]/40 to-transparent dark:from-background/85 dark:via-background/40 backdrop-blur-md [mask-image:linear-gradient(to_top,black_55%,transparent)]"
        />
        <div className="relative px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {directAppUrl ? (
            // Live-app market (UK/US): lead with the offer, not the mechanic —
            // "Start your free trial" converts better than "Download the app".
            <a
              className={DOWNLOAD_CTA_CLASS}
              data-ga-event="cta_floating_trial"
              data-ga-label="Floating mobile CTA"
              href={directAppUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <StoreGlyph className="h-5 w-5 shrink-0" />
              <span>Start your free trial</span>
            </a>
          ) : (
            // App-less market (SE/NL): no trial to offer — opens the chooser.
            <button
              className={DOWNLOAD_CTA_CLASS}
              data-ga-event="cta_floating_download_chooser"
              data-ga-label="Floating mobile CTA"
              type="button"
              onClick={() => setAppsOpen("auto")}
            >
              <StoreGlyph className="h-5 w-5 shrink-0" />
              <span>Download the app</span>
            </button>
          )}
          <p className="pointer-events-none mt-2 text-center text-xs text-foreground/55">
            {directAppUrl
              ? "Free for 7 days, cancel any time. On iOS and Android."
              : "Start your 7-day free trial."}
          </p>
        </div>
      </div>

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
            ? "Get it on Google Play — the UK app is live today."
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
      className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:min-w-0 lg:flex-1 lg:grid-cols-5"
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
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
            {group.title}
          </h2>
          <ul className="mt-2.5 space-y-1.5">
            {group.links.map((link) => (
              <li key={link.href + link.label}>
                <a
                  className="text-[11.5px] leading-4 text-foreground/45 transition-colors hover:text-foreground/75"
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
