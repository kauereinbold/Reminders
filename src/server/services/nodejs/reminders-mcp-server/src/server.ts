import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiError, RemindersApi, type Reminder } from './api.js';

const idField = z.string().uuid().describe('Reminder id (GUID)');
const dateFormat = 'either YYYY-MM-DD or RFC3339 such as 2026-09-30T00:00:00Z';
// Past dates are rejected on create and accepted on update (ADR-0011), so the
// two tools cannot share one description: for a model, the text is the contract.
const createLimitDateField = z.string().describe(`Due date, ${dateFormat}. Must be later than today`);
const updateLimitDateField = z.string().describe(`New due date, ${dateFormat}. May be in the past`);

/** Builds the MCP server with one tool per Reminders API operation. */
export function createServer(api: RemindersApi): McpServer {
  const server = new McpServer({ name: 'reminders-mcp-server', version: '1.0.0' });

  server.registerTool(
    'reminders_list',
    {
      title: 'List reminders',
      description: 'List every reminder, with id, title, description, limit date and done flag.',
      inputSchema: {}
    },
    () => run(() => api.list())
  );

  server.registerTool(
    'reminders_get',
    {
      title: 'Get reminder',
      description: 'Get a single reminder by id.',
      inputSchema: { id: idField }
    },
    ({ id }) => run(() => api.get(id))
  );

  server.registerTool(
    'reminders_create',
    {
      title: 'Create reminder',
      description: 'Create a reminder. The limit date must be later than today.',
      inputSchema: {
        title: z.string().max(50).describe('Short title, at most 50 characters'),
        description: z.string().max(200).describe('Details, at most 200 characters'),
        limitDate: createLimitDateField,
        isDone: z.boolean().optional().describe('Whether the reminder is already done, defaults to false')
      }
    },
    ({ title, description, limitDate, isDone }) =>
      run(() => api.create({ title, description, limitDate, isDone: isDone ?? false }))
  );

  server.registerTool(
    'reminders_update',
    {
      title: 'Update reminder',
      description: 'Update a reminder. Only the given fields change, the rest keep their current values.',
      inputSchema: {
        id: idField,
        title: z.string().max(50).optional().describe('New title'),
        description: z.string().max(200).optional().describe('New description'),
        limitDate: updateLimitDateField.optional(),
        isDone: z.boolean().optional().describe('New done flag')
      }
    },
    ({ id, ...changes }) =>
      run(async () => {
        const current = await api.get(id);
        return api.update(id, { ...current, ...definedFields(changes) });
      })
  );

  server.registerTool(
    'reminders_delete',
    {
      title: 'Delete reminder',
      description: 'Delete a reminder by id.',
      inputSchema: { id: idField }
    },
    ({ id }) =>
      run(async () => {
        await api.delete(id);
        return { deleted: id };
      })
  );

  return server;
}

function definedFields(changes: Partial<Reminder>): Partial<Reminder> {
  return Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
}

/** Runs an API call and turns the result, or the failure, into a tool result the assistant can read. */
async function run(call: () => Promise<unknown>) {
  try {
    const result = await call();
    return { content: [{ type: 'text' as const, text: JSON.stringify(result ?? null, null, 2) }] };
  } catch (error) {
    const text = error instanceof ApiError || error instanceof Error ? error.message : String(error);
    console.error(`reminders-mcp-server tool failure: ${text}`);
    return { content: [{ type: 'text' as const, text }], isError: true };
  }
}
