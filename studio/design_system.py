"""Per-project design system: tokens, validation, contrast, Tailwind config.

A design system is a small JSON object. Every variant in a project is rendered
with a Tailwind config generated from it, so `bg-surface`, `text-ink`,
`text-accent`, `rounded-md`, `font-display` mean the same thing in every
variant and the user can restyle all of them by editing one file.
"""
from __future__ import annotations

import json
import re
from typing import Any

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
COLOR_KEYS = ("bg", "surface", "ink", "muted", "line", "accent", "accentInk", "danger", "success")
FONT_KEYS = ("sans", "display", "mono")
RADIUS_KEYS = ("sm", "md", "lg")
# Tailwind size classes in scale order. The scale REPLACES Tailwind's sizes (theme,
# not extend), so a class past the scale's length draws nothing and the checker flags it.
SIZE_NAMES = ("xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl")
APP_TYPES = ("dashboard", "mobile", "marketing", "content", "form")

# Density per app type: the base font size and the default row/section rhythm
# the rules skill refers to. Kept here so the page can show it next to the tokens.
DENSITY = {
    "dashboard": {"baseFont": 14, "rowHeight": 40, "sectionGap": 24},
    "mobile": {"baseFont": 16, "rowHeight": 56, "sectionGap": 24},
    "marketing": {"baseFont": 18, "rowHeight": 48, "sectionGap": 96},
    "content": {"baseFont": 18, "rowHeight": 48, "sectionGap": 48},
    "form": {"baseFont": 16, "rowHeight": 44, "sectionGap": 32},
}

_DEFAULT = {
    "colors": {
        "bg": "#F7F6F3",
        "surface": "#FFFFFF",
        "ink": "#1B1A17",
        "muted": "#64615A",
        "line": "#E4E1DA",
        "accent": "#B4441C",
        "accentInk": "#FFFFFF",
        "danger": "#B42318",
        "success": "#2F6B3A",
    },
    "fonts": {
        "sans": "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
        "display": "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
        "mono": "'SF Mono', ui-monospace, Menlo, Consolas, monospace",
    },
    "radii": {"sm": 4, "md": 6, "lg": 10},
    "spacingBase": 4,
    "typeScale": [12, 14, 16, 18, 20, 24, 32, 44],
}


def default_system(app_type: str = "dashboard") -> dict[str, Any]:
    system = json.loads(json.dumps(_DEFAULT))
    system["appType"] = app_type if app_type in APP_TYPES else "dashboard"
    if system["appType"] in ("dashboard", "form"):
        system["fonts"]["display"] = system["fonts"]["sans"]
    return system


def validate(system: Any) -> dict[str, Any]:
    """Return a clean copy of *system* or raise ValueError naming the bad field."""
    if not isinstance(system, dict):
        raise ValueError("design system must be an object")
    base = default_system(str(system.get("appType", "dashboard")))
    colors = system.get("colors") or {}
    for k in COLOR_KEYS:
        v = colors.get(k, base["colors"][k])
        if not isinstance(v, str) or not HEX_RE.match(v):
            raise ValueError(f"colors.{k} must be a #RRGGBB hex colour")
        base["colors"][k] = v.upper()
    fonts = system.get("fonts") or {}
    for k in FONT_KEYS:
        v = fonts.get(k, base["fonts"][k])
        if not isinstance(v, str) or not v.strip() or len(v) > 200 or re.search(r"[;{}<>]", v):
            raise ValueError(f"fonts.{k} must be a plain font stack")
        base["fonts"][k] = v.strip()
    radii = system.get("radii") or {}
    for k in RADIUS_KEYS:
        v = radii.get(k, base["radii"][k])
        if not isinstance(v, (int, float)) or isinstance(v, bool) or not 0 <= v <= 32:
            raise ValueError(f"radii.{k} must be a number from 0 to 32")
        base["radii"][k] = v
    sb = system.get("spacingBase", 4)
    if sb not in (4, 8):
        raise ValueError("spacingBase must be 4 or 8")
    base["spacingBase"] = sb
    scale = system.get("typeScale", base["typeScale"])
    if (not isinstance(scale, list) or not 4 <= len(scale) <= 9
            or not all(isinstance(n, int) and 10 <= n <= 96 for n in scale)
            or scale != sorted(set(scale))):
        raise ValueError("typeScale must be 4-9 ascending integers between 10 and 96")
    base["typeScale"] = scale
    return base


# ------------------------------------------------------------------ contrast
def _lum(hex_color: str) -> float:
    def ch(c: int) -> float:
        s = c / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a: str, b: str) -> float:
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return round((la + 0.05) / (lb + 0.05), 2)


CONTRAST_PAIRS = (
    ("ink", "bg", 4.5),
    ("ink", "surface", 4.5),
    ("muted", "bg", 4.5),
    ("muted", "surface", 4.5),
    ("accentInk", "accent", 4.5),
    ("accent", "surface", 3.0),  # accent used for icons, borders, large text
    ("danger", "surface", 4.5),  # status text
    ("success", "surface", 4.5),
)


def contrast_report(system: dict[str, Any]) -> list[dict[str, Any]]:
    c = system["colors"]
    return [
        {"fg": fg, "bg": bg, "ratio": contrast(c[fg], c[bg]), "min": need,
         "pass": contrast(c[fg], c[bg]) >= need}
        for fg, bg, need in CONTRAST_PAIRS
    ]


# ------------------------------------------------------------- tailwind config
def tailwind_config(system: dict[str, Any]) -> dict[str, Any]:
    c = system["colors"]
    f = system["fonts"]
    r = system["radii"]
    scale = system["typeScale"]
    font_size = {}
    for name, px in zip(SIZE_NAMES, scale):
        lh = 1.5 if px <= 18 else 1.25 if px <= 32 else 1.1
        font_size[name] = [f"{px}px", {"lineHeight": str(lh)}]
    return {
        "theme": {
            "fontSize": font_size,
            "extend": {
                "colors": {
                    "bg": c["bg"], "surface": c["surface"], "ink": c["ink"], "muted": c["muted"],
                    "line": c["line"], "accent": c["accent"], "accent-ink": c["accentInk"],
                    "danger": c["danger"], "success": c["success"],
                },
                "fontFamily": {k: [f[k]] for k in FONT_KEYS},
                "borderRadius": {k: f"{r[k]}px" for k in RADIUS_KEYS},
                "borderColor": {"DEFAULT": c["line"]},
            }
        }
    }
