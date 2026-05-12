---
name: linear-ticket-reviewer
description: Review and improve Linear ticket descriptions against the team template. Triggered when the user provides a Linear ticket URL, mentions reviewing or improving a Linear ticket, wants to fill in ticket sections, or asks to update a ticket description. Use this skill to fetch tickets via Linear MCP, compare against the template, interview the user to fill gaps, save a local copy, and update the ticket in Linear while preserving the original description as a comment.
allowed-tools: Read, Write, mcp__linear-server__get_issue, mcp__linear-server__save_issue, mcp__linear-server__save_comment, AskUserQuestion
---

# Linear Ticket Reviewer

## Purpose

Ensure Linear tickets are well-structured for agent-driven development by comparing them against the team's standard template. Gaps are filled via interactive Q&A with the user, then the ticket is updated in Linear with the old description preserved as a comment.

## Trigger Examples

- "Review this Linear ticket: https://linear.app/..."
- "Can you check this ticket and fill in the missing sections?"
- "Improve the description on COMM-42"
- "This ticket needs to be better written for agents"

## Workflow

### Step 1: Parse the Ticket ID from the URL

Extract the ticket identifier from the Linear URL or a bare identifier like `COMM-42`.

URL format: `https://linear.app/{org}/issue/{IDENTIFIER}/...`

### Step 2: Fetch the Ticket

Use `mcp__linear-server__get_issue` with the extracted identifier.

Capture:

- `id` (internal UUID, needed for updates)
- `identifier` (e.g. `COMM-42`, used for filenames)
- `title`
- `description` (may be empty or partial)

### Step 3: Load the Template

Read the template from:

```
./linear-ticket-template.md
```

The template sections are:

- **Context** — problem/capability, product perspective, Sentry link if bug
- **Feature Flags** — flags involved, new vs existing, defaults
- **Requirements** — non-negotiable constraints as checkboxes
- **Expected Behavior** — when/then statements including flag-off path
- **Definition of Done** — DoD checkboxes including tests, E2E
- **Blocked by / Blocks** — optional dependencies
- **How to test** — mock data, repro steps, verification flow

### Step 4: Detect UI Changes

Before evaluating sections, check whether the ticket involves any UI changes (new screens, updated components, layout changes, visual behavior, etc.). Do this by scanning the title and description for keywords like: UI, screen, component, layout, design, view, page, modal, button, form, Figma.

If the ticket involves UI changes:

- Check whether the description already contains a Figma link (look for `figma.com`)
- If no Figma link is present, **immediately ask the user** for it before proceeding with the rest of the review
- Once provided, record it in the **Context** section under a `Figma:` line
- If the user confirms there is no Figma file (e.g. backend-only change mislabeled), note `Figma: N/A — no UI changes` in Context

Do not skip this check. A UI ticket without a Figma link is always incomplete.

### Step 5: Evaluate the Existing Description

Compare the current description against the template. For each section, determine:

| Status  | Meaning                                          |
| ------- | ------------------------------------------------ |
| PRESENT | Section exists with meaningful content           |
| MISSING | Section is absent entirely                       |
| THIN    | Section exists but is too vague to be actionable |

A section is "actionable" if an engineer (or agent) could implement or verify that part of the ticket without needing to ask questions.

### Step 6: Interview the User to Fill Gaps

For each MISSING or THIN section, ask targeted questions. Use `AskUserQuestion` for structured choices where appropriate, or ask open-ended follow-up questions in plain text.

**Guidelines for the interview:**

- Group related questions together — don't ask one section at a time in isolation
- If Context is missing, ask first — it informs all other sections
- For bugs: always ask for a Sentry link or error trace
- For Features: ask if any feature flags are involved
- Keep questions concrete: "What should happen when X?" not "Describe expected behavior"
- If the user says "not applicable" for a section (e.g. no feature flags), note that explicitly in the output
- Do not ask for sections already PRESENT with good content

**Sample questions by section:**

_Context:_

- "What problem does this solve from the user's perspective?"
- "Is this a bug or a new capability?"
- "Do you have a Sentry link or error trace?"

_Feature Flags:_

- "Does this involve any feature flags?"
- "Is this a new flag or an existing one? What does it gate? What's the default state?"

_Requirements:_

- "Are there any hard constraints — things that must not break or must be preserved?"

_Expected Behavior:_

- "Walk me through the key when/then scenarios."
- "What's the behavior when the flag is OFF (if applicable)?"

_Definition of Done:_

- "What specific tests need to be written? Is there a critical E2E flow this touches?"

_How to test:_

- "What mock data or seed should an engineer use?"
- "What are the exact steps to verify this is done?"

### Step 7: Draft the New Description

Using PRESENT content from the original description plus the user's answers, write a complete description matching the template structure exactly.

Rules:

- Keep all existing content that is already good
- Fill in gaps with the user's answers, formatted to match template style
- Use `- [ ]` checkboxes for Requirements and Definition of Done items
- Use `When [condition]: [outcome]` format for Expected Behavior
- If a section is truly not applicable, write `N/A` with a brief reason
- Do not invent details the user hasn't provided

Show the drafted description to the user and ask for confirmation before proceeding.

### Step 8: Save a Local Copy

Write the final description to:

```
.claude/docs/linear-{identifier}.md
```

Example: `.claude/docs/linear-COMM-42.md`

File format:

```markdown
# {Title}

**Linear ID:** {identifier}
**Reviewed:** {today's date}

{full description content}
```

### Step 9: Preserve the Old Description as a Comment

Before overwriting, use `mcp__linear-server__save_comment` to post the original description as a comment on the ticket:

```
**[Archived description — pre-review]**

{original description content, or "(empty)" if blank}
```

### Step 10: Update the Ticket in Linear

Use `mcp__linear-server__save_issue` with:

- `id`: the internal UUID from Step 2
- `description`: the new reviewed description

Confirm to the user that the ticket has been updated and provide the local file path.

## Error Handling

- If the ticket has no description at all, skip Steps 3-5 evaluation and go straight to Step 6 (interview) — treat all sections as MISSING
- If the user skips a question or says a section isn't applicable, note it explicitly rather than leaving it blank
- If `save_issue` fails, do NOT lose the drafted content — it is already saved locally in Step 8

## Output Summary

At the end, tell the user:

1. Which sections were already good (PRESENT)
2. Which sections were filled in
3. The local file path where the description is saved
4. Confirmation that the old description was preserved as a comment
5. Confirmation that the Linear ticket was updated
