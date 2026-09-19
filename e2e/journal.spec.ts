import { test, expect } from "@playwright/test";
const english = "Placeholder: my text will go here later.";
test("registration → German → wrong guess → ink reveal → persisted English", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const responses: Promise<void>[] = [];
  const inspect = (response: import("@playwright/test").Response) => {
    if (/text|json|javascript/.test(response.headers()["content-type"] ?? ""))
      responses.push(
        response.text().then((text) => {
          expect(text).not.toContain(english);
        }),
      );
  };
  page.on("response", inspect);
  await page.goto("/");
  await page.getByLabel("What should I call you?").fill("QA journal reader");
  await page.getByRole("button", { name: "Open the journal" }).click();
  await expect(page).toHaveURL(/\/sections$/);
  await page.getByRole("link", { name: /Kindheit/ }).click();
  await expect(page.locator(".story-text")).toContainText(
    "Platzhalter: Hier kommt später mein Text hin.",
  );
  await expect(page.locator(".story-text")).not.toContainText(english);
  await page
    .getByLabel("Placeholder question: type placeholder to open this example.")
    .fill("wrong");
  await page.getByRole("button", { name: "Let the ink unfold" }).click();
  await expect(page.getByRole("status")).toContainText("Not quite");
  await Promise.all(responses);
  page.off("response", inspect);
  await page
    .getByLabel("Placeholder question: type placeholder to open this example.")
    .fill("placeholder");
  await page.getByRole("button", { name: "Let the ink unfold" }).click();
  await expect(page.locator(".story-text")).toContainText(english);
  await expect(page.locator(".ink-page")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Original (Deutsch)" }).click();
  await expect(page.locator(".story-text")).toContainText("Platzhalter");
  await page.reload();
  await expect(page.locator(".story-text")).toContainText(english);
  await expect(
    page.getByRole("button", { name: "English", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
  await page.getByRole("link", { name: /Familie/ }).click();
  await page
    .getByLabel("Placeholder question: type placeholder to open this example.")
    .fill("placeholder");
  await page.getByRole("button", { name: "Let the ink unfold" }).click();
  await expect(page.locator(".story-text")).toContainText(english);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
