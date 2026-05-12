# CLAUDE.md — @spiandorello/rrulejs

## Overview

`@spiandorello/rrulejs` is a TypeScript library (hardened fork of `rrule`) for working with RFC 5545 recurrence rules. It is published as both UMD (`dist/es5/`) and ESM (`dist/esm/`) and runs in Node.js 14+ and modern browsers.

The fork's value over upstream is operational safety: DoS-resistant parser, iteration guards, ~50× faster TZID iteration, and a typed `Recurrence` API with inclusive-day `UNTIL` semantics (new in 2.9.0). See [`SECURITY.md`](SECURITY.md) for the authoritative threat model and rationale.

## Commands

### Setup

```bash
yarn install
```

### Build

```bash
yarn build          # clean + lint + format-check + tsc -b tsconfig.build.json + webpack
yarn clean          # remove dist/
```

There is no watch script. For an inner-loop, run `tsc -b tsconfig.build.json -w` directly, or just `yarn test` (jest re-runs are fast).

### Testing

```bash
yarn test           # jest **/*.test.ts
yarn test-ci        # ts-node ./node_modules/.bin/nyc jest **/*.test.ts  (coverage)
jest --watch        # not in package.json — invoke jest directly
```

### Code Quality

```bash
yarn lint           # eslint . --fix --config .eslintrc.js
yarn format         # prettier --write .
yarn format-check   # prettier --check .   (CI gate)
```

`tsc` typechecking happens as part of `yarn build` — there is no standalone `typecheck` script.

## Architecture

**Pattern:** Functional RFC parser + state-machine iterator with DoS guards and performance caches.

**Data flow:**

```
User code
  └─ new RRule(opts) / rrulestr(str)
       └─ parseString → parseOptions  (length cap, typed validation)
            └─ RRule.all() / .between() / .before() / .after()
                 └─ iter() generator over DateTime
                      └─ apply BY* masks  (iterinfo/monthinfo|yearinfo)
                           └─ IterResult.add()           ─┐
                                (RRuleIterationLimitError ◀ 100k cap)
                                └─ optional cache.ts
                                     └─ Date[] | Date | RFC string | text
```

**Key layers:**

| Layer        | Location                                        | Responsibility                                                                         |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Public API   | `src/index.ts`                                  | Exports `RRule`, `RRuleSet`, `rrulestr`, `Recurrence`, weekday constants, typed errors |
| Core engine  | `src/rrule.ts`, `src/rruleset.ts`               | Occurrence retrieval (`.all`/`.between`/`.before`/`.after`), RFC serialization         |
| Parser       | `src/parsestring.ts`, `src/parseoptions.ts`     | RFC 5545 parsing with length cap + typed validation                                    |
| Iteration    | `src/iter/`, `src/iterinfo/`, `src/datetime.ts` | Candidate generation; `MAX_ADD_ITERATIONS=100k` guard                                  |
| Accumulation | `src/iterresult.ts`                             | 100k-result backstop (`RRuleIterationLimitError`)                                      |
| Timezone     | `src/datewithzone.ts`, `src/dateutil.ts`        | `Intl.DateTimeFormat` cache per TZID                                                   |
| Typed API    | `src/typedRecurrence/`                          | `Recurrence` ↔ `RRule` bridge (2.9.0)                                                  |
| NLP          | `src/nlp/`                                      | text ↔ RRule, multi-language                                                           |

Full directory tree, module breakdown, and static pitfalls:
[`.claude/docs/architecture.md`](.claude/docs/architecture.md)

## Tech Stack

| Layer           | Technology                   | Version                                                 |
| --------------- | ---------------------------- | ------------------------------------------------------- |
| Language        | TypeScript                   | ^4.7.3                                                  |
| Runtime         | Node.js                      | 14.x / 16.x / 18.x (CI matrix)                          |
| Package manager | Yarn                         | (classic — implicit)                                    |
| Test runner     | Jest + ts-jest               | ^29.7.0                                                 |
| Linter          | ESLint                       | ^8.17.0                                                 |
| Formatter       | Prettier                     | ^2.6.2 (`semi: false`, `singleQuote: true`, tabWidth 2) |
| Bundler (UMD)   | Webpack + ts-loader          | ^5.73.0                                                 |
| Bundler (ESM)   | `tsc -b tsconfig.build.json` | ^4.7.3                                                  |
| Coverage        | nyc                          | ^15.1.0 (reporter: html; codecov upload in CI)          |
| Pre-commit      | Husky + lint-staged          | ^8.0.1                                                  |
| Runtime dep     | `tslib`                      | ^2.4.0 (only)                                           |

