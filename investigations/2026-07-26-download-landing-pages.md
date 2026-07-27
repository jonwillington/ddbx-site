# Download landing pages — per-market, per-platform

_2026-07-26_

## What shipped

Six routes, from two previously (`/download`, `/us/download`):

| Route | Market | Platform | Store |
|---|---|---|---|
| `/download` | UK | sniffed (iOS on desktop) | App Store / Play |
| `/download/ios` | UK | forced iOS | App Store |
| `/download/android` | UK | forced Android | Google Play |
| `/us/download` | US | sniffed | App Store |
| `/us/download/ios` | US | forced iOS | App Store |
| `/us/download/android` | US | forced Android | **none yet** — see below |

The bare route sniffs the device (`useDevicePlatform`) and falls back to iOS on
desktop. The `/ios` and `/android` routes force one, because store-specific ad
campaigns and "ddbx android app" searches need a URL that shows the same store
whatever device opens it. Market still resolves via `marketForPath`, so
`ddbx.us/download` is the US page with no `/us` prefix.

`/us/download/android` runs in "not on this store yet" mode: the US flavour is
in Play internal testing only (`PLAY_STORE_URLS` has no `us` key). The hero CTA
is replaced by `StoreUnavailable`, which explains the situation and offers the
two things that CAN be installed today (ddbx US on iPhone, ddbx UK on Play).
**Delete that branch the moment the US Play listing goes live** — it disappears
on its own once `PLAY_STORE_URLS.us` exists.

## Page structure

1. **Hero** (`download-hero.tsx`) — the market hero's lit stage, reusing
   `HeroDealMapLayer` + `useDealRadar` directly, with a code-drawn phone on the
   right and the live notification stack sitting on it like a banner over a
   running app.
2. **Stat band** — three numbers derived from the same feed the winners come
   from. Nothing hand-typed; a tile with a zero value doesn't render.
3. **App tour** (`app-tour.tsx`) — desktop: pinned phone, four copy beats
   scroll past it, screen cross-fades per beat. Mobile: snap carousel.
4. **Winners wall** — unchanged selection logic, restaged with scroll-reveal
   and a count-up on the return.
5. **Pricing + FAQ** — the price stated next to the CTA, plus five objections.
6. **Final CTA** — dark band, store badge, and a QR code on desktop only
   (nobody retypes a URL on their phone).

## Screenshots

They have landed — 27 PNGs, `uk` and `us` × `ios` and `android` × the six
slots the tour renders (`today`, `analysis`, `balance`, `cluster`,
`performance`, `recap`). The styled placeholder is still wired up, but it is
fallback insurance against a missing or renamed file now rather than the
normal case.

```
public/app-shots/<market>/<platform>/<slot>.png
  market   uk | us
  platform ios | android
  slot     today | analysis | balance | cluster | performance | recap
```

`alert.png` exists for most pairs but is never requested: the alert beat
renders the live notification stack instead, because a capture lands whatever
state the simulator was in and a "markets closed for the weekend" screen under
a heading about instant alerts is worse than no screen at all.

Export **screen only** — no device chrome, no rounded corners, no drop shadow.
The bezel is drawn in CSS (`device-frame.tsx`) so the frame can be restyled, or
dark mode changed, without re-exporting anything.

Sizes: iOS 1290×2796 (iPhone 15/16 Pro), Android 1080×2400 (Pixel 8). Only the
aspect ratio actually matters — the frame sizes the screen with `aspect-ratio`.

`lockscreen` is declared but not yet placed on the page; it's there for a
notification-theatre section if we want one.

### Capturing them from the simulators

Both apps are installed and signed in on the local simulators. **Neither
platform needs `idb`** — it's no longer in homebrew-core, and it turned out to
be unnecessary.

**Deep-link straight to a screen — no tapping, no permissions.** The iOS app
already carries a simulator-driving hook (`DdbxApp.swift`, `#if DEBUG`), and
both apps handle the `ddbx.uk/t/{id}` shared-trade link:

