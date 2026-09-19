import "server-only";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().url(),
  CONTENT_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  SESSION_SECRET: z.string().min(32),
  ADMIN_TOKEN: z.string().min(32),
  IP_SALT: z.string().min(32),
});
export function env() {
  return schema.parse(process.env);
}
