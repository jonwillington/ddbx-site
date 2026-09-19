// Hidden, unlinked page outlining how users delete their account. Account
// deletion happens in-app (iOS/Android); this page exists to satisfy app-store
// requirements for a publicly reachable deletion-instructions URL. It is not
// added to the navbar or footer LEGAL_LINKS, so it's only reachable directly.
//
// On the SEO shell for its header and sections (2026-09-19), with the rail
// section variant: three short answers read as a document, not as three
// display-scale headlines. No terminal band — this is a compliance page for
// people leaving, not a selling surface.
import DefaultLayout from "@/layouts/default";
import { SeoPageShell } from "@/components/seo/page-shell";
import { SeoSection } from "@/components/seo/section";

const PROSE = "space-y-4 text-body text-foreground/70";

export default function AccountDeletionPage() {
  return (
    <DefaultLayout>
      <SeoPageShell
        eyebrow="Account"
        standfirst="You can delete your DDBX account and all associated data at any time from within the app. Deletion is permanent and cannot be undone."
        title="Account deletion"
      >
        <div className="mt-10 border-b border-rule">
          <SeoSection title="How to delete your account" variant="rail">
            <div className={PROSE}>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open the DDBX app on your device.</li>
                <li>
                  Go to <strong>Settings</strong> (the gear or profile icon).
                </li>
                <li>
                  Tap <strong>Account</strong>, then{" "}
                  <strong>Delete account</strong>.
                </li>
                <li>Confirm when prompted.</li>
              </ol>
              <p>
                Once confirmed, your account is removed immediately and you are
                signed out.
              </p>
            </div>
          </SeoSection>

          <SeoSection title="What gets deleted" variant="rail">
            <div className={PROSE}>
              <p>
                Deleting your account permanently removes the data tied to it,
                including your sign-in identity, saved preferences, and any
                watchlist or follow settings. This action cannot be reversed.
              </p>
              <p>
                Aggregated or anonymised data that cannot be linked back to you,
                and records we are required to retain for legal or accounting
                reasons (for example, in-app purchase receipts held by Apple or
                Google), may be kept for the period required by law.
              </p>
            </div>
          </SeoSection>

          <SeoSection title="If you can’t access the app" variant="rail">
            <p className={PROSE}>
              If you&apos;re unable to open the app to delete your account,
              email us at{" "}
              <a
                className="text-foreground/90 underline underline-offset-2 hover:text-foreground"
                href="mailto:trades@ddbx.uk"
              >
                trades@ddbx.uk
              </a>{" "}
              from the address linked to your account and we&apos;ll process the
              deletion for you.
            </p>
          </SeoSection>
        </div>
      </SeoPageShell>
    </DefaultLayout>
  );
}
