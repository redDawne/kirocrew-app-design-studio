import { useAppApi, useNavigate } from '@kirocrew/app-sdk'
import { PageHeader } from '@kirocrew/app-sdk/ui'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  b64ToBytes, client, criticMessage, designerMessage, download, exporterMessage, sendToAgent,
  type DesignSystem, type Project, type ProjectSummary, type Round, type Variant, type VariantMeta,
} from './api'
import { CSS } from './styles'

const VIEWPORT_SIZE: Record<string, [number, number]> = { desktop: [1440, 900], mobile: [390, 844] }
const POLL_MS = 3000

export default function DesignStudio() {
  const api = useAppApi()
  const navigate = useNavigate()
  const c = useMemo(() => client(api), [api])
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [pid, setPid] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<'design' | 'system'>('design')
  const [picked, setPicked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chrome, setChrome] = useState<string | null | undefined>(undefined)

  const fail = useCallback((e: unknown) => setError(e instanceof Error ? e.message : String(e)), [])

  const loadProjects = useCallback(() => c.projects().then((r) => setProjects(r.projects)).catch(fail), [c, fail])
  const loadProject = useCallback(async () => {
    if (!pid) return
    try {
      setProject(await c.project(pid))
    } catch (e) { fail(e) }
  }, [c, pid, fail])

  useEffect(() => { loadProjects(); c.status().then((s) => setChrome(s.chrome)).catch(() => setChrome(null)) }, [c, loadProjects])
  useEffect(() => { setProject(null); setPicked(null); loadProject() }, [pid, loadProject])

  // Poll while agents are working. The critic is started from here once a
  // round has all its drafts: agents cannot call each other.
  const latest = project?.rounds[project.rounds.length - 1]
  const busy = !!project && (project.rounds.some((r) => r.status !== 'ready') || awaitingExport(project))
  useEffect(() => {
    if (!busy) return
    const t = setInterval(loadProject, POLL_MS)
    return () => clearInterval(t)
  }, [busy, loadProject])
  useEffect(() => {
    if (!project || !latest || latest.status !== 'reviewing' || latest.criticRequested) return
    c.markRound(project.id, latest.id, { criticRequested: true })
      .then(() => sendToAgent(api, project.id, project.name, 'critic', criticMessage(project.id, latest)))
      .then(loadProject)
      .catch(fail)
  }, [project, latest, api, c, loadProject, fail])

  const openChat = (role: string) => project && navigate(`/chat?sid=${encodeURIComponent(`design-studio-${role}-${project.id}`)}`)

  return (
    <div className="ds-root">
      <style>{CSS}</style>
      <PageHeader title="Design Studio" subtitle="Describe a screen. Get distinct, reviewed directions. Refine one. Export it." />
      {error && <div className="ds-error" role="alert">{error}<button onClick={() => setError(null)} aria-label="Dismiss">×</button></div>}
      {chrome === null && <div className="ds-warn">No Chrome or Chromium found: the critic cannot see screenshots and PNG export is off.</div>}
      <div className="ds-body">
        <ProjectRail projects={projects} pid={pid} onPick={(id) => { setPid(id); setTab('design') }}
          onCreate={async (name, appType) => {
            try {
              const p = await c.createProject(name, appType)
              await loadProjects()
              setPid(p.id)
            } catch (e) { fail(e) }
          }} />
        <main className="ds-main">
          {!project ? (
            <div className="ds-empty">
              <h2>Start with a project</h2>
              <p>A project holds one product's screens and its design system: colours, fonts, radii and spacing every variant follows.</p>
            </div>
          ) : (
            <>
              <div className="ds-projhead">
                <h2>{project.name}</h2>
                <div className="ds-tabs" role="tablist">
                  <button role="tab" aria-selected={tab === 'design'} onClick={() => setTab('design')}>Screens</button>
                  <button role="tab" aria-selected={tab === 'system'} onClick={() => setTab('system')}>Design system</button>
                </div>
                <span className="ds-spacer" />
                <button className="ds-link" onClick={() => openChat('designer')}>Designer chat</button>
                <button className="ds-link" onClick={() => openChat('critic')}>Critic chat</button>
              </div>
              {tab === 'system' ? (
                <SystemEditor project={project} onSave={async (s) => {
                  try { await c.saveSystem(project.id, s); await loadProject() } catch (e) { fail(e) }
                }} />
              ) : picked ? (
                <VariantDetail project={project} vid={picked} onBack={() => setPicked(null)} fail={fail}
                  onRefine={async (comment, count) => {
                    const r = await c.createRound(project.id, { prompt: '', count, parent: picked, comment })
                    await sendToAgent(api, project.id, project.name, 'designer', designerMessage(project.id, r))
                    setPicked(null)
                    await loadProject()
                  }}
                  onExport={async () => {
                    await sendToAgent(api, project.id, project.name, 'exporter', exporterMessage(project.id, picked))
                    exportRequested.add(`${project.id}/${picked}`)
                    await loadProject()
                  }} />
              ) : (
                <Screens project={project} onPick={setPicked}
                  onGenerate={async (prompt, count) => {
                    try {
                      const r = await c.createRound(project.id, { prompt, count })
                      await sendToAgent(api, project.id, project.name, 'designer', designerMessage(project.id, r))
                      await loadProject()
                    } catch (e) { fail(e) }
                  }} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// Exports the page asked for and is still waiting on (module scope: survives tab switches).
const exportRequested = new Set<string>()
function awaitingExport(p: Project): boolean {
  return p.variants.some((v) => exportRequested.has(`${p.id}/${v.id}`) && !v.hasExport)
}

// ------------------------------------------------------------------ projects
function ProjectRail({ projects, pid, onPick, onCreate }: {
  projects: ProjectSummary[]; pid: string | null; onPick: (id: string) => void
  onCreate: (name: string, appType: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [appType, setAppType] = useState('dashboard')
  return (
    <nav className="ds-rail" aria-label="Projects">
      <form className="ds-new" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim(), appType).then(() => setName('')) }}>
        <label htmlFor="ds-new-name">New project</label>
        <input id="ds-new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Billing dashboard" />
        <div className="ds-row">
          <select aria-label="App type" value={appType} onChange={(e) => setAppType(e.target.value)}>
            <option value="dashboard">Dashboard</option>
            <option value="mobile">Mobile app</option>
            <option value="marketing">Marketing page</option>
            <option value="content">Content / docs</option>
            <option value="form">Form / flow</option>
          </select>
          <button type="submit" className="ds-btn" disabled={!name.trim()}>Create</button>
        </div>
      </form>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <button aria-current={p.id === pid ? 'page' : undefined} onClick={() => onPick(p.id)}>
              <span>{p.name}</span>
              <small>{p.variants} variant{p.variants === 1 ? '' : 's'}</small>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ------------------------------------------------------------------- screens
const STATUS_LABEL: Record<Round['status'], string> = {
  designing: 'Designer is working',
  reviewing: 'Critic is reviewing',
  ready: 'Ready',
}

function Screens({ project, onGenerate, onPick }: {
  project: Project; onGenerate: (prompt: string, count: number) => Promise<void>; onPick: (vid: string) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(3)
  const [sending, setSending] = useState(false)
  const rounds = [...project.rounds].reverse()
  return (
    <div className="ds-screens">
      <form className="ds-prompt" onSubmit={async (e) => {
        e.preventDefault()
        if (!prompt.trim()) return
        setSending(true)
        try { await onGenerate(prompt.trim(), count); setPrompt('') } finally { setSending(false) }
      }}>
        <label htmlFor="ds-prompt">Describe the screen</label>
        <textarea id="ds-prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          aria-describedby={prompt.trim() ? undefined : 'ds-prompt-hint'}
          placeholder="e.g. The home screen of an invoicing tool for freelance designers: unpaid invoices, this month's income, quick 'new invoice'." />
        <div className="ds-row">
          <label className="ds-inline">Variants
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={3}>3</option><option value={4}>4</option>
            </select>
          </label>
          <span className="ds-spacer" />
          <button className="ds-btn ds-primary" type="submit" disabled={sending || !prompt.trim()}>
            {sending ? 'Sending…' : 'Generate'}
          </button>
        </div>
        {!prompt.trim() && !sending && <p id="ds-prompt-hint" className="ds-small ds-hint">Type a description to enable Generate.</p>}
      </form>
      {rounds.length === 0 && <p className="ds-muted">No screens yet. Variants appear here as the designer saves them.</p>}
      {rounds.map((r) => {
        const vs = project.variants.filter((v) => v.round === r.id)
        return (
          <section key={r.id} className="ds-round" aria-label={r.prompt || r.comment}>
            <header>
              <p className="ds-roundtitle">{r.parent ? <>Refine: “{r.comment}”</> : r.prompt}</p>
              <span className={`ds-status ds-${r.status}`}>{STATUS_LABEL[r.status]} · {vs.length}/{r.count}</span>
            </header>
            <div className="ds-grid" style={{ gridTemplateColumns: `repeat(${Math.min(r.count, 4)}, minmax(0, 1fr))` }}>
              {vs.map((v) => <VariantCard key={`${v.id}-${v.updatedAt}`} project={project} v={v} onPick={() => onPick(v.id)} />)}
              {Array.from({ length: Math.max(0, r.count - vs.length) }, (_, i) => <div key={i} className="ds-card ds-pending">Waiting for the designer…</div>)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function VariantCard({ project, v, onPick }: { project: Project; v: VariantMeta; onPick: () => void }) {
  const api = useAppApi()
  const [doc, setDoc] = useState<Variant | null>(null)
  useEffect(() => { client(api).variant(project.id, v.id).then(setDoc).catch(() => setDoc(null)) }, [api, project.id, v.id, v.updatedAt])
  const viewport = project.designSystem.appType === 'mobile' ? 'mobile' : 'desktop'
  return (
    <article className="ds-card">
      <button className="ds-thumbbtn" onClick={onPick} aria-label={`Open ${v.title}`}>
        {doc ? <Frame doc={doc.document} viewport={viewport} title={v.title} /> : <div className="ds-thumb" />}
      </button>
      <div className="ds-cardbody">
        <div className="ds-row">
          <h3>{v.title}</h3>
          <span className="ds-spacer" />
          <span className={`ds-chip ${v.stage === 'reviewed' ? 'ds-ok' : ''}`}>{v.stage === 'reviewed' ? 'Reviewed' : 'Draft'}</span>
        </div>
        {v.rationale && <p className="ds-muted">{v.rationale}</p>}
        {doc && <p className="ds-small">{doc.checks.errors} rule errors · {doc.checks.warnings} warnings</p>}
        <button className="ds-btn" onClick={onPick}>Pick this one</button>
      </div>
    </article>
  )
}

/** A variant drawn at its real viewport width and scaled to fit the box. */
function Frame({ doc, viewport, title, maxHeight }: { doc: string; viewport: string; title: string; maxHeight?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)
  const [w, h] = VIEWPORT_SIZE[viewport] ?? VIEWPORT_SIZE.desktop
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(Math.min(el.clientWidth / w, maxHeight ? maxHeight / h : Infinity, 1))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h, maxHeight])
  return (
    <div ref={box} className="ds-frame" style={{ height: h * scale }}>
      {/* sandbox without allow-same-origin: the variant runs scripts (Tailwind) but cannot touch the dashboard */}
      <iframe title={title} sandbox="allow-scripts" srcDoc={doc}
        style={{ width: w, height: h, transform: `scale(${scale})` }} tabIndex={-1} />
    </div>
  )
}

// ------------------------------------------------------------ variant detail
function VariantDetail({ project, vid, onBack, onRefine, onExport, fail }: {
  project: Project; vid: string; onBack: () => void; fail: (e: unknown) => void
  onRefine: (comment: string, count: number) => Promise<void>; onExport: () => Promise<void>
}) {
  const api = useAppApi()
  const c = useMemo(() => client(api), [api])
  const meta = project.variants.find((v) => v.id === vid)
  const [v, setV] = useState<Variant | null>(null)
  const [viewport, setViewport] = useState(project.designSystem.appType === 'mobile' ? 'mobile' : 'desktop')
  const [comment, setComment] = useState('')
  const [count, setCount] = useState(2)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => { c.variant(project.id, vid).then(setV).catch(fail) }, [c, project.id, vid, meta?.updatedAt, meta?.hasExport, fail])

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    try { await fn() } catch (e) { fail(e) } finally { setBusy(null) }
  }
  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }
  const file = (v?.title || 'variant').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  if (!v) return <p className="ds-muted">Loading…</p>
  return (
    <div className="ds-detail">
      <div className="ds-row">
        <button className="ds-link" onClick={onBack}>← All screens</button>
        <h3>{v.title}</h3>
        <span className="ds-spacer" />
        <div className="ds-tabs" role="tablist" aria-label="Viewport">
          {['desktop', 'mobile'].map((vp) => (
            <button key={vp} role="tab" aria-selected={viewport === vp} onClick={() => setViewport(vp)}>{vp === 'desktop' ? 'Desktop' : 'Mobile'}</button>
          ))}
        </div>
      </div>
      <div className="ds-detailgrid">
        <Frame doc={v.document} viewport={viewport} title={v.title} maxHeight={720} />
        <aside className="ds-side">
          <section>
            <h4>Refine</h4>
            <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} aria-label="What should change?"
              placeholder="Make the table the hero; drop the KPI cards to one row; warmer accent." />
            <div className="ds-row">
              <label className="ds-inline">Takes
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
              </label>
              <span className="ds-spacer" />
              <button className="ds-btn ds-primary" disabled={!comment.trim() || !!busy}
                onClick={() => run('refine', () => onRefine(comment.trim(), count))}>{busy === 'refine' ? 'Sending…' : 'Refine'}</button>
            </div>
          </section>
          <section>
            <h4>Export</h4>
            <div className="ds-btns">
              <button className="ds-btn" onClick={() => copy('html', v.html)}>{copied === 'html' ? 'Copied' : 'Copy HTML'}</button>
              <button className="ds-btn" onClick={() => download(`${file}.html`, v.document, 'text/html')}>Download HTML</button>
              <button className="ds-btn" disabled={!!busy} onClick={() => run('png', async () => {
                const r = await c.png(project.id, vid, viewport)
                download(`${file}-${viewport}.png`, b64ToBytes(r.png), 'image/png')
              })}>{busy === 'png' ? 'Rendering…' : 'Download PNG'}</button>
              <button className="ds-btn" disabled={!!busy || exportRequested.has(`${project.id}/${vid}`) && !v.export}
                onClick={() => run('export', onExport)}>
                {v.export ? 'Re-export React' : exportRequested.has(`${project.id}/${vid}`) ? 'Exporter is working…' : 'Export React + Tailwind'}
              </button>
            </div>
            {v.export && (
              <div className="ds-code">
                <div className="ds-row"><strong>{file}.tsx</strong><span className="ds-spacer" />
                  <button className="ds-btn" onClick={() => copy('tsx', v.export!)}>{copied === 'tsx' ? 'Copied' : 'Copy code'}</button>
                  <button className="ds-btn" onClick={() => download(`${file}.tsx`, v.export!, 'text/plain')}>Download</button>
                </div>
                <pre><code>{v.export}</code></pre>
              </div>
            )}
          </section>
          <section>
            <h4>Rule check</h4>
            {v.checks.findings.length === 0 ? <p className="ds-muted">No static rule findings.</p> : (
              <ul className="ds-findings">
                {v.checks.findings.map((f, i) => (
                  <li key={i} className={f.severity === 'error' ? 'ds-err' : ''}>
                    <code>{f.rule}</code> {f.message}{f.evidence ? <> — <em>{f.evidence}</em></> : null}
                  </li>
                ))}
              </ul>
            )}
            {v.notes && <><h4>Critic notes</h4><p className="ds-pre">{v.notes}</p></>}
            {v.rationale && <><h4>Idea</h4><p>{v.rationale}</p></>}
          </section>
        </aside>
      </div>
    </div>
  )
}

// ------------------------------------------------------------- design system
const COLOR_LABELS: [keyof DesignSystem['colors'], string][] = [
  ['bg', 'Page background'], ['surface', 'Cards and panels'], ['ink', 'Text'], ['muted', 'Secondary text'],
  ['line', 'Borders'], ['accent', 'Accent (one)'], ['accentInk', 'Text on accent'],
  ['danger', 'Error status'], ['success', 'Success status'],
]

function SystemEditor({ project, onSave }: { project: Project; onSave: (s: DesignSystem) => Promise<void> }) {
  const [s, setS] = useState<DesignSystem>(project.designSystem)
  const [scale, setScale] = useState(project.designSystem.typeScale.join(', '))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setS(project.designSystem); setScale(project.designSystem.typeScale.join(', ')) }, [project.designSystem])
  const set = <K extends keyof DesignSystem>(k: K, v: DesignSystem[K]) => setS({ ...s, [k]: v })
  return (
    <form className="ds-system" onSubmit={async (e) => {
      e.preventDefault()
      setSaving(true)
      try {
        await onSave({ ...s, typeScale: scale.split(/[,\s]+/).filter(Boolean).map(Number) })
      } finally { setSaving(false) }
    }}>
      <p className="ds-muted">Every variant in this project is drawn with these tokens. Change them and every screen follows; ask the designer for a new round to rethink layouts.</p>
      <fieldset>
        <legend>Colours</legend>
        <div className="ds-colors">
          {COLOR_LABELS.map(([k, label]) => (
            <label key={k} className="ds-color">
              <input type="color" value={s.colors[k]} onChange={(e) => set('colors', { ...s.colors, [k]: e.target.value.toUpperCase() })} />
              <span>{label}<small>{s.colors[k]}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Type</legend>
        {(['sans', 'display', 'mono'] as const).map((k) => (
          <label key={k} className="ds-field">{k === 'sans' ? 'Body font' : k === 'display' ? 'Heading font' : 'Numbers / code font'}
            <input value={s.fonts[k]} onChange={(e) => set('fonts', { ...s.fonts, [k]: e.target.value })} />
          </label>
        ))}
        <label className="ds-field">Type scale (px, ascending)
          <input value={scale} onChange={(e) => setScale(e.target.value)} />
        </label>
      </fieldset>
      <fieldset>
        <legend>Shape and space</legend>
        <div className="ds-row">
          {(['sm', 'md', 'lg'] as const).map((k) => (
            <label key={k} className="ds-field ds-narrow">Radius {k}
              <input type="number" min={0} max={32} value={s.radii[k]} onChange={(e) => set('radii', { ...s.radii, [k]: Number(e.target.value) })} />
            </label>
          ))}
          <label className="ds-field ds-narrow">Spacing grid
            <select value={s.spacingBase} onChange={(e) => set('spacingBase', Number(e.target.value))}>
              <option value={4}>4px</option><option value={8}>8px</option>
            </select>
          </label>
          <label className="ds-field ds-narrow">App type
            <select value={s.appType} onChange={(e) => set('appType', e.target.value)}>
              <option value="dashboard">Dashboard</option><option value="mobile">Mobile app</option>
              <option value="marketing">Marketing page</option><option value="content">Content / docs</option>
              <option value="form">Form / flow</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Contrast (WCAG AA)</legend>
        <ul className="ds-contrast">
          {project.contrast.map((r) => (
            <li key={`${r.fg}-${r.bg}`} className={r.pass ? '' : 'ds-err'}>
              <span className="ds-swatch" style={{ background: project.designSystem.colors[r.bg as keyof DesignSystem['colors']], color: project.designSystem.colors[r.fg as keyof DesignSystem['colors']] }}>Aa</span>
              {r.fg} on {r.bg}: {r.ratio}:1 {r.pass ? '✓' : `needs ${r.min}:1`}
            </li>
          ))}
        </ul>
        <p className="ds-small">Contrast is computed from the saved tokens.</p>
      </fieldset>
      <div className="ds-row"><span className="ds-spacer" /><button className="ds-btn ds-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save design system'}</button></div>
    </form>
  )
}
