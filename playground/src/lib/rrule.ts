import {
  RRule,
  Frequency,
  Weekday,
  RRuleIterationLimitError,
  type Options,
} from '@spiandorello/rrulejs'

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type WeekdayCode = (typeof WEEKDAYS)[number]

export const FREQUENCIES = [
  { value: Frequency.YEARLY, label: 'Yearly' },
  { value: Frequency.MONTHLY, label: 'Monthly' },
  { value: Frequency.WEEKLY, label: 'Weekly' },
  { value: Frequency.DAILY, label: 'Daily' },
  { value: Frequency.HOURLY, label: 'Hourly' },
  { value: Frequency.MINUTELY, label: 'Minutely' },
  { value: Frequency.SECONDLY, label: 'Secondly' },
] as const

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const WEEKDAY_TO_CODE: Record<number, WeekdayCode> = {
  0: 'MO',
  1: 'TU',
  2: 'WE',
  3: 'TH',
  4: 'FR',
  5: 'SA',
  6: 'SU',
}

const CODE_TO_INDEX: Record<WeekdayCode, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
}

export type EndKind = 'never' | 'count' | 'until'

export type BuilderState = {
  dtstart: string // YYYY-MM-DDTHH:mm
  freq: Frequency
  interval: number
  byweekday: WeekdayCode[]
  bymonth: number[]
  bymonthday: number[]
  bysetpos: number[]
  byhour: number[]
  byminute: number[]
  end: EndKind
  count: number
  until: string // YYYY-MM-DD
}

export const DEFAULT_STATE: BuilderState = {
  dtstart: toLocalInputValue(new Date()),
  freq: Frequency.WEEKLY,
  interval: 1,
  byweekday: [],
  bymonth: [],
  bymonthday: [],
  bysetpos: [],
  byhour: [],
  byminute: [],
  end: 'count',
  count: 10,
  until: '',
}

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

export function fromLocalInputValue(v: string): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function toUtcEndOfDay(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Date.UTC(+y, +m - 1, +d, 23, 59, 59))
}

export function stateToOptions(s: BuilderState): Partial<Options> {
  const opts: Partial<Options> = {
    freq: s.freq,
    interval: s.interval > 0 ? s.interval : 1,
  }
  const dt = fromLocalInputValue(s.dtstart)
  if (dt) opts.dtstart = dt

  if (s.byweekday.length) {
    opts.byweekday = s.byweekday.map((c) => new Weekday(CODE_TO_INDEX[c]))
  }
  if (s.bymonth.length) opts.bymonth = s.bymonth
  if (s.bymonthday.length) opts.bymonthday = s.bymonthday
  if (s.bysetpos.length) opts.bysetpos = s.bysetpos
  if (s.byhour.length) opts.byhour = s.byhour
  if (s.byminute.length) opts.byminute = s.byminute

  if (s.end === 'count' && s.count > 0) opts.count = s.count
  if (s.end === 'until') {
    const until = toUtcEndOfDay(s.until)
    if (until) opts.until = until
  }
  return opts
}

export function stateToRRule(s: BuilderState): RRule {
  return new RRule(stateToOptions(s) as Options)
}

export function stateToRRuleString(s: BuilderState): string {
  return stateToRRule(s).toString()
}

export function rruleToState(input: string): BuilderState {
  const rule = RRule.fromString(input.trim())
  const o = rule.origOptions
  const dt = o.dtstart ?? new Date()

  const byweekday: WeekdayCode[] = []
  const rawBwd = o.byweekday
  if (rawBwd != null) {
    const arr = Array.isArray(rawBwd) ? rawBwd : [rawBwd]
    for (const w of arr) {
      if (typeof w === 'number') {
        const code = WEEKDAY_TO_CODE[w]
        if (code) byweekday.push(code)
      } else if (w instanceof Weekday) {
        const code = WEEKDAY_TO_CODE[w.weekday]
        if (code) byweekday.push(code)
      } else if (typeof w === 'string') {
        if ((WEEKDAYS as readonly string[]).includes(w))
          byweekday.push(w as WeekdayCode)
      }
    }
  }

  const toArr = (v: number | number[] | null | undefined): number[] => {
    if (v == null) return []
    return Array.isArray(v) ? v : [v]
  }

  let end: EndKind = 'never'
  let count = 10
  let until = ''
  if (o.count != null) {
    end = 'count'
    count = o.count
  } else if (o.until) {
    end = 'until'
    const u = o.until
    const pad = (n: number) => String(n).padStart(2, '0')
    until = `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`
  }

  return {
    dtstart: toLocalInputValue(dt),
    freq: o.freq ?? Frequency.WEEKLY,
    interval: o.interval ?? 1,
    byweekday,
    bymonth: toArr(o.bymonth),
    bymonthday: toArr(o.bymonthday),
    bysetpos: toArr(o.bysetpos),
    byhour: toArr(o.byhour),
    byminute: toArr(o.byminute),
    end,
    count,
    until,
  }
}

export type GenerateResult = {
  occurrences: Date[]
  truncated: boolean
  error?: string
  text?: string
}

export function generate(rule: RRule, limit: number): GenerateResult {
  let truncated = false
  try {
    const occurrences = rule.all((_d, i) => {
      if (i >= limit) {
        truncated = true
        return false
      }
      return true
    })
    let text: string | undefined
    try {
      text = rule.toText()
    } catch {
      text = undefined
    }
    return { occurrences, truncated, text }
  } catch (err: unknown) {
    if (err instanceof RRuleIterationLimitError) {
      return {
        occurrences: [],
        truncated: true,
        error: `Iteration guard hit: ${err.message}`,
      }
    }
    return {
      occurrences: [],
      truncated: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
