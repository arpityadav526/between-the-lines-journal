import { config } from "dotenv";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(await readFile("migrations/0001.sql", "utf8"));
  });
  console.log("Database schema ready.");
} finally {
  await sql.end();
}
