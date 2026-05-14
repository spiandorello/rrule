import {
  Frequency,
  Recurrence,
  RRule,
  formatUtcDateToYmd,
  parseYmdToUtcEndOfDay,
  recurrenceToRRule,
  recurrenceToRRuleString,
  rrulestr,
  rruleStringToRecurrence,
} from '../src'
import { __resetDeprecationStateForTests } from '../src/typedRecurrence/mapper'

describe('parseYmdToUtcEndOfDay', () => {
  it('returns UTC end of day for a valid YMD', () => {
    const date = parseYmdToUtcEndOfDay('2026-12-31')
    expect(date.toISOString()).toBe('2026-12-31T23:59:59.000Z')
  })

  it('rejects invalid month', () => {
    expect(() => parseYmdToUtcEndOfDay('2026-13-01')).toThrow(
      /month out of range/
    )
  })

  it('rejects impossible day of month', () => {
    expect(() => parseYmdToUtcEndOfDay('2026-02-30')).toThrow(
      /not a real calendar date/
    )
  })

  it('rejects wrong format', () => {
    expect(() => parseYmdToUtcEndOfDay('2026/12/31')).toThrow(
      /expected 'YYYY-MM-DD'/
    )
    expect(() => parseYmdToUtcEndOfDay('')).toThrow(/expected 'YYYY-MM-DD'/)
  })
})

describe('formatUtcDateToYmd', () => {
  it('formats a Date in UTC', () => {
    const date = new Date(Date.UTC(2026, 4, 12, 10, 0, 0))
    expect(formatUtcDateToYmd(date)).toBe('2026-05-12')
  })

  it('round-trips through parseYmdToUtcEndOfDay', () => {
    const ymd = '2026-12-31'
    expect(formatUtcDateToYmd(parseYmdToUtcEndOfDay(ymd))).toBe(ymd)
  })

  it('throws on invalid Date', () => {
    expect(() => formatUtcDateToYmd(new Date('not-a-date'))).toThrow(
      /Invalid Date/
    )
  })
})

describe('recurrenceToRRuleString', () => {
  const dtstart = new Date(Date.UTC(2026, 4, 12, 21, 0, 0))

  it('produces the PRD §8 happy path string', () => {
    const recurrence: Recurrence = {
      frequency: 'WEEKLY',
      interval: 1,
      byWeekday: ['TU', 'TH'],
      end: { type: 'until', until: '2026-12-31' },
    }
    expect(recurrenceToRRuleString(recurrence, dtstart)).toBe(
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959Z'
    )
  })

  it('omits INTERVAL=1 from output', () => {
    const out = recurrenceToRRuleString(
      { frequency: 'DAILY', interval: 1 },
      dtstart
    )
    expect(out).toBe('RRULE:FREQ=DAILY')
  })

  it('emits INTERVAL=2 when interval > 1', () => {
    const out = recurrenceToRRuleString(
      { frequency: 'DAILY', interval: 2 },
      dtstart
    )
    expect(out).toBe('RRULE:FREQ=DAILY;INTERVAL=2')
  })

  it('serializes COUNT and omits UNTIL when end.type=count', () => {
    const out = recurrenceToRRuleString(
      {
        frequency: 'WEEKLY',
        byWeekday: ['TU', 'TH'],
        end: { type: 'count', count: 10 },
      },
      dtstart
    )
    expect(out).toBe('RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10')
  })

  it('serializes no end fields when end.type=never', () => {
    const out = recurrenceToRRuleString(
      { frequency: 'WEEKLY', byWeekday: ['MO'], end: { type: 'never' } },
      dtstart
    )
    expect(out).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO')
  })

  it('serializes no end fields when end is omitted', () => {
    const out = recurrenceToRRuleString({ frequency: 'YEARLY' }, dtstart)
    expect(out).toBe('RRULE:FREQ=YEARLY')
  })

  it('untilMode=instant uses YMD T000000Z', () => {
    const out = recurrenceToRRuleString(
      {
        frequency: 'DAILY',
        end: { type: 'until', until: '2026-12-31' },
      },
      dtstart,
      { untilMode: 'instant' }
    )
    expect(out).toBe('RRULE:FREQ=DAILY;UNTIL=20261231T000000Z')
  })

  it('includeDtstart=true emits both DTSTART and RRULE lines', () => {
    const out = recurrenceToRRuleString({ frequency: 'DAILY' }, dtstart, {
      includeDtstart: true,
    })
    expect(out.split('\n')[0]).toBe('DTSTART:20260512T210000Z')
    expect(out.split('\n')[1]).toBe('RRULE:FREQ=DAILY')
  })

  it('includeDtstart=false (default) strips DTSTART', () => {
    const out = recurrenceToRRuleString({ frequency: 'DAILY' }, dtstart)
    expect(out.startsWith('DTSTART')).toBe(false)
    expect(out).toBe('RRULE:FREQ=DAILY')
  })

  it('byMonth and byMonthDay are emitted', () => {
    const out = recurrenceToRRuleString(
      { frequency: 'YEARLY', byMonth: 6, byMonthDay: 15 },
      dtstart
    )
    expect(out).toContain('BYMONTH=6')
    expect(out).toContain('BYMONTHDAY=15')
  })

  it('rejects non-integer interval', () => {
    expect(() =>
      recurrenceToRRuleString({ frequency: 'DAILY', interval: 0 }, dtstart)
    ).toThrow(/expected positive integer/)
  })

  it('rejects invalid count', () => {
    expect(() =>
      recurrenceToRRuleString(
        {
          frequency: 'DAILY',
          end: { type: 'count', count: 0 },
        },
        dtstart
      )
    ).toThrow(/positive integer/)
  })
})

