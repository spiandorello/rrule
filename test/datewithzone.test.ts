import { DateWithZone } from '../src/datewithzone'
import { set as setMockDate, reset as resetMockDate } from 'mockdate'
import { datetime, expectedDate } from './lib/utils'
import { RRule } from '../src/rrule'

describe('toString', () => {
  it('returns the date when no tzid is present', () => {
    const dt = new DateWithZone(datetime(2010, 10, 5, 11, 0, 0))
    expect(dt.toString()).toBe(':20101005T110000Z')

    const dt2 = new DateWithZone(datetime(2010, 10, 5, 11, 0, 0), 'UTC')
    expect(dt2.toString()).toBe(':20101005T110000Z')
  })

  it('returns the date with tzid when present', () => {
    const dt = new DateWithZone(datetime(2010, 10, 5, 11, 0, 0), 'Asia/Tokyo')
    expect(dt.toString()).toBe(';TZID=Asia/Tokyo:20101005T110000')
  })
})

it('returns the time of the date', () => {
  const d = datetime(2010, 10, 5, 11, 0, 0)
  const dt = new DateWithZone(d)
  expect(dt.getTime()).toBe(d.getTime())
})

it('rejects invalid dates', () => {
  expect(() => new DateWithZone(new Date(undefined))).toThrow(
    'Invalid date passed to DateWithZone'
  )
})

describe('rezonedDate perf', () => {
  // Regression guard for the per-iteration `Intl.DateTimeFormat` allocation
  // hot path in `dateInTimeZone` — historically `.between()` with TZID was
  // ~50× slower than UTC because each accepted candidate built three new
  // formatters. With formatter caching the gap drops to ~2×. We require
  // ≤6× here to keep the bound noise-tolerant on slower CI hardware.
  it('keeps TZID iteration within ~6x of UTC for .between()', () => {
    const dtstart = datetime(2020, 1, 1, 0, 0, 0)
    const after = datetime(2025, 1, 1, 0, 0, 0)
    const before = datetime(2030, 1, 1, 0, 0, 0)

    const utcRule = new RRule(
      { freq: RRule.DAILY, dtstart },
      true /* noCache */
    )
    const tzRule = new RRule(
      { freq: RRule.DAILY, dtstart, tzid: 'America/New_York' },
      true
    )

    // Warmup to stabilise V8 JIT for both code paths.
    for (let i = 0; i < 2; i++) {
      utcRule.between(after, before)
      tzRule.between(after, before)
    }

    const utcStart = process.hrtime.bigint()
    utcRule.between(after, before)
    const utcMs = Number(process.hrtime.bigint() - utcStart) / 1e6

    const tzStart = process.hrtime.bigint()
    tzRule.between(after, before)
    const tzMs = Number(process.hrtime.bigint() - tzStart) / 1e6

    // Hard ceiling so a regression to per-call formatter allocation
    // (which would put TZID back near 350ms) fails loudly even if utcMs
    // happens to be slow on the runner.
    expect(tzMs).toBeLessThan(150)
    // Ratio guard catches subtler regressions while utcMs grows in lockstep.
    // Floor utcMs to avoid divide-by-tiny noise on fast hardware.
    expect(tzMs / Math.max(utcMs, 1)).toBeLessThan(6)
  })
})

describe('rezonedDate', () => {
  it('returns the original date when no zone is given', () => {
    const d = datetime(2010, 10, 5, 11, 0, 0)
    const dt = new DateWithZone(d)
    expect(dt.rezonedDate()).toEqual(d)
  })

  it('returns the date in the correct zone when given', () => {
    const targetZone = 'America/New_York'
    const currentLocalDate = new Date(2000, 1, 6, 1, 0, 0)
    setMockDate(currentLocalDate)

    const d = new Date(Date.parse('2010-10-05T11:00:00'))
    const dt = new DateWithZone(d, targetZone)
    expect(dt.rezonedDate()).toEqual(
      expectedDate(
        new Date(Date.parse('2010-10-05T11:00:00')),
        currentLocalDate,
        targetZone
      )
    )

    resetMockDate()
  })
})
