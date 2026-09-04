#!/usr/bin/env python3
"""Call one tool on Spline's MCP bridge from the shell and keep what comes back.

    python3 scripts/spline-mcp-call.py <tool> ['<json args>'] [--save-image out.png]

WHY. Spline for Desktop bundles an MCP server (`spline-mcp.cjs`, run under the
app's own Electron binary as node). Through an LLM host its `3d_take_screenshot`
renders come back as inline images the agent can look at but never write to
disk. The bridge is a plain stdio JSON-RPC process, though, so this speaks the
same protocol to it directly and saves the image content it returns — which
is how the empty-state illustrations are captured: the screenshot camera
renders the scene with no grid, gizmo or selection, from a framing that stays
put between calls, and it renders whether or not the editor window is visible.

The bridge joins whatever Spline instance is running (it prints its handshake
on stderr); a second bridge alongside the LLM host's is fine — the app hosts
several agent clients on one local port.

Text content is printed; each image content is written to --save-image (a
second image gets a numeric suffix).
"""
import argparse, base64, json, os, pathlib, subprocess, sys, time

APP = pathlib.Path("/Applications/Spline.app/Contents")
BRIDGE = [str(APP / "MacOS/Spline"), str(APP / "Resources/spline-mcp.cjs")]


class Bridge:
    def __init__(self):
        env = dict(os.environ, ELECTRON_RUN_AS_NODE="1")
        self.p = subprocess.Popen(BRIDGE, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=subprocess.DEVNULL, env=env)
        self.next_id = 1
        self.request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "ddbx-illustrations", "version": "0.1"},
        })
        self.notify("notifications/initialized", {})

    def send(self, msg):
        self.p.stdin.write((json.dumps(msg) + "\n").encode())
        self.p.stdin.flush()

    def notify(self, method, params):
        self.send({"jsonrpc": "2.0", "method": method, "params": params})

    def request(self, method, params):
        rid = self.next_id
        self.next_id += 1
        self.send({"jsonrpc": "2.0", "id": rid, "method": method, "params": params})
        while True:
            line = self.p.stdout.readline()
            if not line:
                sys.exit("bridge closed the connection — is Spline running with a 3D file open?")
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            if msg.get("id") == rid:
                if "error" in msg:
                    sys.exit(f"{method}: {msg['error']}")
                return msg["result"]

    NOT_YET = "No two editor is connected"

    def call(self, tool, args, wait_s=20.0):
        """The bridge answers before it has joined the app, so a call in the
        first second or two is refused with a stock message. Retry through
        it; anything else is a real error and comes straight back."""
        deadline = time.monotonic() + wait_s
        while True:
            result = self.request("tools/call", {"name": tool, "arguments": args})
            texts = [c.get("text", "") for c in result.get("content", []) if c.get("type") == "text"]
            if result.get("isError") and any(self.NOT_YET in t for t in texts) and time.monotonic() < deadline:
                time.sleep(0.5)
                continue
            return result

    def close(self):
        try:
            self.p.stdin.close()
            self.p.terminate()
        except OSError:
            pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tool")
    ap.add_argument("args", nargs="?", default="{}", help="JSON object of tool arguments")
    ap.add_argument("--save-image", type=pathlib.Path, help="where to write image content")
    a = ap.parse_args()

    bridge = Bridge()
    try:
        result = bridge.call(a.tool, json.loads(a.args))
    finally:
        bridge.close()

    images = 0
    for item in result.get("content", []):
        if item.get("type") == "text":
            print(item["text"])
        elif item.get("type") == "image":
            if not a.save_image:
                print(f"[image {item.get('mimeType')} — pass --save-image to keep it]")
                continue
            dest = a.save_image if images == 0 else a.save_image.with_stem(f"{a.save_image.stem}-{images + 1}")
            dest.write_bytes(base64.b64decode(item["data"]))
            print(f"wrote {dest}")
            images += 1
    if result.get("isError"):
        sys.exit(1)


if __name__ == "__main__":
    main()
