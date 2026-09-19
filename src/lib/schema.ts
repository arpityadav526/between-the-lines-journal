import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
export type AnswerHash = { salt: string; hash: string };
export const visitors = pgTable("visitors", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSeen: timestamp("last_seen", { withTimezone: true })
    .defaultNow()
    .notNull(),
  ipHash: text("ip_hash").notNull(),
  userAgent: text("user_agent").notNull(),
});
export const sections = pgTable("sections", {
  id: text().primaryKey(),
  order: integer("sort_order").notNull(),
  title: text().notNull(),
  question: text().notNull(),
  hint: text(),
  textDe: text("text_de").notNull(),
  textEn: text("text_en").notNull(),
  answers: jsonb().$type<AnswerHash[]>().notNull(),
  typoAnswers: text("typo_answers"),
});
export const unlocks = pgTable(
  "unlocks",
  {
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.visitorId, t.sectionId] })],
);
export const attempts = pgTable(
  "attempts",
  {
    id: uuid().primaryKey().defaultRandom(),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    time: timestamp({ withTimezone: true }).defaultNow().notNull(),
    success: boolean().notNull(),
  },
  (t) => [index("attempt_lookup").on(t.visitorId, t.sectionId, t.time)],
);
export const reads = pgTable("reads", {
  id: uuid().primaryKey().defaultRandom(),
  visitorId: uuid("visitor_id")
    .notNull()
    .references(() => visitors.id, { onDelete: "cascade" }),
  sectionId: text("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  time: timestamp({ withTimezone: true }).defaultNow().notNull(),
  revisit: boolean().notNull(),
});
export const limits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
