// Masthead shape — the floating top bar (production) or an experimental left
// sidebar, which only ever takes over from xl (1280px) up. Below that the top
// bar and its mobile sheet stay exactly as they are.
//
// Toggle precedence (highest wins), same shape as discretion mode:
//   1. URL: `?nav=sidebar|top|reset` (reset clears the override)
//   2. localStorage: `ddbx.nav.override` (written by the URL param)
//   3. Build-time env: VITE_NAV_MODE=sidebar (code default `top`)

export type NavMode = "top" | "sidebar";

const OVERRIDE_KEY = "ddbx.nav.override";

function isMode(v: string | null | undefined): v is NavMode {
  return v === "top" || v === "sidebar";
}

function resolveNavMode(): NavMode {
  const env = import.meta.env.VITE_NAV_MODE as string | undefined;
  const envDefault: NavMode = isMode(env) ? env : "top";

  if (typeof window === "undefined") return envDefault;

  try {
    const urlMode = new URLSearchParams(window.location.search).get("nav");

    if (isMode(urlMode)) {
      window.localStorage.setItem(OVERRIDE_KEY, urlMode);

      return urlMode;
    }
    if (urlMode === "reset") window.localStorage.removeItem(OVERRIDE_KEY);
    const stored = window.localStorage.getItem(OVERRIDE_KEY);

    if (isMode(stored)) return stored;
  } catch {
    // localStorage unavailable — fall through to the env default.
  }

  return envDefault;
}

export const NAV_MODE = resolveNavMode();
export const NAV_SIDEBAR = NAV_MODE === "sidebar";

// The sticky offsets across the site read --nav-h / --nav-clear. With no bar
// across the top they have nothing to clear, so globals.css zeroes them under
// this class at the sidebar's breakpoint.
if (typeof document !== "undefined" && NAV_SIDEBAR) {
  document.documentElement.classList.add("nav-sidebar");
}
