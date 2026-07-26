// Which app screenshots actually exist, resolved at runtime.
//
// `app-screenshots.ts` deliberately doesn't verify its files: the manifest is a
// path builder, the PNGs are dropped in by hand, and `DeviceFrame` renders a
// styled placeholder for anything missing so the pages could ship before the
// mockups did.
//
// That fallback is right for a fixed layout — a tour beat has a slot whether or
// not its screen has been captured, and an empty gap there is worse than a
// labelled placeholder. It is wrong for a decorative rail of screens, where a
// slot with no image is just an "iPhone screenshot" card sitting mid-row
// telling visitors we haven't finished. There's nothing to hold the space for.
//
// So: probe the images, render the ones that load. Kept as a runtime check
// rather than a hard-coded list of what's on disk today, because the whole
// point of the manifest is that dropping a new PNG into public/app-shots/ lights
// it up with no code change — a checked-in list would quietly break that.
import { useEffect, useState } from "react";

import {
  appShotSrc,
  type AppPlatform,
  type ShotSlot,
} from "@/lib/app-screenshots";

/** Resolves to the subset of `slots` whose PNG loaded, in the order given.
 *  `null` while probing — callers should render nothing rather than guess, so a
 *  screen never appears and then vanishes.
 *
 *  `slots` must be referentially stable (a module constant, or memoised);
 *  it's a dependency of the probe. */
export function useAvailableShots(
  marketId: string,
  platform: AppPlatform,
  slots: readonly ShotSlot[],
): ShotSlot[] | null {
  const [available, setAvailable] = useState<ShotSlot[] | null>(null);

  useEffect(() => {
    let live = true;

    setAvailable(null);
    Promise.all(
      slots.map(
        (slot) =>
          new Promise<ShotSlot | null>((resolve) => {
            const img = new Image();

            img.onload = () => resolve(slot);
            img.onerror = () => resolve(null);
            img.src = appShotSrc(marketId, platform, slot);
          }),
      ),
    ).then((results) => {
      if (live) setAvailable(results.filter((s): s is ShotSlot => s !== null));
    });

    return () => {
      live = false;
    };
  }, [marketId, platform, slots]);

  return available;
}
