import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Fluxos da US-02 contra a API REAL e o PostgreSQL (nada é simulado, exceto as falhas de
 * comunicação do AC09, provocadas no navegador). Pré-requisito: backend em E2E_API_URL
 * (padrão http://localhost:8000) com as migrações aplicadas. Cada teste cria o próprio
 * projeto, com nome único, e não depende de o banco estar vazio.
 */

const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

function unique(label: string): string {
  return `E2E ${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function createProject(request: APIRequestContext, label: string) {
  const name = unique(label);
  const response = await request.post(`${API_URL}/api/v1/projects`, { data: { name } });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return { id: body.id as string, name };
}

async function apiStories(request: APIRequestContext, projectId: string) {
  const response = await request.get(`${API_URL}/api/v1/projects/${projectId}/stories`);
  expect(response.status()).toBe(200);
  return (await response.json()) as Array<Record<string, unknown>>;
}

interface StoryInput {
  title: string;
  description?: string;
  priority?: "Alta" | "Média" | "Baixa";
  criteria?: string[];
}

async function openForm(page: Page) {
  await page
    .getByRole("button", { name: /Nova história|Cadastrar primeira história/ })
    .first()
    .click();
  await expect(page.getByRole("form", { name: "Nova história" })).toBeVisible();
}

async function fillStory(page: Page, story: StoryInput) {
  await page.getByLabel(/^Título/).fill(story.title);
  if (story.description) await page.getByLabel(/^Descrição/).fill(story.description);
  if (story.priority) await page.getByRole("radio", { name: story.priority }).check();
  const criteria = story.criteria ?? [];
  for (const [index, text] of criteria.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Adicionar critério" }).click();
    await page.getByLabel(`Critério ${index + 1}`, { exact: true }).fill(text);
  }
}

async function saveStory(page: Page) {
  await page.getByRole("button", { name: "Salvar história" }).click();
}

async function createViaUi(page: Page, story: StoryInput) {
  await openForm(page);
  await fillStory(page, story);
  await saveStory(page);
  await expect(page.getByText(`História “${story.title}” criada com sucesso.`)).toBeVisible();
}

function postsTo(page: Page): { count: () => number } {
  let count = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/stories")) count += 1;
  });
  return { count: () => count };
}

test.describe("US-02: histórias de usuário de um projeto", () => {
  test("AC01 + AC07: cadastra uma história, vê no backlog e ela persiste após recarregar", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-ac01");
    const title = unique("historia");
    await page.goto(`/projetos/${project.id}`);
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();

    await openForm(page);
    await fillStory(page, {
      title: `  ${title}  `,
      description: "Descrição da história",
      priority: "Alta",
      criteria: ["Salva título e prioridade", "Aparece no backlog"],
    });
    await saveStory(page);

    await expect(page.getByText(`História “${title}” criada com sucesso.`)).toBeVisible();
    const card = page.getByRole("article").filter({ hasText: title });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Prioridade: Alta");
    await expect(card).toContainText("Status: A fazer");
    await expect(card).toContainText("Descrição da história");
    await expect(card.getByRole("listitem")).toHaveText([
      "Salva título e prioridade",
      "Aparece no backlog",
    ]);

    await page.reload(); // AC07
    const reloaded = page.getByRole("article").filter({ hasText: title });
    await expect(reloaded).toHaveCount(1);
    await expect(reloaded).toContainText("Prioridade: Alta");
    await expect(reloaded).toContainText("Status: A fazer");
    await expect(reloaded.getByRole("listitem")).toHaveText([
      "Salva título e prioridade",
      "Aparece no backlog",
    ]);
    await expect(page.getByText(/criada com sucesso/)).toHaveCount(0);

    const stored = await apiStories(request, project.id);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ title, status: "A fazer", project_id: project.id });
  });

  test("AC02: título vazio é recusado com mensagem e nada é criado", async ({ page, request }) => {
    const project = await createProject(request, "hist-ac02");
    const posts = postsTo(page);
    await page.goto(`/projetos/${project.id}`);
    await openForm(page);

    await fillStory(page, { title: "     ", priority: "Baixa", criteria: ["ok"] });
    await saveStory(page);

    await expect(page.getByText("O título não pode ficar vazio.")).toBeVisible();
    await expect(page.getByLabel(/^Título/)).toBeFocused();
    expect(posts.count()).toBe(0);
    expect(await apiStories(request, project.id)).toHaveLength(0);
  });

  test("AC03: sem critério válido a história é recusada; critérios podem ser adicionados e removidos", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-ac03");
    const posts = postsTo(page);
    await page.goto(`/projetos/${project.id}`);
    await openForm(page);

    await fillStory(page, { title: "Sem critérios", priority: "Alta" });
    await saveStory(page);
    await expect(page.getByText("Informe ao menos um critério de aceitação.")).toBeVisible();

    await page.getByLabel("Critério 1", { exact: true }).fill("Primeiro");
    await page.getByRole("button", { name: "Adicionar critério" }).click();
    await expect(page.getByLabel("Critério 2", { exact: true })).toBeFocused();
    await saveStory(page); // critério 2 em branco
    await expect(page.getByText(/O critério de aceitação 2 não pode ficar vazio/)).toBeVisible();

    await page.getByRole("button", { name: "Remover critério 2" }).click();
    await expect(page.getByLabel(/^Critério \d+$/)).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Remover critério 1" })).toBeDisabled();

    expect(posts.count()).toBe(0);
    expect(await apiStories(request, project.id)).toHaveLength(0);

    await saveStory(page); // agora válido
    await expect(page.getByText(/criada com sucesso/)).toBeVisible();
  });

  test("limites: 20 critérios no máximo, e os limites exatos (150/2000/500) são aceitos pela API real", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-limites");
    await page.goto(`/projetos/${project.id}`);
    await openForm(page);

    for (let i = 0; i < 19; i += 1) {
      await page.getByRole("button", { name: "Adicionar critério" }).click();
    }
    await expect(page.getByLabel(/^Critério \d+$/)).toHaveCount(20);
    await expect(page.getByRole("button", { name: "Adicionar critério" })).toBeDisabled();
    await expect(page.getByText(/limite atingido/)).toBeVisible();

    await page.getByLabel(/^Título/).fill(`E2E ${"t".repeat(146)}`);
    await page.getByLabel(/^Descrição/).fill("d".repeat(2000));
    await page.getByRole("radio", { name: "Média" }).check();
    for (let n = 1; n <= 20; n += 1) {
      await page
        .getByLabel(`Critério ${n}`, { exact: true })
        .fill(n === 1 ? "c".repeat(500) : `c${n}`);
    }
    await saveStory(page);

    await expect(page.getByText(/criada com sucesso/)).toBeVisible();
    const stored = await apiStories(request, project.id);
    expect(stored).toHaveLength(1);
    expect((stored[0]?.title as string).length).toBe(150);
    expect((stored[0]?.acceptance_criteria as string[]).length).toBe(20);
  });

  test("limites: título com 151, descrição com 2001 e critério com 501 caracteres são bloqueados", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-excesso");
    const posts = postsTo(page);
    await page.goto(`/projetos/${project.id}`);
    await openForm(page);

    await fillStory(page, {
      title: "t".repeat(151),
      description: "d".repeat(2001),
      priority: "Alta",
      criteria: ["c".repeat(501)],
    });
    await expect(page.getByText("151/150")).toBeVisible();
    await saveStory(page);

    await expect(page.getByText("O título deve ter no máximo 150 caracteres.")).toBeVisible();
    await expect(page.getByText("A descrição deve ter no máximo 2000 caracteres.")).toBeVisible();
    await expect(page.getByText(/deve ter no máximo 500 caracteres/)).toBeVisible();
    expect(posts.count()).toBe(0);
  });

  test("AC04: só existem as três prioridades, sem pré-seleção; a API recusa valor inválido", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-ac04");
    await page.goto(`/projetos/${project.id}`);
    await openForm(page);

    await expect(page.getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await fillStory(page, { title: "Sem prioridade", criteria: ["ok"] });
    await saveStory(page);
    await expect(page.getByText("Selecione a prioridade: Alta, Média ou Baixa.")).toBeVisible();

    const invalid = await request.post(`${API_URL}/api/v1/projects/${project.id}/stories`, {
      data: { title: "x", priority: "Urgente", acceptance_criteria: ["a"] },
    });
    expect(invalid.status()).toBe(422);
    expect(await apiStories(request, project.id)).toHaveLength(0);
  });

  test("AC05: projeto inexistente: 404 na API (nada criado) e página sem seção de histórias", async ({
    page,
    request,
  }) => {
    const ghost = "00000000-0000-4000-8000-000000000000";

    const post = await request.post(`${API_URL}/api/v1/projects/${ghost}/stories`, {
      data: { title: "x", priority: "Alta", acceptance_criteria: ["a"] },
    });
    const get = await request.get(`${API_URL}/api/v1/projects/${ghost}/stories`);
    expect(post.status()).toBe(404);
    expect(get.status()).toBe(404);

    await page.goto(`/projetos/${ghost}`);
    await expect(page.getByText("Este projeto não existe")).toBeVisible();
    await expect(page.getByRole("region", { name: /Histórias de usuário/ })).toHaveCount(0);
  });

  test("AC05: 404 ao cadastrar mostra erro e não confirma sucesso", async ({ page, request }) => {
    const project = await createProject(request, "hist-404");
    await page.goto(`/projetos/${project.id}`);
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();
    await page.route("**/stories", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({
              error: { code: "not_found", message: "Recurso não encontrado." },
            }),
          })
        : route.continue(),
    );
    await openForm(page);
    await fillStory(page, { title: "Órfã", priority: "Alta", criteria: ["a"] });

    await saveStory(page);

    await expect(page.getByRole("alert")).toContainText("Projeto não encontrado.");
    await expect(page.getByText(/criada com sucesso/)).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("AC06: títulos repetidos no mesmo projeto viram itens distintos", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-ac06");
    const title = unique("repetida");
    await page.goto(`/projetos/${project.id}`);

    await createViaUi(page, { title, priority: "Alta", criteria: ["a"] });
    await createViaUi(page, { title, priority: "Baixa", criteria: ["b"] });

    await expect(page.getByRole("article").filter({ hasText: title })).toHaveCount(2);
    await page.reload();
    await expect(page.getByRole("article").filter({ hasText: title })).toHaveCount(2);
    const stored = await apiStories(request, project.id);
    expect(new Set(stored.map((s) => s.id)).size).toBe(2);
    expect(String(stored[0]?.id)).toMatch(UUID);
  });

  test("AC08: histórias de um projeto não aparecem em outro (tela e API)", async ({
    page,
    request,
  }) => {
    const a = await createProject(request, "hist-iso-a");
    const b = await createProject(request, "hist-iso-b");
    const title = unique("so-do-A");

    await page.goto(`/projetos/${a.id}`);
    await createViaUi(page, { title, priority: "Média", criteria: ["x"] });

    await page.goto(`/projetos/${b.id}`);
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();
    await expect(page.getByText(title)).toHaveCount(0);

    // navegação sem recarregar: lista -> projeto A -> lista -> projeto B
    await page.goto("/projetos");
    await page.getByRole("link", { name: new RegExp(a.name) }).click();
    await expect(page.getByRole("article").filter({ hasText: title })).toHaveCount(1);
    await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Projetos" })
      .click();
    await page.getByRole("link", { name: new RegExp(b.name) }).click();
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();

    expect(await apiStories(request, b.id)).toHaveLength(0);
    expect(await apiStories(request, a.id)).toHaveLength(1);
  });

  test("AC09: falha de comunicação ao salvar: erro, sem sucesso, sem item fantasma e nada gravado", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-ac09");
    await page.goto(`/projetos/${project.id}`);
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();
    await page.route("**/stories", (route) =>
      route.request().method() === "POST" ? route.abort("failed") : route.continue(),
    );
    const title = unique("falha");
    await openForm(page);
    await fillStory(page, { title, priority: "Alta", criteria: ["a"] });

    await saveStory(page);

    await expect(page.getByRole("alert")).toContainText(
      "Não foi possível se comunicar com o servidor",
    );
    await expect(page.getByText(/criada com sucesso/)).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByLabel(/^Título/)).toHaveValue(title);

    await page.unroute("**/stories");
    await page.reload();
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();
    expect(await apiStories(request, project.id)).toHaveLength(0);
  });

  test("AC09: erro 500 ao salvar não confirma sucesso e o reenvio funciona", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-500");
    await page.goto(`/projetos/${project.id}`);
    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();
    await page.route("**/stories", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: { code: "internal_error", message: "Erro interno do servidor." },
            }),
          })
        : route.continue(),
    );
    const title = unique("erro500");
    await openForm(page);
    await fillStory(page, { title, priority: "Alta", criteria: ["a"] });

    await saveStory(page);
    await expect(page.getByRole("alert")).toContainText("O servidor encontrou um erro");
    await expect(page.getByText(/criada com sucesso/)).toHaveCount(0);

    await page.unroute("**/stories");
    await saveStory(page);
    await expect(page.getByText(`História “${title}” criada com sucesso.`)).toBeVisible();
    expect(await apiStories(request, project.id)).toHaveLength(1);
  });

  test("falha ao listar mostra erro e 'Tentar novamente' recupera", async ({ page, request }) => {
    const project = await createProject(request, "hist-lista");
    await page.route("**/stories", (route) =>
      route.request().method() === "GET" ? route.abort("failed") : route.continue(),
    );
    await page.goto(`/projetos/${project.id}`);
    await expect(page.getByText("Não foi possível carregar as histórias.")).toBeVisible();
    await expect(page.getByText("Nenhuma história neste projeto")).toHaveCount(0);

    await page.unroute("**/stories");
    await page.getByRole("button", { name: "Tentar novamente" }).click();

    await expect(page.getByText("Nenhuma história neste projeto")).toBeVisible();
  });

  test("teclado: é possível cadastrar uma história sem usar o mouse", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, "Fluxo de teclado é relevante no desktop");
    const project = await createProject(request, "hist-teclado");
    const title = unique("teclado");
    await page.goto(`/projetos/${project.id}`);
    await page.getByRole("button", { name: "Cadastrar primeira história" }).focus();
    await page.keyboard.press("Enter");

    await expect(page.getByLabel(/^Título/)).toBeFocused();
    await page.keyboard.type(title);
    await page.keyboard.press("Tab"); // descrição
    await page.keyboard.press("Tab"); // prioridade (grupo de opções)
    await page.keyboard.press("ArrowRight"); // Alta -> Média
    await page.getByLabel("Critério 1", { exact: true }).focus();
    await page.keyboard.type("Critério por teclado");
    await page.getByRole("button", { name: "Salvar história" }).focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText(/criada com sucesso/)).toBeVisible();
    const stored = await apiStories(request, project.id);
    expect(stored[0]).toMatchObject({ title, acceptance_criteria: ["Critério por teclado"] });
  });

  test("responsivo: textos longos e formulário aberto não geram rolagem horizontal", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "hist-resp");
    await page.goto(`/projetos/${project.id}`);
    await openForm(page);
    await fillStory(page, {
      title: `E2E ${"Longo".repeat(29)}`,
      description: "Palavra".repeat(60),
      priority: "Alta",
      criteria: ["Critério ".repeat(50).trim(), "SemEspaços".repeat(40)],
    });
    const overflowsForm = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    await saveStory(page);
    await expect(page.getByText(/criada com sucesso/)).toBeVisible();
    const overflowsList = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(overflowsForm).toBe(false);
    expect(overflowsList).toBe(false);
  });
});
