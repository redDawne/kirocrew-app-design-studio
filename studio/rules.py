"""Static checks for the anti-AI-look rules (skills/anti-ai-look-design).

These catch the machine-checkable half of the rules in the variant markup.
The critic agent runs them, then judges the rest (hierarchy, alignment,
density) from the screenshot. Each finding names its rule id from SKILL.md.
"""
from __future__ import annotations

import re
from typing import Any

from . import design_system as ds

PLACEHOLDER_RE = re.compile(
    r"lorem ipsum|dolor sit amet|john doe|jane doe|acme(?: corp| inc)?\b|example user|"
    r"your (?:name|company|title) here|placeholder text|test@test|"
    r"(?<![\w.-])(?:john|jane)@(?:example|email|test)\.com|123 main st",
    re.I,
)
# Pictographic emoji only. Text glyphs a real UI uses (arrows, check marks
# like U+2713/U+2717, the shell prompt U+279C) are deliberately not matched.
EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U0001F000-\U0001F02F\U0001F1E6-\U0001F1FF☀-⛿"
    "✅✊✋✨❌❎❓-❕❗❤➕-➗⭐⭕️]"
)
GRADIENT_RE = re.compile(r"\bbg-gradient-to-[a-z]+\b|linear-gradient|radial-gradient", re.I)
AI_GRADIENT_STOP_RE = re.compile(r"\b(?:from|via|to)-(?:purple|violet|indigo|fuchsia|blue|pink|cyan)-\d{2,3}\b")
GLASS_RE = re.compile(r"\bbackdrop-blur(?:-[a-z0-9]+)?\b|backdrop-filter", re.I)
PALETTE_CLASS_RE = re.compile(
    r"\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|shadow|accent|decoration)-"
    r"(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|"
    r"violet|purple|fuchsia|pink|rose)-\d{2,3}\b"
)
NEUTRALS = {"slate", "gray", "zinc", "neutral", "stone"}
ARBITRARY_PX_RE = re.compile(r"\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-\[(\d+)px\]")
SPACING_STEP_RE = re.compile(r"(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.5)?)\b")
ARBITRARY_TEXT_RE = re.compile(r"\btext-\[(\d+)px\]")
# A scale-up on a text element fakes a size the type scale does not have.
SCALED_TEXT_RE = re.compile(r'class="[^"]*\btext-[a-z0-9]+\b[^"]*\bscale-(?:1[1-9]\d|[2-9]\d\d)\b[^"]*"'
                            r'|class="[^"]*\bscale-(?:1[1-9]\d|[2-9]\d\d)\b[^"]*\btext-[a-z0-9]+\b[^"]*"')
TEXT_SIZE_RE = re.compile(r"\btext-(xs|sm|base|lg|xl|[2-9]xl)\b")
CENTER_RE = re.compile(r"\btext-center\b")
HEX_IN_MARKUP_RE = re.compile(r"#[0-9a-fA-F]{6}\b")
SHADOW_RE = re.compile(r"\bshadow-(?:xl|2xl)\b")
IMG_NO_ALT_RE = re.compile(r"<img(?![^>]*\balt=)[^>]*>", re.I)


def _f(rule: str, severity: str, message: str, evidence: str = "") -> dict[str, Any]:
    out = {"rule": rule, "severity": severity, "message": message}
    if evidence:
        out["evidence"] = evidence[:160]
    return out


