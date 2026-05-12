---
name: create-skill-or-rule
description: Helps you decide whether to create a skill or a rule (CLAUDE.md / .claude/rules/), then creates the right artifact. Use when adding instructions to a repo, capturing a coding standard, packaging a repeatable workflow, or when unsure whether something belongs in CLAUDE.md, .claude/rules/, or a SKILL.md file. Triggers on phrases like "create a skill", "add a rule", "where should I put this instruction", "should this be a skill or rule", "capture this workflow", "add coding standard", "write a skill", "create a rule file", "add to CLAUDE.md".
---

# Create Skill or Rule

You help the user decide whether their instruction belongs in a **skill**, a **rule**, or **CLAUDE.md** — then create the right artifact.

## Step 1: Understand what the user wants to capture

Ask if they haven't told you:
- What behavior or knowledge do they want to persist?
- Should it apply automatically on every session, or only when explicitly invoked?
- Is it a repeatable task/workflow, or a standing convention?

## Step 2: Explore the codebase for existing context

Before creating anything, scan what already exists:

```
~/.claude/CLAUDE.md              # User-level instructions (all projects)
~/.claude/rules/                 # User-level rules (all projects)
~/.claude/skills/                # User-level skills (all projects)
./.claude/CLAUDE.md              # Project-level main instructions
./.claude/rules/                 # Project-level rules
./.claude/skills/                # Project-level skills
./CLAUDE.md                      # Project root instructions
```

Check whether the instruction or workflow already exists (partially or fully). Point out duplicates or conflicts. Identify the right home based on scope and load behavior.

## Step 3: Apply the decision framework

Use this table to pick the right artifact:

| Question | Skill | Rule / CLAUDE.md |
|---|---|---|
| Should it load on **every session automatically**? | No | Yes |
| Is it a **repeatable workflow** with steps? | Yes | No |
| Is it a **coding standard** or **convention**? | No | Yes |
| Does it have **side effects** (writes files, runs commands)? | Yes | No |
| Should the user **invoke it manually** with `/name`? | Yes | No |
| Is it **project architecture** or domain knowledge? | No | Yes |
| Does it need **arguments** passed at invocation time? | Yes | No |
| Should it only load when **specific files** are open? | Yes (paths frontmatter) | Yes (.claude/rules/ with paths) |
| Is it **too noisy to load every session**? | Yes | No |

**Use a skill when:** The instruction describes a task to perform, workflow to follow, or procedure to execute — something that runs on demand. Examples: `/commit`, `/deploy`, `/explain-code`, `/add-migration`.

**Use a rule when:** The instruction is a standing convention that should silently shape every interaction — coding standards, import ordering, error handling patterns, naming conventions, project architecture facts. Examples: "always use Pino logger, never console.log", "services must not import db directly".

**Use CLAUDE.md when:** The instruction is broad project context — architecture overview, tech stack, key relationships, setup commands, or workflow conventions that apply to the whole project. Think of it as onboarding documentation for Claude.

**Use `.claude/rules/` when:** You want modular rule files, path-scoped rules (only load when working on `src/api/**`), or you want to keep CLAUDE.md lean by splitting rules into topic files.

## Step 4: Create the artifact

### Creating a Skill

**Location options:**
- Personal (all projects): `~/.claude/skills/<name>/SKILL.md`
- Project-only: `.claude/skills/<name>/SKILL.md`

**Template:**
```yaml
---
name: <name>                          # lowercase, hyphens, max 64 chars
description: <what it does and when to use it — include trigger keywords, max 250 chars visible>
disable-model-invocation: true        # add if user should invoke manually (side effects, deploys, etc.)
allowed-tools: Read, Grep, Glob       # restrict tools if appropriate
---

# <Skill Title>

## Purpose
<one-paragraph summary>

## When to use
<specific scenarios>

## Steps / Instructions
<numbered steps or prose Claude follows>
```

**Rules for good skills:**
- Keep SKILL.md under 500 lines. Move reference material to sibling files and link them.
- Front-load the description with trigger keywords — descriptions are truncated at 250 chars in the skill listing.
- Add `disable-model-invocation: true` for workflows with side effects (deploy, send message, commit).
- Add `context: fork` if the skill should run in an isolated subagent.
- Support `$ARGUMENTS` for parameterized invocation (e.g. `/fix-issue 123`).

### Creating a Rule

**Location options:**
- User-level (all projects): `~/.claude/rules/<topic>.md`
- Project-level (all files): `.claude/rules/<topic>.md`
- Project-level (path-scoped): `.claude/rules/<topic>.md` with `paths` frontmatter

**Template — unconditional rule:**
```markdown
# <Topic>

- <specific, verifiable instruction>
- <specific, verifiable instruction>
```

**Template — path-scoped rule:**
```markdown
---
paths:
  - "src/api/**/*.ts"
  - "src/services/**/*.ts"
---

# <Topic>

- <instruction that only applies to these files>
```

**Rules for good rules:**
- Be concrete and verifiable: "Use 2-space indentation" beats "format code nicely".
- One topic per file — `testing.md`, `api-design.md`, `error-handling.md`.
- Use path frontmatter to scope rules that only apply to a subsystem — reduces context noise.
- Keep all rules files short. If a topic exceeds ~50 lines, split it.

### Updating CLAUDE.md

Prefer editing the existing `CLAUDE.md` over creating a new rule file when the instruction is:
- Broad project context (architecture, tech stack, key relationships)
- A setup command or environment requirement
- A workflow convention that applies to all work in the repo

Add to the most specific CLAUDE.md that applies (project-root beats user-level).

## Step 5: Verify placement

After creating the artifact, confirm:
- **Skill**: does the description include the keywords a user would naturally say to trigger it?
- **Rule**: is it specific enough that Claude can verify compliance? (Not "write good code" — "use `unknown` instead of `any`")
- **CLAUDE.md**: is it context Claude needs on every session, not just a one-time workflow?

If the user is uncertain, suggest: start with a rule (zero overhead), and promote it to a skill only if they find themselves wanting to invoke it deliberately or pass arguments to it.

## Quick cheat sheet

```
Always-on convention or standard  → .claude/rules/<topic>.md
Broad project context / onboarding → CLAUDE.md
Repeatable workflow with steps     → .claude/skills/<name>/SKILL.md
Manual /command with side effects  → SKILL.md + disable-model-invocation: true
Path-specific guidance             → .claude/rules/<topic>.md with paths frontmatter
Personal preference across projects → ~/.claude/rules/<topic>.md or ~/.claude/CLAUDE.md
```
