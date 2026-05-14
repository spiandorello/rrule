# Changelog

## [5.0.0](https://github.com/spiandorello/rrule/compare/v4.0.0...v5.0.0) (2026-05-14)


### ⚠ BREAKING CHANGES

* **typedRecurrence:** recurrenceToRRuleString output bytes change on non-UTC hosts when untilMode is left at default. Callers who want the previous runtime-TZ behavior must now pass untilMode: 'inclusive-day' explicitly (and will see a deprecation warning). Silence with SPIANDORELLO_RRULEJS_NO_WARN=1.

### Features

* **typedRecurrence:** default untilMode to 'inclusive-day-utc' for deterministic roundtrip ([559e82f](https://github.com/spiandorello/rrule/commit/559e82fdfad789402ae5ab4c7a6358b19b3559d1))

## [4.0.0](https://github.com/spiandorello/rrule/compare/v3.0.0...v4.0.0) (2026-05-14)


### ⚠ BREAKING CHANGES

* **build:** the UMD bundle is gone. Browser consumers loading the library via a `<script>` tag must switch to a bundler or an ESM-capable CDN. Node CJS (`require('@spiandorello/rrulejs')`) and Node ESM (`import { RRule } from '@spiandorello/rrulejs'`) are unaffected — the new `exports` map keeps both entry points resolving to working builds. ([#46](https://github.com/spiandorello/rrule/issues/46))


### Build

* dual tsc emit (ESM + CJS), kill webpack ([#46](https://github.com/spiandorello/rrule/issues/46)) ([59b7c24](https://github.com/spiandorello/rrule/commit/59b7c244060da6f51a74e7f24ceb24558db2d28e))


### Code Refactoring

* **helpers:** tighten `repeat<T>()` signature with overloads (closes [#31](https://github.com/spiandorello/rrule/issues/31)) ([35419c0](https://github.com/spiandorello/rrule/commit/35419c0b596da375f658ef737ed293a20e489449))
* **strict:** narrow `IterArgs` per-method to drop 9 `@ts-expect-error` ([5163c09](https://github.com/spiandorello/rrule/commit/5163c09b596da375f658ef737ed293a20e489449))
* **strict:** remove 4 narrow `@ts-expect-error` in options/parser layer ([144e824](https://github.com/spiandorello/rrule/commit/144e824a5c83b04ff76bf225562db1b6f412f506))
* **strict:** remove 11 `@ts-expect-error` in tests via real guards ([49e6434](https://github.com/spiandorello/rrule/commit/49e6434fc9a1748478cb185e076ee80a00ef06da))
* **strict:** retype `ToText.options` as `ParsedOptions` to drop 39 `@ts-expect-error` ([4fd6db1](https://github.com/spiandorello/rrule/commit/4fd6db122106e9cfc15f345e0a8032e626baa9c9))


### Miscellaneous

* drop Node 20 from CI test matrix (post-LTS) ([e4aa426](https://github.com/spiandorello/rrule/commit/e4aa426))

## [3.0.0](https://github.com/spiandorello/rrule/compare/v2.9.1...v3.0.0) (2026-05-12)


### ⚠ BREAKING CHANGES

* **pkg:** package.json now declares an `exports` map. Only the root entry (`@spiandorello/rrulejs`) and `./package.json` are importable by consumers; any code reaching into `dist/...` directly must switch to the root entry. Drives the v3.0.0 release-please bump.

### Features

* add getters for rrules, exrules, rdates, exdates ([3723f60](https://github.com/spiandorello/rrule/commit/3723f60f0728c396dbbe82a73515db8f4d165fc3))
* **nlp:** support weekly by hour texts ([#590](https://github.com/spiandorello/rrule/issues/590)) ([62e7320](https://github.com/spiandorello/rrule/commit/62e7320a35195b2eef6bbec75887e8ec209b20ed))
* **pkg:** add exports map and CJS-typed declarations ([c8dfb3c](https://github.com/spiandorello/rrule/commit/c8dfb3cf3f2e8dd27811a6324d4ac5b57b36a13f))
* **typed-recurrence:** add typed Recurrence API with inclusive UNTIL ([#8](https://github.com/spiandorello/rrule/issues/8)) ([0fa5a7e](https://github.com/spiandorello/rrule/commit/0fa5a7ee7988ec7c26b9cd7b05e6772550cb5bb2))


### Bug Fixes

* 320 ([1ba0f0c](https://github.com/spiandorello/rrule/commit/1ba0f0cddb34785cfc1326d9a8d7d441caf2454f))
* 321 ([5305f1d](https://github.com/spiandorello/rrule/commit/5305f1df6809eba4273a700d70bbc7da9b348254))
* **cache:** cache key comparison ignores milliseconds ([f446250](https://github.com/spiandorello/rrule/commit/f446250e83cb438b2b97bcafa0b2dce397c63cff))
* **datetime:** force terminal state when iteration cap fires ([07c6104](https://github.com/spiandorello/rrule/commit/07c61042c080a64632f1b088184d96616a2eefc6))
* Export RRule and RRuleSet as named exports ([484daef](https://github.com/spiandorello/rrule/commit/484daef666e0d03955091e8790088faf8ae8a4a1))
* Export RRule and RRuleSet as named exports ([ed7f929](https://github.com/spiandorello/rrule/commit/ed7f9294b638f907f1bb7d492387d5dd8faa87a4))
* format ([b28e8b8](https://github.com/spiandorello/rrule/commit/b28e8b84cc8fa4ffac09fb6e3d3a898044c78907))
* harden parser and iter loops against DoS from untrusted input ([4723781](https://github.com/spiandorello/rrule/commit/47237818127f63c3c8c9a90f7c643ebbcb979a7a))
* **iterresult:** cap iterations to prevent OOM on infinite rules ([6868abf](https://github.com/spiandorello/rrule/commit/6868abfd9ff59d0877572b47c1bf90ecad4803d4))
* **iterresult:** cap iterations to prevent OOM on infinite rules ([922ed78](https://github.com/spiandorello/rrule/commit/922ed780985c60bf9db3eefae0076318adc11cf9))
* make getters return immutable objects ([a16ad76](https://github.com/spiandorello/rrule/commit/a16ad76f0a110ef28cc6b7cddd0c19ef5ef2367b))
* **parseoptions:** cap bysetpos array length at 732 entries ([c50b757](https://github.com/spiandorello/rrule/commit/c50b757f59177358fb92c63b34b8e1fa62b46d5d))
* **parseoptions:** cap bysetpos array length at 732 entries ([1f59a90](https://github.com/spiandorello/rrule/commit/1f59a900f2c5f0c053711df1ac40e14b2e0c49b6))
* **parsestring:** reject oversized RRULE input strings ([ea5ff5c](https://github.com/spiandorello/rrule/commit/ea5ff5c3c9fcc1a52390cecd6529748597702e17))
* **parsestring:** reject oversized RRULE input strings ([a5dfa38](https://github.com/spiandorello/rrule/commit/a5dfa3873b3631e3e510f13a470f6bc40e4f9ab8))
* removed unnecessary offset in daysBetween() ([#539](https://github.com/spiandorello/rrule/issues/539)) ([26c799f](https://github.com/spiandorello/rrule/commit/26c799f644f494dd31dcf6077983ee419c8328a0))
* resolve circular import ([17268f4](https://github.com/spiandorello/rrule/commit/17268f467182cd2581307f58578b5c1f8a18908b))
* resolve circular import ([95c3eb9](https://github.com/spiandorello/rrule/commit/95c3eb9af80aee1d33ca6fe9aa283074948fef5b))
* **scripts:** split lint:fix from lint, replace deprecated prepublish ([28e2a5a](https://github.com/spiandorello/rrule/commit/28e2a5aa6887ba200deca14942c3ca5be74056c9))
* typo plural minutes ([07580aa](https://github.com/spiandorello/rrule/commit/07580aadb191d3e82a669967494a6ca2fcee0df5))


### Performance Improvements

* **dateutil:** cache Intl.DateTimeFormat per timezone ([29de7de](https://github.com/spiandorello/rrule/commit/29de7de83501687d23283cf90d742620736899f5))
* **dateutil:** cache Intl.DateTimeFormat per timezone (~28x faster TZID iteration) ([177ae90](https://github.com/spiandorello/rrule/commit/177ae9050e9d87c14633ef4d22f61a8120d894e2))
* **rrulestr:** rewrite splitIntoLines as a single forward pass ([bff3b85](https://github.com/spiandorello/rrule/commit/bff3b8558f3891945ccea986546c811d5b1f933f))
* **rrulestr:** rewrite splitIntoLines as a single forward pass ([65daa4a](https://github.com/spiandorello/rrule/commit/65daa4abe7ee770fcff018a82f15a70e0ee8ff2a))

### Changelog

- 2.9.0 (2026-05-12)

  - Features:
    - Typed Recurrence API on top of `RRule`:
      - `Recurrence`, `RecurrenceFrequency`, `RecurrenceWeekday`,
        `RecurrenceEnd`, `TypedRecurrenceOptions` types.
      - `recurrenceToRRule()`, `recurrenceToRRuleString()`,
        `rruleStringToRecurrence()` for round-trip conversion.
      - `parseYmdToUtcEndOfDay()`, `formatUtcDateToYmd()` date helpers.
    - `UNTIL` defaults to inclusive-day semantics so events scheduled later
      in the day on the boundary date are no longer skipped. Opt out with
      `{ untilMode: 'instant' }`.
    - `INTERVAL=1` is omitted from serialized output.
    - Strict parser rejects RRULE features the typed surface can't represent
      (`FREQ=HOURLY/MINUTELY/SECONDLY`, `BYSETPOS`, `BYHOUR`, `WKST`,
      `BYDAY` with nth offset, multi-value `BYMONTH`/`BYMONTHDAY`) with
      descriptive errors instead of silent data loss.
  - Internal:
    - No breaking changes to `RRule`, `RRuleSet`, `rrulestr`, or any existing
      export.

- 2.8.1 (2026-01-15)

  - Hardened fork rebrand to `@spiandorello/rrulejs`.
  - Security and performance fixes:
    - DoS-resistant `parseString` with `parseStringConfig.maxLength` cap and
      `RRuleStringTooLargeError`.
    - Iteration cap with `RRuleIterationLimitError` to prevent OOM on
      pathological rules.
    - `bysetpos` array length capped.
    - `Intl.DateTimeFormat` cached per timezone for ~50× faster TZID
      iteration.
    - Stricter integer validation across parser (including BYEASTER).

- 2.8.0 (2023-11-10)

  - Bugfixes:
    - Don't minify `rrule.js` (minified version is still at `rrule.min.js`) ([#606](https://github.com/jkbrzt/rrule/pull/606))
    - Ignore tzid in NLP ([#528](https://github.com/jkbrzt/rrule/pull/528))
    - Remove unnecessary offset in daysBetween() ([#539](https://github.com/jkbrzt/rrule/pull/539))
  - Convert test suite from mocha to jest ([#605](https://github.com/jkbrzt/rrule/pull/605))
  - Export `ALL_WEEKDAYS` ([#591](https://github.com/jkbrzt/rrule/pull/591))
  - Support weekly by hour texts ([#590](https://github.com/jkbrzt/rrule/pull/590))

- 2.7.2 (2023-02-10)

  - Bugfixes:
    - Fix rezonedDate ([#523](https://github.com/jakubroztocil/rrule/issues/523))
    - Export datetime ([#551](https://github.com/jakubroztocil/rrule/issues/551))
    - Fixes types for `before()` and `after()` ([#560](https://github.com/jakubroztocil/rrule/issues/560))
  - Update README (https://github.com/jakubroztocil/rrule/pull/543)

- 2.7.1 (2022-07-10)

  - Internal:
    - Upgrade build dependencies (#515)
    - Migrate from tslint to eslint (#514)
    - Fix precommit & lint warnings (#519)
    - Fix invalid date formats in tests (#517)
  - Remove default exports (#513)
  - Point to esm correctly (#516)

- 2.7.0 (2022-06-05)

  - Features:
    - **BREAKING CHANGE** Removes default export in favor of named exports
    - Removes Luxon dependency (#508)

- 2.6.8 (2021-02-04)

  - Bugfixes:
    - Solve circular imports (#444)

- 2.6.6 (2020-08-23)

  - Bugfixes:
    - Fixed broken npm package (#417)

- 2.6.5 (2020-08-23)
  - Bugfixes:
    - `luxon`-less binary should not contain any `luxon` imports (#410)
    - Fixed `toText` pluralization of “minutes“ (#415)
- 2.6.4 (2019-12-18)
  - Bugfixes:
    - Calculating series with unknown timezones will produce infinite loop (#320)
  - Internal:
    - Upgrade build dependencies
- 2.6.3 (2019-11-24)
  - Features
    - Allow passing `WeekdayStr` to `byweekday` like the types suggest is possible (#371)
- 2.6.2 (2019-06-08)
  - Features
    - Allow two digits for `BYDAY` (#330)
    - Add a quick way to format `until` in `toText` (#313)
    - Add support for parsing an rrule string without frequency (#339)
    - Add getters for `rrules`, `exrules`, `rdates`, `exdates` (#347)
- 2.6.0 (2019-01-03)
  - Bugfixes:
    - Fix sourcemap structure (#303)
- 2.5.6 (2018-09-30)
  - Bugfixes:
    - Validate date inputs (#281)
- 2.5.5 (2018-09-06)
  - Bugfixes:
    - Don't emit `RDATE;TZID=UTC` for rdates
- 2.5.3 (2018-09-06)
  - Bugfixes:
    - Prevented emitting `DTSTART;TZID=UTC` when UTC is explicitly set as tzid
- 2.5.2 (2018-09-05)
  - Bugfixes:
    - Permitted RRuleSets with no rrules to have tzid
- 2.5.1 (2018-09-02)
  - Bugfixes:
    - Conformed output & parsing to RFC 5545 (#295)
- 2.4.1 (2018-08-16)
  - Features:
    - Added codecov (#265)
  - Bugfixes:
    - Fixed RRULE parsing issue (#266)
- 2.4.0 (2018-08-16)
  - Features:
    - Implement `TZID` support (#38, #261)
  - Bugfixes:
    - Fixed an error in Typescript output (#264)
- 2.3.6 (2018-08-14)
  - Bugfixes:
    - Point package.json to es5-compiled bundle (#260)
- 2.3.5 (2018-08-14)
  - Features:
    - Return text "every day" when all days are selected
  - Bugfixes:
    - Sort monthdays correctly from toText() (#101)
    - Accept 0 as a valid monthday/weekday value (#153)
    - Support 3-digit years (#202)
- 2.3.4 (2018-08-10)
  - Fixed support for eastern hemisphere timezones (#247)
- 2.3.3 (2018-08-08)
  - Fixed typescript error (#244)
- 2.3.2 (2018-08-07)
  - Fixed deploy on npm (#239)
- 2.3.0 (2018-08-06)
  - Converted to [Typescript](https://www.typescriptlang.org/) (#229)
  - Add es5 and es6 distributions
  - Fixed a bug where recurrences in DST were 1 hour off if the host system used DST (#233)
  - Fixed numeric handling of weekday strings
- 2.2.8 (2018-02-16)
  - Added `fromText()` and `toText()` support for rules with `RRule.MINUTELY` frequency.
  - Added support for `VALUE=DATE` as a `RDATE` param.
  - Added typescript definitions.
  - Merged in the now obsolete `arolson101/rrule` fork (many thanks to @arolson101).
  - Fixed `RRule` mutating passed-in `options` in some cases.
  - Fixed unexpected results with dates lower than 1970.
  - Fixed `RRule.DAILY` frequency when only 1 `BYHOUR` is provided.
  - Fixed the internal `isLeapYear()` to only accept integers instead of relying on `instanceof` to check the parameter type.
- 2.2.0 (2017-03-11)
  - Added support `RRuleSet`, which allows more complex recurrence setups,
    mixing multiple rules, dates, exclusion rules, and exclusion dates.
  - Added Millisecond precision
    - Millisecond offset extracted from `dtstart` (`dtstart.getTime() % 1000`)
    - Each recurrence is returned with the same offset
  - Added some NLP support for hourly and byhour.
  - Fixed export in nlp.js.
- 2.1.0
  - Removed dependency on Underscore.js (thanks, @gsf).
  - Various small bugfixes and improvements.
- 2.0.1
  - Added bower.json.
- 2.0.0 (2013-07-16)
  - Fixed a February 28-related issue.
  - More flexible, backwards-incompatible API:
    - `freq` is now `options.freq`.
    - `options.cache` is now `noCache`.
    - `iterator` has to return `true`
    - `dtstart` and `options` arguments removed from `RRule.fromString`
      (use `RRule.parseString` and modify `options` manually instead).
    - `today` argument removed from `Rule.prototype.toText`
      (never actually used).
    - `rule.toString()` now includes `DTSTART` (if explicitly specified
      in `options`).
    - Day constants `.clone` is now `.nth`, eg. `RRule.FR.nth(-1)`
      (last Friday).
  - Added `RRule.parseString`
  - Added `RRule.parseText`
  - Added `RRule.optionsToString`
- 1.1.0 (2013-05-21)
  - Added a [demo app](http://jakubroztocil.github.io/rrule/).
  - Handle dates in `UNTIL` in `RRule.fromString`.
  - Added support for RequireJS.
  - Added `options` argument to `RRule.fromString`.
- 1.0.1 (2013-02-26)
  - Fixed leap years (thanks @jessevogt)
- 1.0.0 (2013-01-24)
  - Fixed timezone offset issues related to DST (thanks @evro).
- 1.0.0-beta (2012-08-15)
  - Initial public release.
