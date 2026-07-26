#!/usr/bin/env bash
#
# Capture app screenshots for the download / company landing pages.
#
# The pages read PNGs out of public/app-shots/<market>/<platform>/<slot>.png
# (manifest: src/lib/app-screenshots.ts). Anything missing renders a styled
# placeholder, which must never ship — so this exists to make refilling the
# matrix a one-liner rather than an afternoon.
#
# Everything here was worked out by hand once; the point of the script is that
# nobody has to work it out again. In particular:
#
#   - No `idb`. It left homebrew-core and turned out to be unnecessary — the
#     apps carry DEBUG-only launch hooks instead (`-ddbx-tab`, `-ddbx-deeplink`,
#     `-ddbx-scroll`, `-ddbx-sheet`), because `simctl` has no tap command.
#   - Launch arguments of the form `-key value` land in `UserDefaults`, which is
#     how the hooks are read. That's also how the theme is forced to light
#     (`-ddbx.appearance light`) — the app's own Appearance preference does not
#     follow the system setting.
#   - The status bar is overridden to a fixed 9:41 / full bars / charged before
#     every capture, so two shots taken an hour apart still look like a set.
#
# Usage:
#   ./scripts/app-shots.sh doctor                 # what's installed / booted
#   ./scripts/app-shots.sh status                 # coverage matrix
#   ./scripts/app-shots.sh ios uk analysis        # one slot
#   ./scripts/app-shots.sh ios us missing         # every US slot with no PNG
#   ./scripts/app-shots.sh ios uk all             # re-shoot the lot
#   ./scripts/app-shots.sh android uk balance     # same, on the emulator
#   ./scripts/app-shots.sh build us               # rebuild + reinstall the app
#
# Env overrides:
#   SIM=<udid>      target simulator (default: the booted one)
#   IOS_REPO=<path> default ../ddbx-ios-app
#
set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_REPO="${IOS_REPO:-$(cd "$SITE_DIR/.." && pwd)/ddbx-ios-app}"
SHOTS_DIR="$SITE_DIR/public/app-shots"

SLOTS=(today alert analysis balance recap cluster performance)
MARKETS=(uk us)
PLATFORMS=(ios android)

bundle_for() { [[ "$1" == "uk" ]] && echo "uk.ddbx.app" || echo "us.ddbx.app"; }
scheme_for() { [[ "$1" == "uk" ]] && echo "DdbxApp-UK" || echo "DdbxApp-US"; }
product_for() { [[ "$1" == "uk" ]] && echo "ddbx.app" || echo "ddbx-us.app"; }

die() { echo "error: $*" >&2; exit 1; }

