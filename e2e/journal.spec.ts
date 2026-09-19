import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const chapters = JSON.parse(
  readFileSync(
    process.env.TEST_CONTENT_FILE ?? "content/sections.example.json",
    "utf8",
  ),
) as { title: string; question: string; answers: string[]; text_en: string }[];
const english = chapters[0].text_en;
test("registration → sealed artwork → wrong guess → ink reveal → persisted story", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("What should I call you?").fill("QA journal reader");
  await page.getByRole("button", { name: "Open the journal" }).click();
  await expect(page).toHaveURL(/\/sections$/);
  await page.getByRole("link", { name: /Childhood/ }).click();
  await expect(page.locator(".sealed-cover .chapter-art")).toBeVisible();
  await expect(page.locator(".story-text")).toHaveCount(0);
  await expect(page.locator(".reading-paper")).toHaveCount(0);
  const retired = await page.request.get("/api/sections/chapter-1/preview");
  expect(retired.status()).toBe(410);
  expect(await retired.text()).not.toContain(english);
  await page.locator("#answer").fill("wrong");
  await page.getByRole("button", { name: "Let the ink unfold" }).click();
  await expect(page.getByRole("status")).toContainText("Not quite");
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLScriptElement).src),
    );
  for (const url of [
    "/",
    "/sections",
    "/sections/chapter-1",
    "/api/sections",
    ...scripts,
  ]) {
    const response = await page.request.get(url);
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain(english);
  }
  expect(await page.content()).not.toContain(english);
  await page.locator("#answer").fill(chapters[0].answers[0]);
  await page.getByRole("button", { name: "Let the ink unfold" }).click();
  await expect(page.locator(".story-text")).toContainText(english);
  await expect(page.locator(".ink-page")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".sealed-cover")).toHaveCount(0);
  await expect(page.locator(".language-options")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".story-text")).toContainText(english);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "journal")).toMatchObject({
    httpOnly: true,
    sameSite: "Strict",
  });
  expect(errors).toEqual([]);
});
test("reduced motion swaps the page and narrow layouts do not overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByLabel("What should I call you?").fill("QA reduced motion");
  await page.getByRole("button", { name: "Open the journal" }).click();
  await expect(page).toHaveURL(/\/sections$/);
  await page.getByRole("link", { name: /Family/ }).click();
  await page.locator("#answer").fill(chapters[1].answers[0]);
  await page.getByRole("button", { name: "Let the ink unfold" }).click();
  await expect(page.locator(".story-text")).toContainText(chapters[1].text_en);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
