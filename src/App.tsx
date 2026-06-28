import { Route, Routes } from "react-router-dom";

import { BetaTag } from "@/components/market/beta-tag";
import { CookieBanner } from "@/components/cookie-banner";
import { DocumentTitle } from "@/components/document-title";
import AccountDeletionPage from "@/pages/account-deletion";
import BrokerDetailPage from "@/pages/broker-detail";
import ComparePage from "@/pages/compare";
import PerformancePage from "@/pages/performance";
import DirectorPage from "@/pages/director";
import CongressPreviewPage from "@/pages/congress-preview";
import MarketHomePage from "@/pages/market-home";
import NetherlandsPreviewPage from "@/pages/netherlands-preview";
import SwedenPreviewPage from "@/pages/sweden-preview";
import UsPreviewPage from "@/pages/us-preview";
import UkPreviewPage from "@/pages/uk-preview";

function App() {
  return (
    <div className="relative">
      <DocumentTitle />
      <BetaTag />
      <Routes>
        <Route element={<MarketHomePage />} path="/" />
        {/* Deep-link to a monthly recap, e.g. /report/may-2026. Resolves to the
            UK home (reports are UK-only today) which auto-opens the modal. */}
        <Route element={<MarketHomePage />} path="/report/:month" />
        <Route element={<UkPreviewPage />} path="/dealings/:id" />
        <Route element={<MarketHomePage />} path="/contact" />
        <Route element={<MarketHomePage />} path="/privacy" />
        <Route element={<MarketHomePage />} path="/cookies" />
        <Route element={<MarketHomePage />} path="/terms" />
        {/* Hidden, unlinked page for app-store account-deletion requirements.
            Deletion itself happens in-app; this just documents the steps. */}
        <Route element={<AccountDeletionPage />} path="/account-deletion" />
        <Route element={<PerformancePage />} path="/portfolio" />
        <Route element={<PerformancePage />} path="/performance" />
        <Route element={<PerformancePage />} path="/us/performance" />
        <Route element={<PerformancePage />} path="/se/performance" />
        <Route element={<PerformancePage />} path="/nl/performance" />
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
        <Route element={<SwedenPreviewPage />} path="/se-preview" />
        <Route element={<SwedenPreviewPage />} path="/se" />
        <Route element={<NetherlandsPreviewPage />} path="/nl-preview" />
        <Route element={<NetherlandsPreviewPage />} path="/nl" />
        <Route element={<UkPreviewPage />} path="/uk-preview" />
        {/* Broker comparison + affiliate directory (UK). Always public. */}
        <Route element={<ComparePage />} path="/compare" />
        <Route element={<ComparePage />} path="/brokers" />
        <Route element={<BrokerDetailPage />} path="/brokers/:slug" />
      </Routes>
      <CookieBanner />
    </div>
  );
}

export default App;
