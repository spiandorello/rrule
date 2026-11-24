import IterResult from '../iterresult.js'
import {
  ParsedOptions,
  freqIsDailyOrGreater,
  QueryMethodTypes,
  Frequency,
} from '../types.js'
import { combine, fromOrdinal, MAXYEAR } from '../dateutil.js'
import Iterinfo from '../iterinfo/index.js'
import { RRule } from '../rrule.js'
import { buildTimeset } from '../parseoptions.js'
import { notEmpty, includes, isPresent } from '../helpers.js'
import { DateWithZone } from '../datewithzone.js'
import { buildPoslist } from './poslist.js'
import { Time, DateTime } from '../datetime.js'

export function iter<M extends QueryMethodTypes>(
  iterResult: IterResult<M>,
  options: ParsedOptions
) {
  const { dtstart, freq, interval, until, bysetpos } = options

  let count = options.count
  if (count === 0 || interval === 0) {
    return emitResult(iterResult)
  }

  const counterDate = DateTime.fromDate(dtstart)

  const ii = new Iterinfo(options)
  ii.rebuild(counterDate.year, counterDate.month)

  let timeset = makeTimeset(ii, counterDate, options)

  for (;;) {
    iterResult.step()

    // Every candidate of this period falls on or after its start, so once
    // the period starts past UNTIL nothing else can be emitted. Checking
    // only emitted candidates is not enough: a rule whose candidates are
    // all filtered out would otherwise run until MAXYEAR.
    if (until && periodStart(counterDate, freq) > until.getTime()) {
      return emitResult(iterResult)
    }

    const [dayset, start, end] = ii.getdayset(freq)(
      counterDate.year,
      counterDate.month,
      counterDate.day
    )

    const filtered = removeFilteredDays(dayset, start, end, ii, options)

    if (notEmpty(bysetpos)) {
      const poslist = buildPoslist(bysetpos, timeset, start, end, ii, dayset)

      iterResult.step(bysetpos.length)
      for (let j = 0; j < poslist.length; j++) {
        const res = poslist[j]
        if (until && res > until) {
          return emitResult(iterResult)
        }

        if (res >= dtstart) {
          const rezonedDate = rezoneIfNeeded(res, options)
          if (!iterResult.accept(rezonedDate)) {
            return emitResult(iterResult)
          }

          if (count) {
            --count
            if (!count) {
              return emitResult(iterResult)
            }
          }
        }
      }
    } else {
      for (let j = start; j < end; j++) {
        const currentDay = dayset[j]
        if (!isPresent(currentDay)) {
          continue
        }

        const date = fromOrdinal(ii.yearordinal + currentDay)
        iterResult.step(timeset.length)
        for (let k = 0; k < timeset.length; k++) {
          const time = timeset[k]
          const res = combine(date, time)
          if (until && res > until) {
            return emitResult(iterResult)
          }

          if (res >= dtstart) {
            const rezonedDate = rezoneIfNeeded(res, options)
            if (!iterResult.accept(rezonedDate)) {
              return emitResult(iterResult)
            }

            if (count) {
              --count
              if (!count) {
                return emitResult(iterResult)
              }
            }
          }
        }
      }
    }
    if (options.interval === 0) {
      return emitResult(iterResult)
    }

    // Handle frequency and interval
    counterDate.add(options, filtered)

    if (counterDate.year > MAXYEAR) {
      return emitResult(iterResult)
    }

    if (!freqIsDailyOrGreater(freq)) {
      timeset = ii.gettimeset(freq)(
        counterDate.hour,
        counterDate.minute,
        counterDate.second,
        0
      )
    }

    ii.rebuild(counterDate.year, counterDate.month)
  }
}

/**
 * Start (UTC ms) of the period the iterator is about to expand. Dayset
 * indexes are relative to the counter's year; sub-yearly periods never
 * reach back before the counter's month (MONTHLY) or day (WEEKLY, DAILY),
 * and sub-daily timesets start at the counter's hour, minute or second.
 */
