import { endpoint, json } from "@/lib/http";
import { globalLimit } from "@/lib/rate-limit";
import { visitorSession } from "@/lib/session";
import { listSections, touchVisitor } from "@/lib/journal";
export const GET = endpoint(async (request) => {
  await globalLimit(request);
  const session = await visitorSession();
  await touchVisitor(session.sub);
  return json({ sections: await listSections(session.sub) });
});
