import { z } from "zod";
import { body, endpoint, HttpError, json } from "@/lib/http";
import { globalLimit, ipHash, rateLimit } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/crypto";
import { env } from "@/lib/env";
import { issueAdmin } from "@/lib/session";
export const POST = endpoint(async (request) => {
  await globalLimit(request);
  await rateLimit("admin:" + ipHash(request), 5, 900);
  const { token } = z
    .object({ token: z.string().max(512) })
    .parse(await body(request));
  if (!safeEqual(token, env().ADMIN_TOKEN))
    throw new HttpError(401, "That key does not fit.");
  await issueAdmin();
  return json({ ok: true });
});
