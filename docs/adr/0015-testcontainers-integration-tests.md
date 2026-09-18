# ADR-0015: Integration tests host the API in-process on a Testcontainers Postgres

- **Status**: accepted
- **Date**: 2026-09-17
- **Issue**: #305

## Context

`Reminders.Api.Test` talked to an API the developer had to start by hand, at the
URL configured in the test project's own `appsettings.json`, against whatever
database that API happened to point at. Nothing in CI could satisfy those
preconditions, so the integration suite never ran on a pull request and could
rot unnoticed.

Constraints: the suite must run unattended on a GitHub runner, must not depend
on the Docker Compose stack, and must not require Ganache, since blockchain
writes are a side path these tests do not assert on.

## Options considered

### Option 1: Boot the compose stack in CI

Run `docker compose --profile api up` in the workflow and point the tests at
Nginx. Buys realism: the same containers as local development. Costs: slow, and
the test suite stays coupled to compose files, env files and a deployed
contract address.

### Option 2: A Postgres service container in the workflow

GitHub Actions `services:` block for Postgres, API started as a background
process in the job. Buys a small workflow change. Costs: the suite still cannot
be run the same way locally, and the API process lifecycle has to be managed by
shell in YAML.

### Option 3: In-process host plus Testcontainers Postgres

`WebApplicationFactory<Program>` hosts the API in the test process;
`Testcontainers.PostgreSql` starts a throwaway database per run. Buys one
command that behaves identically locally and in CI. Costs: two test-only
dependencies, and a `public partial class Program` marker in the API. The test
project's net package count still falls: the three
`Microsoft.Extensions.Configuration.*` packages that existed only to read the
old `appsettings.json` go away with it.

## Decision

Option 3. `dotnet test src/test/server/dotnet/Reminders.Api.Test/` is the whole
procedure: the assembly fixture starts a `postgres:16-alpine` container, points
the in-process API at it, applies the Postgres migration set, and disposes both
at the end. The blockchain service is replaced by a no-op test double, because
these tests assert on the database path and the real chain writes are already
best effort in production code.

Migrations are applied by the fixture rather than by the API, which keeps
ADR-0004 intact: the API still does not migrate. Both providers' migrations ship
in one assembly, and EF applies every migration whose id sorts at or below the
target, so selecting the last `.Postgres.` id is not on its own enough. The
fixture also stamps any non-Postgres migration that sorts below that target into
the history table as already applied, so the Postgres set is the only thing that
can run whatever the id ordering. Only migrations below the target are stamped,
because EF reverts applied migrations that sort above it.

The suite is wired into `dotnet - build - pull request` as a step alongside the
unit test step, so it gates every .NET pull request.

## Consequences

Easier: the integration suite is now a real gate, and a contributor can run it
with no stack, no `.env` and no manual API process.

Harder: the suite needs a Docker daemon, so it fails on a machine without one
rather than being skippable. Run time is about a minute, most of it container
startup and migrations.

Watch out for: the fixture duplicates the migrations runner's namespace filter,
so a change to how provider migrations are laid out has to be reflected in both
places. The runner still has the plain filter without the history stamping, so
it keeps the id-ordering hazard this fixture now guards against. That is
production code outside this change and needs its own issue.
