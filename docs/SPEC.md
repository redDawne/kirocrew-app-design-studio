# Design Studio: spec

A Claude-Design-like space inside Kiro Crew. A developer with little visual
design background describes a screen, gets 3-4 structurally different
directions that do not look AI-generated, picks one, refines it with
comments, and exports it. Built only from Kiro Crew's own agents (Claude
models), a rules skill, local tools and an app page. It never calls or embeds
claude.ai.

## Goals

- Output a designer would not dismiss as "AI look" on sight.
- Rules that are concrete and checkable, not taste adjectives.
- Everything local: no web fonts, CDNs, image URLs or external services at
  render time. Servers bind 127.0.0.1.
- Works end to end even when plain; quality comes from the rules and the
  critic pass, not from UI polish.

## Phase 1: app screens (built)

### User flow

1. **Project**: name + app type (dashboard, mobile, marketing, content, form).
   Creating one writes a default design system for that type.
2. **Prompt**: describe a screen, choose 3 or 4 variants, **Generate**.
3. **Designer** agent saves each variant as a draft. Cards appear as they land.
4. When the round has all its drafts, the page sends the round to the
   **critic** agent, which runs the static checks, renders each draft to PNG,
   looks at it, fixes it, and saves it as **reviewed**.
5. **Pick this one** opens the detail view: large preview (desktop/mobile),
   rule findings, critic notes.
6. **Refine**: a comment plus 1-3 takes starts a new round whose parent is
   the picked variant. Same designer -> critic loop.
7. **Export**: Copy HTML, Download HTML (standalone, Tailwind inlined),
   Download PNG (local headless Chrome), **Export React + Tailwind** (exporter
   agent writes one shadcn/ui-style `.tsx`; the page shows it with Copy).
8. **Design system** tab: edit colours, fonts, radii, spacing grid, type
   scale, app type; shows the WCAG AA contrast report.

### Architecture

```
 Dashboard page (ui/, React, SDK)            Agents (kiro-cli, Claude)
 ┌──────────────────────────────┐            ┌──────────────────────────┐
 │ projects · prompt · grid     │ /api/chat  │ design-studio-designer   │
 │ sandboxed iframes (srcdoc)   │──────────► │ design-studio-critic     │
 │ detail · refine · export     │ (slots per │ design-studio-exporter   │
 │ design-system editor         │  project + │  + skill anti-ai-look-   │
 └──────────────┬───────────────┘   role)    │    design (resource)     │
                │ /apps/design-studio/api/*  └────────────┬─────────────┘
                │ (gateway proxy, HMAC-signed)            │ stdio MCP
 ┌──────────────▼───────────────┐            ┌────────────▼─────────────┐
 │ backend/server.py (stdlib,   │            │ mcp/server.py (stdlib)   │
 │ 127.0.0.1:$PORT)             │            │ list/get project, save/  │
 └──────────────┬───────────────┘            │ load variant, check,     │
                │                            │ render PNG, save export  │
                └──────────────┬─────────────┴──────────────────────────┘
                     studio/ (shared, stdlib)
                     store.py · design_system.py · rules.py · render.py · png.py
                     vendor/tailwind-play.js (v3.4.17, MIT)
                               │
                ~/.kiro/crew/apps/design-studio/data/projects/<pid>/
```

- **Orchestration** follows HTML Studio: the page owns the loop. It
  get-or-creates one chat slot per project and role
  (`design-studio-<role>-<pid>`) with `POST /api/chat/slots`, and sends with
  `POST /api/chat`. Agents cannot call each other, so the page starts the
  critic when a round's drafts are complete (once, recorded as
  `criticRequested` on the round). The page polls the backend every 3 s
  while any round is unfinished.
- **Round status** is derived, never stored: `designing` (fewer variants than
  requested) -> `reviewing` (all present, some draft) -> `ready` (all
  reviewed).
- **Rendering**: `render.wrap()` builds one standalone document (body markup +
  inlined Tailwind + a Tailwind config generated from the design system). The
  iframe, HTML download and PNG all use it. `fontSize` is set in `theme`
  (not `extend`), so only the project's scale exists.
- **Screenshots**: headless Chrome. Chrome's own sandbox cannot start inside
  Kiro Crew's sandbox, so it is tried first, then `--no-sandbox` with
  SwiftShader and all DNS mapped to nothing. Chrome will not lay out below
  500px wide and counts browser chrome in the window height, so the capture
  window is larger and `png.py` crops to the exact viewport.
