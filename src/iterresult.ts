import { QueryMethodTypes, IterResultType } from './types.js'

// =============================================================================
// Results
// =============================================================================

/**
 * Permissive cache/wire shape — used by `Cache` where we genuinely store
 * heterogeneous arg bags keyed by method (and a piggy-backed `_value`).
 * Per-method call-sites should prefer the narrow `NarrowIterArgs<M>` below.
 */
export interface IterArgs {
  inc: boolean
  before: Date
  after: Date
  dt: Date
  _value: Date | Date[] | null
}

/**
 * Discriminated-by-method narrow args used by `IterResult` and its consumers
 * (e.g. `iterset`). Each branch only carries the fields its method needs.
 */
export type NarrowIterArgs<M extends QueryMethodTypes> = M extends 'all'
  ? Record<string, never>
  : M extends 'between'
    ? { after: Date; before: Date; inc: boolean }
    : M extends 'before' | 'after'
      ? { dt: Date; inc: boolean }
      : never

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
      const a = args as NarrowIterArgs<'between'>
      this.maxDate = a.inc ? a.before : new Date(a.before.getTime() - 1)
      this.minDate = a.inc ? a.after : new Date(a.after.getTime() + 1)
    } else if (method === 'before') {
      const a = args as NarrowIterArgs<'before'>
      this.maxDate = a.inc ? a.dt : new Date(a.dt.getTime() - 1)
    } else if (method === 'after') {
      const a = args as NarrowIterArgs<'after'>
      this.minDate = a.inc ? a.dt : new Date(a.dt.getTime() + 1)
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