## Development Setup

### Prerequisites

- Node.js 14+ (16 or 18 recommended — match the CI matrix)
- Yarn classic (`npm install -g yarn`)

### First-time setup

```bash
yarn install
yarn build        # verify the full pipeline (lint + format + tsc + webpack)
yarn test         # confirm tests pass locally
```

### Environment variables

No `.env*` files. The only env vars the test suite cares about are `LANG` and `TZ`, used by CI to run the suite under multiple timezones (see CI/CD).

## Coding Standards

Enforced by `.eslintrc.js`, `.prettierrc.json`, `tsconfig.json`, and `tsconfig.build.json`. Highlights an agent must respect:

- TypeScript: no `any` (`@typescript-eslint/no-explicit-any: error`); strict null checks; `noImplicitAny`.
- Style: single quotes, no semicolons, 2-space indent (Prettier owns formatting — do not hand-format).
- No floating promises (`@typescript-eslint/no-floating-promises: error`).
- No empty functions; no `console.log`, no dynamic `eval`/`Function`/`require()`.
- ESLint `id-denylist` forbids identifiers like `any`, `Number`, `String`, `string`, `Boolean`, `boolean`, `undefined`.
- Public exports require JSDoc (enforced by `eslint-plugin-jsdoc`).
- Module organization is separated by concern (parser / iterator / options / cache); do not collapse into god-files.
- Test files use the `*.test.ts` pattern and live under `/test/`, not co-located with source.
- The TS build splits across `tsconfig.json` (dev+test) and `tsconfig.build.json` (production ESM); always build via `yarn build`.

<!-- TODO: extract to .claude/docs/coding-standards.md once standards diverge from .eslintrc.js -->

## Testing

- **Framework:** Jest ^29.7.0 with `ts-jest`, Node environment.
- **Location:** `test/*.test.ts` (not co-located with `src/`).
- **Time mocking:** `mockdate` for frozen-time tests.
- **Helper:** `datetime()` in `dateutil.ts` builds UTC dates with 1-based months — prefer it in new tests.
- **Coverage:** `yarn test-ci` runs jest under `nyc`; CI uploads to Codecov.

Tests must pass under all four locale/TZ combos that CI runs (see CI/CD). When adding tests that involve TZID, run at least one non-UTC TZ locally:

```bash
TZ=America/Los_Angeles yarn test
```

> **TZ sanity check.** CI runs tests across 4 timezone contexts (`America/Vancouver`, `America/Los_Angeles`, `Africa/Nairobi`, `Pacific/Kiritimati`) plus `Asia/Tokyo` with coverage. A local `yarn test` runs only in your system TZ and can mask TZ-sensitive regressions in the iterator and `datewithzone`. Before pushing changes that touch `src/datetime.ts`, `src/datewithzone.ts`, `src/dateutil.ts`, or `src/iter/`, run `TZ=America/Vancouver yarn test` and `TZ=Pacific/Kiritimati yarn test` as a quick local proxy for the CI matrix.

## CI/CD

Workflow: [`.github/workflows/nodejs.yml`](.github/workflows/nodejs.yml). Triggers on push and PR.

- Matrix: Node `14.x`, `16.x`, `18.x` on `ubuntu-latest`.
- Steps: `yarn install` → `yarn build` (lint, format-check, tsc, webpack) → `yarn test` repeated under four `LANG`/`TZ` combos (Vancouver, Los Angeles, Nairobi, Kiritimati) → `yarn test-ci` (Tokyo) → `nyc report` → Codecov upload.
- Quality gates: lint, format-check, tsc, all tests in all TZs, webpack bundle.

Pre-commit (`.husky/pre-commit`) runs `yarn lint-staged`, which applies `yarn lint` + `yarn format` to staged `*.ts` files.

No production deployment is configured in the repo — releases are published manually to npm.

## Security Hardening

This is a security-focused fork. Treat the following as load-bearing invariants — do not weaken them without a corresponding update to [`SECURITY.md`](SECURITY.md):

