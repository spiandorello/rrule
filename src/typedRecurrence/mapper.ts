import { RRule } from '../rrule.js'
import { Options } from '../types.js'
import { Weekday } from '../weekday.js'
import { isValidDate } from '../dateutil.js'
import {
  DEFAULT_TYPED_OPTIONS,
  FREQUENCY_MAP,
  WEEKDAY_MAP,
} from './constants.js'
import {
  Recurrence,
  TypedRecurrenceOptions,
  TypedRecurrenceUntilMode,
} from './types.js'
import {
  ymdEndOfDayLocal,
  ymdEndOfDayUtc,
  ymdToUtcMidnight,
} from './helpers.js'

let warnedInclusiveDay = false

const INCLUSIVE_DAY_DEPRECATION_MESSAGE =
  "[@spiandorello/rrulejs] untilMode='inclusive-day' is deprecated and will be removed in a future major. It depends on runtime TZ and breaks roundtrip on non-UTC hosts. Switch to 'inclusive-day-utc' (now the default) or remove the explicit untilMode. Silence with SPIANDORELLO_RRULEJS_NO_WARN=1."

function maybeWarnInclusiveDay(
  untilMode: TypedRecurrenceUntilMode | undefined
): void {
  if (untilMode !== 'inclusive-day') return
  if (warnedInclusiveDay) return
  if (process.env.SPIANDORELLO_RRULEJS_NO_WARN === '1') return
  warnedInclusiveDay = true
  console.warn(INCLUSIVE_DAY_DEPRECATION_MESSAGE)
}

/**
 * Internal: reset the one-time deprecation-warning flag. Intended for tests
 * only — not re-exported from the package entry point.
 */
export function __resetDeprecationStateForTests(): void {
  warnedInclusiveDay = false
}

function resolveOptions(
  options?: TypedRecurrenceOptions
): Required<TypedRecurrenceOptions> {
  maybeWarnInclusiveDay(options?.untilMode)
  return {
    includeDtstart:
      options?.includeDtstart ?? DEFAULT_TYPED_OPTIONS.includeDtstart,
    untilMode: options?.untilMode ?? DEFAULT_TYPED_OPTIONS.untilMode,
  }
}

function untilStringToDate(
  ymd: string,
  mode: TypedRecurrenceUntilMode
): Date {
  switch (mode) {
    case 'instant':
      return ymdToUtcMidnight(ymd)
    case 'inclusive-day':
      return ymdEndOfDayLocal(ymd)
    case 'inclusive-day-utc':
      return ymdEndOfDayUtc(ymd)
  }
}

function buildPartialOptions(
  recurrence: Recurrence,
  dtstart: Date,
  resolved: Required<TypedRecurrenceOptions>
): Partial<Options> {
  if (!isValidDate(dtstart)) {
    throw new Error('recurrenceToRRule requires a valid dtstart Date')
  }

  if (!(recurrence.frequency in FREQUENCY_MAP)) {
    throw new Error(
      `Unsupported recurrence frequency: '${String(recurrence.frequency)}'`
    )
  }

  const partial: Partial<Options> = {
    freq: FREQUENCY_MAP[recurrence.frequency],
    dtstart,
  }

  if (recurrence.interval !== undefined) {
    if (!Number.isInteger(recurrence.interval) || recurrence.interval < 1) {
      throw new Error(
        `Invalid recurrence.interval: expected positive integer, got ${recurrence.interval}`
      )
    }
    if (recurrence.interval > 1) {
      partial.interval = recurrence.interval
    }
  }

  if (recurrence.byWeekday && recurrence.byWeekday.length > 0) {
    const weekdays: Weekday[] = recurrence.byWeekday.map((w) => {
      const mapped = WEEKDAY_MAP[w]
      if (!mapped) {
        throw new Error(`Unsupported recurrence weekday: '${String(w)}'`)
      }
      return mapped
    })
    partial.byweekday = weekdays
  }

  if (recurrence.byMonth !== undefined) {
    partial.bymonth = recurrence.byMonth
  }

  if (recurrence.byMonthDay !== undefined) {
    partial.bymonthday = recurrence.byMonthDay
  }

  const end = recurrence.end
  if (end && end.type === 'until') {
    partial.until = untilStringToDate(end.until, resolved.untilMode)
  } else if (end && end.type === 'count') {
    if (!Number.isInteger(end.count) || end.count < 1) {
      throw new Error(
        `Invalid recurrence.end.count: expected positive integer, got ${end.count}`
      )
    }
    partial.count = end.count
  }

  return partial
}

export function recurrenceToRRule(
  recurrence: Recurrence,
  dtstart: Date,
  options?: TypedRecurrenceOptions
): RRule {
  const resolved = resolveOptions(options)
  const partial = buildPartialOptions(recurrence, dtstart, resolved)
  return new RRule(partial)
}

export function recurrenceToRRuleString(
  recurrence: Recurrence,
  dtstart: Date,
  options?: TypedRecurrenceOptions
): string {
  const resolved = resolveOptions(options)
  const partial = buildPartialOptions(recurrence, dtstart, resolved)
  const rrule = new RRule(partial)
  const full = rrule.toString()

  if (resolved.includeDtstart) {
    return full
  }

  return full
    .split('\n')
    .filter((line) => line.startsWith('RRULE:'))
    .join('\n')
}
