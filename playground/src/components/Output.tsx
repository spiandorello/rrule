import { useMemo, useState } from 'react'
import { Button, SegmentedControl, Textarea } from './ui'
import { type GenerateResult } from '../lib/rrule'

type Props = {
  rruleString: string
  parseError?: string
  onRRuleChange: (next: string) => void
  result: GenerateResult
  limit: number
  onLimitChange: (n: number) => void
  shareUrl: string
}

const LIMITS = [10, 25, 50, 100, 250] as const

function formatDate(d: Date, mode: 'iso' | 'local'): string {
  if (mode === 'iso') return d.toISOString()
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Output({
  rruleString,
  parseError,
  onRRuleChange,
  result,
  limit,
  onLimitChange,
  shareUrl,
}: Props) {
  const [copied, setCopied] = useState<'rrule' | 'link' | null>(null)
  const [dateMode, setDateMode] = useState<'iso' | 'local'>('local')

  const copy = async (text: string, kind: 'rrule' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1400)
    } catch {
      /* ignore */
    }
  }

  const groups = useMemo(() => {
    const out: { year: number; dates: Date[] }[] = []
    let current: { year: number; dates: Date[] } | null = null
    for (const d of result.occurrences) {
      const y = d.getFullYear()
      if (!current || current.year !== y) {
        current = { year: y, dates: [] }
        out.push(current)
      }
      current.dates.push(d)
    }
    return out
  }, [result.occurrences])

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            RRULE string
          </span>
          <div className="flex gap-1">
            <Button onClick={() => copy(rruleString, 'rrule')}>
              {copied === 'rrule' ? 'Copied' : 'Copy'}
            </Button>
            <Button onClick={() => copy(shareUrl, 'link')}>
              {copied === 'link' ? 'Link copied' : 'Share link'}
            </Button>
          </div>
        </div>
        <Textarea
          rows={3}
          value={rruleString}
          onChange={(e) => onRRuleChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
        {parseError && (
          <p className="mt-2 rounded-md border border-rose-900/60 bg-rose-950/30 px-3 py-2 font-mono text-[11px] text-rose-300">
            {parseError}
          </p>
        )}
      </div>

      {result.text && !parseError && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Plain English
          </div>
          <div className="text-sm text-zinc-200 first-letter:capitalize">
            {result.text}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Occurrences
            </span>
            <span className="text-[11px] tabular-nums text-zinc-500">
              {result.occurrences.length}
              {result.truncated && '+'} shown
            </span>
          </div>
          <div className="flex gap-2">
            <SegmentedControl<'local' | 'iso'>
              value={dateMode}
              onChange={setDateMode}
              options={[
                { value: 'local', label: 'Local' },
                { value: 'iso', label: 'ISO' },
              ]}
            />
            <SegmentedControl<number>
              value={limit}
              onChange={onLimitChange}
              options={LIMITS.map((n) => ({ value: n, label: String(n) }))}
            />
          </div>
        </div>

        {result.error ? (
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-200">
            {result.error}
          </div>
        ) : result.occurrences.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-6 text-center text-sm text-zinc-500">
            No occurrences produced by this rule.
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/40">
            <ol className="divide-y divide-zinc-900">
              {groups.map((g) => (
                <li key={g.year}>
                  <div className="sticky top-0 z-10 flex items-baseline justify-between border-b border-zinc-900 bg-zinc-950/95 px-3 py-1.5 backdrop-blur">
                    <span className="font-mono text-xs font-semibold text-accent-200">
                      {g.year}
                    </span>
                    <span className="text-[10px] tabular-nums text-zinc-500">
                      {g.dates.length}
                    </span>
                  </div>
                  <ul>
                    {g.dates.map((d, i) => (
                      <li
                        key={`${g.year}-${i}`}
                        className="flex items-center gap-3 px-3 py-1.5 font-mono text-[12px] text-zinc-300 hover:bg-zinc-900/40"
                      >
                        <span className="w-6 text-right text-[10px] text-zinc-600 tabular-nums">
                          {result.occurrences.indexOf(d) + 1}
                        </span>
                        <span>{formatDate(d, dateMode)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            {result.truncated && (
              <div className="border-t border-zinc-900 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
                Capped at {limit} occurrences. Increase the limit to see more.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
