import 'server-only';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from './db';
import { attempts, reads, sections, unlocks, visitors } from './schema';
import { decrypt, verifyHash } from './crypto';
import { normalizeAnswer, oneTypo } from './answers';
import { HttpError } from './http';
export async function touchVisitor(id: string) { const found = await db().update(visitors).set({ lastSeen: new Date() }).where(eq(visitors.id, id)).returning({ id: visitors.id }); if (!found.length) throw new HttpError(401, 'Please register again.'); }
export async function listSections(visitorId: string) {
  return db().select({ id: sections.id, order: sections.order, title: sections.title, question: sections.question, hint: sections.hint, unlocked: sql<boolean>`${unlocks.visitorId} is not null` }).from(sections).leftJoin(unlocks, and(eq(unlocks.sectionId, sections.id), eq(unlocks.visitorId, visitorId))).orderBy(sections.order);
}
export async function preview(id: string) {
  const [section] = await db().select({ id: sections.id, textDe: sections.textDe }).from(sections).where(eq(sections.id, id));
  if (!section) throw new HttpError(404, 'This page was not found.');
  return { text_de: decrypt(section.textDe, id + ':de') };
}
export async function unlock(visitorId: string, sectionId: string, input?: string) {
  const result = await db().transaction(async tx => {
    // Serialize attempts for the same visitor/section, including concurrent requests across instances.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${visitorId}), hashtext(${sectionId}))`);
    const [section] = await tx.select().from(sections).where(eq(sections.id, sectionId));
    if (!section) throw new HttpError(404, 'This page was not found.');
    const [existing] = await tx.select().from(unlocks).where(and(eq(unlocks.visitorId, visitorId), eq(unlocks.sectionId, sectionId)));
    if (!existing) {
      const failures = await tx.select({ time: attempts.time }).from(attempts).where(and(eq(attempts.visitorId, visitorId), eq(attempts.sectionId, sectionId), eq(attempts.success, false), gt(attempts.time, new Date(Date.now() - 600000)))).orderBy(attempts.time);
      if (failures.length >= 5) return { error: new HttpError(429, 'Five guesses have dried on this page. Wait a little before trying again.', Math.max(1, Math.ceil((failures[0].time.getTime() + 600000 - Date.now()) / 1000))) };
      if (input === undefined) return { error: new HttpError(403, 'An answer is needed to open this page.') };
      const answer = normalizeAnswer(input);
      const matches = await Promise.all(section.answers.map(hash => verifyHash(answer, hash)));
      let correct = matches.some(Boolean);
      if (!correct && section.typoAnswers) {
        const originals = JSON.parse(decrypt(section.typoAnswers, sectionId + ':answers')) as string[];
        correct = originals.some(original => oneTypo(answer, original));
      }
      await tx.insert(attempts).values({ visitorId, sectionId, success: correct });
      if (!correct) return { error: new HttpError(422, 'Not quite. Take your time and try another answer.') };
      await tx.insert(unlocks).values({ visitorId, sectionId }).onConflictDoNothing();
    }
    await tx.insert(reads).values({ visitorId, sectionId, revisit: Boolean(existing) });
    const all = await tx.select({ id: unlocks.sectionId }).from(unlocks).where(eq(unlocks.visitorId, visitorId));
    return { text_en: decrypt(section.textEn, sectionId + ':en'), unlocked: all.map(row => row.id), revisit: Boolean(existing) };
  });
  if ('error' in result) throw result.error;
  return result;
}
