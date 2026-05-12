import { RRule, RRuleSet } from '../src'
import IterResult, { RRuleIterationLimitError } from '../src/iterresult'

describe('IterResult iteration cap', () => {
  const originalDefault = IterResult.defaultMaxIterations

  afterEach(() => {
    IterResult.defaultMaxIterations = originalDefault
  })

  describe('infinite rules throw RRuleIterationLimitError', () => {
    it('.all() throws on a rule with no COUNT/UNTIL', () => {
      IterResult.defaultMaxIterations = 50
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(() => rule.all()).toThrow(RRuleIterationLimitError)
    })

    it('.count() throws on a rule with no COUNT/UNTIL', () => {
      IterResult.defaultMaxIterations = 50
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(() => rule.count()).toThrow(RRuleIterationLimitError)
    })

    it('.between() throws when the window contains too many occurrences', () => {
      IterResult.defaultMaxIterations = 100
      const rule = new RRule({
        freq: RRule.MINUTELY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(() =>
        rule.between(
          new Date(Date.UTC(2024, 0, 1)),
          new Date(Date.UTC(2025, 0, 1))
        )
      ).toThrow(RRuleIterationLimitError)
    })

    it('.before() throws when many candidates fall before the boundary', () => {
      IterResult.defaultMaxIterations = 100
      const rule = new RRule({
        freq: RRule.MINUTELY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(() => rule.before(new Date(Date.UTC(2025, 0, 1)))).toThrow(
        RRuleIterationLimitError
      )
    })

    it('error carries the configured limit', () => {
      IterResult.defaultMaxIterations = 7
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      try {
        rule.all()
        fail('expected RRuleIterationLimitError')
      } catch (err) {
        expect(err).toBeInstanceOf(RRuleIterationLimitError)
        expect((err as RRuleIterationLimitError).limit).toBe(7)
      }
    })
  })

  describe('finite rules under the cap still succeed', () => {
    it('.all() with COUNT well under the cap returns all dates', () => {
      IterResult.defaultMaxIterations = 1000
      const rule = new RRule({
        freq: RRule.DAILY,
        count: 10,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(rule.all()).toHaveLength(10)
    })

    it('.all() with COUNT exactly at the cap returns all dates', () => {
      IterResult.defaultMaxIterations = 5
      const rule = new RRule({
        freq: RRule.DAILY,
        count: 5,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(rule.all()).toHaveLength(5)
    })

    it('.all() with COUNT one over the cap throws', () => {
      IterResult.defaultMaxIterations = 5
      const rule = new RRule({
        freq: RRule.DAILY,
        count: 6,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(() => rule.all()).toThrow(RRuleIterationLimitError)
    })

    it('.between() with a narrow window does not throw', () => {
      IterResult.defaultMaxIterations = 100
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      const dates = rule.between(
        new Date(Date.UTC(2024, 0, 1)),
        new Date(Date.UTC(2024, 0, 11))
      )
      expect(dates.length).toBeLessThan(100)
    })
  })

  describe('callback iterators also respect the cap', () => {
    it('.all(callback) throws when the callback never returns false', () => {
      IterResult.defaultMaxIterations = 50
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      expect(() => rule.all(() => true)).toThrow(RRuleIterationLimitError)
    })

    it('.all(callback) does not throw when the callback stops early', () => {
      IterResult.defaultMaxIterations = 50
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
      })
      const dates = rule.all((_d, len) => len < 10)
      expect(dates).toHaveLength(10)
    })
  })

  describe('RRuleSet inherits the cap', () => {
    it('throws when the union of rules is unbounded', () => {
      IterResult.defaultMaxIterations = 50
      const set = new RRuleSet()
      set.rrule(
        new RRule({
          freq: RRule.DAILY,
          dtstart: new Date(Date.UTC(2024, 0, 1)),
        })
      )
      expect(() => set.all()).toThrow(RRuleIterationLimitError)
    })
  })

  describe('default cap is generous enough for routine queries', () => {
    it('a one-year DAILY rule fits well under the default 100k cap', () => {
      const rule = new RRule({
        freq: RRule.DAILY,
        dtstart: new Date(Date.UTC(2024, 0, 1)),
        until: new Date(Date.UTC(2025, 0, 1)),
      })
      expect(rule.all().length).toBeLessThan(IterResult.defaultMaxIterations)
    })
  })
})
