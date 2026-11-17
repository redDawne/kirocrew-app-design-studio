// The dashboard provides these modules at runtime (vite.config.ts externals).
// Only the surface this app uses is declared.
declare module '@kirocrew/app-sdk' {
  export interface AppApi {
    get<T = any>(path: string): Promise<T>
    post<T = any>(path: string, body?: unknown): Promise<T>
    put<T = any>(path: string, body?: unknown): Promise<T>
  }
  export function useAppApi(): AppApi
  export function useNavigate(): (to: string) => void
  export function useNotify(): any
}

declare module '@kirocrew/app-sdk/ui' {
  import type { ComponentType, ReactNode } from 'react'
  export const PageHeader: ComponentType<{ title: ReactNode; subtitle?: ReactNode; children?: ReactNode }>
}
