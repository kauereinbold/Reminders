# ADR-0016: MCP server as a Node.js service over the load balancer

- **Status**: accepted
- **Date**: 2026-09-20
- **Issue**: #233

## Context

PRD-0001 asks for the Reminders API to be reachable by AI assistants through the
Model Context Protocol. Three constraints shape how it is built:

- Three API implementations sit behind nginx (ADR-0003) and share one REST
  contract with RFC 7807 errors (ADR-0011). Whatever exposes MCP must not care
  which backend answers.
- MCP clients come in two shapes: a desktop client that launches a process and
  speaks stdio, and a container or remote client that speaks HTTP.
- The repository already runs every service in compose behind a profile, and
  trunk must stay deployable, so a new service cannot join the `all` or `api`
  profile without being load bearing.

## Options considered

### Option 1: MCP endpoint inside the .NET API

Add the protocol to an existing backend. Buys: no new service, no new runtime.
Costs: only one of the three implementations would have it, so the behaviour
would depend on which container a request reached, which ADR-0003 exists to
avoid. The .NET MCP SDK is also younger than the TypeScript one.

### Option 2: Separate Node.js service calling nginx

A thin process that owns no data, maps tools to REST calls, and reaches the API
through `http://reminders-nginx:9999`. Buys: the official and best supported
SDK, all three backends serve MCP traffic unchanged, and the service can be run
locally by a desktop client or in compose. Costs: a fourth language in the
server tree and a second hop for every call.

### Option 3: Separate service, HTTP transport only

Same service, but only the streamable HTTP transport, always in a container.
Buys: one code path. Costs: the common desktop setup (client launches the
binary, stdio) would need a running stack and a URL, which is friction for the
main user of the feature.

## Decision

Option 2, with both transports from one build.

- The service lives at `src/server/services/nodejs/reminders-mcp-server/`,
  TypeScript on `@modelcontextprotocol/sdk`, matching the existing
  `src/server/services/<runtime>/<service>` layout.
- It holds no state and no database access. Every tool is a REST call to
  `API_BASE_URL`, which defaults to `http://reminders-nginx:9999` and is
  `http://localhost:9999` when run outside compose.
- Transport is chosen by `MCP_TRANSPORT`: `stdio` by default, `http` for the
  container, where the SDK's streamable HTTP transport listens on `MCP_PORT`
  (9998 by the compose default, published as 9998). Sessions are stateless, one
  transport per request, so no session store is needed.
- Five tools, named `reminders_<verb>`: `list`, `get`, `create`, `update`,
  `delete`. `reminders_update` reads the reminder first and merges the given
  fields, because the REST `PUT` replaces the whole resource and an assistant
  should be able to say "mark it done" without restating the rest.
- Errors are not thrown at the protocol level. A failed call returns an
  `isError` tool result carrying the status and the `title`, `detail` and
  `errors` of the problem details body, so the assistant can read and act on a
  validation failure.
- The compose service sits behind its own `mcp` profile and depends on nginx.
  Nothing in `all`, `api` or `mvc` changes.
- No secrets: the only configuration is a base URL, a transport name and a port,
  all of them placeholders in `.env.example`.

## Consequences

- Node.js joins the server tree, with its own lint and test story: tests run on
  the `node:test` runner against the compiled output, so the service adds no
  test framework dependency.
- Every MCP call costs two hops (client to server, server to nginx). Acceptable
  for an assistant driven workload and it keeps the backends untouched.
- Adding an API endpoint means adding a tool here to expose it, a second place
  to update. The alternative was having the protocol in one backend only.
- Blockchain tools stay out until the REST API has a blockchain endpoint, so the
  MCP server never talks to a service the API does not already front.
- The HTTP transport binds a port with no authentication. It is a local stack
  service; exposing it beyond localhost would need an auth decision first, and
  that is a new ADR.
