#!/usr/bin/env python3
"""Turn PNG captures of a Spline scene into the WebP set `Illustration` loads.

    python3 scripts/illustrations-webp.py <scene> <base.png> [--line <line.png>]
                                          [--height 160] [--trim] [--pad 0.04]

Writes public/illustrations/<scene>[-line][@2x|@3x].webp — the three densities
`lib/illustrations.ts` puts in the srcset — from one transparent capture.
`--height` is the 1x frame height in CSS px; 2x and 3x are twice and three
times that, resampled from the capture (which should be at least 3× tall,
so capture as large as the bridge renders — see illustrations-capture.py).

Every layer of a scene must come from the same camera at the same frame size:
the line layer is stacked over the base and moved with one CSS transform, and
that only lines up if the two files are the same picture minus the objects
hidden in each. `--trim` crops all layers of the scene to the UNION of their
opaque pixels (plus `--pad` of the frame either side), so a wide export with
dead space is tightened without the layers drifting apart. It prints the
resulting aspect ratio and, for a scanning capture, how much of the frame
height the brackets fill — the two numbers `ILLUSTRATIONS` needs.

Requires Pillow with WebP support (`python3 -c "from PIL import features;
print(features.check('webp'))"`).
"""
import argparse, pathlib, sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public/illustrations"


def bbox(img):
    alpha = img.getchannel("A")
    return alpha.getbbox()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene")
    ap.add_argument("base", type=pathlib.Path)
    ap.add_argument("--line", type=pathlib.Path, help="the scan-line layer, scanning scene only")
    ap.add_argument("--height", type=int, default=160, help="1x frame height in CSS px (default 160)")
    ap.add_argument("--trim", action="store_true", help="crop to the union of the layers' opaque pixels")
    ap.add_argument("--pad", type=float, default=0.04, help="air around the trimmed subject, as a fraction of its larger side")
    ap.add_argument("--quality", type=int, default=90)
    args = ap.parse_args()

    layers = {"base": Image.open(args.base).convert("RGBA")}
    if args.line:
        layers["line"] = Image.open(args.line).convert("RGBA")
    sizes = {im.size for im in layers.values()}
    if len(sizes) != 1:
        sys.exit(f"layers differ in size {sizes} — capture them from the same camera at the same frame")
    (w, h), = sizes

    crop = (0, 0, w, h)
    if args.trim:
        boxes = [b for b in (bbox(im) for im in layers.values()) if b]
        if not boxes:
            sys.exit("nothing opaque in these captures — was the background transparent?")
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        pad = round(args.pad * max(x1 - x0, y1 - y0))
        crop = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    print(f"{args.scene}: capture {cw}×{ch}, aspect {cw / ch:.3f}")
    if ch < 3 * args.height:
        print(f"  note: capture is {ch}px tall, under the {3 * args.height}px a clean 3x wants — it will be upsampled")

    if "base" in layers and args.line:
        b = bbox(layers["base"])
        if b:
            print(f"  brackets fill {(b[3] - b[1]) / ch:.2f} of the frame height "
                  f"(SCANNING_BRACKET_FILL in lib/illustrations.ts)")
        l = bbox(layers["line"])
        if l:
            centre = (l[1] + l[3]) / 2
            print(f"  scan line authored at {(centre - crop[1]) / ch:.2f} of the frame height from the top")

    OUT.mkdir(parents=True, exist_ok=True)
    for name, im in layers.items():
        im = im.crop(crop)
        stem = args.scene if name == "base" else f"{args.scene}-{name}"
        for density in (1, 2, 3):
            h = args.height * density
            w_ = max(1, round(cw * h / ch))
            out = im.resize((w_, h), Image.LANCZOS)
            suffix = "" if density == 1 else f"@{density}x"
            dest = OUT / f"{stem}{suffix}.webp"
            out.save(dest, "WEBP", quality=args.quality, method=6)
            print(f"  wrote {dest.relative_to(ROOT)} {w_}×{h} ({dest.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
