#!/usr/bin/env python3
"""Capture one empty-state scene out of the open Spline file as a transparent PNG.

    python3 scripts/illustrations-capture.py <out.png> --azimuth -18 --elevation 4 \\
        --distance 380 --target -647,100,0 [--hide "Scan Line"]

Drives the Spline MCP bridge (see spline-mcp-call.py): aims the editor
viewport with `lookFrom`, hides or isolates the named objects, then takes the
screenshot camera's render twice — over a black page background and over a
white one — and hands the pair to illustrations-matte.py for an exact alpha.
The background and any visibility it changed are put back afterwards.

`--hide` hides the named objects for the capture (names as Spline shows them,
comma-separated) — a layered scene is captured once per layer, hiding the
others each time, from the same framing.

The viewport is the author's, so this DOES move their camera — it is the
render's framing. Pick the angle from the app's prepared export
(`ddbx-ios-app/scripts/spline-prepare.py` reads it back) so the web still is
seen from the same side as the app's scene.
"""
import argparse, importlib.util, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("spline_mcp_call", HERE / "spline-mcp-call.py")
mcp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mcp)


def js_names(names):
    return "[" + ", ".join(repr(n) for n in names) + "]"


def run(bridge, title, code):
    r = bridge.call("3d_run_code", {"title": title, "code": code})
    if r.get("isError"):
        sys.exit("run_code failed: " + " ".join(c.get("text", "") for c in r.get("content", [])))


def shot(bridge, dest):
    r = bridge.call("3d_take_screenshot", {})
    for c in r.get("content", []):
        if c.get("type") == "image":
            dest.write_bytes(mcp.base64.b64decode(c["data"]))
            return
    sys.exit("no image came back: " + " ".join(c.get("text", "") for c in r.get("content", [])))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out", type=pathlib.Path)
    ap.add_argument("--azimuth", type=float, required=True)
    ap.add_argument("--elevation", type=float, required=True)
    ap.add_argument("--distance", type=float, required=True)
    ap.add_argument("--target", required=True, help="x,y,z the camera looks at")
    ap.add_argument("--hide", default="", help="object names to hide, comma-separated")
    ap.add_argument("--pad", type=float, default=0.04)
    a = ap.parse_args()

    target = [float(v) for v in a.target.split(",")]
    hide = [n.strip() for n in a.hide.split(",") if n.strip()]
    work = a.out.parent
    black, white = work / (a.out.stem + "-black.png"), work / (a.out.stem + "-white.png")

    b = mcp.Bridge()
    try:
        vis = []
        if hide:
            vis.append(f"select(o => {js_names(hide)}.includes(o.name)); hide();")
        run(b, "Framing the illustration", f"""unselect();
lookFrom({{ azimuth: {a.azimuth}, elevation: {a.elevation}, distance: {a.distance}, target: [{target[0]}, {target[1]}, {target[2]}] }});
{chr(10).join(vis)}
unselect();
background('#000000');""")
        shot(b, black)
        run(b, "Swapping to a white ground", "background('#ffffff');")
        shot(b, white)
    finally:
        restore = ["background('#ffffff');"]
        if hide:
            restore.append(f"select(o => {js_names(hide)}.includes(o.name)); show();")
        restore.append("unselect();")
        try:
            run(b, "Restoring the editor", "\n".join(restore))
        finally:
            b.close()

    subprocess.run([sys.executable, str(HERE / "illustrations-matte.py"), str(black), str(white), str(a.out),
                    "--pad", str(a.pad), "--inset", "0"], check=True)


if __name__ == "__main__":
    main()
