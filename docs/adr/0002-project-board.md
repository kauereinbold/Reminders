# ADR-0002: GitHub Project board as execution view of the backlog

- **Status**: accepted
- **Date**: 2026-07-26

## Context

GitHub Issues holds the backlog (ADR-0001), but with 40+ open issues across audit, redesign, and learning initiatives, labels alone do not show what is prioritized, in flight, or next. Multiple agents work in parallel and need a shared, current picture of execution state.

## Decision

- GitHub Project 7 ("Reminders") is the single execution board for `kauereinbold/Reminders`.
- Status columns: Backlog (not prioritized), Todo (prioritized, ready), In Progress (claimed), Done (closed).
- Extra single-select fields: Priority (P0/P1/P2) and Initiative (audit/redesign/learning), mirroring initiative labels.
- Built-in project workflows are enabled (auto-add on open, Done on close, Todo on reopen), but they are best effort, not a guarantee: issues opened through the API or `gh issue create` are regularly missed, and closed issues regularly stay in their old column (#332, #233, #439).
- Board state is therefore maintained by hand and the automation is treated as a convenience: agents move their item to In Progress when claiming an issue, set Priority/Initiative when triaging, and set Done after a close or merge, reading the item back to confirm.
- The gap is not fixable from this repository: the built-in workflows live in Project 7's settings, which no pull request can change, and an Actions workflow writing to a user-owned Projects v2 board cannot use `GITHUB_TOKEN`. It would need a personal access token with project scope stored as a repository secret, which only the maintainer can create.

## Consequences

- Easier: at-a-glance execution state for humans and agents; prioritization separate from labels.
- Harder: one more surface to keep honest; stale In Progress items need periodic sweep; board hygiene is manual work at the end of every issue.
- Watch: board and labels drifting apart on initiative; labels stay the source of truth for taxonomy.
