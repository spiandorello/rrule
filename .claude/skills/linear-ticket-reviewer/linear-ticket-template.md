## Context
(What problem does this solve, or what capability does this add?) 
- Product/user perspective
- If bug: user-facing behavior that's broken + Sentry link / error trace

## Feature Flags
(List flags involved. For each: name, new or existing, what it gates, default state)
- FLAG_NAME (new) — gates [behavior]. Default: off.
- FLAG_NAME (existing) — check that [behavior] is gated correctly.

## Requirements
(Non-negotiable constraints the solution must satisfy)

- [ ] Must not affect [X behavior / user group]
- [ ] [Accessibility / performance / legal constraint if any]

## Expected Behavior

- When [condition]: [exact outcome]
- When [condition]: [exact outcome]
- When flag is OFF: [existing behavior is preserved]

## Definition of Done
- [ ] Tests written before implementation (TDD)
- [ ] [Specific scenario from Expected Behavior above has a passing test]
- [ ] Flag-off path has a passing test
- [ ] E2E test covers [critical flow name] if this touches it

## Blocked by / Blocks
(optional)
- Blocked by: #[ticket]
- Blocks: #[ticket]

## How to test
What mock data to use
A flow on how to test the feature/recreate the bug/etc..
All details needed for someone to ensure this ticket is 100% complete
