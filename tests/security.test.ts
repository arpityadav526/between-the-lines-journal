import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  database: undefined as unknown,
  cookies: new Map<string, string>(),
  cookieOptions: new Map<string, Record<string, unknown>>(),
}));
vi.mock("@/lib/db", () => ({ db: () => state.database }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      state.cookies.has(name) ? { value: state.cookies.get(name) } : undefined,
    set: (name: string, value: string, options: Record<string, unknown>) => {
      state.cookies.set(name, value);
      state.cookieOptions.set(name, options);
    },
    delete: (name: string) => state.cookies.delete(name),
  }),
}));
import { normalizeAnswer, oneTypo } from "@/lib/answers";
import { encrypt, decrypt, hashAnswer } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { POST as register } from "@/app/api/register/route";
import { GET as list } from "@/app/api/sections/route";
import { GET as preview } from "@/app/api/sections/[id]/preview/route";
import { POST as unlock } from "@/app/api/unlock/route";
import { GET as stats } from "@/app/api/admin/stats/route";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { sections } from "@/lib/schema";
const client = new PGlite();
const database = drizzle(client);
const ENGLISH = "CONFIDENTIAL_ENGLISH_SENTINEL_87a49";
function req(path: string, data?: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000" + path, {
    method: data === undefined ? "GET" : "POST",
    headers:
      data === undefined ? {} : { origin, "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
async function attempt(answer?: string) {
  return unlock(
    req("/api/unlock", {
      sectionId: "chapter-1",
      ...(answer !== undefined ? { answer } : {}),
    }),
  );
}
beforeAll(async () => {
  Object.assign(process.env, {
    DATABASE_URL: "postgres://test:test@localhost/test",
    CONTENT_KEY: "ab".repeat(32),
    SESSION_SECRET: "session-secret-for-tests-".repeat(3),
    ADMIN_TOKEN: "admin-token-for-tests-".repeat(3),
    IP_SALT: "salt-for-tests-".repeat(3),
  });
  state.database = new Proxy(database, {
    get(target, prop) {
      if (prop === "execute")
        return async (...args: Parameters<typeof database.execute>) =>
          (await target.execute(...args)).rows;
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await client.exec(readFileSync("migrations/0001.sql", "utf8"));
  await database
    .insert(sections)
    .values({
      id: "chapter-1",
      order: 1,
      title: "Test chapter",
      question: "A test question",
      textDe: encrypt("Deutscher Testtext", "chapter-1:de"),
      textEn: encrypt(ENGLISH, "chapter-1:en"),
      answers: [
        await hashAnswer(normalizeAnswer("Grüner Garten")),
        await hashAnswer("garden"),
      ],
      typoAnswers: encrypt(
        JSON.stringify(["gruener garten", "garden"]),
        "chapter-1:answers",
      ),
    });
});
beforeEach(async () => {
  state.cookies.clear();
  state.cookieOptions.clear();
  await client.exec("TRUNCATE visitors, rate_limits CASCADE");
});
afterAll(async () => {
  await client.close();
});
describe("answer normalization", () => {
  it.each([
    ["  Ä Ö Ü ß!  ", "ae oe ue ss"],
    ["Café… déjà-vu?", "cafe dejavu"],
    ["  HELLO \n world. ", "hello world"],
    ["Straße", "strasse"],
    ["A\u0308rger", "aerger"],
    ["Grüner Garten", "gruener garten"],
  ])("%s → %s", (input, expected) =>
    expect(normalizeAnswer(input)).toBe(expected),
  );
  it("allows only one edit for accepted answers longer than five characters", () => {
    expect(oneTypo("gardn", "garden")).toBe(true);
    expect(oneTypo("gardenn", "garden")).toBe(true);
    expect(oneTypo("gardon", "garden")).toBe(true);
    expect(oneTypo("gxrdenn", "garden")).toBe(false);
    expect(oneTypo("hous", "house")).toBe(false);
  });
});
describe("encryption", () => {
  it("uses distinct nonces, binds content to its section and rejects tampering", () => {
    const a = encrypt("secret", "a:en"),
      b = encrypt("secret", "a:en");
    expect(a).not.toBe(b);
    expect(decrypt(a, "a:en")).toBe("secret");
    expect(() => decrypt(a, "b:en")).toThrow();
    const bytes = Buffer.from(a, "base64");
    bytes[14] ^= 1;
    expect(() => decrypt(bytes.toString("base64"), "a:en")).toThrow();
  });
});
describe("Postgres rate limiting", () => {
  it("atomically allows exactly the budget, including concurrent calls", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 9 }, () => rateLimit("concurrent", 5, 600)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(4);
  });
  it("resets expired limits and separates keys", async () => {
    await rateLimit("a", 1, 600);
    await expect(rateLimit("a", 1, 600)).rejects.toMatchObject({
      status: 429,
      retryAfter: expect.any(Number),
    });
    await rateLimit("b", 1, 600);
    await client.exec(
      "UPDATE rate_limits SET expires_at = now() - interval '1 second'",
    );
    await expect(rateLimit("a", 1, 600)).resolves.toBeUndefined();
  });
});
describe("real API handlers and database access boundary", () => {
  it("never returns English before correct unlock; logs the revisit after unlock", async () => {
    const anonymous = await list(req("/api/sections"));
    expect(anonymous.status).toBe(401);
    expect(await anonymous.text()).not.toContain(ENGLISH);
    const anonymousPreview = await preview(
      req("/api/sections/chapter-1/preview"),
      { params: Promise.resolve({ id: "chapter-1" }) },
    );
    expect(anonymousPreview.status).toBe(401);
    const registered = await register(
      req("/api/register", { name: "<Ada> 🌿" }),
    );
    expect(registered.status).toBe(201);
    expect(await registered.text()).not.toContain(ENGLISH);
    expect(state.cookieOptions.get("journal")).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
    });
    const overview = await list(req("/api/sections"));
    const overviewBody = await overview.json();
    expect(overviewBody.sections[0]).not.toHaveProperty("textEn");
    expect(overviewBody.sections[0]).not.toHaveProperty("textDe");
    expect(JSON.stringify(overviewBody)).not.toContain(ENGLISH);
    const german = await preview(req("/api/sections/chapter-1/preview"), {
      params: Promise.resolve({ id: "chapter-1" }),
    });
    expect(await german.json()).toEqual({ text_de: "Deutscher Testtext" });
    const bypass = await attempt();
    expect(bypass.status).toBe(403);
    expect(await bypass.text()).not.toContain(ENGLISH);
    const failure = await attempt("incorrect");
    expect(failure.status).toBe(422);
    expect(await failure.text()).not.toContain(ENGLISH);
    const success = await attempt(" GRÜNER   GARTEN! ");
    expect(success.status).toBe(200);
    expect(await success.json()).toMatchObject({
      text_en: ENGLISH,
      revisit: false,
    });
    const revisit = await attempt();
    expect(await revisit.json()).toMatchObject({
      text_en: ENGLISH,
      revisit: true,
    });
    expect((await client.query("SELECT * FROM reads")).rows).toHaveLength(2);
    const visitor = (
      await client.query<{ name: string; ip_hash: string }>(
        "SELECT * FROM visitors",
      )
    ).rows[0];
    expect(visitor.name).toBe("Ada");
    expect(visitor.ip_hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("enforces five wrong attempts under concurrency without storing submitted answers", async () => {
    await register(req("/api/register", { name: "Tester" }));
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => attempt("not-the-answer")),
    );
    expect(responses.filter((r) => r.status === 422)).toHaveLength(5);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(3);
    const blocked = await attempt("garden");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(await blocked.text()).not.toContain(ENGLISH);
    const rows = (await client.query("SELECT * FROM attempts")).rows;
    expect(rows).toHaveLength(5);
    expect(JSON.stringify(rows)).not.toContain("not-the-answer");
    await client.exec(
      "UPDATE attempts SET time = now() - interval '11 minutes'",
    );
    expect((await attempt("garden")).status).toBe(200);
  });
  it("accepts the optional single typo and rejects two edits", async () => {
    await register(req("/api/register", { name: "Tester" }));
    expect((await attempt("gxrdenn")).status).toBe(422);
    expect((await attempt("gardn")).status).toBe(200);
  });
  it("rejects forged sessions, cross-origin mutations and oversized bodies", async () => {
    state.cookies.set("journal", "forged");
    expect((await list(req("/api/sections"))).status).toBe(401);
    expect(
      (
        await register(
          req("/api/register", { name: "Tester" }, "https://attacker.test"),
        )
      ).status,
    ).toBe(403);
    expect(
      (await register(req("/api/register", { name: "a".repeat(5000) }))).status,
    ).toBe(413);
  });
  it("isolates admin authorization from visitor sessions and supports logout", async () => {
    await register(req("/api/register", { name: "Tester" }));
    expect((await stats(req("/api/admin/stats"))).status).toBe(401);
    expect(
      (await login(req("/api/admin/login", { token: "incorrect" }))).status,
    ).toBe(401);
    expect(
      (await login(req("/api/admin/login", { token: process.env.ADMIN_TOKEN })))
        .status,
    ).toBe(200);
    const response = await stats(req("/api/admin/stats"));
    expect(response.status).toBe(200);
    expect((await response.json()).summary.visitors).toBe(1);
    await logout(req("/api/admin/logout", {}));
    expect((await stats(req("/api/admin/stats"))).status).toBe(401);
  });
});
