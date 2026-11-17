#!/usr/bin/env python3
"""Design Studio MCP server (stdio, JSON-RPC 2.0, one message per line).

Gives the designer, critic and exporter agents their tools: read the project
and its design system, save and load variants, run the rule checks, render a
variant to PNG, and save an export. Standard library only; no network.

Data dir: $DESIGN_STUDIO_DATA (the agent file passes {APP_DATA}), else the
app's default data dir under $KIROCREW_HOME.
"""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from studio import __version__  # noqa: E402
from studio import design_system as ds  # noqa: E402
from studio import render, rules  # noqa: E402
from studio.store import Store, StoreError  # noqa: E402

PROTOCOL_VERSION = "2024-11-05"
STORE = Store()

_S = {"type": "string"}
_PID = {"type": "string", "description": "Project id, e.g. 'billing-dashboard-3f9a1c'"}
_VID = {"type": "string", "description": "Variant id, e.g. 'v-1a2b3c4d'"}

TOOLS: list[dict[str, Any]] = [
    {
        "name": "list_projects",
        "description": "List Design Studio projects (id, name, counts), newest first.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_project",
        "description": (
            "Read one project: its rounds (prompt, requested count, status), its variants (metadata only), "
            "its design system tokens, the density targets for its app type, and the contrast report. "
            "Read this before designing or reviewing."
        ),
        "inputSchema": {"type": "object", "properties": {"project_id": _PID}, "required": ["project_id"],
                        "additionalProperties": False},
    },
    {
        "name": "load_variant",
        "description": "Read one variant's HTML markup and metadata.",
        "inputSchema": {"type": "object", "properties": {"project_id": _PID, "variant_id": _VID},
                        "required": ["project_id", "variant_id"], "additionalProperties": False},
    },
    {
        "name": "save_variant",
        "description": (
            "Save a screen variant. `html` is the BODY markup only (no <html>/<head>, no Tailwind <script>): "
            "the studio wraps it with Tailwind and the project's design-system tokens (bg-bg, bg-surface, "
            "text-ink, text-muted, border-line, bg-accent, text-accent-ink, font-display, rounded-md, ...). "
            "Omit variant_id to create a new variant in the round; pass it to replace that variant's markup. "
            "stage: 'draft' (designer) or 'reviewed' (critic, after fixing). Returns the variant metadata."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": _PID,
                "round_id": {"type": "string", "description": "Round id from get_project, e.g. 'r-0a1b2c3d'"},
                "title": {"type": "string", "description": "2-5 word name for the direction, e.g. 'Dense ledger'"},
                "html": _S,
                "stage": {"type": "string", "enum": ["draft", "reviewed"]},
                "variant_id": _VID,
                "rationale": {"type": "string", "description": "One or two sentences: the idea behind this direction"},
                "notes": {"type": "string", "description": "Critic: what was found and fixed"},
            },
            "required": ["project_id", "round_id", "title", "html"],
            "additionalProperties": False,
        },
    },
    {
        "name": "check_variant",
        "description": (
            "Run the static anti-AI-look checks (rules R1-R11 in the anti-ai-look-design skill) on a saved "
            "variant. Returns findings with rule ids. Errors must be fixed before stage 'reviewed'."
        ),
        "inputSchema": {"type": "object", "properties": {"project_id": _PID, "variant_id": _VID},
                        "required": ["project_id", "variant_id"], "additionalProperties": False},
    },
    {
        "name": "render_variant",
        "description": (
            "Render a saved variant to PNG with local headless Chrome and return the image, so you can look "
            "at hierarchy, alignment and density. viewport: desktop (1440x900), laptop, tablet or mobile (390x844)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"project_id": _PID, "variant_id": _VID,
                           "viewport": {"type": "string", "enum": list(render.VIEWPORTS)},
                           "height": {"type": "integer", "minimum": 400, "maximum": 4000,
                                      "description": "Taller capture for long pages"}},
            "required": ["project_id", "variant_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "save_export",
        "description": (
            "Save the React + Tailwind (shadcn/ui style) export of a variant as one .tsx file. The page shows "
            "it with a Copy button."
        ),
        "inputSchema": {"type": "object",
                        "properties": {"project_id": _PID, "variant_id": _VID, "code": _S},
                        "required": ["project_id", "variant_id", "code"], "additionalProperties": False},
    },
]


