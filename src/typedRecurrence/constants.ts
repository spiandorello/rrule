import { Frequency } from '../types.js'
import { Days } from '../rrule.js'
import { Weekday } from '../weekday.js'
import {
  RecurrenceFrequency,
  RecurrenceWeekday,
  TypedRecurrenceOptions,
} from './types.js'

export const FREQUENCY_MAP: Record<RecurrenceFrequency, Frequency> = {
  YEARLY: Frequency.YEARLY,
  MONTHLY: Frequency.MONTHLY,
  WEEKLY: Frequency.WEEKLY,
  DAILY: Frequency.DAILY,
}

export const SUPPORTED_FREQUENCIES: RecurrenceFrequency[] = [
  'YEARLY',
  'MONTHLY',
  'WEEKLY',
  'DAILY',
]

export const REVERSE_FREQUENCY_MAP: Partial<
  Record<Frequency, RecurrenceFrequency>
> = {
  [Frequency.YEARLY]: 'YEARLY',
  [Frequency.MONTHLY]: 'MONTHLY',
  [Frequency.WEEKLY]: 'WEEKLY',
  [Frequency.DAILY]: 'DAILY',
}

export const WEEKDAY_MAP: Record<RecurrenceWeekday, Weekday> = {
  MO: Days.MO,
  TU: Days.TU,
  WE: Days.WE,
  TH: Days.TH,
  FR: Days.FR,
  SA: Days.SA,
  SU: Days.SU,
}

export const WEEKDAY_INDEX_TO_STR: RecurrenceWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
]

export const DEFAULT_TYPED_OPTIONS: Required<TypedRecurrenceOptions> = {
  includeDtstart: false,
  untilMode: 'inclusive-day',
}
