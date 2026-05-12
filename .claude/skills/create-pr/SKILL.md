---
name: create-pr
description: Create or fix a PR for this repo: enforces Linear ticket-prefix title format [TICKET-123] Subject, fills all sections from the Portuguese PR template in .github/PULL_REQUEST_TEMPLATE.md, and inserts a Giphy GIF if a GIF section exists. Triggers: create PR, open pull request, PR description, PR title, edit PR, write PR body, pull request template.
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---

# Create PR

## Purpose

Guide the creation of a well-formed pull request: a valid title and a complete description following the project's PR template.

## When to use

- User says "create a PR", "open a pull request", "write the PR description", "fix the PR title", "edit PR body", or anything about drafting a PR.
- Reviewing an existing PR title or description for correctness before pushing.

## PR Title Format

The only accepted format is the Linear ticket-prefix style. This is **required**.

```
[TEAM-123] Description in sentence case
```

- Ticket prefix is mandatory. If no ticket number is known, ask the user for it before proceeding.
- Description: sentence-case, max 72 chars, no trailing period.

Examples:

```
[CPU-3220] Add skill to rf-monorepo
[MOM-1709] Remove FF MOM_ENABLE_POLL_FEATURE after rollout
[CMA-1929] Rename modules-message folder to message
```

## PR Description Template

Read `.github/PULL_REQUEST_TEMPLATE.md` at runtime using the Read tool. Do not store or duplicate section names here — the template is the source of truth.

When filling the template:

- Populate every section using `git log main..HEAD --oneline` and `git diff main..HEAD` as context.
- If a section contains a GIF prompt (e.g. "Como esse PR faz você se sentir?"), search Giphy for a relevant GIF using Chrome DevTools MCP and insert the direct image URL in the markdown format shown in the template comment: `![](GIF URL)`. Pick something that matches the mood or nature of the change.

## Steps

1. **Gather context** — run `git log main..HEAD --oneline` and `git diff --stat main..HEAD`.
2. **Get ticket number** — check branch name (`git branch --show-current`) for a ticket slug, or ask the user if not found.
3. **Draft the title** — `[TEAM-123] Description`. Validate: sentence-case subject, under 72 chars, no trailing period.
4. **Load the template** — read `.github/PULL_REQUEST_TEMPLATE.md` with the Read tool.
5. **Fill each section** from the diff and commit history. For any GIF section, use WebFetch to find a relevant GIF from Giphy:
   - Call `WebFetch` with `url: "https://giphy.com/search/<url-encoded-search-term>"` and prompt: `"Return only the first direct .gif image URL you find on this page (a URL ending in .gif). Return nothing else."`
   - Embed the extracted URL as `![](GIF URL)` in the GIF section.
6. **Create the PR** using `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"`. Use a HEREDOC to preserve formatting.
7. **Verify** — confirm the PR URL was returned and the title matches `[TEAM-123] ...`.

## Common Mistakes to Catch

- Missing ticket prefix (rejected by CI)
- Subject not in sentence case or has a trailing period
- GIF section left as a placeholder instead of a real GIF
- Leaving all type-of-change checkboxes unchecked
- Forgetting to update the Rollback section when a feature flag is involved
- Using `gh pr create` without a HEREDOC (causes newline loss in the body)
