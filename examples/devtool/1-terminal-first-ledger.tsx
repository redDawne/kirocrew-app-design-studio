/*
 * Tapedeck landing page, "Terminal-first ledger" (Design Studio export).
 *
 * Paste into tailwind.config.ts -> theme.extend:
 *
 * colors: {
 *   bg: "#F7F6F3", surface: "#FFFFFF", ink: "#1B1A17", muted: "#64615A",
 *   line: "#E4E1DA", accent: "#B4441C", "accent-ink": "#FFFFFF",
 * },
 * fontFamily: {
 *   sans: ["Inter", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
 *   display: ["'Iowan Old Style'", "'Palatino Linotype'", "Palatino", "Georgia", "serif"],
 *   mono: ["'SF Mono'", "ui-monospace", "Menlo", "Consolas", "monospace"],
 * },
 * borderRadius: { sm: "4px", md: "6px", lg: "10px" },
 * fontSize: {
 *   xs: ["12px", { lineHeight: "1.5" }], sm: ["14px", { lineHeight: "1.5" }],
 *   base: ["16px", { lineHeight: "1.5" }], lg: ["20px", { lineHeight: "1.25" }],
 *   xl: ["24px", { lineHeight: "1.25" }], "2xl": ["32px", { lineHeight: "1.25" }],
 *   "3xl": ["44px", { lineHeight: "1.1" }],
 * },
 * borderColor: { DEFAULT: "#E4E1DA" },
 */
import { CassetteTape } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type NavLink = { label: string; href: string; current?: boolean };
type Step = { n: string; title: string; body: React.ReactNode };
type ProofRow = { team: string; suite: string; flaky: number; fixed: number; median: string };
type Plan = { name: string; detail: string; price: React.ReactNode };
type FooterCol = { title: string; items: string[] };

