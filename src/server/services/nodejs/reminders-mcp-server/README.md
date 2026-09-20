# Reminders MCP Server

Exposes the Reminders API to AI assistants over the Model Context Protocol.
The server holds no state: every tool call is a REST request to the nginx load
balancer, so all three API implementations (.NET, Go, C++) serve MCP traffic.

Decisions: [ADR-0016](../../../../../docs/adr/0016-mcp-server.md). Product
intent: [PRD-0001](../../../../../docs/product/0001-mcp-server.md).

## Tools

| Tool | Arguments | Does |
|---|---|---|
| `reminders_list` | none | Lists every reminder |
| `reminders_get` | `id` | Gets one reminder |
| `reminders_create` | `title`, `description`, `limitDate`, `isDone?` | Creates a reminder. The limit date must be later than today |
| `reminders_update` | `id`, plus any of `title`, `description`, `limitDate`, `isDone` | Reads the reminder, merges the given fields, saves it |
| `reminders_delete` | `id` | Deletes a reminder |

`limitDate` accepts `YYYY-MM-DD` or RFC3339 (see ADR-0011). A failed call comes
back as a tool error carrying the HTTP status and the problem details fields, so
the assistant can read a validation failure and retry.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `API_BASE_URL` | `http://localhost:9999` | Base URL of the API, through nginx |
| `MCP_TRANSPORT` | `stdio` | `stdio` when a client launches the process, `http` for the container |
| `MCP_PORT` | `9998` | Port for the HTTP transport |

No secrets: the server authenticates nothing and stores nothing.

## Run it

The API stack has to be up first:

```bash
docker compose --profile api up -d
```

### In Docker, HTTP transport

```bash
docker compose --profile api --profile mcp up -d --build
curl http://localhost:9998/health   # Healthy
```

The MCP endpoint is `http://localhost:9998/mcp`.

### Locally, stdio transport

```bash
npm install
npm run build
API_BASE_URL=http://localhost:9999 npm start
```

## Connect an AI client

Bring the stack up first: the clients below talk to the container over
streamable HTTP at `http://localhost:9998/mcp`.

```bash
docker compose --profile api --profile mcp up -d --build
```

The repository ships a workspace `.mcp.json` at its root pointing at that URL.
Claude Code and Copilot CLI read it, so cloning the repo is enough for both.
Codex CLI does not read workspace files and needs its own user level config.

### Claude Code

```bash
claude mcp add --transport http reminders http://localhost:9998/mcp
claude mcp list   # reminders: http://localhost:9998/mcp (HTTP) - Connected
```

That writes local project scope to `~/.claude.json`. Use `--scope project` to
write the committed `.mcp.json` instead, which shares the server with anyone who
clones the repo.

### Copilot CLI

```bash
copilot mcp add --transport http reminders http://localhost:9998/mcp
```

Config comes from `~/.copilot/mcp-config.json` for the user, and from
`.mcp.json` or `.github/mcp.json` in the workspace. Interactive runs prompt
before a tool call. A non interactive run has to allow the server explicitly:

```bash
copilot -p 'list my reminders' --allow-tool 'reminders'
```

Without `--allow-tool` the call fails with "Permission denied and could not
request permission from user".

### Codex CLI

```bash
codex mcp add reminders --url http://localhost:9998/mcp
codex mcp list
```

That writes `~/.codex/config.toml` globally. Interactive runs prompt for
approval. A headless `codex exec` run stops with "MCP tool call requires
approval, but approval policy is never", so it needs an approval policy that
permits the call.

### stdio instead of HTTP

Clients that prefer to spawn the process use the stdio transport, which is the
default when `MCP_TRANSPORT` is unset. Build the project first (`npm install &&
npm run build`), keep the api profile running, and point the client at the entry
point:

```bash
claude mcp add reminders \
  --env API_BASE_URL=http://localhost:9999 \
  -- node /absolute/path/to/src/server/services/nodejs/reminders-mcp-server/dist/src/index.js
```

The same shape as a JSON config block, for Claude Desktop and others:

```json
{
  "mcpServers": {
    "reminders": {
      "command": "node",
      "args": ["/absolute/path/to/src/server/services/nodejs/reminders-mcp-server/dist/src/index.js"],
      "env": { "API_BASE_URL": "http://localhost:9999" }
    }
  }
}
```

## Tests

```bash
npm test
```

Builds, then runs the `node:test` suites against the compiled output: the REST
client against a stub API, and the tools over an in memory MCP transport. Fast
and offline, no containers and no test framework dependency.

The end to end suite is separate and needs a live stack:

```bash
docker compose --profile api --profile mcp up -d --build
npm run test:e2e
docker compose --profile api --profile mcp down
```

It drives a real MCP client over streamable HTTP against the `mcp-server`
container, which calls the APIs through nginx: full CRUD plus the 404 and 400
paths. It deletes what it creates and asserts the reminder list is left as it
was found. `MCP_URL` overrides the endpoint, default
`http://localhost:9998/mcp`. CI runs both suites in the MCP Server workflow.
