import { config } from "dotenv";
import { spawnSync } from "node:child_process";
config({ path: ".env.local", quiet: true });
// Values go through stdin, never argv or terminal output. Existing variables are not overwritten.
for (const key of ["CONTENT_KEY", "SESSION_SECRET", "ADMIN_TOKEN", "IP_SALT"]) {
  if (!process.env[key]) throw Error(`Missing ${key} in .env.local`);
  const result = spawnSync(
    "vercel",
    ["env", "add", key, "production", "--sensitive"],
    { input: process.env[key], encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(
      `Could not add ${key}. Check whether it already exists with vercel env ls production. No existing value was overwritten.`,
    );
    process.exit(1);
  }
  console.log(`${key} added to production.`);
}
