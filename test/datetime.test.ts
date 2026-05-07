import { DateTime } from '../src/datetime'
import { Frequency } from '../src'
import { ParsedOptions } from '../src/types'

describe('DateTime.add', () => {
  const baseOptions: ParsedOptions = {
    freq: Frequency.HOURLY,
    dtstart: new Date(Date.UTC(2024, 2, 26)),
    interval: 1,
    wkst: 0,
    count: 1,
    until: null,
    tzid: null,
    bysetpos: [],
    bymonth: [],
    bymonthday: [],
    bynmonthday: [],
    byyearday: [],
    byweekno: [],
    byweekday: [],
    bynweekday: null,
    byhour: [0],
    byminute: [0],
    bysecond: [0],
    byeaster: null,
  }

  function runAdd(overrides: Partial<ParsedOptions>): {
    dt: DateTime
    elapsedMs: number
  } {
    const options = { ...baseOptions, ...overrides }
    const dt = DateTime.fromDate(options.dtstart)
    const start = Date.now()
    dt.add(options, false)
    return { dt, elapsedMs: Date.now() - start }
  }

  describe('parity DoS regressions (issue #468)', () => {
    it('does not hang when HOURLY has odd byhour and even interval (until present)', () => {
      const until = new Date(Date.UTC(2024, 2, 27))
      const { dt, elapsedMs } = runAdd({
        freq: Frequency.HOURLY,
        byhour: [1],
        interval: 2,
        until,
      })
      expect(elapsedMs).toBeLessThan(1000)
      expect(dt.getTime()).toBeGreaterThan(until.getTime())
    })

    it('does not hang when MINUTELY has odd byminute and even interval (until present)', () => {
      const until = new Date(Date.UTC(2024, 2, 27))
      const { elapsedMs } = runAdd({
        freq: Frequency.MINUTELY,
        byminute: [1],
        interval: 2,
        until,
      })
      expect(elapsedMs).toBeLessThan(1000)
    })

    it('does not hang when SECONDLY has odd bysecond and even interval (until present)', () => {
      const until = new Date(Date.UTC(2024, 2, 27))
      const { elapsedMs } = runAdd({
        freq: Frequency.SECONDLY,
        bysecond: [1],
        interval: 2,
        until,
      })
      expect(elapsedMs).toBeLessThan(1000)
    })

    it('does not hang when HOURLY parity mismatch has no until (iteration cap)', () => {
      const { elapsedMs } = runAdd({
        freq: Frequency.HOURLY,
        byhour: [1],
        interval: 2,
        until: null,
      })
      expect(elapsedMs).toBeLessThan(1000)
    })

    it('does not hang when MINUTELY parity mismatch has no until (iteration cap)', () => {
      const { elapsedMs } = runAdd({
        freq: Frequency.MINUTELY,
        byminute: [1],
        interval: 2,
        until: null,
      })
      expect(elapsedMs).toBeLessThan(1000)
    })

    it('does not hang when SECONDLY parity mismatch has no until (iteration cap)', () => {
      const { elapsedMs } = runAdd({
        freq: Frequency.SECONDLY,
        bysecond: [1],
        interval: 2,
        until: null,
      })
      expect(elapsedMs).toBeLessThan(1000)
    })
  })

  describe('legitimate matches still produce correct results', () => {
    it('HOURLY with matching byhour advances to the next match', () => {
      const { dt } = runAdd({
        freq: Frequency.HOURLY,
        byhour: [4, 8, 12],
        interval: 1,
      })
      expect(dt.hour).toBe(4)
    })

    it('HOURLY with no byhour advances by interval', () => {
      const { dt } = runAdd({
        freq: Frequency.HOURLY,
        byhour: [],
        interval: 3,
      })
      expect(dt.hour).toBe(3)
    })
  })
})
