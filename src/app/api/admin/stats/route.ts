import { endpoint, json } from '@/lib/http';
import { requireAdmin } from '@/lib/session';
import { db } from '@/lib/db';
import { visitors, unlocks, attempts, reads, sections } from '@/lib/schema';
import { count, desc, eq, sql } from 'drizzle-orm';
export const GET = endpoint(async () => {
  await requireAdmin();
  const [people, opened, failures, summary] = await Promise.all([
    db().select({ id: visitors.id, name: visitors.name, firstSeen: visitors.createdAt, lastSeen: visitors.lastSeen }).from(visitors).orderBy(desc(visitors.lastSeen)).limit(200),
    db().select({ visitorId: unlocks.visitorId, title: sections.title }).from(unlocks).innerJoin(sections, eq(unlocks.sectionId, sections.id)),
    db().select({ name: visitors.name, title: sections.title, time: attempts.time }).from(attempts).innerJoin(visitors, eq(attempts.visitorId, visitors.id)).innerJoin(sections, eq(attempts.sectionId, sections.id)).where(eq(attempts.success, false)).orderBy(desc(attempts.time)).limit(100),
    db().select({ visitors: sql<number>`(select count(*)::int from visitors)`, unlocks: sql<number>`(select count(*)::int from unlocks)`, failures: sql<number>`(select count(*)::int from attempts where success = false)`, reads: count(reads.id) }).from(reads),
  ]);
  return json({ visitors: people.map(p => ({ ...p, unlocked: opened.filter(o => o.visitorId === p.id).map(o => o.title) })), failures, summary: summary[0] });
});
