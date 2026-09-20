// End to end: a real MCP client over streamable HTTP against the running
// mcp-server container, which calls the real APIs through nginx. Needs a live
// stack: docker compose --profile api --profile mcp up -d --build
// Run with: npm run test:e2e
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const mcpUrl = process.env.MCP_URL ?? 'http://localhost:9998/mcp';
const missingId = '00000000-0000-0000-0000-000000000000';

let client;
/** Ids created by this run, so the database is left as it was found. */
const created = new Set();
let idsBefore = [];

before(async () => {
  client = new Client({ name: 'reminders-mcp-e2e', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl)));
  idsBefore = (await call('reminders_list')).json.map(reminder => reminder.id).sort();
});

after(async () => {
  for (const id of created) {
    await call('reminders_delete', { id });
  }
  const idsAfter = (await call('reminders_list')).json.map(reminder => reminder.id).sort();
  await client.close();
  assert.deepEqual(idsAfter, idsBefore, 'the run must leave no reminder behind');
});

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.[0]?.text ?? '';
  const isError = result.isError === true;
  return { isError, text, json: isError || !text ? undefined : JSON.parse(text) };
}

test('the server advertises the five CRUD tools', async () => {
  const names = (await client.listTools()).tools.map(tool => tool.name).sort();
  assert.deepEqual(names, ['reminders_create', 'reminders_delete', 'reminders_get', 'reminders_list', 'reminders_update']);
});

test('full CRUD against the live APIs', async () => {
  const create = await call('reminders_create', {
    title: 'MCP e2e',
    description: 'Created by the MCP end to end test',
    limitDate: '2030-01-15'
  });
  assert.equal(create.isError, false, create.text);
  const id = create.json.id;
  created.add(id);
  assert.equal(create.json.limitDate, '2030-01-15T00:00:00Z', 'a date only value is stored as midnight UTC');

  const fetched = await call('reminders_get', { id });
  assert.equal(fetched.json.title, 'MCP e2e');
  assert.equal(fetched.json.isDone, false);

  const listed = await call('reminders_list');
  assert.ok(listed.json.some(reminder => reminder.id === id), 'the new reminder must appear in the list');

  const updated = await call('reminders_update', { id, isDone: true });
  assert.equal(updated.isError, false, updated.text);
  assert.equal(updated.json.isDone, true);
  assert.equal(updated.json.title, 'MCP e2e', 'fields not given keep their current value');
  assert.equal(updated.json.description, 'Created by the MCP end to end test');

  const deleted = await call('reminders_delete', { id });
  assert.deepEqual(deleted.json, { deleted: id });
  created.delete(id);

  const gone = await call('reminders_list');
  assert.equal(gone.json.some(reminder => reminder.id === id), false, 'the deleted reminder must be gone');
});

test('a missing reminder comes back as a readable 404 tool error', async () => {
  const result = await call('reminders_get', { id: missingId });
  assert.equal(result.isError, true);
  assert.match(result.text, /404/);
});

test('a past limit date comes back as a readable 400 tool error', async () => {
  const result = await call('reminders_create', {
    title: 'MCP e2e past date',
    description: 'Must be rejected',
    limitDate: '2020-01-01'
  });
  assert.equal(result.isError, true);
  assert.match(result.text, /400/);
  assert.match(result.text, /limitDate/);
});
