import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, RemindersApi } from '../src/api.js';
import { startStubApi } from './stub-api.js';

let stub: Awaited<ReturnType<typeof startStubApi>>;
let api: RemindersApi;

before(async () => {
  stub = await startStubApi();
  api = new RemindersApi(stub.url);
});

after(() => stub.close());

test('create, get, list, update and delete round trip', async () => {
  const created = await api.create({ title: 'Buy milk', description: 'Semi skimmed', limitDate: '2030-01-01', isDone: false });
  assert.ok(created.id);

  assert.equal((await api.get(created.id!)).title, 'Buy milk');
  assert.equal((await api.list()).length, 1);

  const updated = await api.update(created.id!, { ...created, isDone: true });
  assert.equal(updated.isDone, true);

  await api.delete(created.id!);
  assert.equal((await api.list()).length, 0);
});

test('a validation failure surfaces the problem details fields', async () => {
  await assert.rejects(
    () => api.create({ description: 'No title', limitDate: '2030-01-01' }),
    (error: ApiError) => {
      assert.equal(error.status, 400);
      assert.deepEqual(error.errors, { title: ['The field is Required'] });
      assert.match(error.message, /title: The field is Required/);
      return true;
    }
  );
});

test('a missing reminder surfaces as 404 with the detail', async () => {
  await assert.rejects(
    () => api.get('00000000-0000-0000-0000-000000000000'),
    (error: ApiError) => {
      assert.equal(error.status, 404);
      assert.match(error.message, /No reminder with id/);
      return true;
    }
  );
});
