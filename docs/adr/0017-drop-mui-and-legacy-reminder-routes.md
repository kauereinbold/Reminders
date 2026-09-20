# ADR-0017: Drop MUI and the legacy reminder routes

- **Status**: accepted
- **Date**: 2026-09-20
- **Issue**: #332 (parent #322)

## Context

ADR-0013 moved create, edit and delete onto overlays on the reminders list and
left the old routes in place so trunk kept working through the redesign: the
app shipped two rendering paths for the same form. The old path,
`/reminder/create` and `/reminder/edit` with `ReminderForm`, `AlertError` and
the reminder context, was the only remaining user of Material UI. Nothing in
the app linked to those routes any more: the list opens `ReminderSheet`
instead.

MUI plus its Emotion peers is roughly 500 packages of lockfile for four
components on two unreachable pages, and its styling has to be overridden to
match the design tokens in `globals.css`. ADR-0013 named the removal as this
issue's work.

## Options considered

### Option 1: Keep the routes, restyle them without MUI

Rewrite `ReminderForm` and the two pages in CSS modules. Buys deep links to a
create and edit page. Costs: a second form, a second set of validation and
error handling, and a second set of specs, all duplicating `ReminderSheet`
with no caller.

### Option 2: Delete the routes with MUI

Remove the pages, `ReminderForm`, `AlertError` and the reminder context that
existed only to feed them, and drop `@mui/material`, `@emotion/react`,
`@emotion/styled` and `use-context-selector`. Buys one form, one dependency
tree, one set of specs. Costs: `/reminder/create` and `/reminder/edit` stop
resolving, and the API hooks those pages used (`useReminder`,
`useReminderActions`) go with them.

## Decision

Option 2. The reminders list is the app: create, edit and delete are overlays
on it, and the old routes are deleted rather than restyled. The React app now
has no UI framework, only CSS modules over the tokens in `globals.css`. The
Cypress specs that drove the deleted routes (`reminder-create`,
`reminder-edit`, `reminder-delete`) are replaced by the modal specs, with the
two cases they alone covered, delete server error and dialog accessibility,
moved to `reminder-modal.cy.js`.

Empty states land in the same change: a single `EmptyState` component renders
when the filtered list is empty, with copy per view and a search variant, as
the design handoff specifies.

## Consequences

The production bundle drops MUI and Emotion entirely, and the lockfile loses
around 500 packages. There is one form to keep correct instead of two.

`/reminder/create` and `/reminder/edit` are gone, so any bookmark or external
link to them 404s. The reminder context and `ValidationService`'s client-side
form validation no longer run in the UI: validation is the API's answer,
rendered by the sheet, which is the contract ADR-0011 already defines.
`ValidationService` stays because the mock API in ADR-0012 uses it.

Focus management stays the repo's own, as ADR-0013 noted: there is no MUI
`Modal` to fall back on, and a full tab trap is still unwritten.
