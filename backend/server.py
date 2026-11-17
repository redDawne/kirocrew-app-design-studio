"""Design Studio backend.

A stdlib HTTP server the gateway spawns and reaches through its reverse proxy
at /apps/design-studio/api/*. It binds 127.0.0.1 only and checks the gateway's
HMAC signature on every route except /health, which the gateway probes
unsigned.

Environment injected by Kiro Crew:
  PORT                    port to bind on 127.0.0.1
  KIROCREW_APP_NAME       app name (design-studio)
  KIROCREW_HOME           Kiro Crew data home (~/.kiro/crew)
  KIROCREW_PROXY_SECRET   HMAC key shared with the gateway
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from studio import __version__  # noqa: E402
from studio import design_system as ds  # noqa: E402
from studio import render, rules  # noqa: E402
from studio.store import Store, StoreError  # noqa: E402

APP_NAME = os.environ.get("KIROCREW_APP_NAME", "design-studio")
PORT = int(os.environ.get("PORT", "9310"))
STORE = Store()
PROXY_HEADER = "X-KiroCrew-Proxy"
MAX_SKEW_SECONDS = 60
MAX_BODY = 1_000_000


def verify_proxy_signature(header_value: str, *, method: str, target: str, body: bytes) -> bool:
    """``<ts>:<hex hmac_sha256(secret, "<ts>:<METHOD>:<target>:<sha256(body)>")>``; fail closed."""
    secret = os.environ.get("KIROCREW_PROXY_SECRET", "")
    if not secret or not header_value or ":" not in header_value:
        return False
    ts, _, sig = header_value.partition(":")
    if not ts.isdigit() or not sig or abs(time.time() - int(ts)) > MAX_SKEW_SECONDS:
        return False
    msg = f"{ts}:{method}:{target}:{hashlib.sha256(body or b'').hexdigest()}"
    expected = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


# ------------------------------------------------------------------- routes
Params = dict[str, str]
Route = Callable[[Params, dict[str, Any]], tuple[int, Any]]


def r_health(_p: Params, _b: dict[str, Any]) -> tuple[int, Any]:
    return 200, {"status": "ok", "app": APP_NAME, "version": __version__}


def r_status(_p: Params, _b: dict[str, Any]) -> tuple[int, Any]:
    return 200, {"version": __version__, "chrome": render.find_chrome(), "dataDir": str(STORE.root),
                 "appTypes": list(ds.APP_TYPES), "viewports": list(render.VIEWPORTS)}


def r_projects(_p: Params, _b: dict[str, Any]) -> tuple[int, Any]:
    return 200, {"projects": STORE.list_projects()}


def r_create_project(_p: Params, b: dict[str, Any]) -> tuple[int, Any]:
    return 201, STORE.create_project(str(b.get("name", "")), str(b.get("appType", "dashboard")))


def r_project(p: Params, _b: dict[str, Any]) -> tuple[int, Any]:
    project = STORE.get_project(p["pid"])
    project["contrast"] = ds.contrast_report(project["designSystem"])
    project["density"] = ds.DENSITY.get(project["designSystem"].get("appType", "dashboard"))
    return 200, project


def r_set_system(p: Params, b: dict[str, Any]) -> tuple[int, Any]:
    system = STORE.set_design_system(p["pid"], b.get("designSystem"))
    return 200, {"designSystem": system, "contrast": ds.contrast_report(system)}


def r_create_round(p: Params, b: dict[str, Any]) -> tuple[int, Any]:
    rnd = STORE.create_round(p["pid"], str(b.get("prompt", "")), int(b.get("count", 3) or 3),
                             parent=b.get("parent") or None, comment=str(b.get("comment", "")))
    return 201, rnd


def r_mark_round(p: Params, b: dict[str, Any]) -> tuple[int, Any]:
    fields = {k: b[k] for k in ("criticRequested", "chosen") if k in b}
    if "criticRequested" in fields and not isinstance(fields["criticRequested"], bool):
        raise StoreError("criticRequested must be a boolean")
    if fields.get("chosen") is not None:
        STORE.get_variant(p["pid"], str(fields["chosen"]))  # must exist
    return 200, STORE.mark_round(p["pid"], p["rid"], **fields)


def r_variant(p: Params, _b: dict[str, Any]) -> tuple[int, Any]:
    v = STORE.get_variant(p["pid"], p["vid"])
    system = STORE.get_design_system(p["pid"])
    v["checks"] = rules.check(v["html"], system)
    v["document"] = render.wrap(v["html"], system, title=v["title"])
    v["export"] = STORE.get_export(p["pid"], p["vid"])
    return 200, v


def r_variant_png(p: Params, b: dict[str, Any]) -> tuple[int, Any]:
    v = STORE.get_variant(p["pid"], p["vid"])
    viewport = str(b.get("viewport", "desktop"))
    if viewport not in render.VIEWPORTS:
        raise StoreError(f"viewport must be one of {list(render.VIEWPORTS)}")
    doc = render.wrap(v["html"], STORE.get_design_system(p["pid"]), title=v["title"])
    out = render.screenshot(doc, STORE.png_path(p["pid"], p["vid"]), viewport=viewport,
                            full_height=b.get("height"))
    return 200, {"png": base64.b64encode(out.read_bytes()).decode(), "viewport": viewport}


ROUTES: list[tuple[str, re.Pattern[str], Route]] = [
    ("GET", re.compile(r"^/health$"), r_health),
    ("GET", re.compile(r"^/status$"), r_status),
    ("GET", re.compile(r"^/projects$"), r_projects),
    ("POST", re.compile(r"^/projects$"), r_create_project),
    ("GET", re.compile(r"^/projects/(?P<pid>[^/]+)$"), r_project),
    ("PUT", re.compile(r"^/projects/(?P<pid>[^/]+)/design-system$"), r_set_system),
    ("POST", re.compile(r"^/projects/(?P<pid>[^/]+)/rounds$"), r_create_round),
    ("POST", re.compile(r"^/projects/(?P<pid>[^/]+)/rounds/(?P<rid>[^/]+)$"), r_mark_round),
    ("GET", re.compile(r"^/projects/(?P<pid>[^/]+)/variants/(?P<vid>[^/]+)$"), r_variant),
    ("POST", re.compile(r"^/projects/(?P<pid>[^/]+)/variants/(?P<vid>[^/]+)/png$"), r_variant_png),
]
UNAUTHENTICATED = {("GET", "/health")}


def normalize_path(raw: str) -> str:
    path = urlsplit(raw).path
    if path == "/api" or path.startswith("/api/"):
        return path[4:] or "/"
    return path


def resolve(method: str, path: str) -> tuple[Route, Params] | None:
    for m, pattern, fn in ROUTES:
        match = pattern.match(path)
        if m == method and match:
            return fn, match.groupdict()
    return None


class Handler(BaseHTTPRequestHandler):
    server_version = f"design-studio/{__version__}"

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch("GET")

    def do_POST(self) -> None:  # noqa: N802
        self._dispatch("POST")

    def do_PUT(self) -> None:  # noqa: N802
        self._dispatch("PUT")

    def _dispatch(self, method: str) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            self._json(413, {"error": "body_too_large"})
            return
        body = self.rfile.read(length) if length > 0 else b""
        path = normalize_path(self.path)
        if (method, path) not in UNAUTHENTICATED and not verify_proxy_signature(
            self.headers.get(PROXY_HEADER, ""), method=method, target=self.path, body=body
        ):
            self._json(401, {"error": "invalid_proxy_signature"})
            return
        found = resolve(method, path)
        if found is None:
            self._json(404, {"error": "unknown_route", "path": path})
            return
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid_json"})
            return
        fn, params = found
        try:
            code, data = fn(params, payload if isinstance(payload, dict) else {})
        except (StoreError, ValueError) as exc:
            code, data = 400, {"error": str(exc)}
        except render.RenderError as exc:
            code, data = 503, {"error": str(exc)}
        except Exception as exc:  # keep serving on a handler bug
            print(f"500 {method} {path}: {exc!r}", file=sys.stderr, flush=True)
            code, data = 500, {"error": "internal"}
        self._json(code, data)

    def _json(self, code: int, data: Any) -> None:
        raw = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *_args: Any) -> None:
        return


def main() -> None:
    STORE.projects_dir.mkdir(parents=True, exist_ok=True)
    print(f"{APP_NAME} backend {__version__} on 127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
