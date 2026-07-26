/** Desktop → phone bridge: a QR code straight to the store listing.
 *
 *  Every install CTA on this site assumes the visitor is holding the device
 *  they'll install on. A desktop visitor who wants the app has had no path at
 *  all — they'd have to remember the URL and retype it on their phone, which
 *  approximately nobody does. This is the fix, and it's why it renders *only*
 *  where there's no store button to tap (desktop / unknown platform).
 *
 *  `qrcode` is dynamically imported so it lands in its own chunk and mobile
 *  visitors — the majority — never download the encoder at all.
 */
import { useEffect, useRef, useState } from "react";

/** Rendered size on the page. The canvas is encoded at 2× this for retina and
 *  then pinned back down with an inline style — `qrcode` writes its own
 *  `style.width`/`style.height` onto the canvas, which beats any class we put
 *  on the element, so the size has to be re-asserted inline after encoding. */
const QR_CSS_PX = 132;

export function QrInstall({
  url,
  caption,
  /** Caption colour. The block currently lives on the dark final-CTA band,
   *  where the usual `text-foreground/50` is dark-on-dark and vanishes — so the
   *  tone is the caller's to set rather than assumed. */
  captionClassName = "text-foreground/50",
}: {
  /** The store listing to encode. */
  url: string;
  caption: string;
  captionClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const { toCanvas } = await import("qrcode");
        const canvas = canvasRef.current;

        if (!live || !canvas) return;
        await toCanvas(canvas, url, {
          width: QR_CSS_PX * 2,
          margin: 1,
          // Brand-warm rather than pure black; still far past the contrast
          // ratio every scanner needs.
          color: { dark: "#1a140dff", light: "#ffffffff" },
          errorCorrectionLevel: "M",
        });
        if (!live) return;
        canvas.style.width = `${QR_CSS_PX}px`;
        canvas.style.height = `${QR_CSS_PX}px`;
      } catch {
        if (live) setFailed(true);
      }
    })();

    return () => {
      live = false;
    };
  }, [url]);

  // A broken encoder shouldn't leave a dead grey square in the layout.
  if (failed) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <canvas
          ref={canvasRef}
          aria-label="QR code linking to the app store listing"
          className="block"
          role="img"
          style={{ width: QR_CSS_PX, height: QR_CSS_PX }}
        />
      </div>
      {/* `text-balance` so a two-line caption splits between phrases rather
          than orphaning the second half of the store's name on its own line. */}
      <p
        className={`max-w-[220px] text-balance text-center text-xs leading-relaxed ${captionClassName}`}
      >
        {caption}
      </p>
    </div>
  );
}