describe('recurrenceToRRule', () => {
  it('returns an RRule that yields the expected occurrences for §8 example', () => {
    const dtstart = new Date(Date.UTC(2026, 4, 12, 12, 0, 0))
    const rule = recurrenceToRRule(
      {
        frequency: 'WEEKLY',
        byWeekday: ['TU', 'TH'],
        end: { type: 'count', count: 4 },
      },
      dtstart
    )
    expect(rule.options.freq).toBe(Frequency.WEEKLY)
    expect(rule.all()).toHaveLength(4)
  })
})

describe('rruleStringToRecurrence', () => {
  it('parses the PRD §8 round-trip string back to the Recurrence', () => {
    const recurrence = rruleStringToRecurrence(
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270101T025959Z'
    )
    expect(recurrence.frequency).toBe('WEEKLY')
    expect(recurrence.byWeekday).toEqual(['TU', 'TH'])
    // UNTIL=20270101T025959Z formats to 2027-01-01 in UTC (this is correct —
    // the YMD reflects the stored Date, not the dtstart-local wall clock).
    expect(recurrence.end).toEqual({ type: 'until', until: '2027-01-01' })
  })

  it('parses COUNT', () => {
    const recurrence = rruleStringToRecurrence(
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10'
    )
    expect(recurrence).toEqual({
      frequency: 'WEEKLY',
      byWeekday: ['TU', 'TH'],
      end: { type: 'count', count: 10 },
    })
  })

  it('parses INTERVAL>1', () => {
    const recurrence = rruleStringToRecurrence('RRULE:FREQ=DAILY;INTERVAL=3')
    expect(recurrence).toEqual({
      frequency: 'DAILY',
      interval: 3,
      end: { type: 'never' },
    })
  })

  it('omits interval when 1', () => {
    const recurrence = rruleStringToRecurrence('RRULE:FREQ=DAILY;INTERVAL=1')
    expect(recurrence.interval).toBeUndefined()
  })

  it('returns end=never when neither UNTIL nor COUNT present', () => {
    const recurrence = rruleStringToRecurrence('RRULE:FREQ=YEARLY')
    expect(recurrence.end).toEqual({ type: 'never' })
  })

  it('throws on unsupported FREQ', () => {
    expect(() => rruleStringToRecurrence('RRULE:FREQ=HOURLY')).toThrow(
      /not supported by Recurrence/
    )
  })

  it('throws on BYSETPOS', () => {
    expect(() =>
      rruleStringToRecurrence('RRULE:FREQ=MONTHLY;BYSETPOS=1;BYDAY=MO')
    ).toThrow(/BYSETPOS/)
  })

  it('throws on BYDAY with nth offset', () => {
    expect(() =>
      rruleStringToRecurrence('RRULE:FREQ=MONTHLY;BYDAY=-1MO')
    ).toThrow(/nth offset/)
  })

  it('throws on WKST', () => {
    expect(() =>
      rruleStringToRecurrence('RRULE:FREQ=WEEKLY;BYDAY=MO;WKST=SU')
    ).toThrow(/WKST/)
  })

  it('throws on BYHOUR', () => {
    expect(() => rruleStringToRecurrence('RRULE:FREQ=DAILY;BYHOUR=10')).toThrow(
      /BYHOUR/
    )
  })

  it('throws on multiple BYMONTHDAY', () => {
    expect(() =>
      rruleStringToRecurrence('RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15')
    ).toThrow(/multiple values/)
  })

  it('throws on missing FREQ', () => {
    expect(() => rruleStringToRecurrence('RRULE:COUNT=3')).toThrow(
      /missing FREQ/
    )
  })
})

