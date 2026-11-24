import { RRule, RRuleSet, rrulestr, recurrenceToRRule } from '../src'
import IterResult, { RRuleIterationLimitError } from '../src/iterresult'
import { RRuleStringTooLargeError } from '../src/parsestring'
import { MAX_CACHE_ENTRIES } from '../src/cache'

const DTSTART = 'DTSTART:20200101T000000Z\n'

function expectStepLimit(fn: () => unknown) {
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(RRuleIterationLimitError)
    expect((err as RRuleIterationLimitError).kind).toBe('steps')
    return
  }
  throw new Error('expected RRuleIterationLimitError')
}

describe('security hardening', () => {
  const originalSteps = IterResult.defaultMaxSteps

  beforeEach(() => {
    // Keep the budget small so every guard fires in milliseconds.
    IterResult.defaultMaxSteps = 50_000
  })

  afterEach(() => {
    IterResult.defaultMaxSteps = originalSteps
  })

  describe('BYxxx validation (timeset blow-up)', () => {
    it('de-duplicates repeated BYHOUR/BYMINUTE/BYSECOND values', () => {
      const list = Array(600).fill(0).join(',')
      const rule = rrulestr(
        `${DTSTART}RRULE:FREQ=DAILY;COUNT=2;BYHOUR=${list};BYMINUTE=${list};BYSECOND=${list}`
      )
      expect(rule.options.byhour).toEqual([0])
      expect(rule.all()).toEqual([
        new Date(Date.UTC(2020, 0, 1)),
        new Date(Date.UTC(2020, 0, 2)),
      ])
    })

    it.each([
      ['BYHOUR=24', /byhour/],
      ['BYMINUTE=60', /byminute/],
      ['BYSECOND=61', /bysecond/],
      ['BYMONTH=13', /bymonth/],
      ['BYMONTH=0', /bymonth/],
      ['BYMONTHDAY=32', /bymonthday/],
      ['BYYEARDAY=367', /byyearday/],
      ['BYWEEKNO=54', /byweekno/],
      ['BYDAY=+54MO', /byweekday/],
      ['COUNT=-1', /count/],
    ])('rejects out-of-range %s', (part, message) => {
      expect(() => rrulestr(`${DTSTART}RRULE:FREQ=MONTHLY;${part}`)).toThrow(
        message
      )
    })

    it('rejects unknown weekday codes with a SyntaxError', () => {
      expect(() => rrulestr(`${DTSTART}RRULE:FREQ=DAILY;BYDAY=XX`)).toThrow(
        SyntaxError
      )
      expect(() => rrulestr(`${DTSTART}RRULE:FREQ=DAILY;WKST=XX`)).toThrow(
        SyntaxError
      )
    })
  })

  describe('rules that never accept a candidate', () => {
    it('BYSETPOS beyond the period size is bounded by the step budget', () => {
      expectStepLimit(() =>
        rrulestr(`${DTSTART}RRULE:FREQ=SECONDLY;BYSETPOS=2;COUNT=1`).all()
      )
    })

    it('UNTIL stops iteration even when every candidate is filtered out', () => {
      expect(
        rrulestr(
          `${DTSTART}RRULE:FREQ=SECONDLY;BYSETPOS=2;UNTIL=20200101T010000Z`
        ).all()
      ).toEqual([])
      expect(
        rrulestr(
          `${DTSTART}RRULE:FREQ=DAILY;BYWEEKNO=1;BYMONTH=6;UNTIL=20200301T000000Z`
        ).all()
      ).toEqual([])
    })

    it('structurally impossible rules without UNTIL hit the step budget', () => {
      expectStepLimit(() =>
        rrulestr(
          'DTSTART:00010101T000000Z\nRRULE:FREQ=DAILY;BYWEEKNO=1;BYMONTH=6;COUNT=1'
        ).all()
      )
    })
  })

  describe('after() / between() far from DTSTART', () => {
    it('after() is bounded by the step budget', () => {
      expectStepLimit(() =>
        rrulestr(`${DTSTART}RRULE:FREQ=SECONDLY`).after(
          new Date(Date.UTC(2026, 10, 24))
        )
      )
    })

    it('between() is bounded by the step budget', () => {
      expectStepLimit(() =>
        rrulestr('DTSTART:19000101T000000Z\nRRULE:FREQ=MINUTELY').between(
          new Date(Date.UTC(2026, 10, 24)),
          new Date(Date.UTC(2026, 10, 25))
        )
      )
    })

    it('still answers queries within the budget', () => {
      expect(
        rrulestr(`${DTSTART}RRULE:FREQ=MINUTELY`).after(
          new Date(Date.UTC(2020, 0, 2)),
          true
        )
      ).toEqual(new Date(Date.UTC(2020, 0, 2)))
    })
  })

  describe('RRuleSet EXRULE', () => {
    it('excludes exrule occurrences without re-iterating per date', () => {
      const set = rrulestr(
        `${DTSTART}RRULE:FREQ=DAILY;COUNT=500\nEXRULE:FREQ=WEEKLY;BYDAY=SA,SU`
      ) as RRuleSet
      const dates = set.all()
      expect(dates).toHaveLength(358)
      expect(
        dates.every((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6)
      ).toBe(true)
    })

    it('exrules that never match are bounded by the step budget', () => {
      expectStepLimit(() =>
        rrulestr(
          `${DTSTART}RRULE:FREQ=DAILY;COUNT=1\nEXRULE:FREQ=SECONDLY;BYSETPOS=2`
        ).all()
      )
    })
  })

  describe('input size and injection', () => {
    it('trims long whitespace runs in linear time', () => {
      const start = Date.now()
      expect(() =>
        RRule.parseString('RRULE:FREQ=DAILY' + ' '.repeat(65000) + 'x')
      ).not.toThrow(RRuleStringTooLargeError)
      expect(() =>
        rrulestr('RRULE:FREQ=DAILY' + ' '.repeat(65000) + 'x', {
          unfold: true,
        })
      ).toThrow()
      expect(Date.now() - start).toBeLessThan(500)
    })

    it('fromText honours parseStringConfig.maxLength', () => {
      expect(() =>
        RRule.fromText('every day at 1' + ',1'.repeat(40000))
      ).toThrow(RRuleStringTooLargeError)
    })

    it('rejects non-integer option values passed to the constructor', () => {
      expect(
        () =>
          new RRule({
            freq: RRule.DAILY,
            byhour: ['<img src=x>' as unknown as number],
          })
      ).toThrow(/byhour/)
      expect(
        () =>
          new RRule({
            freq: RRule.DAILY,
            count: '<script>' as unknown as number,
          })
      ).toThrow(/count/)
      expect(
        () =>
          new RRule({
            freq: RRule.DAILY,
            bymonthday: { length: 1e9 } as unknown as number[],
          })
      ).toThrow(/bymonthday/)
    })

    it('rejects a TZID that would inject iCalendar properties', () => {
      expect(
        () => new RRule({ freq: RRule.DAILY, tzid: 'UTC\r\nATTENDEE:x' })
      ).toThrow(/tzid/)
    })

    it('does not let DTSTART;TZID= span into the next line', () => {
      const set = rrulestr('DTSTART;TZID=Foo\nRDATE:20200101T000000Z', {
        forceset: true,
      })
      expect(set.toString()).not.toContain('TZID=Foo\n')
    })
  })

  describe('bounded caches', () => {
    it('caps memoised after() calls', () => {
      const set = new RRuleSet()
      set.rrule(
        new RRule({ freq: RRule.DAILY, count: 3, dtstart: new Date(0) })
      )
      for (let i = 0; i < MAX_CACHE_ENTRIES * 3; i++) {
        set.after(new Date(i * 1000))
      }
      expect(
        (set as unknown as { _cache: { after: unknown[] } })._cache.after.length
      ).toBe(MAX_CACHE_ENTRIES)
    })

    it('keeps RDATEs sorted and unique', () => {
      const set = new RRuleSet()
      ;[3, 1, 2, 1, 3].forEach((d) => set.rdate(new Date(Date.UTC(2020, 0, d))))
      expect(set.rdates()).toEqual(
        [1, 2, 3].map((d) => new Date(Date.UTC(2020, 0, d)))
      )
    })
  })

  describe('typed API', () => {
    it('rejects prototype keys as weekdays', () => {
      expect(() =>
        recurrenceToRRule(
          {
            frequency: 'WEEKLY',
            byWeekday: ['constructor' as unknown as 'MO'],
          },
          new Date()
        )
      ).toThrow(/weekday/)
    })
  })
})
