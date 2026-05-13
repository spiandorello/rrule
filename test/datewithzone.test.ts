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
  expect(
    () => new DateWithZone(new Date(undefined as unknown as string))
  ).toThrow('Invalid date passed to DateWithZone')
})

describe('rezonedDate honors process.env.TZ changes', () => {
  // Caching the local timezone forever would silently break Node services
  // that change `process.env.TZ` mid-process. The fix invalidates when the
  // env var changes between calls.
  //
  // We can't observe the *resolved* timezone change here because Jest's
  // worker environment caches `Intl.DateTimeFormat().resolvedOptions()`
  // separately from real Node and ignores mid-process `TZ` mutations
  // (verified empirically). Instead we verify the invalidation contract:
  // when `process.env.TZ` changes between calls, `Intl.DateTimeFormat()`
  // is invoked again to re-derive the local zone.
  const origTz = process.env.TZ

  afterEach(() => {
    if (origTz === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = origTz
    }
    jest.restoreAllMocks()
  })

  it('re-derives local timezone when process.env.TZ changes', () => {
    const dtf = jest.spyOn(Intl, 'DateTimeFormat')
    const d = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))

    // Prime the cache so the next change is the one we measure.
    process.env.TZ = 'UTC'
    new DateWithZone(d, 'America/New_York').rezonedDate()

    // No-arg call (used to read the local zone). Count invocations.
    const noArgCallsBefore = dtf.mock.calls.filter(
      (args) => args.length === 0
    ).length

    process.env.TZ = 'America/Los_Angeles'
    new DateWithZone(d, 'America/New_York').rezonedDate()

    const noArgCallsAfter = dtf.mock.calls.filter(
      (args) => args.length === 0
    ).length

    expect(noArgCallsAfter).toBeGreaterThan(noArgCallsBefore)
  })

  it('does not re-derive local timezone when process.env.TZ is stable', () => {
    process.env.TZ = 'UTC'
    const d = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
    // Prime.
    new DateWithZone(d, 'America/New_York').rezonedDate()

    const dtf = jest.spyOn(Intl, 'DateTimeFormat')
    for (let i = 0; i < 5; i++) {
      new DateWithZone(d, 'America/New_York').rezonedDate()
    }
    const noArgCalls = dtf.mock.calls.filter((args) => args.length === 0).length
    expect(noArgCalls).toBe(0)
  })
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
