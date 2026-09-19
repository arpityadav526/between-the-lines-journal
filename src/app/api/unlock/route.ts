import { z } from 'zod';
import { body, endpoint, json } from '@/lib/http';
import { globalLimit } from '@/lib/rate-limit';
import { issueSession, visitorSession } from '@/lib/session';
import { touchVisitor, unlock } from '@/lib/journal';
const input = z.object({ sectionId: z.string().regex(/^[a-z0-9-]{1,60}$/), answer: z.string().min(1).max(300).optional() });
export const POST = endpoint(async request => { await globalLimit(request); const session = await visitorSession(); await touchVisitor(session.sub); const { sectionId, answer } = input.parse(await body(request)); const result = await unlock(session.sub, sectionId, answer); await issueSession(session.sub, result.unlocked); return json({ text_en: result.text_en, revisit: result.revisit }); });
