import { parseString } from '../parsestring'
import { Options } from '../types'
import { Weekday } from '../weekday'
import { REVERSE_FREQUENCY_MAP, WEEKDAY_INDEX_TO_STR } from './constants'
import { formatUtcDateToYmd } from './helpers'
import { Recurrence, RecurrenceEnd, RecurrenceWeekday } from './types'

function isPresentArray<T>(value: T | T[] | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

function rejectIfPresent(
  options: Partial<Options>,
  key: keyof Options,
  field: string
): void {
  if (isPresentArray(options[key] as unknown as null)) {
    throw new Error(
      `rruleStringToRecurrence: '${field}' is not supported by Recurrence`
    )
  }
}

function rejectSingleNumberOnly(
  value: number | number[] | null | undefined,
  field: string
): number | undefined {
  if (value === null || value === undefined) return undefined
  if (Array.isArray(value)) {
    if (value.length > 1) {
      throw new Error(
        `rruleStringToRecurrence: '${field}' with multiple values is not supported`
      )
    }
    return value.length === 1 ? value[0] : undefined
  }
  return value
}

function mapByWeekday(
  byweekday: Options['byweekday']
): [RecurrenceWeekday, ...RecurrenceWeekday[]] | undefined {
  if (byweekday === null || byweekday === undefined) return undefined
  const list = Array.isArray(byweekday) ? byweekday : [byweekday]
  if (list.length === 0) return undefined

  const mapped = list.map((entry) => {
    if (!(entry instanceof Weekday)) {
      throw new Error(
        'rruleStringToRecurrence: unsupported BYDAY value (expected weekday token)'
      )
    }
    if (entry.n !== undefined && entry.n !== null) {
      throw new Error(
        `rruleStringToRecurrence: BYDAY with nth offset ('${entry.toString()}') is not supported`
      )
    }
    const str = WEEKDAY_INDEX_TO_STR[entry.weekday]
    if (!str) {
      throw new Error(
        `rruleStringToRecurrence: BYDAY weekday index ${entry.weekday} is out of range`
      )
    }
    return str
  })

  return [mapped[0], ...mapped.slice(1)]
}

function resolveEnd(options: Partial<Options>): RecurrenceEnd | undefined {
  if (options.until) {
    return { type: 'until', until: formatUtcDateToYmd(options.until) }
  }
  if (options.count !== null && options.count !== undefined) {
    if (!Number.isInteger(options.count) || options.count < 1) {
      throw new Error(
        `rruleStringToRecurrence: invalid COUNT value ${options.count}`
      )
    }
    return { type: 'count', count: options.count }
  }
  return { type: 'never' }
}

export function rruleStringToRecurrence(rrule: string): Recurrence {
  const options = parseString(rrule)

  if (options.freq === undefined || options.freq === null) {
    throw new Error('rruleStringToRecurrence: missing FREQ')
  }

  const frequency = REVERSE_FREQUENCY_MAP[options.freq]
  if (!frequency) {
    throw new Error(
      `rruleStringToRecurrence: FREQ '${options.freq}' is not supported by Recurrence`
    )
  }

  rejectIfPresent(options, 'bysetpos', 'BYSETPOS')
  rejectIfPresent(options, 'byweekno', 'BYWEEKNO')
  rejectIfPresent(options, 'byyearday', 'BYYEARDAY')
  rejectIfPresent(options, 'byhour', 'BYHOUR')
  rejectIfPresent(options, 'byminute', 'BYMINUTE')
  rejectIfPresent(options, 'bysecond', 'BYSECOND')
  if (options.byeaster !== null && options.byeaster !== undefined) {
    throw new Error("rruleStringToRecurrence: 'BYEASTER' is not supported")
  }
  if (options.wkst !== null && options.wkst !== undefined) {
    throw new Error("rruleStringToRecurrence: 'WKST' is not supported")
  }

  const recurrence: Recurrence = { frequency }

  if (options.interval !== undefined && options.interval > 1) {
    recurrence.interval = options.interval
  }

  // @ts-expect-error TS2345 — strict pass: pending refactor
  const byWeekday = mapByWeekday(options.byweekday)
  if (byWeekday) {
    recurrence.byWeekday = byWeekday
  }

  const byMonth = rejectSingleNumberOnly(options.bymonth, 'BYMONTH')
  if (byMonth !== undefined) {
    recurrence.byMonth = byMonth
  }

  const byMonthDay = rejectSingleNumberOnly(options.bymonthday, 'BYMONTHDAY')
  if (byMonthDay !== undefined) {
    recurrence.byMonthDay = byMonthDay
  }

  const end = resolveEnd(options)
  if (end) {
    recurrence.end = end
  }

  return recurrence
}