const nav: NavLink[] = [
  { label: "How it works", href: "#how" },
  { label: "Customers", href: "#proof" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
  { label: "Sign in", href: "#" },
];

const steps: Step[] = [
  {
    n: "01",
    title: "Wrap your test command",
    body: (
      <>Prefix the CI step with <code className="font-mono text-sm text-ink">tapedeck record --</code>. Works with Jest, pytest, Go test, RSpec and Gradle. Overhead in our benchmarks: 3-7%.</>
    ),
  },
  {
    n: "02",
    title: "Keep only the red runs",
    body: "Green runs are discarded after the job. Failed and retried-then-passed runs are uploaded, so you also catch the flakes your retry policy hides.",
  },
  {
    n: "03",
    title: "Replay and attach a debugger",
    body: (
      <><code className="font-mono text-sm text-ink">tapedeck replay</code> feeds the recorded clock, randomness and network back in. Set a breakpoint in Delve, pdb or your IDE and run it as many times as you need.</>
    ),
  },
];

const proof: ProofRow[] = [
  { team: "Northwind Freight", suite: "Go, 4,812 tests", flaky: 63, fixed: 58, median: "2.1 h" },
  { team: "Kestrel Health", suite: "pytest, 11,240 tests", flaky: 117, fixed: 96, median: "3.4 h" },
  { team: "Lumen Maps", suite: "Jest + Playwright", flaky: 41, fixed: 41, median: "55 min" },
  { team: "Brightwater Bank", suite: "JUnit, Gradle", flaky: 208, fixed: 171, median: "5.8 h" },
  { team: "Oyelaran Labs", suite: "RSpec", flaky: 19, fixed: 17, median: "1.2 h" },
  { team: "Tidewater Games", suite: "C++, Bazel", flaky: 84, fixed: 62, median: "7.5 h" },
  { team: "Sorensen & Moe", suite: "Go, pytest", flaky: 37, fixed: 35, median: "1.9 h" },
];

const plans: Plan[] = [
  { name: "Open source", detail: "Public repos, 30-day retention", price: <span className="font-mono">$0</span> },
  { name: "Team", detail: "2,000 tapes a month, 90-day retention, Slack alerts", price: <span className="font-mono">$240 / mo</span> },
  { name: "Self-hosted", detail: "Tapes in your bucket, SSO, audit log", price: <a href="#" className="underline underline-offset-4">Talk to us</a> },
];

const footerCols: FooterCol[] = [
  { title: "Product", items: ["Changelog", "CLI reference", "Status"] },
  { title: "Company", items: ["About", "Security"] },
];

type TermLine = { text: string; tone?: "dim" | "fail" | "plain" };
const terminal: TermLine[] = [
  { text: "$ tapedeck pull gh:northwind/checkout#8814" },
  { text: "  fetched tape 41.7 MB · run 8814 · job integration (3/6)", tone: "dim" },
  { text: "$ tapedeck replay --test OrderSettlesAfterRetry" },
  { text: "  replaying with recorded clock, DNS and 212 network calls", tone: "dim" },
  { text: "  PASS CartCreated              14 ms" },
  { text: "  PASS PaymentAuthorised       380 ms" },
  { text: "  FAIL OrderSettlesAfterRetry 1,204 ms", tone: "fail" },
  { text: '    expected status "settled", got "pending"', tone: "dim" },
  { text: "    diverged at ledger/client.go:118 — retry fired 3 ms before", tone: "dim" },
  { text: "    webhook ack (recorded order: ack, retry)", tone: "dim" },
];
const toneClass = { dim: "text-bg/60", fail: "text-accent", plain: "" } as const;

export default function TapedeckLandingPage() {
  return (
    <div className="bg-bg text-ink font-sans text-base">
      <header className="border-b border-line bg-bg">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-semibold text-ink">
            <CassetteTape size={20} strokeWidth={1.5} aria-hidden="true" />
            Tapedeck
          </a>
          <nav aria-label="Main" className="flex items-center gap-8 text-sm text-muted">
            {nav.map((l) => (
              <a key={l.label} href={l.href} aria-current={l.current ? "page" : undefined} className="hover:text-ink">
                {l.label}
              </a>
            ))}
            <Button asChild variant="outline" className="h-10 px-4 rounded-md border-line bg-surface text-ink font-medium">
              <a href="#">Start free</a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-8 pt-20 pb-24 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-5">
            <p className="font-mono text-sm text-accent">v2.3 · now records Bazel remote execution</p>
            <h1 className="mt-4 font-display text-3xl tracking-tight text-ink">
              The test failed once in CI. Replay that exact run on your laptop.
            </h1>
            <p className="mt-6 text-lg text-muted">
              Tapedeck records every CI test run: syscalls, network, clock and env. When one goes red, pull the tape and
              step through it locally until the flake shows itself.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Button asChild className="h-12 px-6 rounded-md bg-accent text-accent-ink font-semibold hover:bg-accent/90 focus-visible:ring-2 ring-accent">
                <a href="#">Start recording free</a>
              </Button>
              <a href="#" className="inline-flex items-center h-12 px-2 text-ink font-medium underline underline-offset-4">
                Read the docs
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">Free for public repos. No agent on your build machines.</p>
          </div>
          <div className="col-span-7">
            <figure
              aria-label="Terminal session replaying a failed CI test"
              className="rounded-lg border border-line bg-ink text-bg shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 h-10 border-b border-ink">
                <span className="font-mono text-xs text-bg/60">~/src/checkout-service</span>
                <span className="font-mono text-xs text-bg/60">zsh</span>
              </div>
              <pre className="p-6 font-mono text-sm leading-7 overflow-hidden">
                {terminal.map((line, i) => (
                  <div key={i} className={toneClass[line.tone ?? "plain"]}>{line.text}</div>
                ))}
                <div>
                  <span className="text-bg/60">$</span>{" "}
                  <span className="inline-block w-2 h-4 align-middle bg-bg" aria-hidden="true" />
                </div>
              </pre>
            </figure>
          </div>
        </section>

        <section id="how" className="border-t border-line">
          <div className="max-w-6xl mx-auto px-8 py-20 grid grid-cols-12 gap-8">
            <div className="col-span-4">
              <h2 className="font-display text-2xl tracking-tight">How it works</h2>
              <p className="mt-4 text-muted">
                Three commands. The CLI is one static binary; the tapes live on our hosted service or your own S3 bucket.
              </p>
            </div>
            <ol className="col-span-8 divide-y divide-line border-y border-line">
              {steps.map((s) => (
                <li key={s.n} className="grid grid-cols-8 gap-8 py-6">
                  <span className="col-span-1 font-mono text-sm text-muted">{s.n}</span>
                  <div className="col-span-7">
                    <h3 className="font-semibold text-lg">{s.title}</h3>
                    <p className="mt-2 text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="proof" className="border-t border-line bg-surface">
          <div className="max-w-6xl mx-auto px-8 py-20 grid grid-cols-12 gap-8">
            <div className="col-span-4">
              <h2 className="font-display text-2xl tracking-tight">Flakes closed last quarter</h2>
              <p className="mt-4 text-muted">
                From teams that agreed to share numbers. Time to fix is from first red run to merged patch.
              </p>
              <blockquote className="mt-8 border-l-2 border-accent pl-4">
                <p className="text-ink">
                  &ldquo;We had a test quarantined for eleven months. Tapedeck showed us the race in one replay.&rdquo;
                </p>
                <footer className="mt-2 text-sm text-muted">Ifeoma Chukwu, Staff Engineer, Northwind Freight</footer>
              </blockquote>
            </div>
            <div className="col-span-8">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-line hover:bg-transparent">
                    <TableHead className="py-3 font-medium text-muted">Team</TableHead>
                    <TableHead className="py-3 font-medium text-muted">Suite</TableHead>
                    <TableHead className="py-3 font-medium text-muted text-right">Flaky tests</TableHead>
                    <TableHead className="py-3 font-medium text-muted text-right">Fixed</TableHead>
                    <TableHead className="py-3 font-medium text-muted text-right">Median time to fix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-line">
                  {proof.map((r) => (
                    <TableRow key={r.team} className="border-line hover:bg-transparent">
                      <TableCell className="py-3">{r.team}</TableCell>
                      <TableCell className="py-3 text-muted">{r.suite}</TableCell>
                      <TableCell className="py-3 text-right font-mono">{r.flaky}</TableCell>
                      <TableCell className="py-3 text-right font-mono">{r.fixed}</TableCell>
                      <TableCell className="py-3 text-right font-mono">{r.median}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-line">
          <div className="max-w-6xl mx-auto px-8 py-20 grid grid-cols-12 gap-8">
            <div className="col-span-4">
              <h2 className="font-display text-2xl tracking-tight">Priced by tapes kept, not seats</h2>
              <p className="mt-4 text-muted">Everyone on the team can replay. You pay for the failed runs we store.</p>
            </div>
            <div className="col-span-8">
              <dl className="divide-y divide-line border-y border-line">
                {plans.map((p) => (
                  <div key={p.name} className="grid grid-cols-8 gap-8 py-4 items-baseline">
                    <dt className="col-span-2 font-semibold">{p.name}</dt>
                    <dd className="col-span-4 text-muted">{p.detail}</dd>
                    <dd className="col-span-2 text-right">{p.price}</dd>
                  </div>
                ))}
              </dl>
              <a href="#" className="mt-6 inline-block text-accent font-medium">Compare plans in detail</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-12 gap-8 text-sm">
          <div className="col-span-4">
            <p className="font-semibold">Tapedeck</p>
            <p className="mt-2 text-muted">Made in Lisbon and Toronto. © 2026 Tapedeck Labs.</p>
          </div>
          {footerCols.map((c) => (
            <nav key={c.title} aria-label={c.title} className="col-span-2">
              <p className="font-medium">{c.title}</p>
              <ul className="mt-2 space-y-2 text-muted">
                {c.items.map((i) => (
                  <li key={i}><a href="#" className="hover:text-ink">{i}</a></li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-4">
            <p className="font-medium">Contact</p>
            <a href="mailto:hello@tapedeck.example" className="mt-2 block text-muted hover:text-ink">hello@tapedeck.example</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
