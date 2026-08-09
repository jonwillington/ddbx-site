import { Route, Routes } from "react-router-dom";

import { BetaTag } from "@/components/market/beta-tag";
import { CookieBanner } from "@/components/cookie-banner";
import { DocumentTitle } from "@/components/document-title";
import { ScrollToTop } from "@/components/scroll-to-top";
import AccountDeletionPage from "@/pages/account-deletion";
import ApiPage from "@/pages/api";
import BiggestBuysPage from "@/pages/biggest-buys";
import BrokerCategoryPage from "@/pages/broker-category";
import BrokerComparisonPage from "@/pages/broker-comparison";
import BrokerDetailPage from "@/pages/broker-detail";
import CompaniesPage from "@/pages/companies";
import CompanyPage from "@/pages/company";
import ComparePage from "@/pages/compare";
import DownloadPage from "@/pages/download";
import FilingPage from "@/pages/filing";
import WeeklyWeekPage, { WeeklyIndexPage } from "@/pages/weekly";
import HowItWorksPage from "@/pages/how-it-works";
import LearnEntryPage, { LearnIndexPage } from "@/pages/learn";
import ReportPage from "@/pages/report";
import SectorPage from "@/pages/sector";
import SectorsPage from "@/pages/sectors";
import StatusPage from "@/pages/status";
import ReportsPage from "@/pages/reports";
import DirectorPage from "@/pages/director";
import CongressPreviewPage from "@/pages/congress-preview";
import CongressCommitteePage from "@/pages/congress-committee";
import CongressCommitteesPage from "@/pages/congress-committees";
import CongressMemberPage from "@/pages/congress-member";
import CongressMembersPage from "@/pages/congress-members";
import DjtPreviewPage from "@/pages/djt-preview";
import MarketHomePage from "@/pages/market-home";
import KoreaPreviewPage from "@/pages/korea-preview";
import NetherlandsPreviewPage from "@/pages/netherlands-preview";
import SwedenPreviewPage from "@/pages/sweden-preview";
import UsPreviewPage from "@/pages/us-preview";
import UkPreviewPage from "@/pages/uk-preview";

