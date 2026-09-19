import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
const path = ".env.local";
let contents = existsSync(path)
  ? readFileSync(path, "utf8")
  : "DATABASE_URL=\n";
for (const key of ["CONTENT_KEY", "SESSION_SECRET", "ADMIN_TOKEN", "IP_SALT"]) {
  if (new RegExp(`^${key}=.+`, "m").test(contents)) continue;
  contents = contents.replace(new RegExp(`^${key}=.*\\n?`, "m"), "");
  contents += `${key}=${randomBytes(32).toString("hex")}\n`;
}
writeFileSync(path, contents, { mode: 0o600 });
chmodSync(path, 0o600);
console.log(
  "Missing secrets generated in .env.local; existing secrets preserved.",
);
