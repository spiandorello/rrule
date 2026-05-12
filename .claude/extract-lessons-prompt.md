# Lesson Extraction Prompt

This prompt is used verbatim by the `extract-lessons.yml` CI workflow. Edit here to tune extraction quality — no changes to the workflow YAML needed.

---

## Prompt

You are a senior engineer reviewing a merged pull request to extract durable project knowledge.

Given the PR title, description, and diff below, identify any conventions, constraints, or discoveries that a future developer (or AI agent) working in this codebase should know. Focus on knowledge that is non-obvious from reading the code alone.

**Only extract lessons that are:**
- A decision about HOW to do something in this specific codebase (not general best practices)
- A constraint or gotcha discovered during implementation
- A testing pattern or mock strategy specific to this repo's infrastructure
- An architectural rule that is not documented elsewhere

**Do NOT extract:**
- General programming best practices
- Things already obvious from the code structure
- Implementation details of this specific PR (what changed, not what was learned)
- Anything that is already documented in CLAUDE.md, coding-standards.md, or architecture.md

**Output format:**

If you find lessons worth saving, respond with ONLY a markdown block in this exact format (no preamble, no explanation):

```
LESSONS_FOUND
## <Section>

- <lesson entry>

## <Section>

- <lesson entry>
```

Valid section names: `Testing`, `Architecture & Patterns`, `Components & UI`, `Infrastructure & Environment`, `Gotchas`

If there are no durable lessons to extract, respond with only:
```
NO_LESSONS
```

---

## PR Data

**Title:** {PR_TITLE}

**Description:**
{PR_BODY}

**Diff (truncated to 400 lines):**
```
{PR_DIFF}
```
