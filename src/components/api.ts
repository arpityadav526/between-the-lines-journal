export class ApiError extends Error { constructor(message: string, public status: number, public retryAfter?: number) { super(message); } }
export async function api<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store' });
  const result = await response.json(); if (!response.ok) throw new ApiError(result.error ?? 'Please try again.', response.status, result.retryAfter); return result;
}
export type Section = { id: string; title: string; order: number; question: string; hint: string | null; unlocked: boolean };
