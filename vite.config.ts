import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    proxy: {
      // Wrangler dev listens on 8787 by default.
      //
      // Regex (a leading ^ makes vite treat the key as a RegExp) so this
      // matches /api/dealings but NOT the bare /api route, which is a PAGE in
      // this app (the developer-API product page, canonical at /developers).
      // With the old "/api" prefix key the page 500'd in dev, proxied to a
      // wrangler that usually isn't running.
      "^/api/": "http://localhost:8787",
      // US scrape preview during the multi-market spike — see
      // investigations/multi-market/form4-mapping.md.
      "/__us-": "http://localhost:8787",
      // EU spike (Sweden FI today) — dry-run preview at /eu-preview.
      "/__eu-": "http://localhost:8787",
    },
  },
});
