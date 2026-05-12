# /workflow

Orchestrate end-to-end ticket implementation by coordinating specialized sub-agents. The workflow itself does NOT write code, run tests, or execute shell commands — it plans, delegates, and decides.

---

## Role of this orchestrator

- Pull context, form a plan, make decisions
- Delegate all code writing to an `implementation` sub-agent
- Delegate all test execution to a `test-runner` sub-agent
- Delegate all reviews to `self-reviewer` and `code-reviewer` sub-agents
- Synthesize results, decide next steps, and loop until done

---

## Steps

1. **Get ticket context.** Pull issue details from Linear based on user input (ticket URL or ID).
   - In parallel, launch a sub-agent using the `linear-ticket-reviewer` skill to review and improve the ticket description. Wait for it to complete before moving to step 2.

2. Form a structured implementation plan based on the ticket description and acceptance criteria.
   - Use a Test Driven Development approach: plan which tests to write first (failing), then which implementation code to make them pass, and in what order.
   - For this library, explicitly call out:
     - Which DoS invariants in [`SECURITY.md`](../../SECURITY.md) are touched (`parseStringConfig.maxLength`, `IterResult.defaultMaxIterations`, `DateTime.MAX_ADD_ITERATIONS`, BYSETPOS cap, INTERVAL validation, TZID cache).
     - Whether the change crosses parser, iterator, options, cache, or typed Recurrence boundaries (CLAUDE.md -> Architecture table).
     - Whether public API surface in `src/index.ts` changes (re-export coverage, JSDoc, RFC differences in README).
   - The plan is the orchestrator's output for this step — no code is written here.

3. **Pattern finder:** Launch a `pattern-finder` sub-agent with the implementation plan from step 2 and the anchor paths (files/directories that will be touched). It returns concrete code examples from the repo for the implementation sub-agent to copy patterns from. This is high-leverage here because the library has canonical references for each layer (parser arms, BY* masks, typed errors, TZID cache, Recurrence mapper).

4. **Create a worktree for the branch.**
   - Determine the target branch name: `claude/<ticket-id>`.
   - If a branch with that name already exists, ask the user whether to reuse it or create a new one with a suffix (e.g. `claude/<ticket-id>-2`).
   - Determine the worktree path: `.worktrees/claude/<ticket-id>` relative to the repo root (use the same suffix if one was chosen above).
   - If a worktree already exists at that path, reuse it (no need to recreate).
   - Otherwise, create the worktree:
     - If creating a new branch: `git worktree add <worktree-path> -b <branch-name> <default-branch>`
     - If reusing an existing branch: `git worktree add <worktree-path> <branch-name>`
   - All subsequent steps operate inside `<worktree-path>`. Pass this path explicitly to every sub-agent.

5. **Delegate implementation to a sub-agent.** Launch an `implementation` sub-agent with:
   - The full implementation plan from step 2 (including test-first order)
   - The pattern-finder output from step 3
   - The **absolute path to the worktree directory** as its working directory
   - Explicit instruction: write the failing tests first (in `test/<name>.test.ts`, not co-located with `src/`), then the implementation, following the plan
   - Instruction to NOT run tests, lint, build, or format itself — just write the code and report back which files were changed and which test files exist

   Wait for the sub-agent to return a summary of what was written before continuing.

6. **Delegate test execution to a sub-agent.** Launch a `test-runner` sub-agent with:
   - The **absolute worktree path** as its working directory
   - The list of changed files returned from step 5
   - Test scoping rules:
     - Single test file: `yarn jest test/<name>.test.ts` (or invoke `npx jest --findRelatedTests <changed-src-files>` for source-scoped runs)
     - Module-scoped changes (e.g. only `src/parsestring.ts` + its test): `yarn jest test/parsestring.test.ts`
     - Cross-cutting changes (parser + iterator, or DoS guards touching multiple modules): full suite `yarn test`
     - TZID-sensitive changes: also run at least one non-UTC TZ locally, e.g. `TZ=America/Los_Angeles yarn test`
     - Coverage / pre-PR validation: `yarn test-ci`
   - Instruction to return a pass/fail result with any failure output

   If tests fail: re-delegate to the implementation sub-agent (with the worktree path) with the failure output and ask it to fix. Then re-run step 6. Iterate until the test-runner reports all relevant tests passing.

7. **Verify changes locally** by delegating to the appropriate sub-agent based on what changed:
   - Pass the **absolute worktree path** as its working directory
   - **Library/API surface changes (no UI, no server):** delegate to a sub-agent to run `yarn build` (which runs `yarn lint && yarn format-check && tsc -b tsconfig.build.json && webpack`), then run a small smoke script in `node` against `dist/esm/index.js` (or `require('./dist/es5/rrule.js')` for UMD) that exercises the changed surface — e.g. construct an `RRule`, call `.all()` / `.between()`, parse via `rrulestr`, or round-trip through the typed `Recurrence` API. Return a table with: input, expected, actual.
   - **DoS-guard changes:** the sub-agent must also confirm the relevant cap still throws the typed error (`RRuleStringTooLargeError`, `RRuleIterationLimitError`) on overflow, using the existing tests in `test/iterresult.test.ts`, `test/parsestring.test.ts`, `test/parseoptions.test.ts`, and `test/datetime.test.ts` as a baseline.
   - **TZID changes:** also smoke-test under at least one non-UTC TZ (`TZ=America/Los_Angeles node -e '...'`).

8. **Delegate code review** to sub-agents in sequence:
   - Launch `self-reviewer` sub-agent (with the worktree path as working directory) to analyze the code changes and return suggested improvements.
   - If improvements are needed: delegate fixes back to the implementation sub-agent (with the worktree path), then re-run the test-runner sub-agent (step 6) to confirm nothing regressed.
   - Launch `code-reviewer` sub-agent (with the worktree path as working directory) to analyze for style, best practices, and potential bugs. Pay special attention to: no `any`, no `console.log`, single quotes / no semicolons, no floating promises, JSDoc on public exports, and that no DoS invariant was weakened.
   - If improvements are needed: same delegation loop as above.
   - Repeat until both reviewers return no blocking issues.

9. Re-run step 7 (with the worktree path) to verify the final implementation after review improvements. If there are issues, loop back through steps 6-8.

10. Draft the PR.
    - From within the worktree directory, commit changes in logical chunks with clear messages (using git commit and git push commands — no branch switching needed, the worktree is already on `<branch-name>`)
    - Using gh cli, open a PR following the repo's GitHub template (or use: Summary, Implementation details, Testing details)
    - If a DoS invariant or RFC semantic was touched, link the relevant section of `SECURITY.md` / `CLAUDE.md` and call it out in the Summary
    - Assign the PR to the user

11. Return the PR link in the final output.

12. Launch a sub-agent in the background to monitor CI checks on the PR.
    - Pass the **absolute worktree path** so any fixes are applied in the correct working tree.
    - The CI matrix runs Node `14.x`/`16.x`/`18.x` and four LANG/TZ combos — failures in only one TZ are usually timezone-cache or DST related; surface them clearly.
    - Address any issues that come up in CI by delegating fixes to the implementation sub-agent (with the worktree path).
    - Notify the user about every change before making it, and get confirmation first.
