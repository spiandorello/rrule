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
 * Which budget an iteration exhausted. `'results'`: more accepted dates
 * than `maxIterations`. `'steps'`: more candidate dates/periods evaluated
 * than `maxSteps`, accepted or not (e.g. a rule that never matches, or
 * `after()` / `between()` far from DTSTART).
 */
export type RRuleIterationLimitKind = 'results' | 'steps'

/**
 * Thrown when an iteration exceeds one of its budgets. Used as a DoS
 * backstop against infinite rules (no COUNT / UNTIL) reaching MAXYEAR and
 * against rules whose candidates are never accepted.
 */
export class RRuleIterationLimitError extends Error {
  public readonly limit: number
  public readonly kind: RRuleIterationLimitKind

  constructor(limit: number, kind: RRuleIterationLimitKind = 'results') {
    super(
      kind === 'results'
        ? `RRule iteration limit (${limit}) exceeded. The rule may be infinite — ` +
            'add COUNT or UNTIL, narrow the query window, or raise ' +
            'IterResult.defaultMaxIterations.'
        : `RRule step limit (${limit}) exceeded while evaluating candidates. ` +
            'The rule may never match, or the query window may be too far ' +
            'from DTSTART — narrow it, or raise IterResult.defaultMaxSteps.'
    )
    this.name = 'RRuleIterationLimitError'
    this.limit = limit
    this.kind = kind
    Object.setPrototypeOf(this, RRuleIterationLimitError.prototype)
  }
}

/**
 * This class helps us to emulate python's generators, sorta.
 */
export default class IterResult<M extends QueryMethodTypes> {
  public static defaultMaxIterations = 100_000
  /**
   * Cap on the number of candidate dates (and iteration periods) evaluated,
   * accepted or not. Bounds CPU for rules that never produce a match and
   * for `after()` / `between()` queries far from DTSTART.
   */
  public static defaultMaxSteps = 1_000_000

  public readonly method: M
  public readonly args: Partial<IterArgs>
  public readonly minDate: Date | null = null
  public readonly maxDate: Date | null = null
  public readonly maxIterations: number
  public readonly maxSteps: number
  public _result: Date[] = []
  public total = 0
  public steps = 0

  constructor(
    method: M,
    args: Partial<IterArgs>,
    maxIterations: number = IterResult.defaultMaxIterations,
    maxSteps: number = IterResult.defaultMaxSteps
  ) {
    this.method = method
    this.args = args
    this.maxIterations = maxIterations
    this.maxSteps = maxSteps

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
   * Charges `n` units of work against the step budget.
   *
   * @throws {RRuleIterationLimitError} when the budget is exhausted.
   */
  step(n = 1) {
    this.steps += n
    if (this.steps > this.maxSteps) {
      throw new RRuleIterationLimitError(this.maxSteps, 'steps')
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
      // Only the latest date before `dt` is ever returned, so keep just
      // that one instead of accumulating every earlier occurrence.
      if (!this._result.length || date > this._result[0]) {
        this._result[0] = date
      }
      return true
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
    return new IterResult(
      this.method,
      this.args,
      this.maxIterations,
      this.maxSteps
    )
  }
}
