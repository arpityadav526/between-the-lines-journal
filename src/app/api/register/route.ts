import { z } from "zod";
import { body, endpoint, json } from "@/lib/http";
import { globalLimit, ipHash, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { visitors } from "@/lib/schema";
import { issueSession } from "@/lib/session";
const input = z.object({
  name: z
    .string()
    .max(100)
    .transform((v) =>
      v
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N} '\-]/gu, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .pipe(z.string().min(2).max(30)),
});
export const POST = endpoint(async (request) => {
  await globalLimit(request);
  await rateLimit("register:" + ipHash(request), 10, 3600);
  const { name } = input.parse(await body(request));
  const [visitor] = await db()
    .insert(visitors)
    .values({
      name,
      ipHash: ipHash(request),
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 512),
    })
    .returning({ id: visitors.id });
  await issueSession(visitor.id, []);
  return json({ name }, 201);
});
