import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { RemindersApi } from '../src/api.js';
import { createServer } from '../src/server.js';
import { startStubApi } from './stub-api.js';

let stub: Awaited<ReturnType<typeof startStubApi>>;
let client: Client;

before(async () => {
  stub = await startStubApi();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([createServer(new RemindersApi(stub.url)).connect(serverTransport), client.connect(clientTransport)]);
});

after(async () => {
  await client.close();
  await stub.close();
});

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
  const isError = result.isError === true;
  return { isError, text, json: isError || !text ? undefined : JSON.parse(text) };
}

test('the five CRUD tools are advertised', async () => {
  const names = (await client.listTools()).tools.map(tool => tool.name).sort();
  assert.deepEqual(names, ['reminders_create', 'reminders_delete', 'reminders_get', 'reminders_list', 'reminders_update']);
});

test('an MCP client performs full CRUD through the tools', async () => {
  const created = await call('reminders_create', { title: 'Pay rent', description: 'Monthly', limitDate: '2030-02-01' });
  assert.equal(created.isError, false);
  const id = created.json.id as string;

  assert.equal((await call('reminders_get', { id })).json.title, 'Pay rent');
  assert.equal((await call('reminders_list')).json.length, 1);

  const updated = await call('reminders_update', { id, isDone: true });
  assert.equal(updated.json.isDone, true);
  assert.equal(updated.json.title, 'Pay rent', 'fields not given must keep their current value');

  assert.deepEqual((await call('reminders_delete', { id })).json, { deleted: id });
  assert.equal((await call('reminders_list')).json.length, 0);
});

test('an API failure comes back as a readable tool error, not a protocol error', async () => {
  const missing = await call('reminders_get', { id: '00000000-0000-0000-0000-000000000000' });
  assert.equal(missing.isError, true);
  assert.match(missing.text, /404/);

  const invalid = await call('reminders_create', { title: '', description: 'No title', limitDate: '2030-02-01' });
  assert.equal(invalid.isError, true);
  assert.match(invalid.text, /title: The field is Required/);
});

test('a malformed id is rejected by the schema before any request is made', async () => {
  const result = await call('reminders_get', { id: 'not-a-guid' });
  assert.equal(result.isError, true);
  assert.match(result.text, /id/);
});
