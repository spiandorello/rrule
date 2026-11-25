import { Options, ParsedOptions, freqIsDailyOrGreater } from './types.js'
import {
  includes,
  notEmpty,
  isPresent,
  isNumber,
  isArray,
  isWeekdayStr,
} from './helpers.js'
import { RRule, defaultKeys, DEFAULT_OPTIONS } from './rrule.js'
import { getWeekday, isDate, isValidDate } from './dateutil.js'
import { Weekday } from './weekday.js'
import { Time } from './datetime.js'

export function initializeOptions(options: Partial<Options>) {
  const invalid: string[] = []
  const keys = Object.keys(options) as (keyof Options)[]

  // Shallow copy for options and origOptions and check for invalid
  for (const key of keys) {
    if (!includes(defaultKeys, key)) invalid.push(key)
    if (isDate(options[key]) && !isValidDate(options[key])) {
      invalid.push(key)
    }
  }

  if (invalid.length) {
    throw new Error('Invalid options: ' + invalid.join(', '))
  }

  return { ...options }
}

export function parseOptions(options: Partial<Options>) {
  const opts = { ...DEFAULT_OPTIONS, ...initializeOptions(options) }

  if (isPresent(opts.byeaster)) opts.freq = RRule.YEARLY

  if (!(isPresent(opts.freq) && RRule.FREQUENCIES[opts.freq])) {
    throw new Error(`Invalid frequency: ${opts.freq} ${options.freq}`)
  }

  if (!isPresent(opts.interval)) {
    opts.interval = 1
  } else if (
    !isNumber(opts.interval) ||
    !Number.isFinite(opts.interval) ||
    !Number.isInteger(opts.interval) ||
    opts.interval < 1
  ) {
    throw new Error(
      `Invalid interval: ${opts.interval}. Must be a positive integer.`
    )
  }

  if (!opts.dtstart) opts.dtstart = new Date(new Date().setMilliseconds(0))

  if (!isPresent(opts.wkst)) {
    opts.wkst = RRule.MO.weekday
  } else if (isNumber(opts.wkst)) {
    // cool, just keep it like that
  } else {
    opts.wkst = opts.wkst.weekday
  }

  if (isPresent(opts.bysetpos)) {
    if (isNumber(opts.bysetpos)) opts.bysetpos = [opts.bysetpos]

    // Bounded by the value range: at most 732 distinct legal positions
    // (-366..-1, 1..366). Reject anything longer to prevent unbounded
    // arrays from untrusted input.
    if (opts.bysetpos.length > 732) {
      throw new Error(
        `bysetpos must contain at most 732 entries (got ${opts.bysetpos.length})`
      )
    }

    for (let i = 0; i < opts.bysetpos.length; i++) {
      const v = opts.bysetpos[i]
      if (v === 0 || !(v >= -366 && v <= 366)) {
        throw new Error(
          'bysetpos must be between 1 and 366,' + ' or between -366 and -1'
        )
      }
    }
  }

  if (!(
    Boolean(opts.byweekno as number) ||
    notEmpty(opts.byweekno as number[]) ||
    notEmpty(opts.byyearday as number[]) ||
    Boolean(opts.bymonthday) ||
    notEmpty(opts.bymonthday as number[]) ||
    isPresent(opts.byweekday) ||
    isPresent(opts.byeaster)
  )) {
    switch (opts.freq) {
      case RRule.YEARLY:
        if (!opts.bymonth) opts.bymonth = opts.dtstart.getUTCMonth() + 1
        opts.bymonthday = opts.dtstart.getUTCDate()
        break
      case RRule.MONTHLY:
        opts.bymonthday = opts.dtstart.getUTCDate()
        break
      case RRule.WEEKLY:
        opts.byweekday = [getWeekday(opts.dtstart)]
        break
    }
  }

  // bymonth
  if (isPresent(opts.bymonth) && !isArray(opts.bymonth)) {
    opts.bymonth = [opts.bymonth]
  }

  // byyearday
  if (
    isPresent(opts.byyearday) &&
    !isArray(opts.byyearday) &&
    isNumber(opts.byyearday)
  ) {
    opts.byyearday = [opts.byyearday]
  }

  // bymonthday (0 is accepted and ignored, as before)
  validateIntList(
    'bymonthday',
    isPresent(opts.bymonthday) && !isArray(opts.bymonthday)
      ? [opts.bymonthday]
      : opts.bymonthday,
    -31,
    31
  )
  if (!isPresent(opts.bymonthday)) {
    opts.bymonthday = []
    opts.bynmonthday = []
  } else if (isArray(opts.bymonthday)) {
    const bymonthday = []
    const bynmonthday = []

    for (let i = 0; i < opts.bymonthday.length; i++) {
      const v = opts.bymonthday[i]
      if (v > 0) {
        bymonthday.push(v)
      } else if (v < 0) {
        bynmonthday.push(v)
      }
    }
    opts.bymonthday = bymonthday
    opts.bynmonthday = bynmonthday
  } else if (opts.bymonthday < 0) {
    opts.bynmonthday = [opts.bymonthday]
    opts.bymonthday = []
  } else {
    opts.bynmonthday = []
    opts.bymonthday = [opts.bymonthday]
  }

  // Structurally-impossible BYMONTH + BYMONTHDAY combinations (e.g.
  // BYMONTH=2;BYMONTHDAY=30) never produce occurrences. Detect them upfront
  // and short-circuit via count=0 instead of letting the iterator spin until
  // MAX_ADD_ITERATIONS / MAXYEAR. See issue #69.
  if (isImpossibleByMonthDay(opts.bymonth, opts.bymonthday, opts.bynmonthday)) {
    opts.count = 0
  }

  // byweekno
  if (isPresent(opts.byweekno) && !isArray(opts.byweekno)) {
    opts.byweekno = [opts.byweekno]
  }

  // byweekday / bynweekday
  if (!isPresent(opts.byweekday)) {
    opts.bynweekday = null
  } else if (isNumber(opts.byweekday)) {
    opts.byweekday = [opts.byweekday]
    opts.bynweekday = null
  } else if (isWeekdayStr(opts.byweekday)) {
    opts.byweekday = [Weekday.fromStr(opts.byweekday).weekday]
    opts.bynweekday = null
  } else if (opts.byweekday instanceof Weekday) {
    if (!opts.byweekday.n || opts.freq > RRule.MONTHLY) {
      opts.byweekday = [opts.byweekday.weekday]
      opts.bynweekday = null
    } else {
      opts.bynweekday = [[opts.byweekday.weekday, opts.byweekday.n]]
      opts.byweekday = null
    }
  } else {
    const byweekday: number[] = []
    const bynweekday = []

    for (let i = 0; i < opts.byweekday.length; i++) {
      const wday = opts.byweekday[i]

      if (isNumber(wday)) {
        byweekday.push(wday)
        continue
      } else if (isWeekdayStr(wday)) {
        byweekday.push(Weekday.fromStr(wday).weekday)
        continue
      }

      if (!wday.n || opts.freq > RRule.MONTHLY) {
        byweekday.push(wday.weekday)
      } else {
        bynweekday.push([wday.weekday, wday.n])
      }
    }
    opts.byweekday = notEmpty(byweekday) ? byweekday : null
    opts.bynweekday = notEmpty(bynweekday) ? bynweekday : null
  }

  // byhour
  if (!isPresent(opts.byhour)) {
    opts.byhour = opts.freq < RRule.HOURLY ? [opts.dtstart.getUTCHours()] : null
  } else if (isNumber(opts.byhour)) {
    opts.byhour = [opts.byhour]
  }

  // byminute
  if (!isPresent(opts.byminute)) {
    opts.byminute =
      opts.freq < RRule.MINUTELY ? [opts.dtstart.getUTCMinutes()] : null
  } else if (isNumber(opts.byminute)) {
    opts.byminute = [opts.byminute]
  }

  // bysecond
  if (!isPresent(opts.bysecond)) {
    opts.bysecond =
      opts.freq < RRule.SECONDLY ? [opts.dtstart.getUTCSeconds()] : null
  } else if (isNumber(opts.bysecond)) {
    opts.bysecond = [opts.bysecond]
  }

  validateParsedOptions(opts as ParsedOptions)

  return { parsedOptions: opts as ParsedOptions }
}

