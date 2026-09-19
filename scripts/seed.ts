import { config } from "dotenv";
import { readFile, access } from "node:fs/promises";
import { z } from "zod";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sections, unlocks } from "../src/lib/schema";
import { encrypt, hashAnswer } from "../src/lib/crypto";
import { normalizeAnswer } from "../src/lib/answers";
import { eq, notInArray } from "drizzle-orm";
config({ path: ".env.local", quiet: true });
const schema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]{1,60}$/),
      title: z.string().min(1).max(100),
      question: z.string().min(1).max(500),
      hint: z.string().max(500).optional(),
      answers: z.array(z.string().min(1).max(300)).min(1).max(10),
      allow_typo: z.boolean().default(false),
      text_de: z.string().min(1).max(100000),
      text_en: z.string().min(1).max(100000),
    }),
  )
  .min(1)
  .max(100);
let path = "content/sections.local.json";
try {
  await access(path);
} catch {
  path = "content/sections.example.json";
}
const content = schema.parse(JSON.parse(await readFile(path, "utf8")));
if (new Set(content.map((s) => s.id)).size !== content.length)
  throw Error("Duplicate section IDs.");
if (content.reduce((sum, s) => sum + s.id.length + 3, 0) > 2400)
  throw Error("Section IDs exceed the session cookie budget. Use shorter IDs.");
const prepared = await Promise.all(
  content.map(async (s, order) => {
    const normalized = s.answers.map(normalizeAnswer);
    if (normalized.some((a) => !a))
      throw Error("An answer normalizes to an empty value.");
    return {
      id: s.id,
      order: order + 1,
      title: s.title,
      question: s.question,
      hint: s.hint ?? null,
      answers: await Promise.all(normalized.map((a) => hashAnswer(a))),
      typoAnswers: s.allow_typo
        ? encrypt(JSON.stringify(normalized), s.id + ":answers")
        : null,
      textDe: encrypt(s.text_de, s.id + ":de"),
      textEn: encrypt(s.text_en, s.id + ":en"),
    };
  }),
);
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const database = drizzle(client);
try {
  await database.transaction(async (tx) => {
    await tx.delete(sections).where(
      notInArray(
        sections.id,
        content.map((s) => s.id),
      ),
    );
    for (const row of prepared) {
      await tx
        .insert(sections)
        .values(row)
        .onConflictDoUpdate({ target: sections.id, set: row });
      await tx.delete(unlocks).where(eq(unlocks.sectionId, row.id));
    }
  });
  console.log(
    `Seeded ${content.length} encrypted sections from ${path}. Existing unlocks for these sections were reset.`,
  );
} finally {
  await client.end();
}
