import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from './env';
let instance: ReturnType<typeof drizzle> | undefined;
export function db() { return instance ??= drizzle(postgres(env().DATABASE_URL, { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 15 })); }
