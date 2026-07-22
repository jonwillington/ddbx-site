// Hidden, unlinked page outlining how users delete their account. Account
// deletion happens in-app (iOS/Android); this page exists to satisfy app-store
// requirements for a publicly reachable deletion-instructions URL. It is not
// added to the navbar or footer LEGAL_LINKS, so it's only reachable directly.
import DefaultLayout from "@/layouts/default";
import { title } from "@/components/primitives";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground/90 mt-6 mb-2">
      {children}
    </h2>
  );
}

export default function AccountDeletionPage() {
  return (
    <DefaultLayout>
      <section className="py-8 space-y-4 animate-content-in max-w-prose">
        <h1 className={title({ size: "sm" })}>Account deletion</h1>

        <div className="text-sm leading-relaxed text-foreground/70 space-y-4">
          <p>
            You can delete your DDBX account and all associated data at any time
            from within the app. Deletion is permanent and cannot be undone.
          </p>

          <SectionTitle>How to delete your account</SectionTitle>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open the DDBX app on your device.</li>
            <li>
              Go to <strong>Settings</strong> (the gear or profile icon).
            </li>
            <li>
              Tap <strong>Account</strong>, then <strong>Delete account</strong>
              .
            </li>
            <li>Confirm when prompted.</li>
          </ol>
          <p>
            Once confirmed, your account is removed immediately and you are
            signed out.
          </p>

          <SectionTitle>What gets deleted</SectionTitle>
          <p>
            Deleting your account permanently removes the data tied to it,
            including your sign-in identity, saved preferences, and any
            watchlist or follow settings. This action cannot be reversed.
          </p>
          <p>
            Aggregated or anonymised data that cannot be linked back to you, and
            records we are required to retain for legal or accounting reasons
            (for example, in-app purchase receipts held by Apple or Google), may
            be kept for the period required by law.
          </p>

          <SectionTitle>If you can&apos;t access the app</SectionTitle>
          <p>
            If you&apos;re unable to open the app to delete your account, email
            us at{" "}
            <a
              className="text-foreground/90 underline underline-offset-2 hover:text-foreground"
              href="mailto:trades@ddbx.uk"
            >
              trades@ddbx.uk
            </a>{" "}
            from the address linked to your account and we&apos;ll process the
            deletion for you.
          </p>
        </div>
      </section>
    </DefaultLayout>
  );
}
