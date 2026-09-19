import { endpoint, HttpError } from "@/lib/http";
import { visitorSession } from "@/lib/session";
// Retire the old readable preview endpoint. No story body is available here.
export const GET = endpoint(async () => {
  await visitorSession();
  throw new HttpError(
    410,
    "Story previews are no longer available. Answer the chapter question to open it.",
  );
});
