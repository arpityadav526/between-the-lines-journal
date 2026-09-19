import { endpoint, json } from '@/lib/http';
import { clearAdmin } from '@/lib/session';
export const POST = endpoint(async () => { await clearAdmin(); return json({ ok: true }); });
