/** Thin REST client for the Reminders API, reached through the nginx load balancer. */

export interface Reminder {
  id?: string;
  title?: string;
  description?: string;
  limitDate?: string;
  isDone?: boolean;
}

/** An API response that was not successful, carrying the RFC 7807 problem details (ADR-0011). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail?: string,
    readonly errors?: Record<string, string[]>
  ) {
    super(
      [
        `Reminders API returned ${status}`,
        detail,
        errors &&
          Object.entries(errors)
            .map(([field, messages]) => `${field}: ${messages.join(' ')}`)
            .join('; ')
      ]
        .filter(Boolean)
        .join(': ')
    );
    this.name = 'ApiError';
  }
}

export class RemindersApi {
  constructor(private readonly baseUrl: string) {}

  list(): Promise<Reminder[]> {
    return this.send<Reminder[]>('GET', '');
  }

  get(id: string): Promise<Reminder> {
    return this.send<Reminder>('GET', `/${id}`);
  }

  create(reminder: Reminder): Promise<Reminder> {
    return this.send<Reminder>('POST', '', reminder);
  }

  update(id: string, reminder: Reminder): Promise<Reminder> {
    return this.send<Reminder>('PUT', `/${id}`, reminder);
  }

  delete(id: string): Promise<void> {
    return this.send<void>('DELETE', `/${id}`);
  }

  private async send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/reminders${path}`, {
      method,
      headers: body === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const text = await response.text();
    const payload = text ? safeParse(text) : undefined;

    if (!response.ok) {
      const problem = (payload ?? {}) as { title?: string; detail?: string; errors?: Record<string, string[]> };
      throw new ApiError(response.status, problem.detail ?? problem.title ?? (text.slice(0, 200) || undefined), problem.errors);
    }

    return payload as T;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { title: text.slice(0, 200) };
  }
}