sim_udid() {
  if [[ -n "${SIM:-}" ]]; then echo "$SIM"; return; fi
  local udid
  udid=$(xcrun simctl list devices booted -j 2>/dev/null \
    | python3 -c 'import json,sys
d=json.load(sys.stdin)["devices"]
for rt in d.values():
    for dev in rt:
        if "iPhone" in dev.get("name",""):
            print(dev["udid"]); raise SystemExit' 2>/dev/null || true)
  [[ -n "$udid" ]] || die "no booted iPhone simulator. Boot one in Simulator.app, or pass SIM=<udid>."
  echo "$udid"
}

# ---------------------------------------------------------------------------
# Which deal each slot needs.
#
# Picked live from the API rather than hardcoded: a fixed id rots the moment
# the row ages out, and a screenshot of a stale deal is worse than no
# screenshot. Rules per slot, in the same spirit as the capture rules in
# src/lib/app-screenshots.ts — prefer density, prefer real content.
# ---------------------------------------------------------------------------
pick_deal() {
  local market="$1" slot="$2"
  local api="https://api.ddbx.uk/api"
  local url
  if [[ "$market" == "us" ]]; then
    url="$api/us-dealings?view=signal&limit=300"
  else
    url="$api/dealings?limit=300"
  fi
  curl -sS "$url" | SLOT="$slot" MARKET="$market" python3 -c '
import json, os, sys
slot, market = os.environ["SLOT"], os.environ["MARKET"]
payload = json.load(sys.stdin)
rows = payload.get("dealings", payload if isinstance(payload, list) else [])

def analysis(r):
    return r.get("analysis") or {}

def both_sides(r):
    a = analysis(r)
    return len(a.get("evidence_for") or a.get("thesis_points") or []) and len(a.get("evidence_against") or [])

def cluster_n(r):
    return (r.get("cluster") or {}).get("count") or 0

if slot == "cluster":
    # Densest cluster on the feed — a three-name drawer leaves half the frame
    # empty, which reads as a thin app.
    cands = sorted((r for r in rows if cluster_n(r) >= 3), key=cluster_n, reverse=True)
elif slot in ("analysis", "balance"):
    # Needs a rating AND both evidence columns populated, or the "both sides"
    # section the shot is about is half empty.
    cands = [r for r in rows if analysis(r).get("rating") and both_sides(r)]
else:
    cands = [r for r in rows if analysis(r).get("rating")]

if not cands:
    sys.exit("no candidate deal for slot=%s market=%s" % (slot, market))
print(cands[0]["id"])
'
}

# ---------------------------------------------------------------------------
# Per-slot launch arguments. This table IS the knowledge — each line is a
# screen that is otherwise only reachable by tapping.
# ---------------------------------------------------------------------------
launch_args_for() {
  local slot="$1" deal="$2"
  case "$slot" in
    today)       echo "-ddbx-tab dashboard" ;;
    performance) echo "-ddbx-tab performance" ;;
    analysis)    echo "-ddbx-deeplink $deal" ;;
    balance)     echo "-ddbx-deeplink $deal -ddbx-scroll evidence" ;;
    cluster)     echo "-ddbx-deeplink $deal -ddbx-sheet recent-buys" ;;
    recap)       echo "-ddbx-sheet summary" ;;
    alert)       echo "" ;;   # handled separately — needs a push, not a launch
    *)           die "unknown slot: $slot" ;;
  esac
}

clean_chrome() {
  xcrun simctl status_bar "$1" override \
    --time "9:41" --batteryState charged --batteryLevel 100 \
    --cellularMode active --cellularBars 4 --wifiMode active --wifiBars 3
}

cmd_build() {
  local market="${1:?market (uk|us)}"
  local scheme product udid
  scheme="$(scheme_for "$market")"
  product="$(product_for "$market")"
  udid="$(sim_udid)"
  echo "building $scheme…"
  ( cd "$IOS_REPO" && xcodebuild -project DdbxApp.xcodeproj -scheme "$scheme" \
      -configuration Debug -destination "id=$udid" -derivedDataPath .deriveddata \
      build 2>&1 | grep -E "error:|BUILD SUCCEEDED|BUILD FAILED" ) || true
  local app="$HOME/Library/Developer/Xcode/DerivedData/Build/Products/Debug-iphonesimulator/$product"
  [[ -d "$app" ]] || die "built product not found at $app"
  xcrun simctl install "$udid" "$app"
  echo "installed $product"
}

capture_ios() {
  local market="$1" slot="$2"
  local udid bundle deal args out
  udid="$(sim_udid)"
  bundle="$(bundle_for "$market")"
  out="$SHOTS_DIR/$market/ios/$slot.png"
  mkdir -p "$(dirname "$out")"

  if [[ "$slot" == "alert" ]]; then
    capture_alert "$market"; return
  fi

  deal=""
  case "$slot" in
    analysis|balance|cluster) deal="$(pick_deal "$market" "$slot")" ;;
  esac
  args="$(launch_args_for "$slot" "$deal")"

  clean_chrome "$udid"
  # Terminate BOTH bundles first: iOS leaves a "◀ ddbx.uk" back-to-app crumb in
  # the status bar when one market's app is launched straight after the other's,
  # and it lands in the capture.
  xcrun simctl terminate "$udid" uk.ddbx.app >/dev/null 2>&1 || true
  xcrun simctl terminate "$udid" us.ddbx.app >/dev/null 2>&1 || true
  sleep 2

  echo "→ $market/ios/$slot  ${deal:+deal=$deal}"
  # shellcheck disable=SC2086
  xcrun simctl launch "$udid" "$bundle" -ddbx.appearance light $args >/dev/null
  # The hooks deliberately wait for the feed before acting; 18s clears a cold
  # launch plus the deal fetch on a slow network.
  sleep 18
  xcrun simctl io "$udid" screenshot "$out" >/dev/null 2>&1
  echo "   saved $(basename "$out") ($(sips -g pixelWidth -g pixelHeight "$out" | awk '/pixel/{printf "%s ", $2}'))"
}

