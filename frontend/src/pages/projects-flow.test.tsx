import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OTHER_ID,
  PROJECT_ID,
  calls,
  jsonResponse,
  makeProject,
  mockFetch,
  networkFailure,
  renderAt,
  validationBody,
} from "../test/helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Listagem de projetos (AC01)", () => {
  it("mostra o carregamento e depois os projetos, do mais recente ao mais antigo", async () => {
    mockFetch(() =>
      jsonResponse(200, [
        makeProject({ id: OTHER_ID, name: "Segundo", description: null }),
        makeProject({ name: "Primeiro" }),
      ]),
    );

    renderAt("/projetos");

    expect(screen.getByRole("status")).toHaveTextContent("Carregando projetos…");
    const list = await screen.findByRole("list", { name: undefined });
    const items = within(list).getAllByRole("link");
    expect(items[0]).toHaveTextContent("Segundo");
    expect(items[0]).toHaveTextContent("Sem descrição.");
    expect(items[1]).toHaveTextContent("Primeiro");
    expect(items[1]).toHaveAttribute("href", `/projetos/${PROJECT_ID}`);
    expect(screen.getByText("2 projetos")).toBeInTheDocument();
  });

  it("a raiz '/' também mostra a listagem", async () => {
    mockFetch(() => jsonResponse(200, [makeProject()]));
    renderAt("/");
    expect(await screen.findByText("Portal da Coordenadoria")).toBeInTheDocument();
  });

  it("mostra estado vazio com chamada para criar o primeiro projeto", async () => {
    mockFetch(() => jsonResponse(200, []));

    renderAt("/projetos");

    expect(await screen.findByText("Nenhum projeto ainda")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Novo projeto" }).length).toBeGreaterThan(0);
  });

  it("falha de comunicação mostra erro e permite tentar novamente (AC06)", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(networkFailure, () => jsonResponse(200, [makeProject()]));

    renderAt("/projetos");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar os projetos.");
    expect(alert).toHaveTextContent("Não foi possível se comunicar com o servidor");
    expect(screen.queryByText("Nenhum projeto ainda")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Portal da Coordenadoria")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("erro 500 mostra mensagem genérica", async () => {
    mockFetch(() => jsonResponse(500, { error: { code: "internal_error", message: "x" } }));
    renderAt("/projetos");
    expect(await screen.findByRole("alert")).toHaveTextContent("O servidor encontrou um erro");
  });

  it("clicar em um projeto abre os detalhes", async () => {
    const user = userEvent.setup();
    mockFetch(
      () => jsonResponse(200, [makeProject()]),
      () => jsonResponse(200, makeProject()),
    );

    renderAt("/projetos");
    await user.click(await screen.findByRole("link", { name: /Portal da Coordenadoria/ }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Portal da Coordenadoria" }),
    ).toBeVisible();
    expect(window.location.pathname).toBe(`/projetos/${PROJECT_ID}`);
  });
});

describe("Criação de projeto", () => {
  async function fill(name: string, description = "") {
    const user = userEvent.setup();
    const nameField = await screen.findByLabelText(/Nome do projeto/);
    await user.click(nameField);
    if (name) await user.paste(name);
    if (description) {
      await user.click(screen.getByLabelText(/Descrição/));
      await user.paste(description);
    }
    return user;
  }

  it("campos têm rótulos associados e o nome é obrigatório", async () => {
    mockFetch();
    renderAt("/projetos/novo");

    expect(await screen.findByLabelText(/Nome do projeto/)).toBeRequired();
    expect(screen.getByLabelText(/Descrição/)).not.toBeRequired();
    expect(screen.getByRole("heading", { level: 1, name: "Novo projeto" })).toBeInTheDocument();
  });

  it("nome vazio: mostra mensagem clara, foca o campo e não chama a API (AC02)", async () => {
    const fetchMock = mockFetch();
    renderAt("/projetos/novo");
    const user = await fill("   ");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    const field = screen.getByLabelText(/Nome do projeto/);
    expect(screen.getByText("O nome não pode ficar vazio.")).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("nome com 101 caracteres: bloqueia, mostra o limite e o contador (AC03)", async () => {
    const fetchMock = mockFetch();
    renderAt("/projetos/novo");
    const user = await fill("a".repeat(101));

    expect(screen.getByText(/101\/100/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    expect(screen.getByText("O nome deve ter no máximo 100 caracteres.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("descrição com 1001 caracteres: bloqueia e mostra o limite (AC03)", async () => {
    const fetchMock = mockFetch();
    renderAt("/projetos/novo");
    const user = await fill("Projeto", "d".repeat(1001));

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    expect(screen.getByText("A descrição deve ter no máximo 1000 caracteres.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/)).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aceita nome com 100 e descrição com 1000 caracteres", async () => {
    const fetchMock = mockFetch(
      () => jsonResponse(201, makeProject()),
      () => jsonResponse(200, [makeProject()]),
    );
    renderAt("/projetos/novo");
    const user = await fill("n".repeat(100), "d".repeat(1000));

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    await screen.findByRole("status");
    expect(calls(fetchMock)[0]).toEqual([
      "POST",
      "/api/v1/projects",
      { name: "n".repeat(100), description: "d".repeat(1000) },
    ]);
  });

  it("sucesso: envia o corpo normalizado, volta à listagem e confirma só depois da API (AC01)", async () => {
    const fetchMock = mockFetch(
      () => jsonResponse(201, makeProject({ name: "Alfa" })),
      () => jsonResponse(200, [makeProject({ name: "Alfa" })]),
    );
    renderAt("/projetos/novo");
    const user = await fill("  Alfa  ", "Texto");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    expect(await screen.findByText("Projeto “Alfa” criado com sucesso.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Alfa/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/projetos");
    expect(calls(fetchMock)[0]).toEqual([
      "POST",
      "/api/v1/projects",
      { name: "Alfa", description: "Texto" },
    ]);
  });

  it("sem descrição, o corpo não inclui o campo", async () => {
    const fetchMock = mockFetch(
      () => jsonResponse(201, makeProject()),
      () => jsonResponse(200, []),
    );
    renderAt("/projetos/novo");
    const user = await fill("Alfa");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(calls(fetchMock)[0]?.[2]).toEqual({ name: "Alfa" });
  });

  it("falha de comunicação: mostra erro, NÃO mostra sucesso e preserva o que foi digitado (AC06)", async () => {
    const fetchMock = mockFetch(networkFailure);
    renderAt("/projetos/novo");
    const user = await fill("Alfa", "Texto");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível salvar o projeto.");
    expect(alert).toHaveTextContent("Não foi possível se comunicar com o servidor");
    expect(screen.queryByText(/criado com sucesso/)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/projetos/novo");
    expect(screen.getByLabelText(/Nome do projeto/)).toHaveValue("Alfa");
    expect(screen.getByLabelText(/Descrição/)).toHaveValue("Texto");
    expect(screen.getByRole("button", { name: "Criar projeto" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("erro 500 não é apresentado como sucesso", async () => {
    mockFetch(() => jsonResponse(500, { error: { code: "internal_error", message: "x" } }));
    renderAt("/projetos/novo");
    const user = await fill("Alfa");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("O servidor encontrou um erro");
    expect(screen.queryByText(/criado com sucesso/)).not.toBeInTheDocument();
  });

  it("201 com corpo inválido não é tratado como sucesso", async () => {
    mockFetch(() => jsonResponse(201, { qualquer: "coisa" }));
    renderAt("/projetos/novo");
    const user = await fill("Alfa");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("resposta inesperada");
    expect(window.location.pathname).toBe("/projetos/novo");
  });

  it("422 do servidor aparece no campo correspondente (AC07)", async () => {
    mockFetch(() =>
      jsonResponse(
        422,
        validationBody("name", "too_long", "O nome deve ter no máximo 100 caracteres."),
      ),
    );
    renderAt("/projetos/novo");
    const user = await fill("Alfa");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));

    expect(
      await screen.findByText("O nome deve ter no máximo 100 caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do projeto/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/criado com sucesso/)).not.toBeInTheDocument();
  });

  it("durante o envio mostra 'Criando…', desabilita o botão e evita envio duplicado", async () => {
    let release: (response: Response) => void = () => {};
    const fetchMock = mockFetch(
      () => new Promise<Response>((resolve) => (release = resolve)) as unknown as Response,
      () => jsonResponse(200, []),
    );
    renderAt("/projetos/novo");
    const user = await fill("Alfa");

    await user.click(screen.getByRole("button", { name: "Criar projeto" }));
    const busy = screen.getByRole("button", { name: "Criando…" });
    expect(busy).toBeDisabled();
    await user.click(busy);
    await user.keyboard("{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release(jsonResponse(201, makeProject()));
    expect(await screen.findByText(/criado com sucesso/)).toBeInTheDocument();
  });

  it("'Cancelar' volta para a listagem sem chamar a API de criação", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, []));
    renderAt("/projetos/novo");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("link", { name: "Cancelar" }));

    expect(await screen.findByText("Nenhum projeto ainda")).toBeInTheDocument();
    expect(calls(fetchMock).every(([method]) => method === "GET")).toBe(true);
  });
});

describe("Detalhes do projeto (AC05)", () => {
  it("mostra identificador, nome, descrição e data de criação", async () => {
    mockFetch(() => jsonResponse(200, makeProject()));

    renderAt(`/projetos/${PROJECT_ID}`);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando projeto…");
    const section = await screen.findByRole("region", { name: "Detalhes do projeto" });
    expect(within(section).getByText(PROJECT_ID)).toBeInTheDocument();
    expect(within(section).getByText("Portal da Coordenadoria")).toBeInTheDocument();
    expect(within(section).getByText("Projeto de exemplo")).toBeInTheDocument();
    const created = within(section).getByText(/2026/);
    expect(created.tagName).toBe("TIME");
    expect(created).toHaveAttribute("datetime", "2026-10-21T14:45:07.677779Z");
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      `/projetos/${PROJECT_ID}/editar`,
    );
  });

  it("projeto sem descrição mostra 'Sem descrição.'", async () => {
    mockFetch(() => jsonResponse(200, makeProject({ description: null })));
    renderAt(`/projetos/${PROJECT_ID}`);
    expect(await screen.findByText("Sem descrição.")).toBeInTheDocument();
  });

  it("projeto inexistente (404) mostra mensagem e caminho de volta", async () => {
    mockFetch(() => jsonResponse(404, { error: { code: "not_found", message: "x" } }));

    renderAt(`/projetos/${OTHER_ID}`);

    expect(await screen.findByText("Este projeto não existe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para projetos" })).toBeInTheDocument();
  });

  it("identificador malformado na URL nem chega à API", async () => {
    const fetchMock = mockFetch();
    renderAt("/projetos/abc");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falha de comunicação mostra erro com 'Tentar novamente' (AC06)", async () => {
    const user = userEvent.setup();
    mockFetch(networkFailure, () => jsonResponse(200, makeProject()));

    renderAt(`/projetos/${PROJECT_ID}`);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o projeto.",
    );
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Portal da Coordenadoria" }),
    ).toBeVisible();
  });
});

describe("Edição de projeto", () => {
  it("abre com os valores atuais preenchidos", async () => {
    mockFetch(() => jsonResponse(200, makeProject()));

    renderAt(`/projetos/${PROJECT_ID}/editar`);

    expect(await screen.findByLabelText(/Nome do projeto/)).toHaveValue("Portal da Coordenadoria");
    expect(screen.getByLabelText(/Descrição/)).toHaveValue("Projeto de exemplo");
  });

  it("envia só o campo alterado e mostra os dados atualizados nos detalhes (AC04)", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      () => jsonResponse(200, makeProject()),
      () => jsonResponse(200, makeProject({ name: "Portal Digital" })),
      () => jsonResponse(200, makeProject({ name: "Portal Digital" })),
    );
    renderAt(`/projetos/${PROJECT_ID}/editar`);
    const name = await screen.findByLabelText(/Nome do projeto/);

    await user.clear(name);
    await user.paste("  Portal Digital ");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Alterações salvas com sucesso.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Portal Digital" })).toBeVisible();
    expect(calls(fetchMock)[1]).toEqual([
      "PATCH",
      `/api/v1/projects/${PROJECT_ID}`,
      { name: "Portal Digital" },
    ]);
    expect(window.location.pathname).toBe(`/projetos/${PROJECT_ID}`);
  });

  it("apagar a descrição envia null", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      () => jsonResponse(200, makeProject()),
      () => jsonResponse(200, makeProject({ description: null })),
      () => jsonResponse(200, makeProject({ description: null })),
    );
    renderAt(`/projetos/${PROJECT_ID}/editar`);

    await user.clear(await screen.findByLabelText(/Descrição/));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await screen.findByText("Alterações salvas com sucesso.");
    expect(calls(fetchMock)[1]?.[2]).toEqual({ description: null });
  });

  it("sem alterações não chama a API nem anuncia sucesso", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      () => jsonResponse(200, makeProject()),
      () => jsonResponse(200, makeProject()),
    );
    renderAt(`/projetos/${PROJECT_ID}/editar`);

    await user.click(await screen.findByRole("button", { name: "Salvar alterações" }));

    await screen.findByRole("region", { name: "Detalhes do projeto" });
    // Projeto (edição), projeto (detalhes) e histórias (detalhes): nenhuma gravação.
    expect(calls(fetchMock).map(([method]) => method)).toEqual(["GET", "GET", "GET"]);
    expect(screen.queryByText(/salvas com sucesso/)).not.toBeInTheDocument();
  });

  it("nome apagado é bloqueado antes de chamar a API (AC02)", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(() => jsonResponse(200, makeProject()));
    renderAt(`/projetos/${PROJECT_ID}/editar`);

    await user.clear(await screen.findByLabelText(/Nome do projeto/));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(screen.getByText("O nome não pode ficar vazio.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falha ao salvar: mostra erro, permanece na edição e não confirma sucesso (AC06)", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(200, makeProject()), networkFailure);
    renderAt(`/projetos/${PROJECT_ID}/editar`);
    const name = await screen.findByLabelText(/Nome do projeto/);

    await user.clear(name);
    await user.paste("Novo nome");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o projeto.",
    );
    expect(screen.queryByText(/salvas com sucesso/)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe(`/projetos/${PROJECT_ID}/editar`);
    expect(name).toHaveValue("Novo nome");
  });

  it("projeto removido durante a edição (404 no PATCH) mostra erro, sem sucesso", async () => {
    const user = userEvent.setup();
    mockFetch(
      () => jsonResponse(200, makeProject()),
      () => jsonResponse(404, { error: { code: "not_found", message: "x" } }),
    );
    renderAt(`/projetos/${PROJECT_ID}/editar`);
    const name = await screen.findByLabelText(/Nome do projeto/);

    await user.clear(name);
    await user.paste("Outro");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Projeto não encontrado.");
    expect(screen.queryByText(/salvas com sucesso/)).not.toBeInTheDocument();
  });

  it("projeto inexistente ao abrir a edição mostra mensagem", async () => {
    mockFetch(() => jsonResponse(404, { error: { code: "not_found", message: "x" } }));
    renderAt(`/projetos/${OTHER_ID}/editar`);
    expect(await screen.findByText("Este projeto não existe")).toBeInTheDocument();
  });
});

describe("Navegação e acessibilidade básica", () => {
  it("tem link para pular ao conteúdo, navegação principal e região principal", async () => {
    mockFetch(() => jsonResponse(200, []));
    renderAt("/projetos");

    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute(
      "href",
      "#conteudo",
    );
    expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
    expect(screen.getByRole("link", { name: "Projetos", current: "page" })).toBeInTheDocument();
    await screen.findByText("Nenhum projeto ainda");
  });

  it("cada página tem um único h1 e o foco vai para ele", async () => {
    mockFetch(() => jsonResponse(200, []));
    renderAt("/projetos");

    const h1 = screen.getByRole("heading", { level: 1, name: "Projetos" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(h1).toHaveFocus();
    await screen.findByText("Nenhum projeto ainda");
  });

  it("o título do documento acompanha a página", async () => {
    mockFetch(() => jsonResponse(200, []));
    renderAt("/projetos/novo");
    await waitFor(() => expect(document.title).toBe("Novo projeto · ScrumFlow"));
  });

  it("endereço desconhecido mostra página não encontrada", () => {
    mockFetch();
    renderAt("/qualquer-coisa");
    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
  });
});