function App() {
  return (
    <div className="relative">
      <DocumentTitle />
      <ScrollToTop />
      <BetaTag />
      <Routes>
        <Route element={<MarketHomePage />} path="/" />
        {/* Deep-link to a monthly recap, e.g. /report/may-2026. Resolves to the
            UK home (reports are UK-only today) which auto-opens the modal.
            Kept working because shared links point at it; it canonicalises to
            the standalone /reports/:month page rather than competing with it. */}
        <Route element={<MarketHomePage />} path="/report/:month" />
        {/* The archive. The same reports as real, permanently-addressed pages —
            the modal above had no URL of its own to link to or index. */}
        {/* Weekly digests. /weekly is the ARCHIVE INDEX, not "this week" —
            see shared/weeks.js for why there is no undated week page. */}
        <Route element={<WeeklyIndexPage />} path="/weekly" />
        <Route element={<WeeklyWeekPage />} path="/weekly/:week" />
        <Route element={<ReportsPage />} path="/reports" />
        <Route element={<ReportPage />} path="/reports/:month" />
        {/* One disclosure, one permanent URL. Was the UK dashboard, which
            meant every shared filing link landed on the same generic page. */}
        <Route element={<FilingPage />} path="/dealings/:id" />
        {/* The shared-trade link a tweet points at, and the Universal Link iOS
            intercepts before the request leaves the device (see
            public/.well-known/apple-app-site-association). Same filing page in
            share mode, canonicalised to /dealings/:id by functions/t/[id].js.
            The URL shape is fixed: tweets carrying it are already published. */}
        <Route element={<FilingPage share />} path="/t/:id" />
        <Route element={<MarketHomePage />} path="/contact" />
        <Route element={<MarketHomePage />} path="/privacy" />
        <Route element={<MarketHomePage />} path="/cookies" />
        <Route element={<MarketHomePage />} path="/terms" />
        {/* Hidden, unlinked page for app-store account-deletion requirements.
            Deletion itself happens in-app; this just documents the steps. */}
        <Route element={<AccountDeletionPage />} path="/account-deletion" />
        <Route element={<DirectorPage />} path="/directors/:id" />
        <Route element={<DirectorPage />} path="/us/directors/:id" />
        <Route element={<DirectorPage />} path="/se/directors/:id" />
        <Route element={<DirectorPage />} path="/nl/directors/:id" />
        <Route element={<UsPreviewPage />} path="/us-preview" />
        <Route element={<UsPreviewPage />} path="/us" />
        {/* US Congress (STOCK Act) preview — distinct from /directors/:id
            (per-market insider detail). */}
        <Route element={<CongressPreviewPage />} path="/directors" />
        <Route element={<CongressPreviewPage />} path="/congress" />
        {/* Congress directory. Mounted under /congress/members/ and
            /congress/committees/ rather than a bare /congress/:slug, which
            would make the two indexes ambiguous with a member slug and would
            force the Pages Function at functions/congress/[slug].js to
            disambiguate them by shape. Two explicit prefixes, two Function
            directories, no ambiguity. */}
        <Route element={<CongressMembersPage />} path="/congress/members" />
        <Route
          element={<CongressMemberPage />}
          path="/congress/members/:slug"
        />
        <Route
          element={<CongressCommitteesPage />}
          path="/congress/committees"
        />
        <Route
          element={<CongressCommitteePage />}
          path="/congress/committees/:slug"
        />
        <Route element={<DjtPreviewPage />} path="/djt" />
        <Route element={<SwedenPreviewPage />} path="/se-preview" />
        <Route element={<SwedenPreviewPage />} path="/se" />
        <Route element={<NetherlandsPreviewPage />} path="/nl-preview" />
        <Route element={<NetherlandsPreviewPage />} path="/nl" />
        <Route element={<KoreaPreviewPage />} path="/kr-preview" />
        <Route element={<KoreaPreviewPage />} path="/kr" />
        <Route element={<UkPreviewPage />} path="/uk-preview" />
        {/* Broker comparison + affiliate directory (UK). Always public. */}
        {/* Conversion-focused app-install landing pages. Public, ungated.
            Market is resolved inside the page (host- + path-aware): /download
            follows the host (ddbx.us -> US), /us/download forces US anywhere.
            Platform is sniffed on the bare route and FORCED on the /ios and
            /android variants — ad campaigns and store-specific SEO need a URL
            that always shows the same store, whatever device opens it. */}
        <Route element={<DownloadPage />} path="/download" />
        <Route element={<DownloadPage platform="ios" />} path="/download/ios" />
        <Route
          element={<DownloadPage platform="android" />}
          path="/download/android"
        />
        <Route element={<DownloadPage />} path="/us/download" />
        <Route
          element={<DownloadPage platform="ios" />}
          path="/us/download/ios"
        />
        <Route
          element={<DownloadPage platform="android" />}
          path="/us/download/android"
        />
        {/* Traditional Chinese edition of the UK install pages, for a Hong
            Kong audience. The prefix is the ONLY language selector — no
            Accept-Language sniff, so the URL is stable for crawlers and
            shareable by the reader. UK app only: there is no Chinese US
            edition, and the page falls back to English rather than rendering
            English prose in a zh-HK document if one is ever reached on
            ddbx.us. See src/lib/download/copy.tsx. */}
        <Route element={<DownloadPage />} path="/zh-hk/download" />
        <Route
          element={<DownloadPage platform="ios" />}
          path="/zh-hk/download/ios"
        />
        <Route
          element={<DownloadPage platform="android" />}
          path="/zh-hk/download/android"
        />
        {/* Developer API product page. Cross-market by construction — one
            page, no market prop, no discretion gating.
            /developers is canonical; /api is an alias that 301s to it at the
            edge (public/_redirects). Both are routed here so a client-side
            navigation to either resolves without a round trip. /api can't be
            canonical: it collides with the same-origin API prefix (the vite
            dev proxy forwards /api/* to wrangler) and would foreclose ever
            proxying the worker under this origin. */}
        <Route element={<ApiPage />} path="/developers" />
        <Route element={<ApiPage />} path="/api" />
        {/* Cross-market, like /api: the API it probes is the same one behind
            every domain, so ddbx.us/status and ddbx.eu/status render the same
            page and canonicalise to ddbx.uk/status. */}
        <Route element={<StatusPage />} path="/status" />
        <Route element={<ComparePage />} path="/compare" />
        <Route element={<ComparePage />} path="/brokers" />
        {/* Category and head-to-head landing pages sit one level below
            /brokers/:slug so they can't be mistaken for a platform review —
            both by the router (a static segment outranks a dynamic one) and by
            the Pages Functions, which route on directory structure and would
            otherwise need a single Function handling all three page types. */}
        <Route
          element={<BrokerCategoryPage />}
          path="/brokers/best-for/:category"
        />
        <Route
          element={<BrokerComparisonPage />}
          path="/brokers/compare/:pair"
        />
        <Route element={<BrokerDetailPage />} path="/brokers/:slug" />
        {/* Company pages. The market comes from the domain (ddbx.uk serves UK
            issuers, ddbx.us US ones) and the LSE ".L" suffix is dropped, so
            MTLN.L is ddbx.uk/company/mtln. functions/company/[key].js
            pre-renders the same content for crawlers before this mounts. */}
        <Route element={<CompaniesPage />} path="/companies" />
        <Route element={<CompanyPage />} path="/company/:key" />
        {/* Sector hubs — the layer between /companies (one flat index of
            several hundred issuers) and the company pages themselves. */}
        {/* Biggest-buys boards. The rolling board is canonical and the year
            boards are the archive — the other way round would move the
            canonical target every January. */}
        {/* Glossary. Each entry has one owning domain (see shared/glossary.js)
            so the same text never exists at three URLs across three hosts. */}
        {/* The methodology, with a URL. The full-screen walkthrough on the
            market hero demonstrates the same six checks but is a modal — it
            can't be linked to, shared or indexed. Both read from
            src/lib/methodology.ts. */}
        <Route element={<HowItWorksPage />} path="/how-it-works" />
        <Route element={<LearnIndexPage />} path="/learn" />
        <Route element={<LearnEntryPage />} path="/learn/:slug" />
        <Route element={<BiggestBuysPage />} path="/biggest-buys" />
        <Route element={<BiggestBuysPage />} path="/biggest-buys/:year" />
        <Route element={<SectorsPage />} path="/sectors" />
        <Route element={<SectorPage />} path="/sectors/:slug" />
      </Routes>
      <CookieBanner />
    </div>
  );
}

export default App;