- **Previews** are `<iframe sandbox="allow-scripts" srcdoc>`: scripts run
  (Tailwind) but the frame is a unique origin and cannot reach the dashboard.
- **Security**: backend verifies the gateway HMAC on every route except
  `/health`; ids are validated against `^[a-z0-9][a-z0-9-]{0,63}$` before any
  path is built; input sizes are capped; design-system values are validated
  (hex colours, font stacks without `;{}<>`).

### Rules (skills/anti-ai-look-design)

R1 type scale, R2 one accent, R3 spacing grid, R4 alignment, R5 real
content, R6 no default gradients, R7 no emoji icons, R8 no glass, R9 not all
centred, R10 quiet surfaces, R11 contrast/a11y, R12 density per app type.
`[auto]` parts are checked by `studio/rules.py`; `[look]` parts by the
critic on the rendered PNG.

### File layout

```
app.json                     manifest (validated with Kiro Crew's AppManifest.validate)
agents/design-studio-*.json  designer, critic, exporter
skills/anti-ai-look-design/  the rules
mcp/server.py                stdio MCP server for the agents
backend/server.py            HTTP backend for the page
studio/                      shared core (store, design system, rules, render, png)
ui/                          React page; ui/dist/ is committed
tests/                       unittest/pytest: core, MCP, HTTP end to end
tools/mcp_call.py            call one MCP tool over stdio (testing without Kiro Crew)
examples/                    the 3 quality-test prompts: PNG, HTML, critic notes, export
assets/                      store icon and hero
docs/SPEC.md                 this file
capture/, CHECKLIST.md       store-readiness harness from kirocrew-app-template
```

## Phase 2: graphics (designed, not built)

Same project, rules-first approach, a new artifact kind.

- **Kinds**: `icon` (24px grid, 1.5px stroke, set of N), `illustration`
  (spot/hero, flat shapes), `hero-art` (abstract composition for a marketing
  hero), `pattern`.
- **Format**: SVG only, inline, no raster, no external refs. Palette locked to
  the design system plus at most two tints of the accent.
- **Agents**: `design-studio-illustrator` (generates), reuse the critic with
  a second skill `anti-ai-look-graphics`: no glossy 3D blobs, no
  gradient-mesh "AI orbs", no faceless purple people, consistent stroke and
  corner radius across a set, optical alignment on the grid, meaning over
  decoration, max N colours, works at 1x and in monochrome.
- **Checks** (`studio/svg_rules.py`): parse SVG with `xml.etree`; flag
  `<image>`, `href` to anything but `#`, filters/blur, gradients outside
  tokens, stroke widths outside the set, colours outside the palette, path
  count/complexity budgets, `viewBox` not on the grid.
- **Store**: `projects/<pid>/graphics/<gid>.svg|.json`, same rounds model
  (`kind` field on the round).
- **Page**: a Graphics tab; grid of SVG previews on light and dark surfaces;
  icon sets shown at 16/20/24px; export SVG, PNG at 1x/2x, a React component
  per icon (`lucide`-style props).
- **Use in screens**: the designer may reference a saved graphic by id; the
  wrapper inlines it at render time.

## Risks and open questions

| Risk | Impact | Mitigation / status |
|---|---|---|
| Agent sandbox may block the MCP server writing `{APP_DATA}` | Agents cannot save variants | Untested in a live install. Fallback: route saves through the backend (`agentTools` once third-party apps get them, or an app-token call). |
| `--no-sandbox` Chrome renders agent-written HTML | A Chrome exploit in a variant runs with app privileges | Local file only, DNS mapped to nothing, Kiro Crew's own sandbox still applies. Sandboxed launch is tried first. |
| No Chrome on the machine | No critic screenshots, no PNG export | Page warns; previews still work; `DESIGN_STUDIO_CHROME` and Playwright's Chromium are searched. |
| Critic is started by the page | Closing the page mid-round leaves drafts unreviewed | The critic is sent as soon as drafts are complete while the page is open; if it was closed then, it is sent on next open. The designer also self-checks with `check_variant`. |
| Static checks catch few real defects | "0 errors" looks safer than it is | The critic must render and look; the skill says so. Examples show most fixes came from screenshots. |
| Agent and slot request shapes (`/api/chat`, `/api/chat/slots`) taken from HTML Studio | A host change breaks orchestration | Pinned to HTML Studio's working pattern; untested live here. |
| Store screenshots | Store wants real product UI | Current `screenshots` are example outputs; capture the page with `capture/capture.py` after install. |
