// Scoped styles built on the dashboard's own theme variables, so the page
// follows light/dark and the user's accent without relying on host Tailwind
// classes being present in the host CSS bundle.
export const CSS = `
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
.ds-root input::placeholder,.ds-root textarea::placeholder{color:var(--muted);opacity:.7;font-style:italic}
.ds-hint{text-align:right;margin:0}
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
`
