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

### Claude Code

HTTP, with the compose service running:

```bash
claude mcp add --transport http reminders http://localhost:9998/mcp
```

stdio, with the stack running and the project built:

```bash
claude mcp add reminders \
  --env API_BASE_URL=http://localhost:9999 \
  -- node /absolute/path/to/src/server/services/nodejs/reminders-mcp-server/dist/src/index.js
```

### Claude Desktop and other stdio clients

In `claude_desktop_config.json`:

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

Any client that speaks streamable HTTP points at `http://localhost:9998/mcp`
instead.

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
