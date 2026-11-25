import IterResult, { NarrowIterArgs } from './iterresult.js'
import { RRule } from './rrule.js'
import { DateWithZone } from './datewithzone.js'
import { iter } from './iter/index.js'
import { sort } from './dateutil.js'

const DAY_MS = 24 * 60 * 60 * 1000
import { QueryMethodTypes, IterResultType } from './types.js'

export function iterSet<M extends QueryMethodTypes>(
  iterResult: IterResult<M>,
  _rrule: RRule[],
  _exrule: RRule[],
  _rdate: Date[],
  _exdate: Date[],
  tzid: string | undefined
) {
  const _exdateHash: { [k: number]: boolean } = Object.create(null)
  const _accept = iterResult.accept

  // EXRULE occurrences are expanded incrementally: each exrule remembers
  // how far it has been evaluated, and the window at least doubles every
  // time it has to grow. The previous implementation re-ran the exrule
  // from its DTSTART for every candidate date (O(N²)). All exrule work is
  // charged to the caller's step budget.
  const exruleState = _exrule.map(function (rrule) {
    return { rrule, start: Number(rrule.options.dtstart), evaluatedUntil: NaN }
  })

  function expandExrule(
    state: (typeof exruleState)[number],
    upTo: number,
    notBefore: number
  ) {
    const from = isNaN(state.evaluatedUntil)
      ? state.start
      : state.evaluatedUntil
    const target = Math.max(upTo, from + (from - state.start))
    // Rezoned dates can move by a DST offset, so look slightly past the
    // target before declaring it fully evaluated.
    const stopAt = target + DAY_MS
    // Occurrences below what was already expanded (or below the queried
    // window) are either recorded already or irrelevant.
    const recordFrom = Math.max(
      isNaN(state.evaluatedUntil) ? -Infinity : from - DAY_MS,
      notBefore
    )
    const recorder = new IterResult(
      'all',
      {},
      Infinity,
      iterResult.maxSteps - iterResult.steps
    )
    let reachedWindowEnd = false
    recorder.accept = function (date: Date) {
      const t = Number(date)
      if (t > stopAt) {
        reachedWindowEnd = true
        return false
      }
      if (t >= recordFrom) _exdateHash[t] = true
      return true
    }
    try {
      iter(recorder, state.rrule.options)
    } finally {
      iterResult.step(recorder.steps)
    }
    // An exrule that ran out (COUNT/UNTIL/MAXYEAR) is fully expanded.
    state.evaluatedUntil = reachedWindowEnd ? target : Infinity
  }

  // Makes sure every exrule occurrence up to `before` is in `_exdateHash`.
  function evalExdate(before: Date, notBefore = -Infinity) {
    const upTo = Number(before)
    exruleState.forEach(function (state) {
      if (upTo < state.start - DAY_MS) return
      if (isNaN(state.evaluatedUntil) || upTo > state.evaluatedUntil) {
        expandExrule(state, upTo, notBefore)
      }
    })
  }

  _exdate.forEach(function (date) {
    const zonedDate = new DateWithZone(date, tzid).rezonedDate()
    _exdateHash[Number(zonedDate)] = true
  })

  iterResult.accept = function (date) {
    const dt = Number(date)
    if (isNaN(dt)) return _accept.call(this, date)
    if (!_exdateHash[dt]) {
      evalExdate(new Date(dt + 1))
      if (!_exdateHash[dt]) {
        _exdateHash[dt] = true
        return _accept.call(this, date)
      }
    }
    return true
  }

  if (iterResult.method === 'between') {
    const betweenArgs = iterResult.args as NarrowIterArgs<'between'>
    evalExdate(betweenArgs.before, Number(betweenArgs.after) - DAY_MS)
    iterResult.accept = function (date) {
      const dt = Number(date)
      if (!_exdateHash[dt]) {
        _exdateHash[dt] = true
        return _accept.call(this, date)
      }
      return true
    }
  }

  for (let i = 0; i < _rdate.length; i++) {
    const zonedDate = new DateWithZone(_rdate[i], tzid).rezonedDate()
    if (!iterResult.accept(new Date(zonedDate.getTime()))) break
  }

  _rrule.forEach(function (rrule) {
    iter(iterResult, rrule.options)
  })

  const res = iterResult._result
  sort(res)
  switch (iterResult.method) {
    case 'all':
    case 'between':
      return res as IterResultType<M>
    case 'before':
      return ((res.length && res[res.length - 1]) || null) as IterResultType<M>
    case 'after':
    default:
      return ((res.length && res[0]) || null) as IterResultType<M>
  }
}
