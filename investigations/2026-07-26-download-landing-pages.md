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

None exist yet. Every screen slot renders a styled placeholder until the file
lands — the page is designed to ship first and light up file-by-file.

```
public/app-shots/<market>/<platform>/<slot>.png
  market   uk | us
  platform ios | android
  slot     today | alert | analysis | performance | lockscreen
```

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

**Two known limits:**

- **Tabs need taps on iOS.** `simctl` has no tap command and driving the
  Simulator via AppleScript needs Accessibility permission. The deep link only
  reaches a deal detail, so `performance` / `alert` on iOS need either that
  permission granted or a small extension of the existing `-ddbx-deeplink` hook
  in `ddbx-ios-app` to accept a tab name. Android taps freely via
  `adb shell input tap`.
- **`today` needs a weekday.** At a weekend both apps show "Markets closed for
  the weekend", which is a poor hero shot. Capture during UK market hours.

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
