"""Turn a variant into a standalone page, and a page into a PNG.

`wrap()` builds the document every surface uses (the page's iframe, the HTML
download, the screenshot): the variant markup plus the vendored Tailwind play
script and a Tailwind config generated from the project's design system. No
network is needed to render.

`screenshot()` drives a local headless Chrome. Chrome's own sandbox cannot
start inside the Kiro Crew agent sandbox, so it is tried first and, if it
fails, retried with `--no-sandbox`. The page is a local file, and DNS is mapped
to nothing so it cannot fetch anything either way.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from . import design_system as ds
from . import png

MIN_WINDOW_WIDTH = 500
CHROME_HEIGHT_SLACK = 200
VENDOR = Path(__file__).resolve().parent / "vendor" / "tailwind-play.js"

VIEWPORTS = {
    "desktop": (1440, 900),
    "laptop": (1280, 800),
    "tablet": (834, 1112),
    "mobile": (390, 844),
}

_CHROME_CANDIDATES = (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "msedge",
    # Windows installs (per-machine, 32-bit folder, per-user), then Edge.
    os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
    os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
)

_BODY_RE = re.compile(r"<body[^>]*>(.*)</body>", re.S | re.I)
_SCRIPT_SRC_RE = re.compile(r"<script[^>]+src=[\"'][^\"']*tailwind[^\"']*[\"'][^>]*>\s*</script>", re.I)


def _tailwind_js() -> str:
    return VENDOR.read_text(encoding="utf-8")


def body_of(html: str) -> str:
    """The markup inside <body>, or the input as-is when it is a fragment."""
    m = _BODY_RE.search(html)
    return m.group(1) if m else html


def wrap(html: str, system: dict[str, Any], *, title: str = "Design Studio variant") -> str:
    """A standalone HTML document for *html* styled by *system*."""
    cfg = json.dumps(ds.tailwind_config(system))
    body = _SCRIPT_SRC_RE.sub("", body_of(html))
    safe_title = re.sub(r"[<>&\"]", "", title)[:120]
    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        f"<title>{safe_title}</title>\n"
        f"<script>{_tailwind_js()}</script>\n"
        f"<script>tailwind.config = {cfg};</script>\n"
        "<style>html,body{margin:0}body{-webkit-font-smoothing:antialiased}</style>\n"
        "</head>\n"
        f"<body class=\"bg-bg text-ink font-sans text-base\">\n{body}\n</body>\n</html>\n"
    )


def find_chrome() -> str | None:
    override = os.environ.get("DESIGN_STUDIO_CHROME")
    if override and Path(override).is_file():
        return override
    for c in _CHROME_CANDIDATES:
        if os.path.isabs(c):
            if Path(c).is_file():
                return c
        elif shutil.which(c):
            return shutil.which(c)
    pw = Path.home() / "Library" / "Caches" / "ms-playwright"
    for exe in sorted(pw.glob("chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium"), reverse=True):
        return str(exe)
    for exe in sorted((Path.home() / ".cache" / "ms-playwright").glob("chromium-*/chrome-linux*/chrome"), reverse=True):
        return str(exe)
    return None


class RenderError(RuntimeError):
    pass


def screenshot(document: str, out_png: Path, *, viewport: str = "desktop", full_height: int | None = None,
               timeout: int = 60) -> Path:
    """Render *document* (a full HTML page) to *out_png* with headless Chrome."""
    chrome = find_chrome()
    if not chrome:
        raise RenderError("no Chrome/Chromium found; install Google Chrome or set DESIGN_STUDIO_CHROME")
    w, h = VIEWPORTS.get(viewport, VIEWPORTS["desktop"])
    if full_height:
        h = max(h, min(int(full_height), 4000))
    out_png = Path(out_png)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    # Chrome lays out at least 500px wide and its window height includes browser
    # chrome: capture a larger window, pin the body to the viewport width, crop.
    win_w, win_h = max(w, MIN_WINDOW_WIDTH), h + CHROME_HEIGHT_SLACK
    if w < win_w:
        document = document.replace("</head>", f"<style>body{{width:{w}px;overflow-x:hidden}}</style>\n</head>", 1)
    with tempfile.TemporaryDirectory(prefix="ds-render-") as tmp:
        page = Path(tmp) / "page.html"
        page.write_text(document, encoding="utf-8")
        target = Path(tmp) / "shot.png"
        base = [
            chrome, "--headless=new", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
            "--disable-extensions", "--disable-background-networking", "--disable-sync",
            "--host-resolver-rules=MAP * ~NOTFOUND", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
            "--force-device-scale-factor=1", "--virtual-time-budget=4000",
            f"--user-data-dir={tmp}/profile", f"--window-size={win_w},{win_h}", f"--screenshot={target}",
            page.as_uri(),
        ]
        errors = []
        for extra in ([], ["--no-sandbox"]):
            argv = base[:1] + extra + base[1:]
            try:
                proc = subprocess.run(argv, capture_output=True, text=True, timeout=timeout)
            except subprocess.TimeoutExpired:
                errors.append("timed out")
                continue
            if target.is_file() and target.stat().st_size > 0:
                out_png.write_bytes(png.crop(target.read_bytes(), w, h))
                return out_png
            tail = (proc.stderr or "").strip().splitlines()[-1:] or ["no output"]
            errors.append(tail[0][:300])
        raise RenderError("Chrome could not render: " + " | ".join(errors))
