import { RRule } from '../src/rrule'
import { parseString } from '../src/parsestring'
import { Options, Frequency } from '../src/types'
import { datetime } from './lib/utils'

describe('parseString', () => {
  it('parses valid single lines of rrules', function () {
    const expectations: [string, Partial<Options>][] = [
      [
        'FREQ=WEEKLY;UNTIL=20100101T000000Z',
        { freq: RRule.WEEKLY, until: datetime(2010, 1, 1, 0, 0, 0) },
      ],

      // Parse also `date` but return `date-time`
      [
        'FREQ=WEEKLY;UNTIL=20100101',
        { freq: RRule.WEEKLY, until: datetime(2010, 1, 1, 0, 0, 0) },
      ],
      [
        'DTSTART;TZID=America/New_York:19970902T090000',
        {
          dtstart: datetime(1997, 9, 2, 9, 0, 0),
          tzid: 'America/New_York',
        },
      ],
      [
        'RRULE:DTSTART;TZID=America/New_York:19970902T090000',
        {
          dtstart: datetime(1997, 9, 2, 9, 0, 0),
          tzid: 'America/New_York',
        },
      ],
    ]

    expectations.forEach(function (item) {
      const s = item[0]
      const s2 = item[1]
      // s
      expect(parseString(s)).toEqual(s2)
    })
  })

  it('parses multiline rules', () => {
    const expectations: [string, Partial<Options>][] = [
      [
        'DTSTART;TZID=America/New_York:19970902T090000\nRRULE:FREQ=WEEKLY;UNTIL=20100101T000000Z',
        {
          dtstart: datetime(1997, 9, 2, 9, 0, 0),
          tzid: 'America/New_York',
          freq: RRule.WEEKLY,
          until: datetime(2010, 1, 1, 0, 0, 0),
        },
      ],
      [
        'DTSTART:19970902T090000Z\n' + 'RRULE:FREQ=YEARLY;COUNT=3\n',
        {
          dtstart: datetime(1997, 9, 2, 9, 0, 0),
          freq: RRule.YEARLY,
          count: 3,
        },
      ],
    ]

    expectations.forEach(function (item) {
      const s = item[0]
      const s2 = item[1]
      // s
      expect(parseString(s)).toEqual(s2)
    })
  })

  it('parses legacy dtstart in rrule', () => {
    const expectations: [string, Partial<Options>][] = [
      [
        'RRULE:FREQ=WEEKLY;DTSTART;TZID=America/New_York:19970902T090000',
        {
          freq: Frequency.WEEKLY,
          dtstart: datetime(1997, 9, 2, 9, 0, 0),
          tzid: 'America/New_York',
        },
      ],
    ]

    expectations.forEach(function (item) {
      const s = item[0]
      const s2 = item[1]
      // s
      expect(parseString(s)).toEqual(s2)
    })
  })

  describe('numeric value validation', () => {
    it('rejects non-numeric COUNT', () => {
      expect(() => parseString('FREQ=DAILY;COUNT=abc')).toThrow(
        /Invalid COUNT value: expected an integer, got 'abc'/
      )
    })

    it('rejects non-numeric INTERVAL', () => {
      expect(() => parseString('FREQ=DAILY;INTERVAL=2x')).toThrow(
        /Invalid INTERVAL value: expected an integer, got '2x'/
      )
    })

    it('rejects comma-separated COUNT', () => {
      expect(() => parseString('FREQ=DAILY;COUNT=1,2')).toThrow(
        /Invalid COUNT value: expected a single integer, got '1,2'/
      )
    })

    it('rejects comma-separated INTERVAL', () => {
      expect(() => parseString('FREQ=DAILY;INTERVAL=1,2')).toThrow(
        /Invalid INTERVAL value: expected a single integer, got '1,2'/
      )
    })

    it('rejects non-numeric BYHOUR', () => {
      expect(() => parseString('FREQ=DAILY;BYHOUR=abc')).toThrow(
        /Invalid BYHOUR value: expected an integer, got 'abc'/
      )
    })

    it('rejects non-numeric entries inside a comma-separated BYMONTH', () => {
      expect(() => parseString('FREQ=YEARLY;BYMONTH=1,abc,3')).toThrow(
        /Invalid BYMONTH value: expected an integer, got 'abc'/
      )
    })

    it('accepts a comma-separated BYHOUR list', () => {
      expect(parseString('FREQ=DAILY;BYHOUR=1,2,3')).toEqual({
        freq: Frequency.DAILY,
        byhour: [1, 2, 3],
      })
    })

    it('accepts negative scalar BYSETPOS', () => {
      expect(parseString('FREQ=MONTHLY;BYSETPOS=-1')).toEqual({
        freq: Frequency.MONTHLY,
        bysetpos: -1,
      })
    })

    it('rejects non-numeric BYEASTER', () => {
      // Previously `Number('abc')` produced `NaN`, which silently became an
      // empty occurrence set instead of failing at parse time.
      expect(() => parseString('FREQ=YEARLY;BYEASTER=abc')).toThrow(
        /Invalid BYEASTER value: expected an integer, got 'abc'/
      )
    })

    it('rejects comma-separated BYEASTER', () => {
      expect(() => parseString('FREQ=YEARLY;BYEASTER=0,1')).toThrow(
        /Invalid BYEASTER value: expected a single integer, got '0,1'/
      )
    })

    it('accepts a valid BYEASTER offset', () => {
      expect(parseString('FREQ=YEARLY;BYEASTER=-1')).toEqual({
        freq: Frequency.YEARLY,
        byeaster: -1,
      })
    })
  })
})
