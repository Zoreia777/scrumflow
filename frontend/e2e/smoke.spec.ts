import { expect, test } from "@playwright/test";

test("a página inicial carrega com a marca e o título da listagem", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "ScrumFlow" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Projetos" })).toBeVisible();
  await expect(page).toHaveTitle("Projetos · ScrumFlow");
});

test("o layout não gera rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Projetos" })).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});
