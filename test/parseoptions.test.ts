import { parseOptions } from '../src/parseoptions'
import { RRule } from '../src'

describe('TZID', () => {
  it('leaves null when null', () => {
    const options = parseOptions({ tzid: null })
    expect(options.parsedOptions.tzid).toBeNull()
  })

  it('uses a string when passed in', () => {
    const options = parseOptions({ tzid: 'America/Los_Angeles' })
    expect(options.parsedOptions.tzid).toBe('America/Los_Angeles')
  })
})

describe('byweekday', () => {
  it('works with a single numeric day', () => {
    const options = parseOptions({ byweekday: 1 })
    expect(options.parsedOptions.byweekday).toEqual([1])
  })

  it('works with a single Weekday day', () => {
    const options = parseOptions({ byweekday: RRule.TU })
    expect(options.parsedOptions.byweekday).toEqual([1])
  })

  it('works with a single string day', () => {
    const options = parseOptions({ byweekday: 'TU' })
    expect(options.parsedOptions.byweekday).toEqual([1])
  })

  it('works with a multiple numeric days', () => {
    const options = parseOptions({ byweekday: [1, 2] })
    expect(options.parsedOptions.byweekday).toEqual([1, 2])
  })

  it('works with a multiple Weekday days', () => {
    const options = parseOptions({ byweekday: [RRule.TU, RRule.WE] })
    expect(options.parsedOptions.byweekday).toEqual([1, 2])
  })

  it('works with a multiple string days', () => {
    const options = parseOptions({ byweekday: ['TU', 'WE'] })
    expect(options.parsedOptions.byweekday).toEqual([1, 2])
  })
})

describe('interval', () => {
  it('defaults to 1 when undefined', () => {
    const options = parseOptions({ freq: RRule.DAILY, interval: undefined })
    expect(options.parsedOptions.interval).toBe(1)
  })

  it('defaults to 1 when null', () => {
    const options = parseOptions({
      freq: RRule.DAILY,
      interval: null as unknown as number,
    })
    expect(options.parsedOptions.interval).toBe(1)
  })

  it('keeps a positive integer', () => {
    const options = parseOptions({ freq: RRule.DAILY, interval: 5 })
    expect(options.parsedOptions.interval).toBe(5)
  })

  it('rejects zero', () => {
    expect(() => parseOptions({ freq: RRule.DAILY, interval: 0 })).toThrow(
      /Invalid interval: 0/
    )
  })

  it('rejects negative integers', () => {
    expect(() => parseOptions({ freq: RRule.DAILY, interval: -1 })).toThrow(
      /Invalid interval: -1/
    )
  })

  it('rejects fractional values', () => {
    expect(() => parseOptions({ freq: RRule.DAILY, interval: 1.5 })).toThrow(
      /Invalid interval: 1\.5/
    )
  })

  it('rejects NaN', () => {
    expect(() => parseOptions({ freq: RRule.DAILY, interval: NaN })).toThrow(
      /Invalid interval/
    )
  })

  it('rejects Infinity', () => {
    expect(() =>
      parseOptions({ freq: RRule.DAILY, interval: Infinity })
    ).toThrow(/Invalid interval/)
  })

  it('rejects non-numeric values', () => {
    expect(() =>
      parseOptions({ freq: RRule.DAILY, interval: 'abc' as unknown as number })
    ).toThrow(/Invalid interval/)
  })
})

describe('bysetpos length cap', () => {
  it('accepts up to 732 entries (the value-range maximum)', () => {
    const bysetpos: number[] = []
    for (let v = -366; v <= 366; v++) if (v !== 0) bysetpos.push(v)
    expect(bysetpos).toHaveLength(732)
    expect(() =>
      parseOptions({ freq: RRule.YEARLY, bysetpos, bymonthday: 1 })
    ).not.toThrow()
  })

  it('rejects arrays longer than 732 entries', () => {
    const bysetpos = new Array(733).fill(1)
    expect(() =>
      parseOptions({ freq: RRule.YEARLY, bysetpos, bymonthday: 1 })
    ).toThrow(/bysetpos must contain at most 732 entries \(got 733\)/)
  })

  it('rejects very long arrays before per-element validation', () => {
    const bysetpos = new Array(10_000).fill(1)
    const start = Date.now()
    expect(() =>
      parseOptions({ freq: RRule.YEARLY, bysetpos, bymonthday: 1 })
    ).toThrow(/at most 732 entries/)
    expect(Date.now() - start).toBeLessThan(50)
  })
})
