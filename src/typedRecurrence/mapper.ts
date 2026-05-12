import { RRule } from '../rrule'
import { Options } from '../types'
import { Weekday } from '../weekday'
import { isValidDate } from '../dateutil'
import { DEFAULT_TYPED_OPTIONS, FREQUENCY_MAP, WEEKDAY_MAP } from './constants'
import { Recurrence, TypedRecurrenceOptions } from './types'
import { ymdEndOfDayLocal, ymdToUtcMidnight } from './helpers'

function resolveOptions(
  options?: TypedRecurrenceOptions
): Required<TypedRecurrenceOptions> {
  return {
    includeDtstart:
      options?.includeDtstart ?? DEFAULT_TYPED_OPTIONS.includeDtstart,
    untilMode: options?.untilMode ?? DEFAULT_TYPED_OPTIONS.untilMode,
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
    partial.until =
      resolved.untilMode === 'instant'
        ? ymdToUtcMidnight(end.until)
        : ymdEndOfDayLocal(end.until)
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
  const rrule = recurrenceToRRule(recurrence, dtstart, options)
  const full = rrule.toString()

  if (resolved.includeDtstart) {
    return full
  }

  return full
    .split('\n')
    .filter((line) => line.startsWith('RRULE:'))
    .join('\n')
}
