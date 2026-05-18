# @spiandorello/rrulejs

**Hardened fork of [`rrule`](https://github.com/jkbrzt/rrule) — RFC 5545 recurrence rules for JavaScript/TypeScript, with a DoS-resistant parser, iteration caps, and a typed `Recurrence` API with inclusive-day UTC `UNTIL` semantics.**

[![NPM version][npm-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![Downloads][downloads-image]][downloads-url]
[![codecov][codecov-image]][codecov-url]
[![License][license-image]][license-url]

## What this fork adds over upstream `rrule`

- **DoS-resistant parser.** Oversized RRULE strings (default cap: 64 KiB), invalid `interval`, and `BYSETPOS` arrays longer than 732 entries are rejected before reaching the iterator.
- **Iteration cap.** `.all()` / `.count()` / `.between()` throw `RRuleIterationLimitError` after 100 000 accepted dates (configurable). Backstops infinite rules that omit `COUNT` and `UNTIL`.
- **Dual ESM + CJS distribution.** Proper `exports` map with separate `dist/esm` and `dist/cjs` builds and matching `.d.ts` for each. The UMD bundle was removed in 4.x — browser consumers load via a bundler or an ESM-capable CDN.
- **Typed Recurrence API.** A plain-string `Recurrence` type that round-trips to an RFC 5545 `RRULE:` string, with deterministic inclusive-day-UTC `UNTIL` semantics by default.
- **TZID iteration ~28× faster.** `Intl.DateTimeFormat` is now cached per timezone — a 5-year `DAILY` `.between()` over TZID went from ~374 ms to ~13 ms.

See [`SECURITY.md`](./SECURITY.md) for the full hardening matrix and threat model.

## Table of contents

- [Requirements](#requirements)
- [Install](#install)
- [Quick start — Typed Recurrence API](#quick-start--typed-recurrence-api)
- [Quick start — RRule (low-level)](#quick-start--rrule-low-level)
- [Important: use UTC dates](#important-use-utc-dates)
- [Timezone support](#timezone-support)
- [API](#api)
  - [`RRule` constructor](#rrule-constructor)
  - [Instance properties](#instance-properties)
  - [Occurrence retrieval methods](#occurrence-retrieval-methods)
  - [iCalendar RFC string methods](#icalendar-rfc-string-methods)
  - [Natural language text methods](#natural-language-text-methods)
  - [`RRuleSet`](#rruleset)
  - [`rrulestr`](#rrulestr-1)
  - [Hardening guards](#hardening-guards)
- [Migration](#migration)
- [Differences from iCalendar RFC](#differences-from-icalendar-rfc)
- [Development](#development)
- [Authors](#authors)
- [Related projects](#related-projects)

## Requirements

- **Node.js ≥ 20** (declared in `engines.node`). The CI matrix tracks the active LTS line.
- **Modern JavaScript runtime** with the [`Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) available. The `tzid` option uses `Intl.DateTimeFormat` to resolve IANA timezones. If you must support an environment without `Intl`, ship a [polyfill](https://formatjs.io/docs/polyfills/).
- **Browser usage:** load through a bundler (Vite, esbuild, webpack, …) or an ESM-capable CDN. There is no UMD bundle.

## Install

```bash
npm install @spiandorello/rrulejs
# or
yarn add @spiandorello/rrulejs
```

TypeScript types ship in the package — no `@types/...` companion needed.

## Quick start — Typed Recurrence API

The typed API is the recommended entry point for new code. `Recurrence` exchanges numeric enums and `Weekday` instances for plain string literals, treats `UNTIL` as an inclusive calendar day in UTC by default, and round-trips cleanly to and from an RFC 5545 `RRULE:` string.

```ts
import {
  Recurrence,
  recurrenceToRRule,
  recurrenceToRRuleString,
  rruleStringToRecurrence,
  parseYmdToUtcEndOfDay,
  formatUtcDateToYmd,
} from '@spiandorello/rrulejs'
```

### Build an RRULE string

```ts
const recurrence: Recurrence = {
  frequency: 'WEEKLY',
  interval: 1,
  byWeekday: ['TU', 'TH'],
  end: { type: 'until', until: '2026-12-31' },
}

const dtstart = new Date('2026-05-12T18:00:00-03:00')

recurrenceToRRuleString(recurrence, dtstart)
// → 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959Z'
```

`INTERVAL=1` is omitted from the output, and the default `untilMode` (`'inclusive-day-utc'`) anchors the end to 23:59:59 UTC on the `UNTIL` calendar day. The serialized bytes are identical regardless of the runtime's timezone, and an event scheduled later in the day on `2026-12-31` is still included.

### Build a fully serialized rule (with DTSTART)

```ts
recurrenceToRRuleString(recurrence, dtstart, { includeDtstart: true })
// → 'DTSTART:20260512T210000Z\nRRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959Z'
```

### Treat UNTIL as a UTC instant instead of a calendar day

```ts
recurrenceToRRuleString(recurrence, dtstart, { untilMode: 'instant' })
// → 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T000000Z'
```

### Use COUNT or no end at all

```ts
recurrenceToRRuleString(
  {
    frequency: 'WEEKLY',
    byWeekday: ['MO', 'WE', 'FR'],
    end: { type: 'count', count: 10 },
  },
  dtstart
)
// → 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10'

recurrenceToRRuleString({ frequency: 'DAILY', end: { type: 'never' } }, dtstart)
// → 'RRULE:FREQ=DAILY'
```

### Parse an RRULE string back to `Recurrence`

```ts
rruleStringToRecurrence('RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10')
// → {
//     frequency: 'WEEKLY',
//     byWeekday: ['TU', 'TH'],
//     end: { type: 'count', count: 10 },
//   }
```

Unsupported features (`FREQ=HOURLY/MINUTELY/SECONDLY`, `BYSETPOS`, `BYHOUR`, `BYMINUTE`, `BYSECOND`, `BYYEARDAY`, `BYWEEKNO`, `WKST`, `BYDAY` with an nth prefix such as `-1MO`, multi-value `BYMONTH` or `BYMONTHDAY`) throw a descriptive error rather than silently dropping data.

### Hand off to the existing `RRule` API

```ts
const rule = recurrenceToRRule(recurrence, dtstart)
rule.all() // Date[]
rule.between(start, end)
```

### Date helpers

```ts
parseYmdToUtcEndOfDay('2026-12-31')
// → 2026-12-31T23:59:59.000Z

formatUtcDateToYmd(new Date('2026-05-12T10:00:00Z'))
// → '2026-05-12'
```

### `untilMode` options

| Value                             | Effect                                                                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'inclusive-day-utc'` _(default)_ | Anchors `until` at 23:59:59 UTC on the UNTIL calendar day. TZ-independent and roundtrip-clean.                                                                                                                         |
| `'instant'`                       | Anchors `until` at 00:00:00 UTC on the UNTIL calendar day. TZ-independent but excludes events later in the UNTIL day.                                                                                                  |
| `'inclusive-day'` _(deprecated)_  | Anchors `until` at 23:59:59 in the runtime's local timezone. Depends on `process.env.TZ` and breaks roundtrip on non-UTC hosts. Emits one `console.warn` per process; set `SPIANDORELLO_RRULEJS_NO_WARN=1` to silence. |

`'inclusive-day-utc'` interprets the `until` string as a UTC calendar day, so callers in a timezone ahead of UTC who need local-day semantics should pre-convert their `until` value before passing it to `Recurrence`.

## Quick start — RRule (low-level)

The low-level `RRule` API mirrors the upstream `rrule` shape. Use it when you need direct control over RFC 5545 fields the typed API does not expose (`BYSETPOS`, `BYHOUR`, nth-weekday, `WKST`, …) or when you are porting existing code.

### `RRule`

```ts
import { datetime, RRule, RRuleSet, rrulestr } from '@spiandorello/rrulejs'

// Create a rule:
const rule = new RRule({
  freq: RRule.WEEKLY,
  interval: 5,
  byweekday: [RRule.MO, RRule.FR],
  dtstart: datetime(2012, 2, 1, 10, 30),
  until: datetime(2012, 12, 31),
})

// Get all occurrence dates (Date instances):
rule.all()
// → [
//     2012-02-03T10:30:00.000Z,
//     2012-03-05T10:30:00.000Z,
//     2012-03-09T10:30:00.000Z,
//     2012-04-09T10:30:00.000Z,
//     2012-04-13T10:30:00.000Z,
//     2012-05-14T10:30:00.000Z,
//     2012-05-18T10:30:00.000Z,
//     /* … */
//   ]

// Get a slice:
rule.between(datetime(2012, 8, 1), datetime(2012, 9, 1))
// → [2012-08-27T10:30:00.000Z, 2012-08-31T10:30:00.000Z]

// Get an iCalendar RRULE string representation:
// The output can be used with RRule.fromString().
rule.toString()
// → 'DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=MO,FR'

// Get a human-friendly text representation:
// The output can be used with RRule.fromText().
rule.toText()
// → 'every 5 weeks on Monday, Friday until January 31, 2013'
```

### `RRuleSet`

```ts
const rruleSet = new RRuleSet()

// Add a rrule to rruleSet
rruleSet.rrule(
  new RRule({
    freq: RRule.MONTHLY,
    count: 5,
    dtstart: datetime(2012, 2, 1, 10, 30),
  })
)

// Add a date to rruleSet
rruleSet.rdate(datetime(2012, 7, 1, 10, 30))

// Add another date to rruleSet
rruleSet.rdate(datetime(2012, 7, 2, 10, 30))

// Add an exclusion rrule to rruleSet
rruleSet.exrule(
  new RRule({
    freq: RRule.MONTHLY,
    count: 2,
    dtstart: datetime(2012, 3, 1, 10, 30),
  })
)

// Add an exclusion date to rruleSet
rruleSet.exdate(datetime(2012, 5, 1, 10, 30))

// Get all occurrence dates (Date instances):
rruleSet.all()
// → [
//     2012-02-01T10:30:00.000Z,
//     2012-05-01T10:30:00.000Z,
//     2012-07-01T10:30:00.000Z,
//     2012-07-02T10:30:00.000Z,
//   ]

// Get a slice:
rruleSet.between(datetime(2012, 2, 1), datetime(2012, 6, 2))
// → [2012-05-01T10:30:00.000Z]

// Serialize back to RFC lines:
rruleSet.valueOf()
// → [
//     'DTSTART:20120201T103000Z',
//     'RRULE:FREQ=MONTHLY;COUNT=5',
//     'RDATE:20120701T103000Z,20120702T103000Z',
//     'EXRULE:FREQ=MONTHLY;COUNT=2',
//     'EXDATE:20120501T103000Z',
//   ]
```

### `rrulestr`

```ts
// Parse a RRule string, return a RRule object
rrulestr('DTSTART:20120201T023000Z\nRRULE:FREQ=MONTHLY;COUNT=5')

// Parse a RRule string, return a RRuleSet object
rrulestr('DTSTART:20120201T023000Z\nRRULE:FREQ=MONTHLY;COUNT=5', {
  forceset: true,
})

// Parse a RRuleSet string, return a RRuleSet object
rrulestr(
  'DTSTART:20120201T023000Z\n' +
    'RRULE:FREQ=MONTHLY;COUNT=5\n' +
    'RDATE:20120701T023000Z,20120702T023000Z\n' +
    'EXRULE:FREQ=MONTHLY;COUNT=2\n' +
    'EXDATE:20120601T023000Z'
)
```

## Important: use UTC dates

Dates in JavaScript are tricky. `RRule` tries to support as much flexibility as possible without adding any large required 3rd-party dependencies, but that means we also have some special rules.

By default, `RRule` deals in [floating times or UTC timezones](https://tools.ietf.org/html/rfc5545#section-3.2.19). If you want results in a specific timezone, `RRule` also provides [timezone support](#timezone-support). Either way, JavaScript's built-in "timezone" offset tends to just get in the way, so this library does not use it at all. All times are returned with zero offset, as though it did not exist in JavaScript.

**THE BOTTOM LINE:** returned "UTC" dates are always meant to be interpreted as dates in your local timezone. This may mean you have to do additional conversion to get the "correct" local time with offset applied.

For this reason, it is highly recommended to use timestamps in UTC, e.g. `new Date(Date.UTC(...))`. Returned dates will likewise be in UTC (except on Chrome, which always returns dates with a timezone offset). It is recommended to use the provided `datetime()` helper, which creates dates in the correct format using a 1-based month.

For example:

```ts
// local machine zone is America/Los_Angeles
const rule = RRule.fromString(
  'DTSTART;TZID=America/Denver:20181101T190000;\n' +
    'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,TH;INTERVAL=1;COUNT=3'
)
rule.all()
// → [
//     2018-11-01T18:00:00.000Z,
//     2018-11-05T18:00:00.000Z,
//     2018-11-07T18:00:00.000Z,
//   ]
// Even though the given offset is `Z` (UTC), these are local times, not UTC times.
// Each of these is the correct local Pacific time of each recurrence in
// America/Los_Angeles when it is 19:00 in America/Denver, including the DST shift.

// You can get the local components by using the getUTC* methods, e.g.:
date.getUTCDate() // → 1
date.getUTCHours() // → 18
```

If you want to get the same times in true UTC, you may do so (e.g., using [Luxon](https://moment.github.io/luxon/#/)):

```ts
rule
  .all()
  .map((date) =>
    DateTime.fromJSDate(date)
      .toUTC()
      .setZone('local', { keepLocalTime: true })
      .toJSDate()
  )
// → [
//     2018-11-02T01:00:00.000Z,
//     2018-11-06T02:00:00.000Z,
//     2018-11-08T02:00:00.000Z,
//   ]
// These times are in true UTC; you can see the hours shift.
```

For more examples see the [python-dateutil](http://labix.org/python-dateutil/) documentation.

## Timezone support

`RRule` supports the `TZID` parameter in the [RFC](https://tools.ietf.org/html/rfc5545#section-3.2.19) using the [`Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl). The support matrix for `Intl` applies. If you need to support environments without `Intl`, consider a [polyfill](https://formatjs.io/docs/polyfills/).

Example with `TZID`:

```ts
new RRule({
  dtstart: datetime(2018, 2, 1, 10, 30),
  count: 1,
  tzid: 'Asia/Tokyo',
}).all()
// → [2018-01-31T17:30:00.000Z]
// assuming the system timezone is set to America/Los_Angeles —
// the time in Los Angeles when it is 2018-02-01T10:30:00 in Tokyo.
```

Whether or not you use the `tzid` param, make sure to only use JS `Date` objects represented in UTC to avoid unexpected timezone offsets being applied:

```ts
// WRONG: Will produce dates with TZ offsets added
new RRule({
  freq: RRule.MONTHLY,
  dtstart: new Date(2018, 1, 1, 10, 30),
  until: new Date(2018, 2, 31),
}).all()
// → [2018-02-01T18:30:00.000Z, 2018-03-01T18:30:00.000Z]

// RIGHT: Will produce dates with recurrences at the correct time
new RRule({
  freq: RRule.MONTHLY,
  dtstart: datetime(2018, 2, 1, 10, 30),
  until: datetime(2018, 3, 31),
}).all()
// → [2018-02-01T10:30:00.000Z, 2018-03-01T10:30:00.000Z]
```

## API

### `RRule` constructor

```ts
new RRule(options[, noCache = false])
```

The `options` argument mostly corresponds to the properties defined for `RRULE` in the iCalendar RFC. Only `freq` is required.

| Option       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `freq`       | _(required)_ One of `RRule.YEARLY`, `RRule.MONTHLY`, `RRule.WEEKLY`, `RRule.DAILY`, `RRule.HOURLY`, `RRule.MINUTELY`, `RRule.SECONDLY`.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `dtstart`    | The recurrence start. Besides being the base for the recurrence, missing parameters in the final recurrence instances will also be extracted from this date. If not given, `new Date` is used. **See [Timezone support](#timezone-support).**                                                                                                                                                                                                                                                                                           |
| `interval`   | The interval between each `freq` iteration. For example, with `RRule.YEARLY`, `interval: 2` means once every two years; with `RRule.HOURLY`, once every two hours. Default is `1`. The parser rejects non-positive or non-integer values with `Invalid interval: ...`.                                                                                                                                                                                                                                                                  |
| `wkst`       | The week start day. Must be one of the `RRule.MO`, `RRule.TU`, `RRule.WE` constants (or an integer). Affects recurrences based on weekly periods. Default is `RRule.MO`.                                                                                                                                                                                                                                                                                                                                                                |
| `count`      | How many occurrences will be generated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `until`      | A `Date` instance specifying the limit of the recurrence. If a recurrence instance happens to be the same as the `Date` given here, it will be the last occurrence.                                                                                                                                                                                                                                                                                                                                                                     |
| `tzid`       | If given, an IANA string recognized by the `Intl` API. See [Timezone support](#timezone-support).                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `bysetpos`   | An integer, or an array of integers (positive or negative). Each integer specifies an occurrence number, corresponding to the nth occurrence of the rule inside the frequency period. For example, `bysetpos: -1` combined with `RRule.MONTHLY` and `byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR]` resolves to the last work day of every month. The parser caps `bysetpos` arrays at 732 entries (the count of distinct legal positions, `-366..-1, 1..366`).                                                         |
| `bymonth`    | Integer, or array of integers, meaning the months to apply the recurrence to.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `bymonthday` | Integer, or array of integers, meaning the month days to apply the recurrence to.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `byyearday`  | Integer, or array of integers, meaning the year days to apply the recurrence to.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `byweekno`   | Integer, or array of integers, meaning the week numbers to apply the recurrence to. Week numbers have the meaning described in ISO 8601: the first week of the year contains at least four days of the new year.                                                                                                                                                                                                                                                                                                                        |
| `byweekday`  | Integer (`0 == RRule.MO`), array of integers, one of the weekday constants (`RRule.MO`, `RRule.TU`, …), or an array of these. Defines the weekdays where the recurrence will be applied. It is also possible to use an `n` argument for the weekday instances, meaning the nth occurrence of this weekday in the period. For example, with `RRule.MONTHLY` (or with `RRule.YEARLY` and `BYMONTH`), `RRule.FR.nth(+1)` or `RRule.FR.nth(-1)` selects the first or last Friday of the month. Renamed from RFC `BYDAY` to avoid ambiguity. |
| `byhour`     | Integer, or array of integers, meaning the hours to apply the recurrence to.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `byminute`   | Integer, or array of integers, meaning the minutes to apply the recurrence to.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `bysecond`   | Integer, or array of integers, meaning the seconds to apply the recurrence to.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `byeaster`   | RFC extension provided by the Python implementation. **Not implemented in the JavaScript version.**                                                                                                                                                                                                                                                                                                                                                                                                                                     |

`noCache`: Set to `true` to disable caching of results. If you use the same `RRule` instance multiple times, enabling caching improves performance considerably. Enabled by default.

See also the [python-dateutil](http://labix.org/python-dateutil/) documentation.

### Instance properties

- **`rule.options`** — Processed options applied to the rule. Includes defaults such as `wkstart`. Note: `rule.options.byweekday` is currently not equal to `rule.origOptions.byweekday` (a known inconsistency).
- **`rule.origOptions`** — The original `options` argument passed to the constructor.

### Occurrence retrieval methods

#### `RRule.prototype.all([iterator])`

Returns all dates matching the rule. Replacement for the iterator protocol in the Python version.

Rules without `until` or `count` represent infinite date series. You can optionally pass `iterator`, a function called for each matched date. It receives `date` (the `Date` instance) and `i` (zero-indexed position). Dates are added to the result while the iterator returns truthy; returning a falsy value stops iteration.

```ts
rule.all()
// → [
//     2012-02-01T10:30:00.000Z,
//     2012-05-01T10:30:00.000Z,
//     2012-07-01T10:30:00.000Z,
//     2012-07-02T10:30:00.000Z,
//   ]

rule.all((date, i) => i < 2)
// → [2012-02-01T10:30:00.000Z, 2012-05-01T10:30:00.000Z]
```

**Note (DoS backstop):** `.all()` throws `RRuleIterationLimitError` after `IterResult.defaultMaxIterations` accepted dates (default `100_000`). For infinite rules, prefer `.between()` or pass an iterator that stops on your own condition. See [Hardening guards](#hardening-guards).

#### `RRule.prototype.between(after, before, inc=false [, iterator])`

Returns all occurrences between `after` and `before`. The `inc` flag controls whether `after` and `before` are themselves included when they fall on an occurrence.

```ts
rule.between(datetime(2012, 8, 1), datetime(2012, 9, 1))
// → [2012-08-27T10:30:00.000Z, 2012-08-31T10:30:00.000Z]
```

#### `RRule.prototype.before(dt, inc=false)`

Returns the last recurrence before `dt`. With `inc == true`, returns `dt` itself if it is an occurrence.

#### `RRule.prototype.after(dt, inc=false)`

Returns the first recurrence after `dt`. With `inc == true`, returns `dt` itself if it is an occurrence.

### iCalendar RFC string methods

#### `RRule.prototype.toString()`

Returns a string representation of the rule per the iCalendar RFC. Only properties explicitly specified in `options` are included:

```ts
rule.toString()
// → 'DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=MO,FR'

rule.toString() === RRule.optionsToString(rule.origOptions)
// → true
```

#### `RRule.optionsToString(options)`

Converts `options` to an iCalendar RFC `RRULE` string:

```ts
// Full string representation of all options, including defaults and inferred ones.
RRule.optionsToString(rule.options)
// → 'DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;INTERVAL=5;WKST=0;UNTIL=20130130T230000Z;BYDAY=MO,FR;BYHOUR=10;BYMINUTE=30;BYSECOND=0'

// Cherry-pick only some options from an rrule:
RRule.optionsToString({
  freq: rule.options.freq,
  dtstart: rule.options.dtstart,
})
// → 'DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;'
```

#### `RRule.fromString(rfcString)`

Constructs an `RRule` instance from a complete `rfcString`:

```ts
const rule = RRule.fromString('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY;')

// Equivalent to:
const sameRule = new RRule(
  RRule.parseString('DTSTART:20120201T093000Z\nRRULE:FREQ=WEEKLY')
)
```

#### `RRule.parseString(rfcString)`

Parses an RFC string and returns `options` (without constructing an `RRule`).

```ts
const options = RRule.parseString('FREQ=DAILY;INTERVAL=6')
options.dtstart = datetime(2000, 2, 1)
const rule = new RRule(options)
```

`RRule.parseString` throws `RRuleStringTooLargeError` for inputs longer than `parseStringConfig.maxLength` (default 64 KiB), and throws on invalid `INTERVAL` (non-positive integer) and comma-separated `COUNT` / `INTERVAL` / `BYEASTER` values. See [Hardening guards](#hardening-guards).

### Natural language text methods

These methods provide incomplete support for text→`RRule` and `RRule`→text conversion. Test them with your input to see whether the result is acceptable.

#### `RRule.prototype.toText([gettext, [language]])`

Returns a textual representation of `rule`. The `gettext` callback, if provided, is called for each text token; its return value is used instead. The optional `language` argument selects a language definition (defaults to `rrule/nlp.js:ENGLISH`).

```ts
const rule = new RRule({
  freq: RRule.WEEKLY,
  count: 23,
})
rule.toText()
// → 'every week for 23 times'
```

#### `RRule.prototype.isFullyConvertibleToText()`

Hints whether all options on the rule can be converted to text.

#### `RRule.fromText(text[, language])`

Constructs an `RRule` from `text`.

```ts
const rule = RRule.fromText('every day for 3 times')
```

#### `RRule.parseText(text[, language])`

Parse `text` into `options`:

```ts
const options = RRule.parseText('every day for 3 times')
// → { freq: 3, count: '3' }
options.dtstart = datetime(2000, 2, 1)
const rule = new RRule(options)
```

### `RRuleSet`

```ts
new RRuleSet((noCache = false))
```

Allows more complex recurrence setups, mixing multiple rules, dates, exclusion rules, and exclusion dates.

Default `noCache` is `false`; caching of results is enabled and improves performance of multiple queries considerably.

- **`RRuleSet.prototype.rrule(rrule)`** — Include the given `rrule` instance in the recurrence set generation.
- **`RRuleSet.prototype.rdate(dt)`** — Include the given datetime `dt` in the recurrence set generation.
- **`RRuleSet.prototype.exrule(rrule)`** — Include the given `rrule` instance in the exclusion list. Dates matched by exrules are not generated, even if some inclusive `rrule` or `rdate` matches them. **Note:** `EXRULE` is [deprecated in RFC 5545](https://icalendar.org/iCalendar-RFC-5545/a-3-deprecated-features.html) and does not support a `DTSTART` property.
- **`RRuleSet.prototype.exdate(dt)`** — Include the given datetime `dt` in the exclusion list.
- **`RRuleSet.prototype.tzid(tz?)`** — Sets or overrides the timezone identifier. Useful when there are no rrules in the set and thus no `DTSTART`.
- **`RRuleSet.prototype.all([iterator])`** — Same as `RRule.prototype.all`.
- **`RRuleSet.prototype.between(after, before, inc=false [, iterator])`** — Same as `RRule.prototype.between`.
- **`RRuleSet.prototype.before(dt, inc=false)`** — Same as `RRule.prototype.before`.
- **`RRuleSet.prototype.after(dt, inc=false)`** — Same as `RRule.prototype.after`.
- **`RRuleSet.prototype.rrules()`** — List of included rrules (immutable copy).
- **`RRuleSet.prototype.exrules()`** — List of excluded rrules (immutable copy).
- **`RRuleSet.prototype.rdates()`** — List of included datetimes (immutable copy).
- **`RRuleSet.prototype.exdates()`** — List of excluded datetimes (immutable copy).

### `rrulestr`

```ts
rrulestr(rruleStr[, options])
```

`rrulestr` parses RFC-like syntaxes. The string may be a multi-line string, a single-line string, or just the `RRULE` property value.

| Option       | Description                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cache`      | If `true`, the returned `rrule` or `rruleset` will cache its results. Default: not cached.                                                                             |
| `dtstart`    | A datetime instance used when no `DTSTART` is found in the parsed string. If both are absent, `new Date()` is used.                                                    |
| `unfold`     | If `true`, lines are unfolded per the RFC. Default `false` (leading spaces on each line are stripped).                                                                 |
| `forceset`   | If `true`, an `rruleset` is returned even when only a single rule is found. Default is to return an `rrule` when possible, an `rruleset` otherwise.                    |
| `compatible` | If `true`, the parser operates in RFC-compatible mode: `unfold` is turned on and, if a `DTSTART` is found, it is treated as the first recurrence instance per the RFC. |
| `tzid`       | A string used when no `TZID` is found in the parsed string. If both are absent, `'UTC'` is used.                                                                       |

`rrulestr` inherits the same `parseStringConfig.maxLength` guard as `RRule.parseString` — oversized inputs throw `RRuleStringTooLargeError` before any structural parsing.

### Hardening guards

The fork ships two configurable backstops against denial-of-service from untrusted input, both exported from the package root.

```ts
import {
  parseStringConfig,
  RRuleStringTooLargeError,
  RRuleIterationLimitError,
  IterResult,
  rrulestr,
} from '@spiandorello/rrulejs'

// Tighten the parser cap (default 64 KiB):
parseStringConfig.maxLength = 4096

// Tighten the iteration cap (default 100_000) for all subsequent IterResult
// instances:
IterResult.defaultMaxIterations = 10_000

try {
  rrulestr(untrustedString).all()
} catch (e) {
  if (e instanceof RRuleStringTooLargeError) {
    // e.actualLength, e.limit
  } else if (e instanceof RRuleIterationLimitError) {
    // e.limit — usually means the rule has no COUNT/UNTIL
  } else {
    throw e
  }
}
```

- **`parseStringConfig.maxLength`** — Maximum accepted input length, in characters. Defaults to `65536` (64 KiB). Mutable at runtime.
- **`IterResult.defaultMaxIterations`** — Default cap on accepted dates per iteration. Defaults to `100_000`. Mutable at runtime; changes apply to subsequently constructed `IterResult` instances.
- **`RRuleStringTooLargeError`** — Thrown by `parseString` / `rrulestr` when an input exceeds `parseStringConfig.maxLength`. Exposes `actualLength` and `limit`.
- **`RRuleIterationLimitError`** — Thrown by `IterResult.add` when the accepted-date count reaches `maxIterations`. Exposes `limit`. Triggered from `.all()`, `.count()`, `.between()`, `.before()`, callback iterators, and `RRuleSet`.

See [`SECURITY.md`](./SECURITY.md) for the full threat model and the upstream issues these guards close.

## Migration

### From upstream `rrule` (`jkbrzt/rrule`) to `@spiandorello/rrulejs`

- **Change the package name.** `npm install @spiandorello/rrulejs`, then update imports from `'rrule'` to `'@spiandorello/rrulejs'`. The exported names (`RRule`, `RRuleSet`, `rrulestr`, `Weekday`, `datetime`, …) are identical.
- **No UMD bundle.** Browser consumers that loaded upstream via a `<script>` tag must switch to a bundler (Vite, esbuild, webpack, …) or an ESM-capable CDN. Node CJS (`require('@spiandorello/rrulejs')`) and Node ESM (`import { RRule } from '@spiandorello/rrulejs'`) are unaffected.
- **Iteration cap on infinite rules.** Calls like `new RRule({ freq: RRule.DAILY }).all()` now throw `RRuleIterationLimitError` after 100 000 accepted dates instead of growing without bound. Either add `count` / `until`, switch to `.between()`, pass an iterator that stops on your own condition, or raise `IterResult.defaultMaxIterations`.
- **Stricter `parseString`.** `RRule.parseString` / `rrulestr` reject inputs above 64 KiB (`RRuleStringTooLargeError`), reject non-positive or non-integer `INTERVAL`, and reject `BYSETPOS` arrays longer than 732 entries. Inputs that previously parsed silently with bogus values may now throw — usually a strict-mode improvement.
- **`Recurrence` API available.** Consider migrating new code to the [typed Recurrence API](#quick-start--typed-recurrence-api).

### 3.x → 4.x (UMD removed)

The UMD bundle is gone. Browser consumers that loaded the library via a `<script>` tag must switch to a bundler or an ESM-capable CDN. Node CJS (`require('@spiandorello/rrulejs')`) and Node ESM (`import { RRule } from '@spiandorello/rrulejs'`) are unaffected — the `exports` map keeps both entry points resolving to working builds.

See [#46](https://github.com/spiandorello/rrule/issues/46) for the rationale.

### 4.x → 5.x (`untilMode` default flipped to `inclusive-day-utc`)

Starting in 5.x, the Typed Recurrence API's `untilMode` defaults to `'inclusive-day-utc'` instead of `'inclusive-day'`. The serialized output is now identical across hosts:

```
// 4.x on TZ=America/Sao_Paulo:
RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270101T025959Z

// 5.x (any TZ):
RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959Z
```

Callers who relied on the legacy runtime-TZ behavior can pass `untilMode: 'inclusive-day'` explicitly. That mode is now deprecated and emits a one-time `console.warn`; set `SPIANDORELLO_RRULEJS_NO_WARN=1` in the environment to silence it. See [issue #61](https://github.com/spiandorello/rrule/issues/61) for the background.

## Differences from iCalendar RFC

- `RRule` has no `byday` keyword. The equivalent keyword has been replaced by `byweekday` to remove the ambiguity present in the original keyword.
- Unlike documented in the RFC, the starting datetime `dtstart` is not the first recurrence instance unless it fits the specified rules. This is in part due to the project being a port of [python-dateutil](https://labix.org/python-dateutil#head-a65103993a21b717f6702063f3717e6e75b4ba66), which has the same non-compliant behavior. You can get the original behavior by using an `RRuleSet` and adding `dtstart` as an `rdate`.

```ts
const rruleSet = new RRuleSet()
const start = datetime(2012, 2, 1, 10, 30)

// Add a rrule to rruleSet
rruleSet.rrule(
  new RRule({
    freq: RRule.MONTHLY,
    count: 5,
    dtstart: start,
  })
)

// Add a date to rruleSet
rruleSet.rdate(start)
```

- Unlike documented in the RFC, every keyword is valid on every frequency. (The RFC documents that `byweekno` is only valid on yearly frequencies, for example.)

## Development

The library is implemented in TypeScript with strict mode enabled. Builds emit ESM and CJS in parallel via `tsc` (no bundler).

```bash
# Install dependencies
yarn

# Run the test suite
yarn test

# Build dist/esm and dist/cjs
yarn build

# Type-check without emitting
yarn typecheck

# Lint and format
yarn lint
yarn format
```

## Authors

**Fork maintainer**

- Eduardo da Veiga Spiandorello — `<eduardo.spiandorello@gmail.com>` ([@spiandorello](https://github.com/spiandorello))

**Upstream `rrule` authors**

- [Jakub Roztocil](http://roztocil.co) ([@jkbrzt](http://twitter.com/jkbrzt))
- Lars Schöning ([@lyschoening](http://twitter.com/lyschoening))
- David Golightly ([@davigoli](http://twitter.com/davigoli))

Python `dateutil` is written by [Gustavo Niemeyer](http://niemeyer.net).

See [LICENCE](https://github.com/spiandorello/rrule/blob/main/LICENCE) for more details.

## Related projects

- [`rrules.com`](https://rrules.com) — RESTful API to get back occurrences of RRULEs that conform to RFC 5545.

[npm-url]: https://www.npmjs.com/package/@spiandorello/rrulejs
[npm-image]: https://img.shields.io/npm/v/@spiandorello/rrulejs.svg
[ci-url]: https://github.com/spiandorello/rrule/actions/workflows/nodejs.yml
[ci-image]: https://github.com/spiandorello/rrule/actions/workflows/nodejs.yml/badge.svg?branch=main
[downloads-url]: https://www.npmjs.com/package/@spiandorello/rrulejs
[downloads-image]: https://img.shields.io/npm/dm/@spiandorello/rrulejs.svg
[codecov-url]: https://codecov.io/gh/spiandorello/rrule
[codecov-image]: https://codecov.io/gh/spiandorello/rrule/branch/main/graph/badge.svg
[license-url]: https://github.com/spiandorello/rrule/blob/main/LICENCE
[license-image]: https://img.shields.io/npm/l/@spiandorello/rrulejs.svg
