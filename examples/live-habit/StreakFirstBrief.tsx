/*
 * Streak-first brief — exported from Design Studio.
 * Needs: npx shadcn@latest add button ; npm i lucide-react
 *
 * tailwind.config.ts -> theme:
 *   fontSize: { xs: ['12px', '1.5'], sm: ['14px', '1.5'], base: ['16px', '1.5'], lg: ['18px', '1.5'],
 *               xl: ['20px', '1.25'], '2xl': ['24px', '1.25'], '3xl': ['32px', '1.25'], '4xl': ['44px', '1.1'] },
 *   extend: {
 *     colors: { bg: '#F7F6F3', surface: '#FFFFFF', ink: '#1B1A17', muted: '#64615A', line: '#E4E1DA',
 *               accent: '#B4441C', 'accent-ink': '#FFFFFF', danger: '#B42318', success: '#2F6B3A' },
 *     fontFamily: { sans: ["Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"],
 *                   display: ["'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"],
 *                   mono: ["'SF Mono', ui-monospace, Menlo, Consolas, monospace"] },
 *     borderRadius: { sm: '4px', md: '6px', lg: '10px' },
 *   }
 */
import { Button } from '@/components/ui/button'
import { BarChart3, Check, List, SquareCheck, User } from 'lucide-react'

type Day = { label: string; done: boolean; today?: boolean }
type OpenHabit = { name: string; note: string; broke?: boolean }
type DoneHabit = { name: string; streak: number }

const week: Day[] = [
  { label: 'T', done: true }, { label: 'W', done: true }, { label: 'T', done: false }, { label: 'F', done: true },
  { label: 'S', done: false }, { label: 'S', done: true }, { label: 'M', done: true, today: true },
]
const open: OpenHabit[] = [
  { name: 'Spanish, 15 minutes', note: '12-day streak' },
  { name: 'Stretch before bed', note: '3-day streak' },
  { name: 'No phone after 22:00', note: 'Broke at 6 days yesterday', broke: true },
]
const finished: DoneHabit[] = [
  { name: 'Meditate', streak: 41 }, { name: 'Read', streak: 23 }, { name: 'Water', streak: 9 }, { name: 'Morning run', streak: 6 },
]
const nav = [
  { label: 'Today', icon: SquareCheck, current: true },
  { label: 'Habits', icon: List },
  { label: 'Stats', icon: BarChart3 },
  { label: 'Profile', icon: User },
]

export default function StreakFirstBrief({ onDone }: { onDone?: (habit: string) => void }) {
  return (
    <div className="mx-auto flex min-h-[844px] w-[390px] flex-col bg-bg font-sans text-base text-ink">
      <header className="px-6 pt-12">
        <p className="text-xs uppercase tracking-wide text-muted">Monday 16 November</p>
        <div className="mt-4 flex items-end gap-4">
          <p className="font-display text-4xl leading-none tracking-tight text-accent">41</p>
          <div className="pb-1">
            <h1 className="font-display text-2xl leading-tight tracking-tight">days of meditation</h1>
            <p className="text-sm text-muted">Your longest streak this year. Best before: 29.</p>
          </div>
        </div>
        <p className="mt-4 text-muted">Four down, three to go today.</p>
      </header>

      <section aria-label="Last 7 days" className="mx-6 mt-4 flex items-center justify-between border-y border-line py-3">
        <ul className="flex items-center gap-3">
          {week.map((d, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className={`font-mono text-xs ${d.today ? 'font-semibold text-accent' : 'text-muted'}`}>{d.label}</span>
              <span className={`h-3 w-3 rounded-sm ${d.today ? 'bg-accent' : d.done ? 'bg-ink' : 'bg-ink/20'}`} />
            </li>
          ))}
        </ul>
        <p className="font-mono text-sm text-muted">39/49</p>
      </section>

      <main className="mt-6 flex-1 px-6">
        <h2 className="font-display text-xl">Still open</h2>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {open.map((h, i) => (
            <li key={h.name} className="flex h-14 items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate">{h.name}</p>
                <p className={`text-sm ${h.broke ? 'text-danger' : 'text-muted'}`}>{h.note}</p>
              </div>
              <Button type="button" variant={i === 0 ? 'default' : 'outline'} className="h-11 px-4 text-sm font-semibold"
                onClick={() => onDone?.(h.name)}>
                Done
              </Button>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 font-display text-xl">Finished</h2>
        <ul className="mt-2 grid grid-cols-2 gap-x-8 text-sm text-muted">
          {finished.map((h) => (
            <li key={h.name} className="flex h-8 items-center justify-between">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-success" aria-hidden />{h.name}</span>
              <span className="font-mono tabular-nums">{h.streak}</span>
            </li>
          ))}
        </ul>
      </main>

      <nav aria-label="Main" className="sticky bottom-0 grid grid-cols-4 border-t border-line bg-surface px-2 pb-6 pt-2">
        {nav.map(({ label, icon: Icon, current }) => (
          <a key={label} href="#" aria-current={current ? 'page' : undefined}
            className={`flex h-12 flex-col items-center justify-center gap-1 ${current ? 'text-accent' : 'text-muted'}`}>
            <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            <span className={`text-xs ${current ? 'font-semibold' : ''}`}>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