// TZID ends up verbatim in toString() output (`DTSTART;TZID=<tzid>:...`).
// Control characters (CR/LF in particular) and iCalendar delimiters would
// let a caller inject extra properties, so reject them. Windows-style names
// with spaces ("W. Europe Standard Time") are still accepted.
// eslint-disable-next-line no-control-regex
const UNSAFE_TZID = /[\u0000-\u001f\u007f;:,"]/
const MAX_TZID_LENGTH = 256

function invalid(name: string, detail: string): never {
  throw new Error(`Invalid ${name}: ${detail}`)
}

function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value)
}

/**
 * Validates that every element of `list` is an integer in [min, max]
 * (excluding 0 when `allowZero` is false) and returns it de-duplicated.
 * De-duplication bounds every BYxxx list by the size of its value domain,
 * which in turn bounds the BYHOUR×BYMINUTE×BYSECOND timeset.
 */
function validateIntList(
  name: string,
  list: unknown,
  min: number,
  max: number,
  allowZero = true
): number[] | null {
  if (!isPresent(list)) return null
  if (!isArray(list)) invalid(name, 'expected an array of integers')

  const seen: { [k: number]: true } = Object.create(null)
  const out: number[] = []
  for (let i = 0; i < list.length; i++) {
    const v: unknown = list[i]
    if (!isInteger(v) || v < min || v > max || (!allowZero && v === 0)) {
      invalid(
        name,
        `expected integers between ${min} and ${max}` +
          (allowZero ? '' : ' (excluding 0)') +
          `, got ${String(v)}`
      )
    }
    if (!seen[v]) {
      seen[v] = true
      out.push(v)
    }
  }
  return out
}

