import "server-only";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { env } from "./env";
import { db } from "./db";
import { HttpError } from "./http";
export function ipHash(request: Request) {
  // Vercel overwrites this header. Outside Vercel, do not trust user-supplied forwarding headers.
  const ip = process.env.VERCEL
    ? (request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown")
    : "local";
  return createHash("sha256")
    .update(env().IP_SALT + "\0" + ip)
    .digest("hex");
}
export async function rateLimit(key: string, maximum: number, seconds: number) {
  const rows = await db().execute(
    sql`INSERT INTO rate_limits (key, count, expires_at) VALUES (${key}, 1, now() + ${seconds} * interval '1 second') ON CONFLICT (key) DO UPDATE SET count = CASE WHEN rate_limits.expires_at <= now() THEN 1 ELSE rate_limits.count + 1 END, expires_at = CASE WHEN rate_limits.expires_at <= now() THEN now() + ${seconds} * interval '1 second' ELSE rate_limits.expires_at END RETURNING count, greatest(1, ceil(extract(epoch from (expires_at - now()))))::int AS retry`,
  );
  const row = rows[0] as { count: number; retry: number };
  if (row.count > maximum)
    throw new HttpError(
      429,
      "Let the ink settle. Please try again after the pause.",
      row.retry,
    );
}
export async function globalLimit(request: Request) {
  await rateLimit("ip:" + ipHash(request), 120, 600);
}
