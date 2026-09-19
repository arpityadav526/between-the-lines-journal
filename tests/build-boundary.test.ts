import { it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
}
it.skipIf(!existsSync(".next/static"))(
  "does not put seeded English or content files in built public assets or HTML",
  () => {
    const roots = [".next/static", ".next/server/app"];
    for (const file of roots
      .flatMap(files)
      .filter((f) => /\.(js|html|json|rsc|txt)$/.test(f))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain(
        "Placeholder: my text will go here later.",
      );
      expect(source, file).not.toContain("sections.local.json");
    }
  },
);
