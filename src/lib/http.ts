import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class HttpError extends Error { constructor(public status: number, message: string, public retryAfter?: number) { super(message); } }
export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } }); }
export function endpoint(fn: (request: Request) => Promise<Response>) { return async (request: Request) => {
  try {
    if (request.method !== 'GET') {
      const origin = request.headers.get('origin');
      if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'Please open this form from the journal.');
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Expected JSON.');
    }
    return await fn(request);
  } catch (error) {
    const known = error instanceof HttpError;
    const response = json({ error: known ? error.message : error instanceof ZodError || error instanceof SyntaxError ? 'Please check your input.' : 'The journal is unavailable for a moment. Please try again.', ...(known && error.retryAfter ? { retryAfter: error.retryAfter } : {}) }, known ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503);
    if (known && error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter));
    return response;
  }
}; }
export async function body(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, 'Missing input.');
  let value = ''; let bytes = 0; const decoder = new TextDecoder();
  while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 4096) { await reader.cancel(); throw new HttpError(413, 'Input is too long.'); } value += decoder.decode(chunk.value, { stream: true }); }
  return JSON.parse(value + decoder.decode());
}
