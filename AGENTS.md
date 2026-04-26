## Project Workflow

- Multi-agent mode is allowed when it materially speeds up the task without reducing quality.
- Before starting parallel work, split the task into non-overlapping blocks and state which agent handles which block.
- Never assign the same file to multiple agents.
- Never edit shared helpers, services, i18n utilities, or shared components in parallel if there is any risk of overlap.
- If there is a conflict risk, process that area sequentially.
- After each completed block, report:
  - which services or areas were checked
  - which files were changed
  - whether translation/localization fixes were needed
  - `rg` and `eslint` status for changed files
  - any pre-existing warnings or errors not caused by the current changes

## Multi-Agent Rules

- Use multiple agents only when it materially speeds up the task without reducing quality.
- Before starting parallel work, show a short breakdown: which agent handles which block of files.
- Never assign the same file to two agents.
- Never assign overlapping logical areas to different agents.
- If there's a conflict risk, do not parallelize — handle sequentially.
- Do not use background tasks unless necessary; keep all work manageable and visible.

## Change Rules

- Each agent modifies only its assigned files.
- Never touch unrelated files.
- Never rewrite files already changed by another agent.
- If a conflict is detected, stop and report it explicitly.
- Never revert user or external changes without explicit instruction.
- When adding content, check localization: ensure all text is translated.

## Reporting Requirements

After each completed block, provide a summary:
- **Block / Zone**: which area was worked on
- **Changed files**: list of modified files
- **Result**: brief description of what was done
- **Checks status**: `rg`, `eslint`, tests, build — as applicable
- **Remaining / Risks**: what's left or where issues may exist

## Logging

- Log every user request in `PROMPT_LOG.md` with date and time.
- Do not skip short messages like "давай", "продолжай", "проверь".

## Memory Management

- Maintain `MEMORY.md` structured by topics, not chronology.
- Remove outdated, incorrect, or irrelevant data.
- Do not duplicate the same facts.
- Record only stable, useful context: decisions, constraints, found issues, remaining tasks, workflow agreements.

## iOS Migration Tracking

- If changes affect iOS or general mobile platform behavior, log in `Docs/IOS_CHANGES_FOR_MIGRATION.md`.
- Include: date, changed files, what was → what became, short code snippets.
- Do not log local text-only changes that don't affect iOS behavior, platform logic, builds, navigation, native integrations, or shared mobile functionality.

## Large Task Workflow

- Show a block breakdown plan first.
- Execute block by block.
- After each block: show a summary.
- After all blocks: provide a final overall status.

## Linter / Test Warnings

- If linter, tests, or build show pre-existing unrelated errors, explicitly mark them as existing before current changes.

## General Principle

Work carefully, with minimal changes, control overlaps between agents, and provide clear intermediate status after each block.

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills
- fullstack-go-react-native: Professional full-stack Go backend + React Native mobile developer playbook covering architecture, API design, testing, observability, and release guidance whenever the work spans both Go services and React Native clients. (file: /Users/mamu/.codex/skills/fullstack-go-react-native/SKILL.md)
- nextjs-react-expert: React and Next.js performance optimization from Vercel Engineering. Use when building React components, optimizing performance, eliminating waterfalls, reducing bundle size, reviewing code for performance issues, or implementing server/client-side optimizations. (file: /Users/mamu/.codex/skills/nextjs-react-expert/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/mamu/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/mamu/.codex/skills/.system/skill-installer/SKILL.md)

### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