```bash
# iOS — deal detail (the `analysis` slot)
xcrun simctl launch booted uk.ddbx.app -ddbx-deeplink d-3c9b8491b70e0873

# Android — same deal, via App Links
adb shell am start -a android.intent.action.VIEW \
  -d "https://ddbx.uk/t/d-3c9b8491b70e0873" uk.ddbx.app
```

Pick an id with a rating from `https://api.ddbx.uk/api/dealings`.

**Clean the chrome before capturing.**

```bash
# iOS — fixed 9:41 clock, full bars, charged battery
xcrun simctl status_bar booted override --time "9:41" \
  --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiMode active --wifiBars 3

# Android — demo-mode status bar + gesture pill instead of the 3-button bar
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb shell cmd overlay enable com.android.internal.systemui.navbar.gestural
```

**Capture** — these land at exactly the manifest sizes:

```bash
xcrun simctl io booted screenshot out.png     # 1206×2622
adb exec-out screencap -p > out.png           # 1080×2400
```

**Theme.** Each app has its own Appearance preference (Settings → Appearance);
the system light/dark setting does NOT drive it. Set both to **Light** so the
phone sits in the site's cream page instead of reading as a black slab.

**Open a tab directly.** `ddbx-ios-app` now carries a `-ddbx-tab` hook
(`ContentView.swift`, DEBUG-only) alongside `-ddbx-deeplink`, because `simctl`
has no tap command:

```bash
xcrun simctl launch booted uk.ddbx.app -ddbx-tab performance
# dashboard | performance | news | congress | search
```

Android needs no equivalent — `adb shell input tap <x> <y>` works freely.

**Notifications.** `simctl push` delivers a real push to the simulator, which is
how the `alert` shots were made. Fire it while the app is FOREGROUNDED: the
banner then lands over the app's own cream UI instead of over the stock iOS
wallpaper, which is aggressively blue and fights the palette.

```bash
cat > push.json <<'JSON'
{ "Simulator Target Bundle": "uk.ddbx.app",
  "aps": { "alert": { "title": "…", "body": "…" }, "sound": "default" } }
JSON
xcrun simctl launch booted uk.ddbx.app && sleep 18
xcrun simctl push booted uk.ddbx.app push.json
```

**Three known limits:**

- **`today` needs a weekday.** At a weekend both apps show "Markets closed for
  the weekend", which is a weak hero. The UK `today` shots currently in the repo
  are that state — re-shoot during UK market hours.
- **Don't launch one market's app straight after the other's.** iOS leaves a
  "◀ ddbx.uk" back-to-app crumb in the status bar. `simctl terminate` both, wait,
  then launch.
- **`us/android/performance` is deliberately absent.** That screen leads with a
  Top Performers card for SaverOne (SVRE) reading "Director bought
  $1,135,938,816" — and the API agrees (`shares: 326,419,200`, `value:
  1135938816` on `f4-0001731122-26-000909-1-0`), so it's an upstream Form 4
  parse problem in ddbx-data, not a render bug. A nano-cap with a $1.1bn
  "director buy" on a marketing page would be fatal to credibility. The same row
  is live on the site and in both apps, and is eligible for this page's winners
  wall.

## Pricing

`src/lib/pricing.ts` is the only place on the public web that states a price.
It's mirrored by hand from `ddbx-ios-app/Subscriptions.storekit`, which is a
LOCAL StoreKit test config on the **USA storefront** — the live per-territory
prices can differ. **Confirm against App Store Connect / Play Console before
trusting it**, and re-check whenever a price changes.

Current values: £/$9.99 monthly, £/$39.99 annual, 7-day introductory trial.

## Things worth knowing

- `.dl-lift` in `globals.css` deliberately sets no `display`. Rules in that file
  are unlayered and beat Tailwind's utilities, so a `dl-lift hidden` element
  would stay visible. Call sites supply the display utility.
- `<Reveal>` hides content until an IntersectionObserver fires. That means
  anything never scrolled to stays at `opacity: 0` — there's a `@media print`
  escape hatch, and full-page screenshot tools will capture the page blank
  below the fold. Scroll-and-capture instead.
- The desktop hero badge is hidden below `md`, where `DefaultLayout`'s floating
  install bar is already on screen. The `StoreUnavailable` block is NOT hidden:
  the floating bar falls back to a different app there, and that needs saying.
