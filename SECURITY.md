# Security Hardening

This fork is consumed by an HTTP API that parses RFC 5545 RRULE strings supplied by API clients. The threat model is therefore **untrusted input**, with DoS as the dominant risk class (no RCE surface — there is no `eval`/`Function`/dynamic `require` in the library, and the only runtime dependency is `tslib`).

The list below is ordered by severity, then by exploitability. Checked items are addressed in this fork.

## HIGH — single-request process hang or crash

- [x] **Negative / zero / fractional / NaN `interval` → infinite loop.** `for(;;)` loops in `addHours`/`addMinutes`/`addSeconds` and the iterator never terminate when `interval ≤ 0` or non-integer. **Fix:** `parseOptions` now throws `Invalid interval: ...` for any value that is not a positive integer; defaults missing values to `1` per RFC. Builds on upstream PR [#494](https://github.com/jkbrzt/rrule/pull/494). _src/parseoptions.ts; tests in test/parseoptions.test.ts._
- [x] **Parity-mismatch hang in HOURLY / MINUTELY / SECONDLY add loops** (e.g. `freq=HOURLY, interval=2, byhour=[1]`). The `for(;;)` loop spins until `MAXYEAR` (~35M iterations) because `byhour.includes(this.hour)` can never match. **Fix:** added `until?` propagation, a `MAX_ADD_ITERATIONS = 100000` hard cap, and forwarded `until` into inner recursive calls (which upstream PR [#622](https://github.com/jkbrzt/rrule/pull/622) missed). When the cap fires, the `DateTime` is forced past `MAXYEAR` (`markExhausted`) so the outer iterator's existing terminal check at `iter/index.ts:100` fires and no invalid candidate is emitted. _src/datetime.ts; regression tests in test/rrule.test.ts (RRule-level: `.all()` returns `[]`) and test/datetime.test.ts._
- [x] **Unbounded `.all()` / `.count()` on infinite rules.** No `COUNT` / `UNTIL` → builds an array up to `MAXYEAR=9999` and can OOM the process. **Fix:** `IterResult.add()` throws `RRuleIterationLimitError` when the accepted-date count reaches `IterResult.defaultMaxIterations` (default `100_000`, configurable). Applies to `.all()`, `.count()`, `.between()`, `.before()`, callback iterators, and `RRuleSet`. PR [#422](https://github.com/jkbrzt/rrule/pull/422)'s parse-time `isFinite` rejection was rejected as too API-breaking; this runtime backstop is non-breaking for finite rules. _src/iterresult.ts; tests in test/iterresult.test.ts._

## MED — degraded performance / footgun

- [x] **O(n²) RFC line unfolding.** `splitIntoLines(unfold=true)` mutated the array via `splice` inside a `while` loop; a payload of N continuation or blank lines was O(N²) (measured: N=100k took ~3.3s, N=200k took ~13.5s). **Fix:** rewrote as a single forward pass that builds the output array — N=100k now completes in ~5ms. Only the `unfold=true` path was affected. _src/rrulestr.ts; perf-regression tests in test/rrulestr.test.ts._
- [ ] **Bracket-assignment in option parser.** Parsed key is lower-cased and assigned via `options[optionKey] = num` with `@ts-ignore`. Currently mitigated by an upstream switch-statement whitelist, but the pattern is a refactoring footgun for prototype pollution. _src/parsestring.ts:84._ **Plan:** drop `@ts-ignore`, narrow the assignment via a typed `Record<keyof Options, ...>` and reject unknown keys explicitly.
- [ ] **`between()` is ~10× slower with TZID** (upstream issue [#580](https://github.com/jkbrzt/rrule/issues/580)). Per-request perf cliff for any TZID-aware query. **Plan:** profile and reduce per-iteration timezone conversions; cache where safe.

## LOW — defense in depth

- [x] **No `bysetpos` array length cap.** Values are bounded `[-366, 366]` but `BYSETPOS=1,2,...,10000` was accepted. **Fix:** cap at 732 entries (the count of distinct legal positions: `-366..-1, 1..366`) and reject longer arrays before per-element validation runs. _src/parseoptions.ts; tests in test/parseoptions.test.ts._
- [ ] **No top-level rrule string length cap.** A multi-MB string will be parsed before any structural validation. **Plan:** reject inputs > a few KB at the top of `rrulestr`.

## Upstream backports aligned with this hardening theme

These are open upstream PRs that fix correctness bugs in the same code paths. They are not security issues per se, but pulling them avoids divergent regressions.

- [ ] [#626](https://github.com/jkbrzt/rrule/pull/626) — invalid `UNTIL` value for years < 10 (issue [#385](https://github.com/jkbrzt/rrule/issues/385))
- [ ] [#664](https://github.com/jkbrzt/rrule/pull/664) — `BYDAY=undefined` when `byweekday` initialized as `WeekdayStr[]` (issue [#648](https://github.com/jkbrzt/rrule/issues/648))
- [ ] [#613](https://github.com/jkbrzt/rrule/pull/613) — `dtstart`/`tzid` from `rrulestr` options not respected (issue [#612](https://github.com/jkbrzt/rrule/issues/612))

## Application-layer validator (out of scope for this repo)

For completeness, the calendar-events service that consumes this library should additionally:

- Reject rrule strings above the storage cap (1024 chars) at the validator boundary, not at the database.
- Require `COUNT` or `UNTIL` to be present.
- Cap `COUNT` and clamp `UNTIL` to a reasonable horizon.

## Reporting a vulnerability

For non-public reports, email the maintainer.
