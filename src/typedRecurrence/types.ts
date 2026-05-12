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

export type TypedRecurrenceUntilMode = 'inclusive-day' | 'instant'

export type TypedRecurrenceOptions = {
  includeDtstart?: boolean
  untilMode?: TypedRecurrenceUntilMode
}