function periodStart(counterDate: DateTime, freq: Frequency): number {
  const { year, month, day, hour, minute, second } = counterDate
  switch (freq) {
    case Frequency.YEARLY:
      return Date.UTC(year, 0, 1)
    case Frequency.MONTHLY:
      return Date.UTC(year, month - 1, 1)
    case Frequency.WEEKLY:
    case Frequency.DAILY:
      return Date.UTC(year, month - 1, day)
    case Frequency.HOURLY:
      return Date.UTC(year, month - 1, day, hour)
    case Frequency.MINUTELY:
      return Date.UTC(year, month - 1, day, hour, minute)
    default:
      return Date.UTC(year, month - 1, day, hour, minute, second)
  }
}

function isFiltered(
  ii: Iterinfo,
  currentDay: number,
  options: ParsedOptions
): boolean {
  const {
    bymonth,
    byweekno,
    byweekday,
    byeaster,
    bymonthday,
    bynmonthday,
    byyearday,
  } = options

  return (
    (notEmpty(bymonth) && !includes(bymonth, ii.mmask[currentDay])) ||
    // wnomask is non-null whenever byweekno is set (see rebuildYear).
    (notEmpty(byweekno) && isPresent(ii.wnomask) && !ii.wnomask[currentDay]) ||
    (notEmpty(byweekday) && !includes(byweekday, ii.wdaymask[currentDay])) ||
    (notEmpty(ii.nwdaymask) && !ii.nwdaymask[currentDay]) ||
    (byeaster !== null && !includes(ii.eastermask, currentDay)) ||
    ((notEmpty(bymonthday) || notEmpty(bynmonthday)) &&
      !includes(bymonthday, ii.mdaymask[currentDay]) &&
      !includes(bynmonthday, ii.nmdaymask[currentDay])) ||
    (notEmpty(byyearday) &&
      ((currentDay < ii.yearlen &&
        !includes(byyearday, currentDay + 1) &&
        !includes(byyearday, -ii.yearlen + currentDay)) ||
        (currentDay >= ii.yearlen &&
          !includes(byyearday, currentDay + 1 - ii.yearlen) &&
          !includes(byyearday, -ii.nextyearlen + currentDay - ii.yearlen))))
  )
}

function rezoneIfNeeded(date: Date, options: ParsedOptions) {
  return new DateWithZone(date, options.tzid).rezonedDate()
}

function emitResult<M extends QueryMethodTypes>(iterResult: IterResult<M>) {
  return iterResult.getValue()
}

function removeFilteredDays(
  dayset: (number | null)[],
  start: number,
  end: number,
  ii: Iterinfo,
  options: ParsedOptions
) {
  let filtered = false
  for (let dayCounter = start; dayCounter < end; dayCounter++) {
    const currentDay = dayset[dayCounter]
    if (currentDay === null) continue

    filtered = isFiltered(ii, currentDay, options)

    if (filtered) dayset[currentDay] = null
  }

  return filtered
}

function makeTimeset(
  ii: Iterinfo,
  counterDate: DateTime,
  options: ParsedOptions
): Time[] {
  const { freq, byhour, byminute, bysecond } = options

  if (freqIsDailyOrGreater(freq)) {
    return buildTimeset(options)
  }

  if (
    (freq >= RRule.HOURLY &&
      notEmpty(byhour) &&
      !includes(byhour, counterDate.hour)) ||
    (freq >= RRule.MINUTELY &&
      notEmpty(byminute) &&
      !includes(byminute, counterDate.minute)) ||
    (freq >= RRule.SECONDLY &&
      notEmpty(bysecond) &&
      !includes(bysecond, counterDate.second))
  ) {
    return []
  }

  return ii.gettimeset(freq)(
    counterDate.hour,
    counterDate.minute,
    counterDate.second,
    counterDate.millisecond
  )
}