def check(html: str, system: dict[str, Any]) -> dict[str, Any]:
    """Run every static rule on *html*; return findings and a pass flag."""
    findings: list[dict[str, Any]] = []
    text_only = re.sub(r"<[^>]+>", " ", html)

    for m in PLACEHOLDER_RE.finditer(text_only):
        findings.append(_f("R5-real-content", "error", "Placeholder or stock-name content", m.group(0)))
        break
    emojis = EMOJI_RE.findall(text_only)
    if emojis:
        findings.append(_f("R7-no-emoji-icons", "error", f"{len(emojis)} emoji used as icons or decoration",
                           "".join(emojis[:8])))
    if GRADIENT_RE.search(html):
        stops = AI_GRADIENT_STOP_RE.findall(html)
        sev = "error" if stops else "warn"
        findings.append(_f("R6-no-default-gradients", sev,
                           "Gradient background" + (" in the default purple/blue range" if stops else
                                                    "; keep only if the design system calls for it")))
    if GLASS_RE.search(html):
        findings.append(_f("R8-no-default-glass", "error", "backdrop blur / glassmorphism"))

    hues = {m.group(1) for m in PALETTE_CLASS_RE.finditer(html)} - NEUTRALS
    if hues:
        findings.append(_f("R2-one-accent", "error" if len(hues) > 1 else "warn",
                           "Tailwind palette colours instead of design-system tokens (use accent / ink / muted / line)",
                           ", ".join(sorted(hues))))
    hexes = set(h.upper() for h in HEX_IN_MARKUP_RE.findall(html)) - set(system["colors"].values())
    if len(hexes) > 2:
        findings.append(_f("R2-one-accent", "warn", f"{len(hexes)} hard-coded colours outside the design system",
                           ", ".join(sorted(hexes)[:6])))

    base = system.get("spacingBase", 4)
    off_grid = sorted({int(n) for n in ARBITRARY_PX_RE.findall(html) if int(n) % base})
    halves = sorted({s for s in SPACING_STEP_RE.findall(html) if s.endswith(".5")} |
                    ({s for s in SPACING_STEP_RE.findall(html) if s in ("1", "3", "5", "7")} if base == 8 else set()))
    if off_grid or halves:
        findings.append(_f("R3-spacing-grid", "warn", f"Spacing off the {base}px grid",
                           ", ".join([f"{n}px" for n in off_grid] + [f"-{s}" for s in halves])))

    scale = system["typeScale"]
    if SCALED_TEXT_RE.search(html):
        findings.append(_f("R1-type-scale", "error", "Text enlarged with scale-*: use a type-scale size instead"))
    arb_text = sorted({int(n) for n in ARBITRARY_TEXT_RE.findall(html)} - set(scale))
    if arb_text:
        findings.append(_f("R1-type-scale", "error", "Font sizes outside the type scale",
                           ", ".join(f"{n}px" for n in arb_text)))
    sizes = set(TEXT_SIZE_RE.findall(html))
    unmapped = sorted(sizes - set(ds.SIZE_NAMES[:len(scale)]))
    if unmapped:
        findings.append(_f("R1-type-scale", "error", "Size classes the project's type scale does not define",
                           ", ".join(f"text-{s}" for s in unmapped)))
    if sizes and len(sizes) < 3:
        findings.append(_f("R1-type-scale", "warn", "Fewer than 3 type sizes: weak hierarchy", ", ".join(sorted(sizes))))
    if len(sizes) > 6:
        findings.append(_f("R1-type-scale", "warn", f"{len(sizes)} type sizes: too many steps", ", ".join(sorted(sizes))))

    centers = len(CENTER_RE.findall(html))
    blocks = max(1, len(re.findall(r"<(?:section|div|header|main|article)\b", html, re.I)))
    if centers >= 4 and centers / blocks > 0.25:
        findings.append(_f("R9-not-all-centered", "warn", f"{centers} centred blocks: layout reads as a template"))

    if len(SHADOW_RE.findall(html)) > 3:
        findings.append(_f("R10-quiet-surfaces", "warn", "Heavy shadows on many elements"))
    if IMG_NO_ALT_RE.search(html):
        findings.append(_f("R11-contrast-a11y", "error", "Image without alt text"))

    for row in ds.contrast_report(system):
        if not row["pass"]:
            findings.append(_f("R11-contrast-a11y", "error",
                               f"Design system: {row['fg']} on {row['bg']} is {row['ratio']}:1, needs {row['min']}:1"))

    errors = sum(1 for f in findings if f["severity"] == "error")
    return {"pass": errors == 0, "errors": errors, "warnings": len(findings) - errors, "findings": findings}
