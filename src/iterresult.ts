import { QueryMethodTypes, IterResultType } from './types'

// =============================================================================
// Results
// =============================================================================

export interface IterArgs {
  inc: boolean
  before: Date
  after: Date
  dt: Date
  _value: Date | Date[] | null
}

/**
 * Thrown when an iteration produces more accepted dates than the
 * configured cap. Used as a DoS backstop against infinite rules
 * (no COUNT / UNTIL) reaching MAXYEAR.
 */
export class RRuleIterationLimitError extends Error {
  public readonly limit: number

  constructor(limit: number) {
    super(
      `RRule iteration limit (${limit}) exceeded. The rule may be infinite — ` +
        'add COUNT or UNTIL, narrow the query window, or raise ' +
        'IterResult.defaultMaxIterations.'
    )
    this.name = 'RRuleIterationLimitError'
    this.limit = limit
    Object.setPrototypeOf(this, RRuleIterationLimitError.prototype)
  }
}

/**
 * This class helps us to emulate python's generators, sorta.
 */
export default class IterResult<M extends QueryMethodTypes> {
  public static defaultMaxIterations = 100_000

  public readonly method: M
  public readonly args: Partial<IterArgs>
  public readonly minDate: Date | null = null
  public readonly maxDate: Date | null = null
  public readonly maxIterations: number
  public _result: Date[] = []
  public total = 0

  constructor(
    method: M,
    args: Partial<IterArgs>,
    maxIterations: number = IterResult.defaultMaxIterations
  ) {
    this.method = method
    this.args = args
    this.maxIterations = maxIterations

    if (method === 'between') {
      // @ts-expect-error TS2322 — strict pass: pending refactor
      this.maxDate = args.inc
        ? args.before
        : // @ts-expect-error TS18048 — strict pass: pending refactor
          new Date(args.before.getTime() - 1)
      // @ts-expect-error TS18048/TS2322 — strict pass: pending refactor
      this.minDate = args.inc ? args.after : new Date(args.after.getTime() + 1)
    } else if (method === 'before') {
      // @ts-expect-error TS18048/TS2322 — strict pass: pending refactor
      this.maxDate = args.inc ? args.dt : new Date(args.dt.getTime() - 1)
    } else if (method === 'after') {
      // @ts-expect-error TS18048/TS2322 — strict pass: pending refactor
      this.minDate = args.inc ? args.dt : new Date(args.dt.getTime() + 1)
    }
  }

  /**
   * Possibly adds a date into the result.
   *
   * @param {Date} date - the date isn't necessarly added to the result
   * list (if it is too late/too early)
   * @return {Boolean} true if it makes sense to continue the iteration
   * false if we're done.
   */
  accept(date: Date) {
    ++this.total
    const tooEarly = this.minDate && date < this.minDate
    const tooLate = this.maxDate && date > this.maxDate

    if (this.method === 'between') {
      if (tooEarly) return true
      if (tooLate) return false
    } else if (this.method === 'before') {
      if (tooLate) return false
    } else if (this.method === 'after') {
      if (tooEarly) return true
      this.add(date)
      return false
    }

    return this.add(date)
  }

  /**
   *
   * @param {Date} date that is part of the result.
   * @return {Boolean} whether we are interested in more values.
   */
  add(date: Date) {
    if (this._result.length >= this.maxIterations) {
      throw new RRuleIterationLimitError(this.maxIterations)
    }
    this._result.push(date)
    return true
  }

  /**
   * 'before' and 'after' return only one date, whereas 'all'
   * and 'between' an array.
   *
   * @return {Date,Array?}
   */
  getValue(): IterResultType<M> {
    const res = this._result
    switch (this.method) {
      case 'all':
      case 'between':
        return res as IterResultType<M>
      case 'before':
      case 'after':
      default:
        return (res.length ? res[res.length - 1] : null) as IterResultType<M>
    }
  }

  clone() {
    return new IterResult(this.method, this.args, this.maxIterations)
  }
}
