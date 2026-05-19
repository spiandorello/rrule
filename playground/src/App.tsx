import { useMemo, useState } from 'react'
import { RRule } from '@spiandorello/rrulejs'
import { Builder } from './components/Builder'
import { Output } from './components/Output'
import { Card } from './components/ui'
import { Examples, EXAMPLES } from './components/Examples'
import {
  type BuilderState,
  DEFAULT_STATE,
  generate,
  rruleToState,
  stateToRRuleString,
} from './lib/rrule'
import { shareUrl, useUrlRRule } from './lib/urlState'

const INITIAL_RRULE = EXAMPLES[0].rrule

type Parsed =
  | { ok: true; rule: RRule; state: BuilderState }
  | { ok: false; error: string }

function parse(input: string): Parsed {
  try {
    const rule = RRule.fromString(input.trim())
    const state = rruleToState(input)
    return { ok: true, rule, state }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function App() {
  const [rruleString, setRRuleString] = useUrlRRule(INITIAL_RRULE)
  const [limit, setLimit] = useState<number>(25)

  const parsed = useMemo(() => parse(rruleString), [rruleString])

  const builderState: BuilderState = parsed.ok ? parsed.state : DEFAULT_STATE
  const parseError = parsed.ok ? undefined : parsed.error

  const result = useMemo(() => {
    if (!parsed.ok)
      return { occurrences: [], truncated: false, error: parsed.error }
    return generate(parsed.rule, limit)
  }, [parsed, limit])

  const link = useMemo(() => shareUrl(rruleString), [rruleString])

  const onBuilderChange = (s: BuilderState) => {
    try {
      const next = stateToRRuleString(s)
      setRRuleString(next)
    } catch {
      /* invalid intermediate combination — ignore, UI will reflect on next valid edit */
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <Header />

      <main className="mt-8 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Builder" hint="Visual editor">
          <Builder state={builderState} onChange={onBuilderChange} />
        </Card>

        <Card title="RRULE" hint="String + occurrences">
          <Output
            rruleString={rruleString}
            parseError={parseError}
            onRRuleChange={setRRuleString}
            result={result}
            limit={limit}
            onLimitChange={setLimit}
            shareUrl={link}
          />
        </Card>

        <Card title="Examples" hint="Click to load" className="lg:col-span-2">
          <Examples onPick={setRRuleString} />
        </Card>
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            rrulejs playground
          </h1>
          <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            v5
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">
          Build, parse and preview RFC 5545 recurrence rules. Powered by{' '}
          <a
            href="https://github.com/spiandorello/rrule"
            className="text-accent-200 underline-offset-4 hover:underline"
          >
            @spiandorello/rrulejs
          </a>
          .
        </p>
      </div>
      <nav className="flex items-center gap-2">
        <a
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
          href="https://github.com/spiandorello/rrule"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
          href="https://www.npmjs.com/package/@spiandorello/rrulejs"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm
        </a>
        <a
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
          href="https://datatracker.ietf.org/doc/html/rfc5545"
          target="_blank"
          rel="noopener noreferrer"
        >
          RFC 5545
        </a>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-5 text-[11px] text-zinc-500">
      <span>
        BSD-3-Clause &middot; Hardened fork of{' '}
        <a
          className="hover:text-zinc-300"
          href="https://github.com/jakubroztocil/rrule"
          target="_blank"
          rel="noopener noreferrer"
        >
          jakubroztocil/rrule
        </a>
      </span>
      <span>
        State is encoded in the URL hash &mdash; share this page to share the
        rule.
      </span>
    </footer>
  )
}

function Logo() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-8 w-8 rounded-lg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="#09090b" />
      <path
        d="M8 11h16M8 16h11M8 21h13"
        stroke="url(#lg)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="16" r="1.8" fill="url(#lg)" />
      <circle cx="24.5" cy="21" r="1.8" fill="url(#lg)" />
    </svg>
  )
}

export default App