capture_alert() {
  local market="$1" udid bundle out push
  udid="$(sim_udid)"
  bundle="$(bundle_for "$market")"
  out="$SHOTS_DIR/$market/ios/alert.png"
  push="$(mktemp -t ddbxpush).json"
  # Fired while the app is FOREGROUNDED on purpose: the banner then lands over
  # the app's own cream UI rather than over the stock iOS wallpaper, which is
  # aggressively blue and fights the site palette.
  cat > "$push" <<JSON
{ "Simulator Target Bundle": "$bundle",
  "aps": { "alert": {
     "title": "Director buy · $( [[ $market == uk ]] && echo "LSE" || echo "Form 4" )",
     "body": "A new rated disclosure just filed. Tap to read the analysis." },
     "sound": "default" } }
JSON
  clean_chrome "$udid"
  xcrun simctl terminate "$udid" uk.ddbx.app >/dev/null 2>&1 || true
  xcrun simctl terminate "$udid" us.ddbx.app >/dev/null 2>&1 || true
  sleep 2
  xcrun simctl launch "$udid" "$bundle" -ddbx.appearance light >/dev/null
  sleep 18
  xcrun simctl push "$udid" "$bundle" "$push" >/dev/null
  sleep 2
  xcrun simctl io "$udid" screenshot "$out" >/dev/null 2>&1
  echo "   saved $(basename "$out")"
  rm -f "$push"
}

cmd_ios() {
  local market="${1:?market (uk|us)}" which="${2:?slot | all | missing}"
  local list=()
  case "$which" in
    all)     list=("${SLOTS[@]}") ;;
    missing) for s in "${SLOTS[@]}"; do
               [[ -f "$SHOTS_DIR/$market/ios/$s.png" ]] || list+=("$s")
             done ;;
    *)       list=("$which") ;;
  esac
  [[ ${#list[@]} -gt 0 ]] || { echo "nothing to capture — $market/ios is complete"; return; }
  for s in "${list[@]}"; do capture_ios "$market" "$s"; done
  echo
  cmd_status
}

cmd_status() {
  printf '%-13s' "slot"
  for m in "${MARKETS[@]}"; do for p in "${PLATFORMS[@]}"; do printf '%-13s' "$m/$p"; done; done
  echo
  local missing=0
  for s in "${SLOTS[@]}"; do
    printf '%-13s' "$s"
    for m in "${MARKETS[@]}"; do for p in "${PLATFORMS[@]}"; do
      if [[ -f "$SHOTS_DIR/$m/$p/$s.png" ]]; then printf '%-13s' "  ok"
      else printf '%-13s' "  --"; missing=$((missing+1)); fi
    done; done
    echo
  done
  echo
  echo "$missing missing of $(( ${#SLOTS[@]} * 4 ))"
}

# ---------------------------------------------------------------------------
# Android.
#
# `adb` is not on PATH by default on this machine — the SDK ships it at
# ~/Library/Android/sdk/platform-tools. Sourced here so the script works from a
# clean shell.
#
# Unlike iOS, Android needs no DEBUG launch hooks: `adb shell input` taps and
# swipes freely, and both apps take the shared-trade URL as an App Link. What it
# does need is demo mode, or the status bar carries a real clock and a
# notification pile into every capture.
# ---------------------------------------------------------------------------
ANDROID_SDK="${ANDROID_SDK:-$HOME/Library/Android/sdk}"
adb_bin() {
  if command -v adb >/dev/null; then command -v adb
  elif [[ -x "$ANDROID_SDK/platform-tools/adb" ]]; then echo "$ANDROID_SDK/platform-tools/adb"
  else die "adb not found. Install platform-tools or set ANDROID_SDK."; fi
}

android_chrome() {
  local adb; adb="$(adb_bin)"
  "$adb" shell settings put global sysui_demo_allowed 1 >/dev/null
  local b="$adb shell am broadcast -a com.android.systemui.demo -e command"
  $b enter >/dev/null
  $b clock -e hhmm 0941 >/dev/null
  $b notifications -e visible false >/dev/null
  $b battery -e level 100 -e plugged false >/dev/null
  $b network -e wifi show -e level 4 >/dev/null
  # Gesture pill rather than the three-button bar — a 2026 handset mockup with
  # a back/home/recents triad reads as an old phone.
  "$adb" shell cmd overlay enable com.android.internal.systemui.navbar.gestural >/dev/null 2>&1 || true
}

# Poll the view hierarchy until `$1` appears. Beats a fixed sleep: a cold launch
# behind a 3MB feed fetch is not the same wait as a warm one.
android_wait_text() {
  local adb needle="$1" tries="${2:-30}"; adb="$(adb_bin)"
  for _ in $(seq 1 "$tries"); do
    if "$adb" exec-out uiautomator dump /dev/tty 2>/dev/null | grep -q "$needle"; then return 0; fi
    sleep 2
  done
  echo "   ! timed out waiting for \"$needle\"" >&2
  return 1
}

capture_android() {
  local market="$1" slot="$2" adb pkg out deal
  adb="$(adb_bin)"
  pkg="$(bundle_for "$market")"
  out="$SHOTS_DIR/$market/android/$slot.png"
  mkdir -p "$(dirname "$out")"

  android_chrome
  "$adb" shell am force-stop uk.ddbx.app >/dev/null 2>&1 || true
  "$adb" shell am force-stop us.ddbx.app >/dev/null 2>&1 || true
  sleep 2

  case "$slot" in
    today|performance)
      "$adb" shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
      android_wait_text "Today" 30 || true
      [[ "$slot" == "performance" ]] && { "$adb" shell input tap 320 1690; sleep 6; }
      ;;
    analysis|balance|cluster)
      deal="$(pick_deal "$market" "$slot")"
      echo "→ $market/android/$slot  deal=$deal"
      "$adb" shell am start -a android.intent.action.VIEW \
        -d "https://ddbx.uk/t/$deal" "$pkg" >/dev/null 2>&1
      android_wait_text "Why this is interesting" 40 || true
      # `balance` wants the for/against columns, which sit below the fold.
      if [[ "$slot" == "balance" ]]; then
        for _ in 1 2 3; do "$adb" shell input swipe 540 1800 540 700 400; sleep 1; done
      fi
      ;;
    *)
      die "slot '$slot' has no Android recipe yet — see notes at the head of this script"
      ;;
  esac
  sleep 2
  "$adb" exec-out screencap -p > "$out" 2>/dev/null
  echo "   saved $(basename "$out")"
}

