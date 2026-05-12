---
name: rrule-hardening
description: DoS-hardening invariants, RFC 5545 parser strictness, and TZID caching rules for @spiandorello/rrulejs. Load before changing the parser (parseString, parseoptions), iteration engine (iter, iterinfo, datetime, iterresult), DoS guards (RRuleStringTooLargeError, RRuleIterationLimitError, MAX_ADD_ITERATIONS, BYSETPOS cap, INTERVAL validation), TZID cache (datewithzone, dateutil), the typed Recurrence API (typedRecurrence), or any DoS cap. Triggers on rrule, RRule, recurrence, RFC 5545, iCalendar, BYSETPOS, BYDAY, byweekday, UNTIL, RDATE, RRULE, TZID, parseString, parseOptions, IterResult, DateTime, RRuleSet, rrulestr, typed Recurrence, hardening, DoS, iteration limit, OOM.
allowed-tools: Read, Grep, Glob
---

Read the following docs before working on any rrule parser, iterator, DoS-guard, TZID, or typed Recurrence logic:

- .claude/docs/architecture.md
- .claude/docs/coding-standards.md
- SECURITY.md
- CLAUDE.md

Also read for related context:
- README.md (RFC differences, API surface, TZID semantics, typed Recurrence usage)