function validateParsedOptions(opts: ParsedOptions) {
  if (!isValidDate(opts.dtstart)) invalid('dtstart', 'expected a valid Date')
  if (isPresent(opts.until) && !isValidDate(opts.until)) {
    invalid('until', 'expected a valid Date')
  }

  if (isPresent(opts.count) && (!isInteger(opts.count) || opts.count < 0)) {
    invalid('count', `expected a non-negative integer, got ${opts.count}`)
  }

  if (!isInteger(opts.wkst) || opts.wkst < 0 || opts.wkst > 6) {
    invalid('wkst', `expected an integer between 0 and 6, got ${opts.wkst}`)
  }

  if (isPresent(opts.tzid)) {
    if (
      typeof opts.tzid !== 'string' ||
      !opts.tzid.length ||
      opts.tzid.length > MAX_TZID_LENGTH ||
      UNSAFE_TZID.test(opts.tzid)
    ) {
      invalid('tzid', JSON.stringify(String(opts.tzid).slice(0, 64)))
    }
  }

  if (
    isPresent(opts.byeaster) &&
    (!isInteger(opts.byeaster) || opts.byeaster < -366 || opts.byeaster > 366)
  ) {
    invalid('byeaster', `expected an integer between -366 and 366`)
  }

  opts.bysetpos = validateIntList(
    'bysetpos',
    opts.bysetpos,
    -366,
    366,
    false
  ) as number[]
  opts.bymonth = validateIntList(
    'bymonth',
    opts.bymonth,
    1,
    12,
    false
  ) as number[]
  opts.bymonthday =
    validateIntList('bymonthday', opts.bymonthday, 1, 31, false) ?? []
  opts.bynmonthday =
    validateIntList('bymonthday', opts.bynmonthday, -31, -1, false) ?? []
  opts.byyearday = validateIntList(
    'byyearday',
    opts.byyearday,
    -366,
    366,
    false
  ) as number[]
  opts.byweekno = validateIntList(
    'byweekno',
    opts.byweekno,
    -53,
    53,
    false
  ) as number[]
  opts.byweekday = validateIntList(
    'byweekday',
    opts.byweekday,
    0,
    6
  ) as number[]
  opts.byhour = validateIntList('byhour', opts.byhour, 0, 23) as number[]
  opts.byminute = validateIntList('byminute', opts.byminute, 0, 59) as number[]
  opts.bysecond = validateIntList('bysecond', opts.bysecond, 0, 60) as number[]

  if (isPresent(opts.bynweekday)) {
    if (!isArray(opts.bynweekday)) invalid('byweekday', 'expected an array')
    for (let i = 0; i < opts.bynweekday.length; i++) {
      const [wday, n] = opts.bynweekday[i]
      if (!isInteger(wday) || wday < 0 || wday > 6) {
        invalid('byweekday', `expected a weekday between 0 and 6, got ${wday}`)
      }
      if (!isInteger(n) || n === 0 || n < -53 || n > 53) {
        invalid('byweekday', `expected an ordinal between -53 and 53, got ${n}`)
      }
    }
  }
}

// 29 (not 28) for February to allow leap-year occurrences with BYMONTHDAY=29.
function maxDaysInMonth(month: number): number {
  if (month === 2) return 29
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30
  return 31
}

function isImpossibleByMonthDay(
  bymonth: number[] | null | undefined,
  bymonthday: number[],
  bynmonthday: number[]
): boolean {
  if (!notEmpty(bymonth)) return false
  if (!notEmpty(bymonthday) && !notEmpty(bynmonthday)) return false

  for (let i = 0; i < bymonth.length; i++) {
    const max = maxDaysInMonth(bymonth[i])
    let monthHasValidDay = false

    for (let j = 0; j < bymonthday.length; j++) {
      if (bymonthday[j] >= 1 && bymonthday[j] <= max) {
        monthHasValidDay = true
        break
      }
    }
    if (!monthHasValidDay) {
      for (let j = 0; j < bynmonthday.length; j++) {
        if (bynmonthday[j] <= -1 && -bynmonthday[j] <= max) {
          monthHasValidDay = true
          break
        }
      }
    }

    if (monthHasValidDay) return false
  }

  return true
}

export function buildTimeset(opts: ParsedOptions) {
  const millisecondModulo = opts.dtstart.getTime() % 1000
  if (!freqIsDailyOrGreater(opts.freq)) {
    return []
  }

  const timeset: Time[] = []
  opts.byhour.forEach((hour) => {
    opts.byminute.forEach((minute) => {
      opts.bysecond.forEach((second) => {
        timeset.push(new Time(hour, minute, second, millisecondModulo))
      })
    })
  })

  return timeset
}
