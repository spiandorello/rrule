export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type RecurrenceWeekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'until'; until: string }
  | { type: 'count'; count: number }

export type Recurrence = {
  frequency: RecurrenceFrequency
  interval?: number
  byWeekday?: [RecurrenceWeekday, ...RecurrenceWeekday[]]
  byMonthDay?: number
  byMonth?: number
  end?: RecurrenceEnd
}

/**
 * Controls how `Recurrence.end.until` (a `YYYY-MM-DD` string) is anchored to a
 * concrete `Date` when serializing to an `RRULE:` string.
 *
 * @default 'inclusive-day-utc'
 */
export type TypedRecurrenceUntilMode =
  /**
   * @deprecated Anchors at 23:59:59 in the runtime's local timezone, so the
   * serialized bytes depend on `process.env.TZ` and roundtrip is broken on
   * non-UTC hosts. Prefer `'inclusive-day-utc'`.
   */
  | 'inclusive-day'
  /**
   * Anchors at 23:59:59 UTC on the UNTIL calendar day. TZ-independent,
   * roundtrip-clean, and still includes events on the UNTIL day (interpreted
   * as a UTC calendar day).
   */
  | 'inclusive-day-utc'
  /**
   * Anchors at 00:00:00 UTC on the UNTIL calendar day. TZ-independent but
   * excludes events later in the UNTIL day.
   */
  | 'instant'

export type TypedRecurrenceOptions = {
  includeDtstart?: boolean
  untilMode?: TypedRecurrenceUntilMode
}
