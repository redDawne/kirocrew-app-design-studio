# Live test log (installed app, v0.1.0)

Newest last. Each entry: step, result, evidence.

## 2026-11-16 22:12 - step 1: enabled?
- PASS `kirocrew app info design-studio`: enabled, v0.1.0, source /Volumes/CaseSensitive/repo/kirocrew-app-design-studio.
- PASS backend up: `data/logs/backend.log` "on 127.0.0.1:9100"; bundle `GET /apps/design-studio/ui/dist/index.mjs` -> 200.
- BLOCKED headless page load: `kirocrew token` refused from an agent shell (403, "could not verify this process as the local owner"); browser tool refuses loopback origins.
- Evidence the page works: the user's page created project `fishing-game-stats-6a1d36` through the backend, and started the critic on the live-test round.

## 2026-11-16 22:12 - BUG 1: no agents registered
- gateway.log: `agent design-studio-designer.json has an unresolved placeholder {APP_ROOT} - not registered` (x3).
- Cause: this Kiro Crew fills {APP_ROOT}/{APP_DATA} only for built-in apps.
- Knock-on: the page's critic send failed: `Bot 'design-studio-critic' is unavailable` (an unknown agent name is read as a Bot).
- FIX 7cbf737: MCP server declared in app.json (`design-studio:studio`, autoApprove), agents use `@design-studio:studio`, server finds data/ next to its code, rules via `get_rules` tool.
- BLOCKED `kirocrew app update` from an agent shell (same 403). The user must press Update.

## 2026-11-16 22:15 - step 3: agent sandbox can write app data
- PASS a real Kiro Crew background agent called the INSTALLED MCP server (`tools/mcp_call.py`) with no DESIGN_STUDIO_DATA set: 3 variants saved and reviewed with critic notes in `data/projects/habit-tracker-live-test-522244/`, PNGs rendered there by Chrome from inside the agent sandbox.
- It stopped at the usage limit after starting the refine round (v-56ae7558 draft).
- NOT YET: kiro-cli starting the server itself for a registered app agent (needs the update).

## 2026-11-17 12:20 - step 2: full flow (tools level, installed copy)
- Resumed after the usage limit. Done by hand through the installed MCP server (`tools/mcp_call.py`), not through registered agents (still unregistered until Update).
- PASS round r-ea574cae: 3 variants reviewed (Dense checklist, Editorial daily brief, Bento habit tiles).
- PASS refine round r-ebf0f591 from v-3e02508c, comment "Make the streak the hero...": v-56ae7558 reviewed, round status `ready`.
- PASS exports: React `StreakFirstBrief` saved (5,379 bytes), HTML download built with `render.wrap`, PNG 390x844 rendered by `render_variant`.
- BUG 2 (critic catch): the designer faked a bigger number with `scale-150`; the checker missed it. FIX: R1 now flags `scale-*` on text; test added.
- Outputs: `examples/live-habit/`.
- NOT TESTED: the page's own buttons (Generate, Pick, Refine, Export) end to end; needs the dashboard login, which agents cannot get.
