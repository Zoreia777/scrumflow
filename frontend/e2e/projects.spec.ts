import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxos da US-01 contra a API REAL e o PostgreSQL (nada é simulado, exceto as falhas
 * de comunicação do AC06, provocadas no navegador). Pré-requisito: backend em E2E_API_URL
 * (padrão http://localhost:8000) com as migrações aplicadas. Os testes usam nomes únicos e
 * não dependem de o banco estar vazio.
 */

const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

function uniqueName(label: string): string {
  return `E2E ${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function createViaUi(page: Page, name: string, description = "") {
  await page.goto("/projetos/novo");
  await page.getByLabel(/Nome do projeto/).fill(name);
  if (description) {
    await page.getByLabel(/Descrição/).fill(description);
  }
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page.getByText(/criado com sucesso/)).toBeVisible();
}

test.describe("US-01: criar, listar, ver e editar projetos", () => {
  test("AC01: cria um projeto, vê na lista e ele persiste após recarregar", async ({ page }) => {
    const name = uniqueName("criar");

    await createViaUi(page, `  ${name}  `, "Descrição do teste E2E");

    await expect(page).toHaveURL(/\/projetos$/);
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

    await page.reload();
    const card = page.getByRole("link", { name: new RegExp(name) });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Descrição do teste E2E");
  });

  test("AC02: nome vazio ou só com espaços é recusado e nada é criado", async ({ page }) => {
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") posts += 1;
    });
    await page.goto("/projetos/novo");

    await page.getByLabel(/Nome do projeto/).fill("     ");
    await page.getByRole("button", { name: "Criar projeto" }).click();

    await expect(page.getByText("O nome não pode ficar vazio.")).toBeVisible();
    await expect(page.getByLabel(/Nome do projeto/)).toBeFocused();
    expect(posts).toBe(0);
  });

  test("AC03: limites de 100 (nome) e 1000 (descrição) são exibidos e bloqueiam o envio", async ({
    page,
  }) => {
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") posts += 1;
    });
    await page.goto("/projetos/novo");

    await page.getByLabel(/Nome do projeto/).fill("a".repeat(101));
    await expect(page.getByText("101/100")).toBeVisible();
    await page.getByRole("button", { name: "Criar projeto" }).click();
    await expect(page.getByText("O nome deve ter no máximo 100 caracteres.")).toBeVisible();

    await page.getByLabel(/Nome do projeto/).fill("Nome válido");
    await page.getByLabel(/Descrição/).fill("d".repeat(1001));
    await page.getByRole("button", { name: "Criar projeto" }).click();
    await expect(page.getByText("A descrição deve ter no máximo 1000 caracteres.")).toBeVisible();

    expect(posts).toBe(0);
  });

  test("AC03: nome com exatamente 100 caracteres é aceito", async ({ page }) => {
    const name = `E2E ${"x".repeat(96)}`;
    expect(name).toHaveLength(100);

    await createViaUi(page, name);

    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  });

  test("AC04: edita nome e descrição e vê as mudanças após recarregar", async ({ page }) => {
    const original = uniqueName("editar");
    const edited = `${original} (editado)`;
    await createViaUi(page, original, "Texto antigo");
    await page.getByRole("link", { name: new RegExp(original) }).click();

    await page.getByRole("link", { name: "Editar" }).click();
    await expect(page.getByLabel(/Nome do projeto/)).toHaveValue(original);
    await page.getByLabel(/Nome do projeto/).fill(edited);
    await page.getByLabel(/Descrição/).fill("Texto novo");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByText("Alterações salvas com sucesso.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: edited })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: edited })).toBeVisible();
    await expect(page.getByText("Texto novo")).toBeVisible();
    await expect(page.getByText("Alterações salvas com sucesso.")).toHaveCount(0);
  });

  test("AC05: os detalhes mostram identificador, nome, descrição e data de criação", async ({
    page,
  }) => {
    const name = uniqueName("detalhes");
    await createViaUi(page, name, "Descrição dos detalhes");

    await page.getByRole("link", { name: new RegExp(name) }).click();

    const details = page.getByRole("region", { name: "Detalhes do projeto" });
    await expect(page).toHaveURL(new RegExp(`/projetos/${UUID.source}$`));
    await expect(details.getByText(UUID)).toBeVisible();
    await expect(details).toContainText(name);
    await expect(details).toContainText("Descrição dos detalhes");
    await expect(details.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);
  });

  test("AC05: projeto inexistente mostra mensagem clara", async ({ page }) => {
    await page.goto("/projetos/00000000-0000-4000-8000-000000000000");

    await expect(page.getByText("Este projeto não existe")).toBeVisible();
  });

  test("AC06: falha de comunicação ao criar mostra erro, sem falso sucesso e sem criar", async ({
    page,
  }) => {
    const name = uniqueName("falha");
    await page.route("**/api/v1/projects", (route) =>
      route.request().method() === "POST" ? route.abort("failed") : route.continue(),
    );
    await page.goto("/projetos/novo");

    await page.getByLabel(/Nome do projeto/).fill(name);
    await page.getByRole("button", { name: "Criar projeto" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Não foi possível se comunicar com o servidor",
    );
    await expect(page.getByText(/criado com sucesso/)).toHaveCount(0);
    await expect(page).toHaveURL(/\/projetos\/novo$/);
    await expect(page.getByLabel(/Nome do projeto/)).toHaveValue(name);

    await page.unroute("**/api/v1/projects");
    await page.goto("/projetos");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  });

  test("AC06: erro 500 da API na listagem mostra mensagem e permite tentar de novo", async ({
    page,
  }) => {
    await page.route("**/api/v1/projects", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "internal_error", message: "Erro interno do servidor." },
        }),
      }),
    );
    await page.goto("/projetos");
    await expect(page.getByRole("alert")).toContainText("Não foi possível carregar os projetos.");

    await page.unroute("**/api/v1/projects");
    await page.getByRole("button", { name: "Tentar novamente" }).click();

    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Projetos" })).toBeVisible();
  });

  test("AC07: a API recusa requisição inválida com 422 e nada é gravado", async ({ request }) => {
    const before = await (await request.get(`${API_URL}/api/v1/projects`)).json();

    const blank = await request.post(`${API_URL}/api/v1/projects`, { data: { name: "   " } });
    const tooLong = await request.post(`${API_URL}/api/v1/projects`, {
      data: { name: "a".repeat(101) },
    });

    expect(blank.status()).toBe(422);
    expect(tooLong.status()).toBe(422);
    expect((await blank.json()).error.code).toBe("validation_error");
    const after = await (await request.get(`${API_URL}/api/v1/projects`)).json();
    expect(after).toHaveLength(before.length);
  });

  test("teclado: é possível criar um projeto sem usar o mouse", async ({ page, isMobile }) => {
    test.skip(isMobile, "Fluxo de teclado é relevante no desktop");
    const name = uniqueName("teclado");
    await page.goto("/projetos/novo");

    await page.getByLabel(/Nome do projeto/).focus();
    await page.keyboard.type(name);
    await page.keyboard.press("Tab");
    await page.keyboard.type("Criado só com o teclado");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Criar projeto" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByText(/criado com sucesso/)).toBeVisible();
  });

  for (const path of ["/projetos", "/projetos/novo"]) {
    test(`responsivo: ${path} não gera rolagem horizontal`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

      expect(overflows).toBe(false);
    });
  }

  test("responsivo: nome muito longo não estoura o layout nos detalhes", async ({ page }) => {
    const name = `E2E ${"Longo".repeat(18)}`.slice(0, 100);
    await createViaUi(page, name);
    await page
      .getByRole("link", { name: new RegExp(name.slice(0, 20)) })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(overflows).toBe(false);
  });
});
