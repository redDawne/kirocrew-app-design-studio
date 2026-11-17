import type { AppApi } from '@kirocrew/app-sdk'

export const API = '/apps/design-studio/api'

export type Colors = { bg: string; surface: string; ink: string; muted: string; line: string; accent: string; accentInk: string; danger: string; success: string }
export type DesignSystem = {
  appType: string
  colors: Colors
  fonts: { sans: string; display: string; mono: string }
  radii: { sm: number; md: number; lg: number }
  spacingBase: number
  typeScale: number[]
}
export type ContrastRow = { fg: string; bg: string; ratio: number; min: number; pass: boolean }
export type Round = {
  id: string; prompt: string; count: number; parent: string | null; comment: string
  createdAt: number; criticRequested: boolean; chosen?: string; status: 'designing' | 'reviewing' | 'ready'
}
export type VariantMeta = {
  id: string; round: string; title: string; stage: 'draft' | 'reviewed'; rationale?: string; notes?: string
  createdAt: number; updatedAt: number; hasPng: boolean; hasExport: boolean
}
export type Finding = { rule: string; severity: 'error' | 'warn'; message: string; evidence?: string }
export type Variant = VariantMeta & {
  html: string; document: string; export: string | null
  checks: { pass: boolean; errors: number; warnings: number; findings: Finding[] }
}
export type Project = {
  id: string; name: string; createdAt: number; rounds: Round[]; variants: VariantMeta[]
  designSystem: DesignSystem; contrast: ContrastRow[]; density: { baseFont: number; rowHeight: number; sectionGap: number }
}
export type ProjectSummary = { id: string; name: string; createdAt: number; rounds: number; variants: number }

export function client(api: AppApi) {
  const enc = encodeURIComponent
  return {
    status: () => api.get<{ chrome: string | null; appTypes: string[]; viewports: string[] }>(`${API}/status`),
    projects: () => api.get<{ projects: ProjectSummary[] }>(`${API}/projects`),
    createProject: (name: string, appType: string) => api.post<Project>(`${API}/projects`, { name, appType }),
    project: (pid: string) => api.get<Project>(`${API}/projects/${enc(pid)}`),
    saveSystem: (pid: string, designSystem: DesignSystem) =>
      api.put<{ designSystem: DesignSystem; contrast: ContrastRow[] }>(`${API}/projects/${enc(pid)}/design-system`, { designSystem }),
    createRound: (pid: string, body: { prompt: string; count: number; parent?: string; comment?: string }) =>
      api.post<Round>(`${API}/projects/${enc(pid)}/rounds`, body),
    markRound: (pid: string, rid: string, body: { criticRequested?: boolean; chosen?: string }) =>
      api.post<Round>(`${API}/projects/${enc(pid)}/rounds/${enc(rid)}`, body),
    variant: (pid: string, vid: string) => api.get<Variant>(`${API}/projects/${enc(pid)}/variants/${enc(vid)}`),
    png: (pid: string, vid: string, viewport: string) =>
      api.post<{ png: string }>(`${API}/projects/${enc(pid)}/variants/${enc(vid)}/png`, { viewport }),
  }
}

// ------------------------------------------------------------------ agents
// One chat session per project and role. POST /api/chat/slots is get-or-create
// by name, so a stable name is the whole mapping.
export type Role = 'designer' | 'critic' | 'exporter'
export const AGENT: Record<Role, string> = {
  designer: 'design-studio-designer',
  critic: 'design-studio-critic',
  exporter: 'design-studio-exporter',
}

export function slotName(pid: string, role: Role): string {
  return `design-studio-${role}-${pid}`.slice(0, 120)
}

export async function sendToAgent(api: AppApi, pid: string, projectName: string, role: Role, message: string): Promise<string> {
  const name = slotName(pid, role)
  const slot = await api.post<{ key?: string }>('/api/chat/slots', {
    name, agent: AGENT[role], title: `Design Studio · ${projectName} · ${role}`,
  })
  const key = slot?.key || name
  await api.post('/api/chat?ws=1', { message, slot: key, agent: AGENT[role] })
  return key
}

export function designerMessage(pid: string, r: Round): string {
  const kind = r.parent
    ? `Refinement round: parent variant ${r.parent}. User comment: "${r.comment}".`
    : 'New round.'
  return [
    `Design Studio project ${pid}, round ${r.id}. ${kind}`,
    `Make ${r.count} variant(s) for: ${r.prompt || '(see parent)'}`,
    'Follow your instructions: get_project first, save each variant as draft, fix check errors.',
  ].join('\n')
}

export function criticMessage(pid: string, r: Round): string {
  return `Design Studio project ${pid}, round ${r.id}. Review every draft variant in this round, fix it, and save it as reviewed.`
}

export function exporterMessage(pid: string, vid: string): string {
  return `Design Studio project ${pid}, variant ${vid}. Export it as one React + Tailwind (shadcn/ui) component and save_export it.`
}

// ---------------------------------------------------------------- downloads
export function download(name: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
