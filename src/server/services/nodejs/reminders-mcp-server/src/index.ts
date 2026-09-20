#!/usr/bin/env node
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { RemindersApi } from './api.js';
import { createServer } from './server.js';

const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:9999').replace(/\/+$/, '');
const transport = process.env.MCP_TRANSPORT ?? 'stdio';
const port = Number(process.env.MCP_PORT ?? 9998);
const api = new RemindersApi(apiBaseUrl);

// Logs go to stderr: stdout is the stdio transport channel.
const log = (message: string) => console.error(`reminders-mcp-server: ${message}`);

if (transport === 'http') {
  await startHttp();
} else {
  await createServer(api).connect(new StdioServerTransport());
  log(`ready on stdio, API at ${apiBaseUrl}`);
}

async function startHttp() {
  createHttpServer(handleHttpRequest).listen(port, () => log(`ready on http://0.0.0.0:${port}/mcp, API at ${apiBaseUrl}`));
}

async function handleHttpRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.url?.startsWith('/health')) {
    response.writeHead(200, { 'content-type': 'text/plain' }).end('Healthy');
    return;
  }

  // Stateless: one server and one transport per request, so no session store is needed.
  const server = createServer(api);
  const httpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  response.on('close', () => {
    void httpTransport.close();
    void server.close();
  });

  try {
    await server.connect(httpTransport);
    await httpTransport.handleRequest(request, response);
  } catch (error) {
    log(`request failed: ${error instanceof Error ? error.message : String(error)}`);
    if (!response.headersSent) response.writeHead(500, { 'content-type': 'application/json' });
    if (!response.writableEnded) response.end(JSON.stringify({ title: 'MCP request failed', status: 500 }));
  }
}