def _text(data: Any) -> list[dict[str, Any]]:
    return [{"type": "text", "text": data if isinstance(data, str) else json.dumps(data, indent=2)}]


def t_list_projects(_a: dict[str, Any]) -> list[dict[str, Any]]:
    return _text(STORE.list_projects())


def t_get_project(a: dict[str, Any]) -> list[dict[str, Any]]:
    p = STORE.get_project(a["project_id"])
    system = p["designSystem"]
    p["density"] = ds.DENSITY.get(system.get("appType", "dashboard"))
    p["contrast"] = ds.contrast_report(system)
    p["tailwindTokens"] = ds.tailwind_config(system)["theme"]["extend"]
    return _text(p)


def t_load_variant(a: dict[str, Any]) -> list[dict[str, Any]]:
    return _text(STORE.get_variant(a["project_id"], a["variant_id"]))


def t_save_variant(a: dict[str, Any]) -> list[dict[str, Any]]:
    html = render.body_of(a["html"])
    meta = STORE.save_variant(a["project_id"], a["round_id"], a["title"], html, stage=a.get("stage", "draft"),
                              variant_id=a.get("variant_id"), rationale=a.get("rationale", ""),
                              notes=a.get("notes", ""))
    report = rules.check(html, STORE.get_design_system(a["project_id"]))
    return _text({"saved": meta, "checks": report})


def t_check_variant(a: dict[str, Any]) -> list[dict[str, Any]]:
    v = STORE.get_variant(a["project_id"], a["variant_id"])
    return _text(rules.check(v["html"], STORE.get_design_system(a["project_id"])))


def t_render_variant(a: dict[str, Any]) -> list[dict[str, Any]]:
    pid, vid = a["project_id"], a["variant_id"]
    v = STORE.get_variant(pid, vid)
    doc = render.wrap(v["html"], STORE.get_design_system(pid), title=v["title"])
    out = render.screenshot(doc, STORE.png_path(pid, vid), viewport=a.get("viewport", "desktop"),
                            full_height=a.get("height"))
    data = base64.b64encode(out.read_bytes()).decode()
    return [{"type": "image", "data": data, "mimeType": "image/png"},
            {"type": "text", "text": f"Rendered {vid} ({a.get('viewport', 'desktop')})"}]


def t_save_export(a: dict[str, Any]) -> list[dict[str, Any]]:
    return _text(STORE.save_export(a["project_id"], a["variant_id"], a["code"]))


HANDLERS: dict[str, Callable[[dict[str, Any]], list[dict[str, Any]]]] = {
    "list_projects": t_list_projects,
    "get_project": t_get_project,
    "load_variant": t_load_variant,
    "save_variant": t_save_variant,
    "check_variant": t_check_variant,
    "render_variant": t_render_variant,
    "save_export": t_save_export,
}


def handle(msg: dict[str, Any]) -> dict[str, Any] | None:
    method = msg.get("method")
    mid = msg.get("id")
    if mid is None:  # notification
        return None
    if method == "initialize":
        result: Any = {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "design-studio", "version": __version__},
        }
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": TOOLS}
    elif method == "tools/call":
        params = msg.get("params") or {}
        name = params.get("name")
        fn = HANDLERS.get(name)
        if fn is None:
            return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32602, "message": f"unknown tool {name}"}}
        try:
            result = {"content": fn(params.get("arguments") or {})}
        except (StoreError, ValueError, KeyError, render.RenderError) as exc:
            result = {"content": _text(f"error: {exc}"), "isError": True}
    else:
        return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": f"unknown method {method}"}}
    return {"jsonrpc": "2.0", "id": mid, "result": result}


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            reply: dict[str, Any] | None = {"jsonrpc": "2.0", "id": None,
                                            "error": {"code": -32700, "message": "parse error"}}
        else:
            reply = handle(msg) if isinstance(msg, dict) else None
        if reply is not None:
            sys.stdout.write(json.dumps(reply) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