cmd_android() {
  local market="${1:?market (uk|us)}" which="${2:?slot | all | missing}"
  local list=()
  case "$which" in
    all)     list=("${SLOTS[@]}") ;;
    missing) for s in "${SLOTS[@]}"; do
               [[ -f "$SHOTS_DIR/$market/android/$s.png" ]] || list+=("$s")
             done ;;
    *)       list=("$which") ;;
  esac
  for s in "${list[@]}"; do capture_android "$market" "$s"; done
  echo; cmd_status
}

cmd_doctor() {
  echo "site        $SITE_DIR"
  echo "ios repo    $IOS_REPO $( [[ -d "$IOS_REPO" ]] && echo "(ok)" || echo "(MISSING)" )"
  echo "shots       $SHOTS_DIR"
  echo -n "simulator   "; sim_udid 2>/dev/null || echo "none booted"
  echo "installed:"
  local udid; udid="$(sim_udid 2>/dev/null || true)"
  if [[ -n "$udid" ]]; then
    xcrun simctl listapps "$udid" 2>/dev/null \
      | grep -oE '"(uk|us)\.ddbx\.app"' | sort -u | sed 's/^/  /'
  fi
  local adb; adb="$(adb_bin 2>/dev/null || true)"
  echo "adb         ${adb:-NOT FOUND}"
  if [[ -n "$adb" ]]; then
    echo "emulator    $("$adb" devices | sed -n '2p' | awk '{print $1" "$2}')"
    "$adb" shell pm list packages 2>/dev/null | grep -i ddbx | sed 's/^package:/  /'
  fi
}

case "${1:-status}" in
  doctor) cmd_doctor ;;
  status) cmd_status ;;
  build)  shift; cmd_build "$@" ;;
  ios)     shift; cmd_ios "$@" ;;
  android) shift; cmd_android "$@" ;;
  *)      sed -n '2,32p' "${BASH_SOURCE[0]}" | sed 's|^# \?||' ;;
esac