describe('round-trip', () => {
  const dtstart = new Date(Date.UTC(2026, 4, 12, 21, 0, 0))

  it('preserves COUNT recurrence', () => {
    const original: Recurrence = {
      frequency: 'WEEKLY',
      byWeekday: ['TU', 'TH'],
      end: { type: 'count', count: 10 },
    }
    const str = recurrenceToRRuleString(original, dtstart)
    const back = rruleStringToRecurrence(str)
    expect(back).toEqual(original)
  })

  it('preserves never-ending recurrence', () => {
    const original: Recurrence = {
      frequency: 'DAILY',
      end: { type: 'never' },
    }
    const str = recurrenceToRRuleString(original, dtstart)
    const back = rruleStringToRecurrence(str)
    expect(back).toEqual(original)
  })

  it('preserves byMonth + byMonthDay', () => {
    const original: Recurrence = {
      frequency: 'YEARLY',
      byMonth: 6,
      byMonthDay: 15,
      end: { type: 'never' },
    }
    const str = recurrenceToRRuleString(original, dtstart)
    const back = rruleStringToRecurrence(str)
    expect(back).toEqual(original)
  })

  it('preserves UNTIL recurrence (deterministic across runtime TZ)', () => {
    const original: Recurrence = {
      frequency: 'WEEKLY',
      byWeekday: ['TU'],
      end: { type: 'until', until: '2026-12-31' },
    }
    const str = recurrenceToRRuleString(original, dtstart)
    const back = rruleStringToRecurrence(str)
    expect(back).toEqual(original)
  })
})

// Node on Linux/macOS picks up process.env.TZ on each new Date() call, so we
// can flip TZ between tests without resetting any cache. Windows' libc does
// not honour TZ the same way, so we skip there.
const describeTzIndependence =
  process.platform === 'win32' ? describe.skip : describe

describeTzIndependence('untilMode=inclusive-day-utc TZ independence', () => {
  describe.each(['UTC', 'America/Sao_Paulo', 'Pacific/Auckland'])(
    'TZ=%s',
    (tz) => {
      let savedTz: string | undefined

      beforeEach(() => {
        savedTz = process.env.TZ
        process.env.TZ = tz
      })

      afterEach(() => {
        if (savedTz === undefined) {
          delete process.env.TZ
        } else {
          process.env.TZ = savedTz
        }
      })

      it('serializes UNTIL deterministically regardless of TZ', () => {
        const out = recurrenceToRRuleString(
          {
            frequency: 'WEEKLY',
            byWeekday: ['TU'],
            end: { type: 'until', until: '2026-12-31' },
          },
          new Date(Date.UTC(2026, 3, 14, 8, 0, 0))
        )
        expect(out).toBe('RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261231T235959Z')
      })
    }
  )
})

describe('inclusive-day deprecation warning', () => {
  const dtstart = new Date(Date.UTC(2026, 4, 12, 21, 0, 0))
  let warnSpy: jest.SpyInstance
  let savedNoWarn: string | undefined

  beforeEach(() => {
    __resetDeprecationStateForTests()
    savedNoWarn = process.env.SPIANDORELLO_RRULEJS_NO_WARN
    delete process.env.SPIANDORELLO_RRULEJS_NO_WARN
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
    if (savedNoWarn === undefined) {
      delete process.env.SPIANDORELLO_RRULEJS_NO_WARN
    } else {
      process.env.SPIANDORELLO_RRULEJS_NO_WARN = savedNoWarn
    }
  })

  it("warns once when untilMode='inclusive-day' is passed", () => {
    recurrenceToRRuleString(
      {
        frequency: 'WEEKLY',
        byWeekday: ['TU'],
        end: { type: 'until', until: '2026-12-31' },
      },
      dtstart,
      { untilMode: 'inclusive-day' }
    )
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const message = warnSpy.mock.calls[0][0] as string
    expect(message).toContain('deprecated')
    expect(message).toContain('inclusive-day-utc')
  })

  it('warns only once across multiple calls in the same process', () => {
    const recurrence: Recurrence = {
      frequency: 'WEEKLY',
      byWeekday: ['TU'],
      end: { type: 'until', until: '2026-12-31' },
    }
    recurrenceToRRuleString(recurrence, dtstart, { untilMode: 'inclusive-day' })
    recurrenceToRRuleString(recurrence, dtstart, { untilMode: 'inclusive-day' })
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('suppresses the warning when SPIANDORELLO_RRULEJS_NO_WARN=1', () => {
    process.env.SPIANDORELLO_RRULEJS_NO_WARN = '1'
    recurrenceToRRuleString(
      {
        frequency: 'WEEKLY',
        byWeekday: ['TU'],
        end: { type: 'until', until: '2026-12-31' },
      },
      dtstart,
      { untilMode: 'inclusive-day' }
    )
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('does not warn when untilMode is omitted (default is inclusive-day-utc)', () => {
    recurrenceToRRuleString(
      {
        frequency: 'WEEKLY',
        byWeekday: ['TU'],
        end: { type: 'until', until: '2026-12-31' },
      },
      dtstart
    )
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when untilMode='inclusive-day-utc' is passed explicitly", () => {
    recurrenceToRRuleString(
      {
        frequency: 'WEEKLY',
        byWeekday: ['TU'],
        end: { type: 'until', until: '2026-12-31' },
      },
      dtstart,
      { untilMode: 'inclusive-day-utc' }
    )
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('compatibility', () => {
  it('existing public exports remain importable', () => {
    expect(typeof RRule).toBe('function')
    expect(typeof rrulestr).toBe('function')
    expect(Frequency.WEEKLY).toBe(2)
  })
})
