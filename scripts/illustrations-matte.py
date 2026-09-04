#!/usr/bin/env python3
"""Pull a transparent still out of two screen captures of the Spline editor.

    python3 scripts/illustrations-matte.py <on-black.png> <on-white.png> <out.png> [--pad 0.04]

WHY. Spline's MCP bridge returns renders into the agent's context, never to
disk, and the editor's play view can only be photographed with macOS
`screencapture` — which has no idea what is background. Two captures of the
same frame, one over a black page background and one over white, settle it
exactly: a pixel that is foreground colour F at coverage a photographs as
a·F on black and a·F + (1−a)·255 on white, so

    a = 1 − (white − black) / 255        F = black / a

per channel — the classic two-background matte, exact for anti-aliased edges
and soft shadows alike, with no chroma-key guesswork against the cream
objects. The editor chrome around the viewport is identical in both captures
(a = 1), so the viewport is found first as the box of pixels that are pure
black in one and pure white in the other, and everything outside it is
discarded; a thin band inside its edge goes too, for the runtime's loading
bar. The result is cropped to the subject with `--pad` of air.

Both captures must be the same frame: same window, same camera, same play
session geometry. If the alpha comes out noisy across the whole subject, the
camera moved between them.
"""
import argparse, pathlib, sys

from PIL import Image, ImageChops, ImageMath

# Plain Pillow throughout — the machine this runs on has no numpy, and a
# matte is four point operations, not a reason to install one.


def channel_max(img):
    r, g, b = img.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def channel_min(img):
    r, g, b = img.split()
    return ImageChops.darker(ImageChops.darker(r, g), b)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("black", type=pathlib.Path)
    ap.add_argument("white", type=pathlib.Path)
    ap.add_argument("out", type=pathlib.Path)
    ap.add_argument("--pad", type=float, default=0.04, help="air around the subject, fraction of its larger side")
    ap.add_argument("--inset", type=int, default=12, help="pixels to ignore inside the viewport edge")
    args = ap.parse_args()

    b = Image.open(args.black).convert("RGB")
    w = Image.open(args.white).convert("RGB")
    if b.size != w.size:
        sys.exit(f"captures differ in size {b.size} vs {w.size}")

    # The viewport: where the page background shows through in both.
    is_black = channel_max(b).point(lambda v: 255 if v <= 3 else 0)
    is_white = channel_min(w).point(lambda v: 255 if v >= 252 else 0)
    box = ImageChops.multiply(is_black, is_white).getbbox()
    if box is None:
        sys.exit("no pixel is black in one capture and white in the other — are these the two backgrounds?")
    i = args.inset
    view = (box[0] + i, box[1] + i, box[2] - i, box[3] - i)
    b, w = b.crop(view), w.crop(view)

    # a = 1 − (white − black)/255. The difference is the same in every
    # channel in theory, so the luminance of the difference IS the mean.
    alpha = ImageChops.invert(ImageChops.subtract(w, b).convert("L"))
    alpha = alpha.point(lambda v: 0 if v < 4 else v)

    # F = black / a, channel by channel; opaque where a is 0 so nothing
    # divides by it (those pixels are fully transparent anyway).
    rgb = []
    for ch in b.split():
        rgb.append(ImageMath.lambda_eval(
            lambda a: a["convert"](a["min"](a["c"] * 255 / a["max"](a["a"], 1), 255), "L"),
            c=ch, a=alpha))
    alpha_safe = alpha  # keep the name for the composite below

    subject = alpha_safe.point(lambda v: 255 if v > 0 else 0).getbbox()
    if subject is None:
        sys.exit("nothing opaque inside the viewport")
    x0, y0, x1, y1 = subject
    pad = round(args.pad * max(y1 - y0, x1 - x0))
    crop = (max(0, x0 - pad), max(0, y0 - pad), min(b.width, x1 + pad), min(b.height, y1 + pad))

    out = Image.merge("RGBA", rgb + [alpha_safe]).crop(crop)
    out.save(args.out)
    cw, ch = out.size
    print(f"viewport {view[2] - view[0]}×{view[3] - view[1]} at ({view[0]},{view[1]}); "
          f"subject {cw}×{ch}, aspect {cw / ch:.3f} -> {args.out}")


if __name__ == "__main__":
    main()
