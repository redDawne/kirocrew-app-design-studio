import { jsxs as s, jsx as e, Fragment as T } from "react/jsx-runtime";
import { useAppApi as L, useNavigate as _ } from "@kirocrew/app-sdk";
import { PageHeader as W } from "@kirocrew/app-sdk/ui";
import { useMemo as V, useState as h, useCallback as z, useEffect as C, useRef as q, useLayoutEffect as H } from "react";
const N = "/apps/design-studio/api";
function B(t) {
  const a = encodeURIComponent;
  return {
    status: () => t.get(`${N}/status`),
    projects: () => t.get(`${N}/projects`),
    createProject: (r, d) => t.post(`${N}/projects`, { name: r, appType: d }),
    project: (r) => t.get(`${N}/projects/${a(r)}`),
    saveSystem: (r, d) => t.put(`${N}/projects/${a(r)}/design-system`, { designSystem: d }),
    createRound: (r, d) => t.post(`${N}/projects/${a(r)}/rounds`, d),
    markRound: (r, d, c) => t.post(`${N}/projects/${a(r)}/rounds/${a(d)}`, c),
    variant: (r, d) => t.get(`${N}/projects/${a(r)}/variants/${a(d)}`),
    png: (r, d, c) => t.post(`${N}/projects/${a(r)}/variants/${a(d)}/png`, { viewport: c })
  };
}
const I = {
  designer: "design-studio-designer",
  critic: "design-studio-critic",
  exporter: "design-studio-exporter"
};
function K(t, a) {
  return `design-studio-${a}-${t}`.slice(0, 120);
}
async function E(t, a, r, d, c) {
  const u = K(a, d), g = await t.post("/api/chat/slots", {
    name: u,
    agent: I[d],
    title: `Design Studio · ${r} · ${d}`
  }), i = (g == null ? void 0 : g.key) || u;
  return await t.post("/api/chat?ws=1", { message: c, slot: i, agent: I[d] }), i;
}
function U(t, a) {
  const r = a.parent ? `Refinement round: parent variant ${a.parent}. User comment: "${a.comment}".` : "New round.";
  return [
    `Design Studio project ${t}, round ${a.id}. ${r}`,
    `Make ${a.count} variant(s) for: ${a.prompt || "(see parent)"}`,
    "Follow your instructions: get_project first, save each variant as draft, fix check errors."
  ].join(`
`);
}
function Z(t, a) {
  return `Design Studio project ${t}, round ${a.id}. Review every draft variant in this round, fix it, and save it as reviewed.`;
}
function J(t, a) {
  return `Design Studio project ${t}, variant ${a}. Export it as one React + Tailwind (shadcn/ui) component and save_export it.`;
}
function M(t, a, r) {
  const d = URL.createObjectURL(new Blob([a], { type: r })), c = document.createElement("a");
  c.href = d, c.download = t, c.click(), setTimeout(() => URL.revokeObjectURL(d), 1e3);
}
function Q(t) {
  const a = atob(t), r = new Uint8Array(new ArrayBuffer(a.length));
  for (let d = 0; d < a.length; d++) r[d] = a.charCodeAt(d);
  return r;
}
const X = `
.ds-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--text);font-size:14px}
.ds-body{display:flex;flex:1;min-height:0;border-top:1px solid var(--border)}
.ds-rail{width:240px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;padding:16px}
.ds-rail ul{list-style:none;margin:16px 0 0;padding:0}
.ds-rail li button{display:flex;flex-direction:column;align-items:flex-start;width:100%;padding:8px 12px;border-radius:6px;background:none;border:0;color:inherit;text-align:left;cursor:pointer}
.ds-rail li button:hover{background:var(--bg-hover)}
.ds-rail li button[aria-current]{background:var(--bg-elevated);box-shadow:inset 2px 0 0 var(--accent)}
.ds-rail small{color:var(--muted);font-size:12px}
.ds-new{display:flex;flex-direction:column;gap:8px}
.ds-new label,.ds-prompt>label,.ds-side h4,.ds-system legend{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.ds-main{flex:1;min-width:0;overflow-y:auto;padding:16px 24px 48px}
.ds-root input,.ds-root select,.ds-root textarea{background:var(--bg-elevated);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font:inherit;min-width:0}
.ds-root textarea{width:100%;resize:vertical;box-sizing:border-box}
.ds-root input:focus-visible,.ds-root select:focus-visible,.ds-root textarea:focus-visible,.ds-root button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.ds-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ds-spacer{flex:1}
.ds-btn{border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);border-radius:6px;padding:6px 12px;font:inherit;cursor:pointer;min-height:32px}
.ds-btn:hover:not(:disabled){background:var(--bg-hover)}
.ds-btn:disabled{opacity:.5;cursor:default}
.ds-primary{background:var(--accent);border-color:var(--accent);color:var(--accent-fg,#fff)}
.ds-primary:hover:not(:disabled){background:var(--accent);filter:brightness(1.08)}
.ds-link{background:none;border:0;color:var(--accent);cursor:pointer;font:inherit;padding:4px}
.ds-muted{color:var(--muted);margin:4px 0}
.ds-small{color:var(--muted);font-size:12px;margin:4px 0}
.ds-inline{display:flex;align-items:center;gap:8px;color:var(--muted)}
.ds-error,.ds-warn{margin:8px 24px;padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between;gap:8px}
.ds-error{background:color-mix(in srgb,var(--danger) 12%,transparent);border:1px solid var(--danger)}
.ds-warn{background:color-mix(in srgb,var(--warn) 12%,transparent);border:1px solid var(--warn)}
.ds-error button{background:none;border:0;color:inherit;cursor:pointer;font-size:16px}
.ds-empty{max-width:480px;margin:64px auto;color:var(--muted)}
.ds-empty h2{color:var(--text);font-size:20px}
.ds-projhead{display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap}
.ds-projhead h2{font-size:20px;margin:0;font-weight:600}
.ds-tabs{display:inline-flex;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.ds-tabs button{background:none;border:0;padding:6px 12px;color:var(--muted);cursor:pointer;font:inherit}
.ds-tabs button[aria-selected=true]{background:var(--bg-elevated);color:var(--text);font-weight:600}
.ds-prompt{display:flex;flex-direction:column;gap:8px;max-width:880px;margin-bottom:24px}
.ds-round{margin-bottom:32px}
.ds-round header{display:flex;align-items:baseline;gap:16px;margin-bottom:12px}
.ds-roundtitle{margin:0;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds-status{font-size:12px;color:var(--muted);white-space:nowrap}
.ds-designing::before,.ds-reviewing::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warn);margin-right:6px;animation:ds-pulse 1.2s infinite}
@media (prefers-reduced-motion:reduce){.ds-designing::before,.ds-reviewing::before{animation:none}}
@keyframes ds-pulse{50%{opacity:.3}}
.ds-grid{display:grid;gap:16px}
.ds-card{border:1px solid var(--border);border-radius:8px;background:var(--card);overflow:hidden;display:flex;flex-direction:column}
.ds-pending{min-height:240px;align-items:center;justify-content:center;color:var(--muted)}
.ds-thumbbtn{display:block;width:100%;padding:0;border:0;border-bottom:1px solid var(--border);background:var(--bg);cursor:zoom-in}
.ds-thumb{height:200px}
.ds-frame{position:relative;width:100%;overflow:hidden;background:#fff}
.ds-frame iframe{position:absolute;top:0;left:0;border:0;transform-origin:0 0;pointer-events:none}
.ds-detail .ds-frame iframe{pointer-events:auto}
.ds-detail .ds-frame{border:1px solid var(--border);border-radius:8px}
.ds-cardbody{padding:12px 16px;display:flex;flex-direction:column;gap:4px;flex:1}
.ds-cardbody h3{font-size:15px;margin:0;font-weight:600}
.ds-cardbody .ds-btn{align-self:flex-start;margin-top:auto}
.ds-chip{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--border);color:var(--muted)}
.ds-ok{color:var(--text);border-color:var(--accent)}
.ds-detail>.ds-row{margin-bottom:12px}
.ds-detail h3{margin:0 8px;font-size:16px}
.ds-detailgrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}
@media (max-width:1100px){.ds-detailgrid{grid-template-columns:1fr}}
.ds-side{display:flex;flex-direction:column;gap:24px}
.ds-side section{display:flex;flex-direction:column;gap:8px}
.ds-side h4{margin:0}
.ds-btns{display:flex;flex-wrap:wrap;gap:8px}
.ds-code pre{max-height:360px;overflow:auto;background:var(--bg-elevated);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:12px;margin:8px 0 0}
.ds-findings{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px;font-size:13px}
.ds-findings code{font-size:11px;color:var(--muted)}
.ds-err{color:var(--danger)}
.ds-pre{white-space:pre-wrap;margin:0}
.ds-system{max-width:880px;display:flex;flex-direction:column;gap:24px}
.ds-system fieldset{border:1px solid var(--border);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;margin:0}
.ds-colors{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.ds-color{display:flex;align-items:center;gap:12px}
.ds-color input{width:40px;height:40px;padding:2px;cursor:pointer}
.ds-color span{display:flex;flex-direction:column}
.ds-color small{color:var(--muted);font-family:ui-monospace,monospace}
.ds-field{display:flex;flex-direction:column;gap:4px;color:var(--muted);font-size:13px}
.ds-narrow{width:140px}
.ds-contrast{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.ds-contrast li{display:flex;align-items:center;gap:8px;font-size:13px}
.ds-swatch{display:inline-flex;align-items:center;justify-content:center;width:40px;height:28px;border-radius:4px;border:1px solid var(--border);font-weight:600}
`, O = { desktop: [1440, 900], mobile: [390, 844] }, Y = 3e3;
function me() {
  const t = L(), a = _(), r = V(() => B(t), [t]), [d, c] = h([]), [u, g] = h(null), [i, o] = h(null), [n, l] = h("design"), [b, v] = h(null), [k, j] = h(null), [A, D] = h(void 0), f = z((p) => j(p instanceof Error ? p.message : String(p)), []), $ = z(() => r.projects().then((p) => c(p.projects)).catch(f), [r, f]), y = z(async () => {
    if (u)
      try {
        o(await r.project(u));
      } catch (p) {
        f(p);
      }
  }, [r, u, f]);
  C(() => {
    $(), r.status().then((p) => D(p.chrome)).catch(() => D(null));
  }, [r, $]), C(() => {
    o(null), v(null), y();
  }, [u, y]);
  const w = i == null ? void 0 : i.rounds[i.rounds.length - 1], S = !!i && (i.rounds.some((p) => p.status !== "ready") || ee(i));
  C(() => {
    if (!S) return;
    const p = setInterval(y, Y);
    return () => clearInterval(p);
  }, [S, y]), C(() => {
    !i || !w || w.status !== "reviewing" || w.criticRequested || r.markRound(i.id, w.id, { criticRequested: !0 }).then(() => E(t, i.id, i.name, "critic", Z(i.id, w))).then(y).catch(f);
  }, [i, w, t, r, y, f]);
  const R = (p) => i && a(`/chat?sid=${encodeURIComponent(`design-studio-${p}-${i.id}`)}`);
  return /* @__PURE__ */ s("div", { className: "ds-root", children: [
    /* @__PURE__ */ e("style", { children: X }),
    /* @__PURE__ */ e(W, { title: "Design Studio", subtitle: "Describe a screen. Get distinct, reviewed directions. Refine one. Export it." }),
    k && /* @__PURE__ */ s("div", { className: "ds-error", role: "alert", children: [
      k,
      /* @__PURE__ */ e("button", { onClick: () => j(null), "aria-label": "Dismiss", children: "×" })
    ] }),
    A === null && /* @__PURE__ */ e("div", { className: "ds-warn", children: "No Chrome or Chromium found: the critic cannot see screenshots and PNG export is off." }),
    /* @__PURE__ */ s("div", { className: "ds-body", children: [
      /* @__PURE__ */ e(
        ne,
        {
          projects: d,
          pid: u,
          onPick: (p) => {
            g(p), l("design");
          },
          onCreate: async (p, m) => {
            try {
              const x = await r.createProject(p, m);
              await $(), g(x.id);
            } catch (x) {
              f(x);
            }
          }
        }
      ),
      /* @__PURE__ */ e("main", { className: "ds-main", children: i ? /* @__PURE__ */ s(T, { children: [
        /* @__PURE__ */ s("div", { className: "ds-projhead", children: [
          /* @__PURE__ */ e("h2", { children: i.name }),
          /* @__PURE__ */ s("div", { className: "ds-tabs", role: "tablist", children: [
            /* @__PURE__ */ e("button", { role: "tab", "aria-selected": n === "design", onClick: () => l("design"), children: "Screens" }),
            /* @__PURE__ */ e("button", { role: "tab", "aria-selected": n === "system", onClick: () => l("system"), children: "Design system" })
          ] }),
          /* @__PURE__ */ e("span", { className: "ds-spacer" }),
          /* @__PURE__ */ e("button", { className: "ds-link", onClick: () => R("designer"), children: "Designer chat" }),
          /* @__PURE__ */ e("button", { className: "ds-link", onClick: () => R("critic"), children: "Critic chat" })
        ] }),
        n === "system" ? /* @__PURE__ */ e(de, { project: i, onSave: async (p) => {
          try {
            await r.saveSystem(i.id, p), await y();
          } catch (m) {
            f(m);
          }
        } }) : b ? /* @__PURE__ */ e(
          re,
          {
            project: i,
            vid: b,
            onBack: () => v(null),
            fail: f,
            onRefine: async (p, m) => {
              const x = await r.createRound(i.id, { prompt: "", count: m, parent: b, comment: p });
              await E(t, i.id, i.name, "designer", U(i.id, x)), v(null), await y();
            },
            onExport: async () => {
              await E(t, i.id, i.name, "exporter", J(i.id, b)), P.add(`${i.id}/${b}`), await y();
            }
          }
        ) : /* @__PURE__ */ e(
          se,
          {
            project: i,
            onPick: v,
            onGenerate: async (p, m) => {
              try {
                const x = await r.createRound(i.id, { prompt: p, count: m });
                await E(t, i.id, i.name, "designer", U(i.id, x)), await y();
              } catch (x) {
                f(x);
              }
            }
          }
        )
      ] }) : /* @__PURE__ */ s("div", { className: "ds-empty", children: [
        /* @__PURE__ */ e("h2", { children: "Start with a project" }),
        /* @__PURE__ */ e("p", { children: "A project holds one product's screens and its design system: colours, fonts, radii and spacing every variant follows." })
      ] }) })
    ] })
  ] });
}
const P = /* @__PURE__ */ new Set();
function ee(t) {
  return t.variants.some((a) => P.has(`${t.id}/${a.id}`) && !a.hasExport);
}
function ne({ projects: t, pid: a, onPick: r, onCreate: d }) {
  const [c, u] = h(""), [g, i] = h("dashboard");
  return /* @__PURE__ */ s("nav", { className: "ds-rail", "aria-label": "Projects", children: [
    /* @__PURE__ */ s("form", { className: "ds-new", onSubmit: (o) => {
      o.preventDefault(), c.trim() && d(c.trim(), g).then(() => u(""));
    }, children: [
      /* @__PURE__ */ e("label", { htmlFor: "ds-new-name", children: "New project" }),
      /* @__PURE__ */ e("input", { id: "ds-new-name", value: c, onChange: (o) => u(o.target.value), placeholder: "Billing dashboard" }),
      /* @__PURE__ */ s("div", { className: "ds-row", children: [
        /* @__PURE__ */ s("select", { "aria-label": "App type", value: g, onChange: (o) => i(o.target.value), children: [
          /* @__PURE__ */ e("option", { value: "dashboard", children: "Dashboard" }),
          /* @__PURE__ */ e("option", { value: "mobile", children: "Mobile app" }),
          /* @__PURE__ */ e("option", { value: "marketing", children: "Marketing page" }),
          /* @__PURE__ */ e("option", { value: "content", children: "Content / docs" }),
          /* @__PURE__ */ e("option", { value: "form", children: "Form / flow" })
        ] }),
        /* @__PURE__ */ e("button", { type: "submit", className: "ds-btn", disabled: !c.trim(), children: "Create" })
      ] })
    ] }),
    /* @__PURE__ */ e("ul", { children: t.map((o) => /* @__PURE__ */ e("li", { children: /* @__PURE__ */ s("button", { "aria-current": o.id === a ? "page" : void 0, onClick: () => r(o.id), children: [
      /* @__PURE__ */ e("span", { children: o.name }),
      /* @__PURE__ */ s("small", { children: [
        o.variants,
        " variant",
        o.variants === 1 ? "" : "s"
      ] })
    ] }) }, o.id)) })
  ] });
}
const te = {
  designing: "Designer is working",
  reviewing: "Critic is reviewing",
  ready: "Ready"
};
function se({ project: t, onGenerate: a, onPick: r }) {
  const [d, c] = h(""), [u, g] = h(3), [i, o] = h(!1), n = [...t.rounds].reverse();
  return /* @__PURE__ */ s("div", { className: "ds-screens", children: [
    /* @__PURE__ */ s("form", { className: "ds-prompt", onSubmit: async (l) => {
      if (l.preventDefault(), !!d.trim()) {
        o(!0);
        try {
          await a(d.trim(), u), c("");
        } finally {
          o(!1);
        }
      }
    }, children: [
      /* @__PURE__ */ e("label", { htmlFor: "ds-prompt", children: "Describe the screen" }),
      /* @__PURE__ */ e(
        "textarea",
        {
          id: "ds-prompt",
          rows: 3,
          value: d,
          onChange: (l) => c(l.target.value),
          placeholder: "The home screen of an invoicing tool for freelance designers: unpaid invoices, this month's income, quick 'new invoice'."
        }
      ),
      /* @__PURE__ */ s("div", { className: "ds-row", children: [
        /* @__PURE__ */ s("label", { className: "ds-inline", children: [
          "Variants",
          /* @__PURE__ */ s("select", { value: u, onChange: (l) => g(Number(l.target.value)), children: [
            /* @__PURE__ */ e("option", { value: 3, children: "3" }),
            /* @__PURE__ */ e("option", { value: 4, children: "4" })
          ] })
        ] }),
        /* @__PURE__ */ e("span", { className: "ds-spacer" }),
        /* @__PURE__ */ e("button", { className: "ds-btn ds-primary", type: "submit", disabled: i || !d.trim(), children: i ? "Sending…" : "Generate" })
      ] })
    ] }),
    n.length === 0 && /* @__PURE__ */ e("p", { className: "ds-muted", children: "No screens yet. Variants appear here as the designer saves them." }),
    n.map((l) => {
      const b = t.variants.filter((v) => v.round === l.id);
      return /* @__PURE__ */ s("section", { className: "ds-round", "aria-label": l.prompt || l.comment, children: [
        /* @__PURE__ */ s("header", { children: [
          /* @__PURE__ */ e("p", { className: "ds-roundtitle", children: l.parent ? /* @__PURE__ */ s(T, { children: [
            "Refine: “",
            l.comment,
            "”"
          ] }) : l.prompt }),
          /* @__PURE__ */ s("span", { className: `ds-status ds-${l.status}`, children: [
            te[l.status],
            " · ",
            b.length,
            "/",
            l.count
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "ds-grid", style: { gridTemplateColumns: `repeat(${Math.min(l.count, 4)}, minmax(0, 1fr))` }, children: [
          b.map((v) => /* @__PURE__ */ e(ae, { project: t, v, onPick: () => r(v.id) }, `${v.id}-${v.updatedAt}`)),
          Array.from({ length: Math.max(0, l.count - b.length) }, (v, k) => /* @__PURE__ */ e("div", { className: "ds-card ds-pending", children: "Waiting for the designer…" }, k))
        ] })
      ] }, l.id);
    })
  ] });
}
function ae({ project: t, v: a, onPick: r }) {
  const d = L(), [c, u] = h(null);
  C(() => {
    B(d).variant(t.id, a.id).then(u).catch(() => u(null));
  }, [d, t.id, a.id, a.updatedAt]);
  const g = t.designSystem.appType === "mobile" ? "mobile" : "desktop";
  return /* @__PURE__ */ s("article", { className: "ds-card", children: [
    /* @__PURE__ */ e("button", { className: "ds-thumbbtn", onClick: r, "aria-label": `Open ${a.title}`, children: c ? /* @__PURE__ */ e(F, { doc: c.document, viewport: g, title: a.title }) : /* @__PURE__ */ e("div", { className: "ds-thumb" }) }),
    /* @__PURE__ */ s("div", { className: "ds-cardbody", children: [
      /* @__PURE__ */ s("div", { className: "ds-row", children: [
        /* @__PURE__ */ e("h3", { children: a.title }),
        /* @__PURE__ */ e("span", { className: "ds-spacer" }),
        /* @__PURE__ */ e("span", { className: `ds-chip ${a.stage === "reviewed" ? "ds-ok" : ""}`, children: a.stage === "reviewed" ? "Reviewed" : "Draft" })
      ] }),
      a.rationale && /* @__PURE__ */ e("p", { className: "ds-muted", children: a.rationale }),
      c && /* @__PURE__ */ s("p", { className: "ds-small", children: [
        c.checks.errors,
        " rule errors · ",
        c.checks.warnings,
        " warnings"
      ] }),
      /* @__PURE__ */ e("button", { className: "ds-btn", onClick: r, children: "Pick this one" })
    ] })
  ] });
}
function F({ doc: t, viewport: a, title: r, maxHeight: d }) {
  const c = q(null), [u, g] = h(0.25), [i, o] = O[a] ?? O.desktop;
  return H(() => {
    const n = c.current;
    if (!n) return;
    const l = () => g(Math.min(n.clientWidth / i, d ? d / o : 1 / 0, 1));
    l();
    const b = new ResizeObserver(l);
    return b.observe(n), () => b.disconnect();
  }, [i, o, d]), /* @__PURE__ */ e("div", { ref: c, className: "ds-frame", style: { height: o * u }, children: /* @__PURE__ */ e(
    "iframe",
    {
      title: r,
      sandbox: "allow-scripts",
      srcDoc: t,
      style: { width: i, height: o, transform: `scale(${u})` },
      tabIndex: -1
    }
  ) });
}
function re({ project: t, vid: a, onBack: r, onRefine: d, onExport: c, fail: u }) {
  const g = L(), i = V(() => B(g), [g]), o = t.variants.find((m) => m.id === a), [n, l] = h(null), [b, v] = h(t.designSystem.appType === "mobile" ? "mobile" : "desktop"), [k, j] = h(""), [A, D] = h(2), [f, $] = h(null), [y, w] = h(null);
  C(() => {
    i.variant(t.id, a).then(l).catch(u);
  }, [i, t.id, a, o == null ? void 0 : o.updatedAt, o == null ? void 0 : o.hasExport, u]);
  const S = async (m, x) => {
    $(m);
    try {
      await x();
    } catch (G) {
      u(G);
    } finally {
      $(null);
    }
  }, R = async (m, x) => {
    await navigator.clipboard.writeText(x), w(m), setTimeout(() => w(null), 1500);
  }, p = ((n == null ? void 0 : n.title) || "variant").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return n ? /* @__PURE__ */ s("div", { className: "ds-detail", children: [
    /* @__PURE__ */ s("div", { className: "ds-row", children: [
      /* @__PURE__ */ e("button", { className: "ds-link", onClick: r, children: "← All screens" }),
      /* @__PURE__ */ e("h3", { children: n.title }),
      /* @__PURE__ */ e("span", { className: "ds-spacer" }),
      /* @__PURE__ */ e("div", { className: "ds-tabs", role: "tablist", "aria-label": "Viewport", children: ["desktop", "mobile"].map((m) => /* @__PURE__ */ e("button", { role: "tab", "aria-selected": b === m, onClick: () => v(m), children: m === "desktop" ? "Desktop" : "Mobile" }, m)) })
    ] }),
    /* @__PURE__ */ s("div", { className: "ds-detailgrid", children: [
      /* @__PURE__ */ e(F, { doc: n.document, viewport: b, title: n.title, maxHeight: 720 }),
      /* @__PURE__ */ s("aside", { className: "ds-side", children: [
        /* @__PURE__ */ s("section", { children: [
          /* @__PURE__ */ e("h4", { children: "Refine" }),
          /* @__PURE__ */ e(
            "textarea",
            {
              rows: 4,
              value: k,
              onChange: (m) => j(m.target.value),
              "aria-label": "What should change?",
              placeholder: "Make the table the hero; drop the KPI cards to one row; warmer accent."
            }
          ),
          /* @__PURE__ */ s("div", { className: "ds-row", children: [
            /* @__PURE__ */ s("label", { className: "ds-inline", children: [
              "Takes",
              /* @__PURE__ */ s("select", { value: A, onChange: (m) => D(Number(m.target.value)), children: [
                /* @__PURE__ */ e("option", { value: 1, children: "1" }),
                /* @__PURE__ */ e("option", { value: 2, children: "2" }),
                /* @__PURE__ */ e("option", { value: 3, children: "3" })
              ] })
            ] }),
            /* @__PURE__ */ e("span", { className: "ds-spacer" }),
            /* @__PURE__ */ e(
              "button",
              {
                className: "ds-btn ds-primary",
                disabled: !k.trim() || !!f,
                onClick: () => S("refine", () => d(k.trim(), A)),
                children: f === "refine" ? "Sending…" : "Refine"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ s("section", { children: [
          /* @__PURE__ */ e("h4", { children: "Export" }),
          /* @__PURE__ */ s("div", { className: "ds-btns", children: [
            /* @__PURE__ */ e("button", { className: "ds-btn", onClick: () => R("html", n.html), children: y === "html" ? "Copied" : "Copy HTML" }),
            /* @__PURE__ */ e("button", { className: "ds-btn", onClick: () => M(`${p}.html`, n.document, "text/html"), children: "Download HTML" }),
            /* @__PURE__ */ e("button", { className: "ds-btn", disabled: !!f, onClick: () => S("png", async () => {
              const m = await i.png(t.id, a, b);
              M(`${p}-${b}.png`, Q(m.png), "image/png");
            }), children: f === "png" ? "Rendering…" : "Download PNG" }),
            /* @__PURE__ */ e(
              "button",
              {
                className: "ds-btn",
                disabled: !!f || P.has(`${t.id}/${a}`) && !n.export,
                onClick: () => S("export", c),
                children: n.export ? "Re-export React" : P.has(`${t.id}/${a}`) ? "Exporter is working…" : "Export React + Tailwind"
              }
            )
          ] }),
          n.export && /* @__PURE__ */ s("div", { className: "ds-code", children: [
            /* @__PURE__ */ s("div", { className: "ds-row", children: [
              /* @__PURE__ */ s("strong", { children: [
                p,
                ".tsx"
              ] }),
              /* @__PURE__ */ e("span", { className: "ds-spacer" }),
              /* @__PURE__ */ e("button", { className: "ds-btn", onClick: () => R("tsx", n.export), children: y === "tsx" ? "Copied" : "Copy code" }),
              /* @__PURE__ */ e("button", { className: "ds-btn", onClick: () => M(`${p}.tsx`, n.export, "text/plain"), children: "Download" })
            ] }),
            /* @__PURE__ */ e("pre", { children: /* @__PURE__ */ e("code", { children: n.export }) })
          ] })
        ] }),
        /* @__PURE__ */ s("section", { children: [
          /* @__PURE__ */ e("h4", { children: "Rule check" }),
          n.checks.findings.length === 0 ? /* @__PURE__ */ e("p", { className: "ds-muted", children: "No static rule findings." }) : /* @__PURE__ */ e("ul", { className: "ds-findings", children: n.checks.findings.map((m, x) => /* @__PURE__ */ s("li", { className: m.severity === "error" ? "ds-err" : "", children: [
            /* @__PURE__ */ e("code", { children: m.rule }),
            " ",
            m.message,
            m.evidence ? /* @__PURE__ */ s(T, { children: [
              " — ",
              /* @__PURE__ */ e("em", { children: m.evidence })
            ] }) : null
          ] }, x)) }),
          n.notes && /* @__PURE__ */ s(T, { children: [
            /* @__PURE__ */ e("h4", { children: "Critic notes" }),
            /* @__PURE__ */ e("p", { className: "ds-pre", children: n.notes })
          ] }),
          n.rationale && /* @__PURE__ */ s(T, { children: [
            /* @__PURE__ */ e("h4", { children: "Idea" }),
            /* @__PURE__ */ e("p", { children: n.rationale })
          ] })
        ] })
      ] })
    ] })
  ] }) : /* @__PURE__ */ e("p", { className: "ds-muted", children: "Loading…" });
}
const ie = [
  ["bg", "Page background"],
  ["surface", "Cards and panels"],
  ["ink", "Text"],
  ["muted", "Secondary text"],
  ["line", "Borders"],
  ["accent", "Accent (one)"],
  ["accentInk", "Text on accent"],
  ["danger", "Error status"],
  ["success", "Success status"]
];
function de({ project: t, onSave: a }) {
  const [r, d] = h(t.designSystem), [c, u] = h(t.designSystem.typeScale.join(", ")), [g, i] = h(!1);
  C(() => {
    d(t.designSystem), u(t.designSystem.typeScale.join(", "));
  }, [t.designSystem]);
  const o = (n, l) => d({ ...r, [n]: l });
  return /* @__PURE__ */ s("form", { className: "ds-system", onSubmit: async (n) => {
    n.preventDefault(), i(!0);
    try {
      await a({ ...r, typeScale: c.split(/[,\s]+/).filter(Boolean).map(Number) });
    } finally {
      i(!1);
    }
  }, children: [
    /* @__PURE__ */ e("p", { className: "ds-muted", children: "Every variant in this project is drawn with these tokens. Change them and every screen follows; ask the designer for a new round to rethink layouts." }),
    /* @__PURE__ */ s("fieldset", { children: [
      /* @__PURE__ */ e("legend", { children: "Colours" }),
      /* @__PURE__ */ e("div", { className: "ds-colors", children: ie.map(([n, l]) => /* @__PURE__ */ s("label", { className: "ds-color", children: [
        /* @__PURE__ */ e("input", { type: "color", value: r.colors[n], onChange: (b) => o("colors", { ...r.colors, [n]: b.target.value.toUpperCase() }) }),
        /* @__PURE__ */ s("span", { children: [
          l,
          /* @__PURE__ */ e("small", { children: r.colors[n] })
        ] })
      ] }, n)) })
    ] }),
    /* @__PURE__ */ s("fieldset", { children: [
      /* @__PURE__ */ e("legend", { children: "Type" }),
      ["sans", "display", "mono"].map((n) => /* @__PURE__ */ s("label", { className: "ds-field", children: [
        n === "sans" ? "Body font" : n === "display" ? "Heading font" : "Numbers / code font",
        /* @__PURE__ */ e("input", { value: r.fonts[n], onChange: (l) => o("fonts", { ...r.fonts, [n]: l.target.value }) })
      ] }, n)),
      /* @__PURE__ */ s("label", { className: "ds-field", children: [
        "Type scale (px, ascending)",
        /* @__PURE__ */ e("input", { value: c, onChange: (n) => u(n.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ s("fieldset", { children: [
      /* @__PURE__ */ e("legend", { children: "Shape and space" }),
      /* @__PURE__ */ s("div", { className: "ds-row", children: [
        ["sm", "md", "lg"].map((n) => /* @__PURE__ */ s("label", { className: "ds-field ds-narrow", children: [
          "Radius ",
          n,
          /* @__PURE__ */ e("input", { type: "number", min: 0, max: 32, value: r.radii[n], onChange: (l) => o("radii", { ...r.radii, [n]: Number(l.target.value) }) })
        ] }, n)),
        /* @__PURE__ */ s("label", { className: "ds-field ds-narrow", children: [
          "Spacing grid",
          /* @__PURE__ */ s("select", { value: r.spacingBase, onChange: (n) => o("spacingBase", Number(n.target.value)), children: [
            /* @__PURE__ */ e("option", { value: 4, children: "4px" }),
            /* @__PURE__ */ e("option", { value: 8, children: "8px" })
          ] })
        ] }),
        /* @__PURE__ */ s("label", { className: "ds-field ds-narrow", children: [
          "App type",
          /* @__PURE__ */ s("select", { value: r.appType, onChange: (n) => o("appType", n.target.value), children: [
            /* @__PURE__ */ e("option", { value: "dashboard", children: "Dashboard" }),
            /* @__PURE__ */ e("option", { value: "mobile", children: "Mobile app" }),
            /* @__PURE__ */ e("option", { value: "marketing", children: "Marketing page" }),
            /* @__PURE__ */ e("option", { value: "content", children: "Content / docs" }),
            /* @__PURE__ */ e("option", { value: "form", children: "Form / flow" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ s("fieldset", { children: [
      /* @__PURE__ */ e("legend", { children: "Contrast (WCAG AA)" }),
      /* @__PURE__ */ e("ul", { className: "ds-contrast", children: t.contrast.map((n) => /* @__PURE__ */ s("li", { className: n.pass ? "" : "ds-err", children: [
        /* @__PURE__ */ e("span", { className: "ds-swatch", style: { background: t.designSystem.colors[n.bg], color: t.designSystem.colors[n.fg] }, children: "Aa" }),
        n.fg,
        " on ",
        n.bg,
        ": ",
        n.ratio,
        ":1 ",
        n.pass ? "✓" : `needs ${n.min}:1`
      ] }, `${n.fg}-${n.bg}`)) }),
      /* @__PURE__ */ e("p", { className: "ds-small", children: "Contrast is computed from the saved tokens." })
    ] }),
    /* @__PURE__ */ s("div", { className: "ds-row", children: [
      /* @__PURE__ */ e("span", { className: "ds-spacer" }),
      /* @__PURE__ */ e("button", { className: "ds-btn ds-primary", type: "submit", disabled: g, children: g ? "Saving…" : "Save design system" })
    ] })
  ] });
}
export {
  me as default
};
