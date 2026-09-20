# PRD-0001: MCP server for the Reminders API

- **Status**: active
- **Date**: 2026-09-20
- **Discussion**: none, scope agreed on issue #233

## Problem

The Reminders API is reachable from the web app, the MVC app and the Flutter
app, all of which need a person clicking through a form. An AI assistant that
the maintainer already uses daily cannot touch reminders at all: it would have
to be handed the base URL, the field names and the error contract in a prompt,
and it would still be guessing at the shape of a request. The project also has
no demonstration of the Model Context Protocol, which is now the standard way a
service exposes itself to assistants.

## Users

- **The maintainer**, asking an assistant to list what is overdue, add a
  reminder from a sentence, or mark one done, without leaving the assistant.
- **Any MCP capable client** (Claude Code, Claude Desktop, other assistants)
  pointed at a local or hosted stack.
- **Reviewers of the portfolio**, who see the API exposed through a standard
  protocol rather than a bespoke integration.

## Success criteria

- An MCP client connected to the server performs a full create, read, list,
  update and delete cycle against the running stack, with no direct HTTP call.
- Every tool call goes through the nginx load balancer, so all three API
  implementations serve MCP traffic unchanged.
- An API failure reaches the assistant as a readable message carrying the status
  and the field errors from the problem details body, not a stack trace.
- Connecting a client takes one documented config block and no code change.

## Scope

- A new service at `src/server/services/nodejs/reminders-mcp-server/`,
  TypeScript on the official `@modelcontextprotocol/sdk`.
- Five tools: `reminders_list`, `reminders_get`, `reminders_create`,
  `reminders_update`, `reminders_delete`.
- Two transports from one build: stdio for a client that launches the process,
  streamable HTTP for the container.
- A compose service behind its own profile, talking to
  `http://reminders-nginx:9999`.
- Tests: the API client against a stub HTTP server, and the tools end to end
  over an in memory MCP transport.
- A README with the client config for stdio and for HTTP.

## Non-goals

- **Blockchain tools.** The REST API exposes no blockchain endpoint today, so a
  blockchain tool would mean new API surface, not new MCP surface. Out of scope
  until the API has one.
- **Authentication.** The Reminders API has none, and inventing an auth model
  only for the MCP hop would protect nothing. The HTTP transport is a local
  stack service, not a public endpoint.
- **Resources and prompts.** Tools alone satisfy the acceptance criterion.
- **Hosting.** The server ships as a compose service for the local stack, not as
  a deployed endpoint.

## Links

- Parent issue: #233
- ADRs: ADR-0016
- Release: pending

## Validation

Empty until shipped.
