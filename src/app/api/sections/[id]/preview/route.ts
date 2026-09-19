import { endpoint, json } from "@/lib/http";
import { globalLimit, rateLimit } from "@/lib/rate-limit";
import { visitorSession } from "@/lib/session";
import { preview, touchVisitor } from "@/lib/journal";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async (req) => {
    await globalLimit(req);
    const session = await visitorSession();
    await touchVisitor(session.sub);
    await rateLimit("preview:" + session.sub, 40, 600);
    const { id } = await context.params;
    return json(await preview(id));
  })(request);
}
