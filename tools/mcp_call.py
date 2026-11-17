#!/usr/bin/env python3
"""Call one Design Studio MCP tool over real stdio, for testing without Kiro Crew.

    DESIGN_STUDIO_DATA=/path/to/data python3 tools/mcp_call.py <tool> <args.json | -> [--image out.png]

Prints the tool's text content; with --image, writes a returned PNG there.
"""
from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

SERVER = Path(__file__).resolve().parent.parent / "mcp" / "server.py"


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    tool, src = sys.argv[1], sys.argv[2]
    image_out = sys.argv[sys.argv.index("--image") + 1] if "--image" in sys.argv else None
    args = json.loads(sys.stdin.read() if src == "-" else Path(src).read_text(encoding="utf-8"))
    msgs = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": tool, "arguments": args}},
    ]
    proc = subprocess.run([sys.executable, str(SERVER)], input="\n".join(json.dumps(m) for m in msgs) + "\n",
                          capture_output=True, text=True, timeout=180)
    replies = [json.loads(line) for line in proc.stdout.splitlines() if line.strip()]
    reply = next((r for r in replies if r.get("id") == 2), None)
    if reply is None:
        print(proc.stderr, file=sys.stderr)
        return 1
    if "error" in reply:
        print(json.dumps(reply["error"]), file=sys.stderr)
        return 1
    result = reply["result"]
    for part in result["content"]:
        if part["type"] == "text":
            print(part["text"])
        elif part["type"] == "image" and image_out:
            Path(image_out).write_bytes(base64.b64decode(part["data"]))
            print(f"[image written to {image_out}]")
    return 1 if result.get("isError") else 0


if __name__ == "__main__":
    sys.exit(main())
