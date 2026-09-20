import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Reminder } from '../src/api.js';

/** In-memory stand-in for the Reminders REST API, matching the contract in ADR-0011. */
export async function startStubApi(): Promise<{ url: string; close: () => Promise<void>; store: Map<string, Reminder> }> {
  const store = new Map<string, Reminder>();

  const server = createServer(async (request, response) => {
    const [, , , id] = (request.url ?? '').split('/');
    const body = await readBody(request);
    const send = (status: number, payload?: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(payload === undefined ? '' : JSON.stringify(payload));
    };

    if (request.method === 'GET' && !id) return send(200, [...store.values()]);
    if (request.method === 'POST') {
      if (!body.title) {
        return send(400, { title: 'One or more validation errors occurred.', status: 400, errors: { title: ['The field is Required'] } });
      }
      const created = { ...body, id: randomUUID() };
      store.set(created.id, created);
      return send(200, created);
    }
    if (!id || !store.has(id)) return send(404, { title: 'Reminder not found', status: 404, detail: `No reminder with id ${id}` });
    if (request.method === 'GET') return send(200, store.get(id));
    if (request.method === 'PUT') {
      const updated = { ...body, id };
      store.set(id, updated);
      return send(200, updated);
    }
    if (request.method === 'DELETE') {
      store.delete(id);
      return send(200);
    }
    return send(405, { title: 'Method not allowed', status: 405 });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;

  return { url: `http://127.0.0.1:${port}`, store, close: () => closeServer(server) };
}

async function readBody(request: { on: (event: string, listener: (chunk?: Buffer) => void) => void }): Promise<Reminder> {
  const chunks: Buffer[] = [];
  await new Promise<void>(resolve => {
    request.on('data', chunk => chunks.push(chunk as Buffer));
    request.on('end', () => resolve());
  });
  const raw = Buffer.concat(chunks).toString();
  return raw ? (JSON.parse(raw) as Reminder) : {};
}

function closeServer(server: Server): Promise<void> {
  return new Promise(resolve => server.close(() => resolve()));
}
