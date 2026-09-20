# Pull request review guidelines

How any agent reviews a pull request in this repository: Claude, Copilot, Codex,
or a human using one of them. The CI review workflow reads this file, and so
should a locally triggered review, so the same diff gets the same treatment
either way.

Plain Markdown on purpose. No tool-specific syntax, so every assistant can load
it directly.

## Before reviewing

1. Read `CLAUDE.md` and `AGENTS.md`. They define the standards reviewed against.
2. Read the earlier review comments on the pull request. Do not repeat a finding
   already raised; do check whether earlier findings were addressed.
3. Apply the repository skills in `.claude/skills/`: caveman for the wording of
   every comment, ponytail as a review lens (unneeded code, a new dependency
   where the standard library works, an abstraction with one caller, unrelated
   changes bundled together are all findings).

Do one complete pass over the whole checklist below. Do not spread findings
across several runs.

## Category sweep

A single pass misses whole classes of defect unless they are enumerated, so
walk this list explicitly before reporting, on top of the checklist below:

- Dead exports, helpers, or assets left behind by a deletion in the diff.
- Documentation (README, AGENTS.md, ADRs, PRDs) still referencing symbols,
  files, routes, or commands the diff removed or renamed.
- Cypress spec drift: a React UI or API contract change with no matching spec
  update, or a new user-facing flow with no spec.
- A schema change with a migration for only one provider (Postgres and
  SqlServer both need one).
- A missing ADR for an architecture, workflow, or tooling decision.
- Local machine details published to GitHub: an absolute path (`/home/...`),
  a machine username, or a PID in the diff, the pull request body, or a commit
  message. This repository is public and `gh` posts as the maintainer.

## What to review

- **Correctness**: bugs, unhandled errors, broken contracts between the .NET, Go
  and C++ APIs and the React, MVC and Flutter clients.
- **Security**: secrets in code or compose files, injection, XSS, unsafe
  defaults, local machine details (absolute paths, username, PIDs) published
  anywhere a reader can see them.
- **Repo rules**: conventional pull request title, minimal change (no new
  dependency without need), migrations for both Postgres and SqlServer on schema
  changes, Cypress specs updated for React UI or API contract changes, an ADR
  present for an architecture or tooling decision.
- **Tests**: new behaviour covered, existing suites still meaningful.

## How to report

- Findings go in pull request comments, nowhere else. Tag each with a severity
  prefix: `[blocker]` (must fix before merge), `[major]` (likely bug or rule
  violation), `[minor]` (worth fixing, not blocking), `[nit]` (style or taste).
- Inline comments for `[blocker]` and `[major]` only, where the host supports
  them. `[minor]` and `[nit]` go in the summary, at most five of them; when
  more were found, end the summary with a count of the ones left out rather
  than listing them.
- Every finding cites evidence as `file:line` (a range for a block). A finding
  that cannot point at a line is not reported.
- Exactly one summary comment, grouped by severity. With no findings the whole
  comment is the line `No findings.`
- Report outcomes, not process. Never list the categories or rules that came
  back clean, never cite a repository document as the reason a finding stands,
  and never add a readiness, sign-off, or next-step line. State the defect and
  stop.
- Caveman wording: one line per finding, `file:line: problem. fix.`, no
  throat-clearing, no restating the diff. Full sentences only for a security
  finding or a design disagreement that needs the why.

## Re-reviews

The first review of a pull request is the broad one. On every later run over
the same pull request:

- Report `[blocker]` and `[major]` findings only, plus whether earlier findings
  were addressed. Suppress new `[minor]` and `[nit]` findings.
- Raise a new finding only for code the later pushes changed, or for something
  the first review got wrong.

## Skip rules

Do not report what something else already enforces or owns:

- Anything CI enforces: linting, formatting, type errors, failing tests. The
  check is the report.
- Generated files, lockfiles, and vendored code.
- Pre-existing code the diff does not touch.

## Limits

Never approve, request changes, or merge: humans decide (ADR-0008). Never push
commits. Never comment on style a linter already enforces.