- **String length cap:** `parseString()` rejects inputs over `parseStringConfig.maxLength` (default 64 KiB) with `RRuleStringTooLargeError`. The config is exported and mutable for consumers needing a different cap.
- **Iteration cap:** `IterResult.defaultMaxIterations = 100_000` is the per-iteration backstop; on overflow throws `RRuleIterationLimitError`. Applies to `.all()`, `.count()`, `.between()`, `.before()`, callback iterators, and `RRuleSet`.
- **DateTime add cap:** `DateTime.MAX_ADD_ITERATIONS = 100_000` prevents parity-mismatch hangs (e.g. `FREQ=HOURLY;INTERVAL=2;BYHOUR=1`). On overflow, `markExhausted()` forces the date past `MAXYEAR` so the outer iterator terminates.
- **Typed parser:** every RFC key has an explicit, typed switch arm in `parseoptions.ts` — never reintroduce `options[key] = value` with `@ts-ignore`.
- **BYSETPOS cap:** 732 entries max (count of legal positions in `[-366, -1] ∪ [1, 366]`).
- **Interval validation:** non-positive or non-integer `INTERVAL` throws `Invalid interval: ...`; missing `INTERVAL` defaults to `1` per RFC.
- **TZID cache:** keep one `Intl.DateTimeFormat` per timezone; do not re-instantiate per candidate. Local TZ is memoized and invalidated on `process.env.TZ` change.

Authoritative source for threat model and rationale: [`SECURITY.md`](SECURITY.md). Detailed pitfalls live in [`.claude/docs/architecture.md`](.claude/docs/architecture.md#common-pitfalls).

## Typed Recurrence API

New in 2.9.0. Located in `src/typedRecurrence/`. Bridges a typed `Recurrence` shape to/from the RFC `RRule`:

- `parser.ts` — RFC `RRULE` string → `Recurrence`
- `mapper.ts` — `Recurrence` ↔ `RRule` conversion
- `constants.ts` — `RecurrenceFrequency` and weekday mappings
- `helpers.ts` — date formatting (inclusive-day `UNTIL` semantics)

**Semantic difference vs RFC:** `Recurrence.until` represents an inclusive calendar day, whereas RFC `UNTIL` is an exact instant. The mapper converts between them — do not bypass it.

When extending the typed API, update both `mapper.ts` and `parser.ts`, add round-trip tests in `test/typedRecurrence.test.ts`, and re-export new symbols from `src/typedRecurrence/index.ts` and `src/index.ts`.

## Agent Workflow

Before reporting any task as complete, run the self-reviewer sub-agent:

1. Use the Task tool to invoke `self-reviewer`.
2. If it returns issues, fix them and invoke it again.
3. Only tell the user "done" after it outputs `APPROVED`.

## Maintenance

> **MCP env vars.** The GitHub MCP server (declared in `.mcp.json` and enabled via `.claude/settings.json`) requires a `GITHUB_PERSONAL_ACCESS_TOKEN` exported in your shell environment. Without it, `mcp__github__*` tools will fail at connect time. Set it once in your shell rc (e.g. `~/.zshrc`).

This Claude context is actively maintained. Update these files in the same PR as the change:

**Update [`.claude/docs/architecture.md`](.claude/docs/architecture.md) when:**

- Adding, removing, or renaming a module under `src/` (especially in `iter/`, `iterinfo/`, `nlp/`, `typedRecurrence/`)
- Changing the iteration pipeline or adding a new DoS guard
- Adjusting `MAX_ADD_ITERATIONS`, `defaultMaxIterations`, or `parseStringConfig.maxLength`
- Finding a static pitfall (HACK/FIXME comments, non-obvious tsconfig/webpack/jest config, env setup issue)

**Update [`.claude/lessons.md`](.claude/lessons.md) when (create the file on first use):**

- Discovering how to test a timezone- or iteration-cap-related edge case in this repo
- Learning a constraint about `DateTime` immutability or iterator semantics that isn't obvious from the code
- Finding a gotcha during implementation that future agents should know about

**Update [`SECURITY.md`](SECURITY.md) when:**

- Adding, removing, or changing any DoS guard, cap, or hardening behavior
- Changing the default value of `parseStringConfig.maxLength`, `IterResult.defaultMaxIterations`, or `MAX_ADD_ITERATIONS`

**Update this file (CLAUDE.md) when:**

- Scripts change in `package.json` (`build`, `test`, `lint`, `format`, etc.)
- CI workflow changes (Node matrix, TZ matrix, new gate)
- Public API surface changes in `src/index.ts`
- Tech stack version bumps (Node, TypeScript, Jest, Webpack)
- New coding conventions are established that aren't captured by `.eslintrc.js` / `.prettierrc.json`

Do not wait for a scheduled review — update these files as you change the code.
