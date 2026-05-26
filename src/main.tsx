import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";

import { bootstrapAnalytics } from "@/lib/cookie-consent";
import "@/styles/globals.css";

// GA4 loads on every visit (no consent gate). Runs before React mounts so
// gtag is defined when DocumentTitle fires the initial page_view.
bootstrapAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider>
        <App />
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
