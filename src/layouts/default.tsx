import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AU, CA, EU, GB, US } from "country-flag-icons/react/3x2";

import { AppDrawer } from "@/components/app-drawer";
import { Navbar } from "@/components/navbar";
import { AppStoreBadgeImg } from "@/components/app-store-badge";
import {
  MarketChooserModal,
  type MarketChoice,
} from "@/components/market-chooser-modal";
import { APP_CHOICES } from "@/lib/app-store";
import { marketContactEmail } from "@/lib/markets/registry";

type LegalPage = "privacy" | "cookies" | "terms" | "contact" | null;

/** Per-market X (Twitter) accounts, surfaced in the "who to follow" chooser.
 *  The same MarketChooserModal pattern drives the app-store chooser — see
 *  `APP_CHOICES` in `@/lib/app-store`. */
const FOLLOW_CHOICES: MarketChoice[] = [
  {
    id: "uk",
    Flag: GB,
    label: "ddbx.uk",
    description: "UK director dealings · @ddbxuk",
    href: "https://x.com/ddbxuk",
  },
  {
    id: "us",
    Flag: US,
    label: "ddbx.us",
    description: "US insiders & Congress · @ddbxus",
    href: "https://x.com/ddbxus",
  },
  { id: "eu", Flag: EU, label: "ddbx.eu", description: "Europe", comingSoon: true },
  { id: "au", Flag: AU, label: "ddbx.au", description: "Australia", comingSoon: true },
  { id: "ca", Flag: CA, label: "ddbx.ca", description: "Canada", comingSoon: true },
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
        processing of network-level data. If you accept the cookie banner, we
        also load Google Analytics 4 (aggregate usage statistics) and the X
        (Twitter) Ads conversion pixel (to measure ad-driven installs) — see
        the Cookie Policy for details.
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
        If you click <strong>&quot;Agree to cookies&quot;</strong> on the
        banner, we load the following scripts. Until you agree, none of them
        are loaded and no cookies are set by them.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Google Analytics 4</strong> — aggregate usage statistics
          (which pages are viewed, roughly where visitors come from).
        </li>
        <li>
          <strong>X (Twitter) conversion pixel</strong> — measures whether
          visitors arriving from X ads go on to install the iOS app or sign
          up. Loaded from <code>static.ads-twitter.com</code>.
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
        By accessing and using ddbx (&quot;the Service&quot;, whether at ddbx.uk,
        ddbx.us, or in the ddbx mobile apps), you agree to be bound by these
        Terms &amp; Conditions. If you do not agree, please do not use the
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
        The ddbx apps let users post comments and other content
        (&quot;user content&quot;) and interact with other users. There is zero
        tolerance for objectionable content or abusive behaviour. By posting,
        you agree not to submit content that is unlawful, harassing,
        threatening, hateful, defamatory, obscene, or otherwise objectionable,
        and not to abuse, harass, or impersonate other users.
      </p>
      <p>
        You can report objectionable content and block abusive users from
        within the apps. We review reports and remove objectionable content,
        ejecting users who post it, within 24 hours. We may remove any user
        content and suspend or terminate any account at our discretion. You are
        solely responsible for the content you post. To report content or a
        user, use the in-app report and block controls or contact us at{" "}
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
}: {
  children: React.ReactNode;
  drawerRight?: boolean;
  ticker?: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [followOpen, setFollowOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const legalPage = pathToLegalPage(location.pathname);
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
      className={`relative flex flex-col min-h-screen bg-[#f5f0e8] dark:bg-background ${drawerRight ? "lg:mr-80" : ""}`}
    >
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
      <main className="mx-auto w-full max-w-[1280px] px-4 md:px-6 flex-grow pt-8">
        {children}
      </main>
      <footer className="w-full border-t border-separator bg-surface/60">
        <div className="mx-auto w-full max-w-[1280px] px-4 md:px-6 py-5 text-[10px] leading-4 text-foreground/40">
          <div className="flex items-center mb-4">
            <img
              alt="ddbx"
              className="h-5 max-w-[56px] opacity-30 dark:invert"
              src="/logo.svg"
            />
          </div>
          <p>
            Disclaimer: The information, ratings, signals, commentary, and any
            related content provided on this website are for general
            informational and educational purposes only and are not intended to
            be financial advice, investment advice, tax advice, legal advice, or
            a recommendation to buy, sell, or hold any security or financial
            instrument.
          </p>
          <p className="mt-2">
            Nothing on this site constitutes personal advice or takes account of
            your individual objectives, financial situation, risk tolerance, or
            needs. You should always conduct your own research and, where
            appropriate, seek advice from a qualified and regulated financial
            professional before making any investment decision.
          </p>
          <p className="mt-2">
            Past performance, hypothetical performance, and model outputs are
            not reliable indicators of future results. Market conditions can
            change rapidly, data may be delayed or incomplete, and no guarantee
            is made as to the accuracy, completeness, or timeliness of any
            content provided.
          </p>
          <p className="mt-2">
            By using this website, you acknowledge that any reliance on the
            information is at your own risk and that the operators, authors, and
            contributors of this site are not liable for any direct, indirect,
            incidental, or consequential loss arising from use of, or reliance
            on, the content.
          </p>
          <p className="mt-2">
            This site is not an offer or solicitation in any jurisdiction where
            such offer or solicitation would be unlawful. Investing involves
            risk, including the possible loss of capital.
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
          {/* Legal links + social/app links */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-separator/50">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              {LEGAL_LINKS.map(({ label, page, path }) => (
                <button
                  key={page}
                  className="text-foreground/40 hover:text-foreground/70 transition-colors underline underline-offset-2 text-left"
                  onClick={() => openLegal(path)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button
                aria-label="Follow on X (Twitter)"
                className="flex items-center gap-1.5 text-foreground/40 hover:text-foreground/70 transition-colors"
                type="button"
                onClick={() => setFollowOpen(true)}
              >
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5 fill-current shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.861L1.254 2.25H8.08l4.257 5.625zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                aria-label="Download the app"
                className="inline-block opacity-80 hover:opacity-100 transition-opacity"
                type="button"
                onClick={() => setAppsOpen(true)}
              >
                <AppStoreBadgeImg size="sm" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      <LegalDrawer page={legalPage} onClose={closeLegal} />

      <MarketChooserModal
        choices={FOLLOW_CHOICES}
        open={followOpen}
        subtitle="Each account posts the trades for its own markets."
        title="Choose who you want to follow"
        onClose={() => setFollowOpen(false)}
      />

      <MarketChooserModal
        choices={APP_CHOICES}
        open={appsOpen}
        subtitle="Get the app for your market."
        title="Download the ddbx app"
        onClose={() => setAppsOpen(false)}
      />
    </div>
  );
}
