import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OTHER_ID,
  PROJECT_ID,
  createFakeBackend,
  jsonResponse,
  makeProject,
  makeStory,
  mockApi,
  networkFailure,
  renderAt,
  validationBody,
  type ApiRequest,
  type FetchMock,
} from "../test/helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const STORIES_PATH = `/api/v1/projects/${PROJECT_ID}/stories`;

/** Projeto + lista de histórias fixa; `onStories` trata o POST. */
function serve(
  stories: unknown[] | (() => Response),
  onPost?: (request: ApiRequest) => Response | Promise<Response>,
): FetchMock {
  return mockApi((request) => {
    if (request.path === `/api/v1/projects/${PROJECT_ID}`) return jsonResponse(200, makeProject());
    if (request.path === STORIES_PATH && request.method === "GET") {
      return typeof stories === "function" ? stories() : jsonResponse(200, stories);
    }
    if (request.path === STORIES_PATH && request.method === "POST") return onPost?.(request);
    return undefined;
  });
}

function posts(fetchMock: FetchMock): unknown[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)) as unknown);
}

async function openForm() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Nova história" }));
  return user;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>, title = "Minha história") {
  await user.click(screen.getByLabelText(/^Título/));
  await user.paste(title);
  await user.click(screen.getByRole("radio", { name: "Média" }));
  await user.click(screen.getByLabelText("Critério 1"));
  await user.paste("Primeiro critério");
}

const submit = () => screen.getByRole("button", { name: "Salvar história" });

describe("Seção 'Histórias de usuário' na página de detalhes", () => {
  it("mostra a seção, o carregamento e depois as histórias com título, prioridade, status e critérios", async () => {
    serve([
      makeStory({
        title: "Fazer login",
        priority: "Baixa",
        description: "Detalhe da história",
        acceptance_criteria: ["Aceita e-mail", "Recusa senha errada"],
      }),
    ]);

    renderAt(`/projetos/${PROJECT_ID}`);

    const section = await screen.findByRole("region", { name: /Histórias de usuário/ });
    expect(within(section).getByRole("status")).toHaveTextContent("Carregando histórias…");
    const card = await within(section).findByRole("article");
    expect(within(card).getByRole("heading", { level: 3, name: "Fazer login" })).toBeVisible();
    expect(card).toHaveTextContent("Prioridade: Baixa");
    expect(card).toHaveTextContent("Status: A fazer");
    expect(card).toHaveTextContent("Detalhe da história");
    const criteria = within(card).getByRole("list", { name: "Critérios de aceitação" });
    expect(
      within(criteria)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Aceita e-mail", "Recusa senha errada"]);
    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent("(1)");
  });

  it("exibe o status definido pelo backend, sem derivá-lo no frontend", async () => {
    serve([makeStory({ status: "Status do servidor" })]);
    renderAt(`/projetos/${PROJECT_ID}`);
    expect(await screen.findByText(/Status do servidor/)).toBeInTheDocument();
  });

  it("estado vazio com chamada para cadastrar a primeira história", async () => {
    serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);

    expect(await screen.findByText("Nenhuma história neste projeto")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cadastrar primeira história" }));
    expect(screen.getByRole("form", { name: "Nova história" })).toBeInTheDocument();
  });

  it("falha ao carregar mostra erro e 'Tentar novamente' recupera (AC09 / req. 14)", async () => {
    let attempts = 0;
    serve(() => {
      attempts += 1;
      return attempts === 1 ? networkFailure() : jsonResponse(200, [makeStory()]);
    });

    renderAt(`/projetos/${PROJECT_ID}`);

    const alert = await screen.findByText("Não foi possível carregar as histórias.");
    expect(alert).toBeVisible();
    expect(screen.queryByText("Nenhuma história neste projeto")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("article")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("erro 500 ao listar mostra mensagem genérica", async () => {
    serve(() => jsonResponse(500, { error: { code: "internal_error", message: "x" } }));
    renderAt(`/projetos/${PROJECT_ID}`);
    expect(await screen.findByText(/O servidor encontrou um erro/)).toBeInTheDocument();
  });

  it("projeto inexistente não mostra a seção de histórias (AC05)", async () => {
    mockApi(() => jsonResponse(404, { error: { code: "not_found", message: "x" } }));
    renderAt(`/projetos/${OTHER_ID}`);

    expect(await screen.findByText("Este projeto não existe")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Histórias de usuário/ })).not.toBeInTheDocument();
  });
});

describe("Formulário: título e descrição", () => {
  it("abre com o foco no título, campos rotulados e sem prioridade pré-selecionada", async () => {
    serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);

    await openForm();

    expect(screen.getByLabelText(/^Título/)).toHaveFocus();
    expect(screen.getByLabelText(/^Título/)).toBeRequired();
    expect(screen.getByLabelText(/^Descrição/)).not.toBeRequired();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual(["Alta", "Média", "Baixa"]);
    expect(radios.some((r) => (r as HTMLInputElement).checked)).toBe(false);
  });

  it("título vazio: mensagem clara, foco no campo e nenhuma chamada (AC02)", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await user.click(screen.getByLabelText(/^Título/));
    await user.paste("    ");

    await user.click(submit());

    expect(screen.getByText("O título não pode ficar vazio.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Título/)).toHaveFocus();
    expect(posts(fetchMock)).toEqual([]);
  });

  it("título com 151 caracteres é bloqueado e mostra o limite e o contador", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user, "t".repeat(151));
    expect(screen.getByText(/151\/150/)).toBeInTheDocument();

    await user.click(submit());

    expect(screen.getByText("O título deve ter no máximo 150 caracteres.")).toBeInTheDocument();
    expect(posts(fetchMock)).toEqual([]);
  });

  it("título com 150 e descrição com 2000 caracteres são aceitos", async () => {
    const fetchMock = serve([], () => jsonResponse(201, makeStory()));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user, "t".repeat(150));
    await user.click(screen.getByLabelText(/^Descrição/));
    await user.paste("d".repeat(2000));

    await user.click(submit());

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
  });

  it("descrição com 2001 caracteres é bloqueada e foca o campo", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);
    await user.click(screen.getByLabelText(/^Descrição/));
    await user.paste("d".repeat(2001));

    await user.click(submit());

    expect(screen.getByText("A descrição deve ter no máximo 2000 caracteres.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Descrição/)).toHaveFocus();
    expect(posts(fetchMock)).toEqual([]);
  });

  it("prioridade não escolhida é recusada com mensagem (AC04 na interface)", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await user.click(screen.getByLabelText(/^Título/));
    await user.paste("Sem prioridade");
    await user.click(screen.getByLabelText("Critério 1"));
    await user.paste("ok");

    await user.click(submit());

    expect(screen.getByText("Selecione a prioridade: Alta, Média ou Baixa.")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();
    expect(posts(fetchMock)).toEqual([]);
  });
});

describe("Formulário: critérios de aceitação dinâmicos", () => {
  async function setup() {
    serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    return openForm();
  }

  it("começa com um critério e não permite remover o último", async () => {
    await setup();

    expect(screen.getAllByLabelText(/^Critério \d+$/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remover critério 1" })).toBeDisabled();
    expect(screen.getByText("1/20 critérios")).toBeInTheDocument();
  });

  it("adiciona critérios, move o foco para o novo e anuncia a mudança", async () => {
    const user = await setup();

    await user.click(screen.getByRole("button", { name: "Adicionar critério" }));

    expect(screen.getAllByLabelText(/^Critério \d+$/)).toHaveLength(2);
    expect(screen.getByLabelText("Critério 2")).toHaveFocus();
    expect(screen.getByText("Critério 2 adicionado. Total: 2.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover critério 1" })).toBeEnabled();
  });

  it("remove um critério do meio e preserva o texto dos demais", async () => {
    const user = await setup();
    for (const text of ["um", "dois", "três"]) {
      const fields = screen.getAllByLabelText(/^Critério \d+$/);
      const last = fields[fields.length - 1] as HTMLElement;
      await user.click(last);
      await user.paste(text);
      if (text !== "três")
        await user.click(screen.getByRole("button", { name: "Adicionar critério" }));
    }

    await user.click(screen.getByRole("button", { name: "Remover critério 2" }));

    const fields = screen.getAllByLabelText(/^Critério \d+$/) as HTMLInputElement[];
    expect(fields.map((f) => f.value)).toEqual(["um", "três"]);
    expect(screen.getByText("Critério 2 removido. Total: 2.")).toBeInTheDocument();
    expect(fields[0]).toHaveFocus();
  });

  it("limita a 20 critérios: o botão de adicionar é desativado e o limite é informado", async () => {
    const user = await setup();

    for (let i = 0; i < 19; i += 1) {
      await user.click(screen.getByRole("button", { name: "Adicionar critério" }));
    }

    expect(screen.getAllByLabelText(/^Critério \d+$/)).toHaveLength(20);
    expect(screen.getByRole("button", { name: "Adicionar critério" })).toBeDisabled();
    expect(screen.getByText(/20\/20 critérios · limite atingido/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover critério 20" }));
    expect(screen.getByRole("button", { name: "Adicionar critério" })).toBeEnabled();
  });

  it("sem nenhum critério preenchido: recusa com mensagem (AC03)", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await user.click(screen.getByLabelText(/^Título/));
    await user.paste("Sem critérios");
    await user.click(screen.getByRole("radio", { name: "Alta" }));

    await user.click(submit());

    expect(screen.getByText("Informe ao menos um critério de aceitação.")).toBeInTheDocument();
    expect(screen.getByLabelText("Critério 1")).toHaveFocus();
    expect(posts(fetchMock)).toEqual([]);
  });

  it("critério em branco entre outros é recusado e indicado pelo número (AC03)", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await user.paste("   ");

    await user.click(submit());

    expect(screen.getByText(/O critério de aceitação 2 não pode ficar vazio/)).toBeInTheDocument();
    expect(screen.getByLabelText("Critério 2")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Critério 2")).toHaveFocus();
    expect(posts(fetchMock)).toEqual([]);
  });

  it("critério com 501 caracteres é bloqueado; com 500 é aceito", async () => {
    const fetchMock = serve([], () => jsonResponse(201, makeStory()));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);
    await user.clear(screen.getByLabelText("Critério 1"));
    await user.paste("c".repeat(501));
    expect(screen.getByText(/501\/500/)).toBeInTheDocument();

    await user.click(submit());
    expect(screen.getByText(/deve ter no máximo 500 caracteres/)).toBeInTheDocument();
    expect(posts(fetchMock)).toEqual([]);

    await user.clear(screen.getByLabelText("Critério 1"));
    await user.paste("c".repeat(500));
    await user.click(submit());
    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
  });
});

describe("Formulário: feedback ao corrigir", () => {
  it("cada erro some assim que o usuário corrige o campo correspondente", async () => {
    serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await user.click(submit());
    expect(screen.getByText("O título não pode ficar vazio.")).toBeInTheDocument();
    expect(screen.getByText("Selecione a prioridade: Alta, Média ou Baixa.")).toBeInTheDocument();
    expect(screen.getByText("Informe ao menos um critério de aceitação.")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/^Título/));
    await user.paste("Corrigido");
    expect(screen.queryByText("O título não pode ficar vazio.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).not.toHaveAttribute("aria-invalid");

    await user.click(screen.getByRole("radio", { name: "Baixa" }));
    expect(screen.queryByText(/Selecione a prioridade/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Critério 1"));
    await user.paste("ok");
    expect(
      screen.queryByText("Informe ao menos um critério de aceitação."),
    ).not.toBeInTheDocument();
  });

  it("corrigir um critério remove só o erro dele", async () => {
    serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await user.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await user.click(submit());
    expect(screen.getAllByText(/não pode ficar vazio/)).toHaveLength(2);

    await user.click(screen.getByLabelText("Critério 2"));
    await user.paste("preenchido");

    expect(screen.getAllByText(/não pode ficar vazio/)).toHaveLength(1);
    expect(screen.getByText(/critério de aceitação 3 não pode ficar vazio/)).toBeInTheDocument();
  });
});

describe("Cadastro: sucesso só depois da resposta válida da API", () => {
  it("envia o corpo exato (sem status), mostra sucesso e a nova história com status 'A fazer' (AC01)", async () => {
    const created = makeStory({
      id: "c1a2b3c4-0000-4000-8000-0000000000aa",
      title: "Minha história",
      priority: "Média",
      acceptance_criteria: ["Primeiro critério", "Segundo"],
    });
    const fetchMock = serve([], () => jsonResponse(201, created));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user, "  Minha história  ");
    await user.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await user.paste("  Segundo  ");

    await user.click(submit());

    expect(await screen.findByText("História “Minha história” criada com sucesso.")).toBeVisible();
    expect(posts(fetchMock)).toEqual([
      {
        title: "Minha história",
        priority: "Média",
        acceptance_criteria: ["Primeiro critério", "Segundo"],
      },
    ]);
    const card = await screen.findByRole("article");
    expect(card).toHaveTextContent("Minha história");
    expect(card).toHaveTextContent("Prioridade: Média");
    expect(card).toHaveTextContent("Status: A fazer");
    expect(screen.queryByRole("form", { name: "Nova história" })).not.toBeInTheDocument();
    expect(screen.queryByText("Nenhuma história neste projeto")).not.toBeInTheDocument();
  });

  it("a descrição preenchida é enviada e a em branco é omitida", async () => {
    const fetchMock = serve([], () => jsonResponse(201, makeStory()));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);
    await user.click(screen.getByLabelText(/^Descrição/));
    await user.paste("  com descrição  ");

    await user.click(submit());

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(posts(fetchMock)[0]).toMatchObject({ description: "com descrição" });
  });

  it("enquanto a API não responde: botão ocupado, campos travados e NENHUMA confirmação de sucesso", async () => {
    let release: (response: Response) => void = () => {};
    const fetchMock = serve(
      [],
      () => new Promise<Response>((resolve) => (release = resolve)) as unknown as Response,
    );
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    const busy = screen.getByRole("button", { name: "Salvando…" });
    expect(busy).toBeDisabled();
    expect(screen.getByLabelText(/^Título/)).toBeDisabled();
    expect(screen.queryByText(/criada com sucesso/)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.click(busy);
    await user.keyboard("{Enter}");
    expect(posts(fetchMock)).toHaveLength(1); // sem envio duplicado

    release(jsonResponse(201, makeStory({ title: "Minha história" })));
    expect(await screen.findByText(/criada com sucesso/)).toBeInTheDocument();
  });

  it("um segundo envio disparado enquanto o primeiro está pendente é ignorado", async () => {
    let release: (response: Response) => void = () => {};
    const fetchMock = serve(
      [],
      () => new Promise<Response>((resolve) => (release = resolve)) as unknown as Response,
    );
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);
    const form = screen.getByRole("form", { name: "Nova história" });

    fireEvent.submit(form); // envia pelo evento, sem passar pelo botão desativado
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(posts(fetchMock)).toHaveLength(1);
    release(jsonResponse(201, makeStory({ title: "Minha história" })));
    expect(await screen.findByText(/criada com sucesso/)).toBeInTheDocument();
    expect(posts(fetchMock)).toHaveLength(1);
  });

  it("falha de comunicação: erro claro, sem sucesso, sem item fantasma e com os dados preservados (AC09)", async () => {
    serve([], networkFailure);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível salvar a história.");
    expect(alert).toHaveTextContent("Não foi possível se comunicar com o servidor");
    expect(screen.queryByText(/criada com sucesso/)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveValue("Minha história");
    expect(screen.getByLabelText("Critério 1")).toHaveValue("Primeiro critério");
    expect(screen.getByRole("radio", { name: "Média" })).toBeChecked();
    expect(submit()).toBeEnabled();
  });

  it("erro 500 não é apresentado como sucesso e permite tentar de novo (AC09)", async () => {
    let attempt = 0;
    const fetchMock = serve([], () => {
      attempt += 1;
      return attempt === 1
        ? jsonResponse(500, { error: { code: "internal_error", message: "x" } })
        : jsonResponse(201, makeStory({ title: "Minha história" }));
    });
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("O servidor encontrou um erro");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    await user.click(submit());
    expect(await screen.findByText(/criada com sucesso/)).toBeInTheDocument();
    expect(posts(fetchMock)).toHaveLength(2);
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("201 com corpo que não é uma história não vira sucesso", async () => {
    serve([], () => jsonResponse(201, { qualquer: "coisa" }));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent("resposta inesperada");
    expect(screen.queryByText(/criada com sucesso/)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("201 com história de outro projeto não vira sucesso nem aparece na lista", async () => {
    serve([], () => jsonResponse(201, makeStory({ project_id: OTHER_ID })));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/criada com sucesso/)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("projeto removido durante o cadastro (404): mostra o erro, sem sucesso", async () => {
    serve([], () => jsonResponse(404, { error: { code: "not_found", message: "x" } }));
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent("Projeto não encontrado.");
    expect(screen.queryByText(/criada com sucesso/)).not.toBeInTheDocument();
  });

  it("422 do servidor aparece no campo correspondente (AC04 / backend)", async () => {
    serve([], () =>
      jsonResponse(
        422,
        validationBody(
          "priority",
          "invalid_priority",
          "A prioridade deve ser Alta, Média ou Baixa.",
        ),
      ),
    );
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    expect(
      await screen.findByText("A prioridade deve ser Alta, Média ou Baixa."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/criada com sucesso/)).not.toBeInTheDocument();
  });

  it("422 de critérios aparece junto ao grupo de critérios", async () => {
    serve([], () =>
      jsonResponse(
        422,
        validationBody(
          "acceptance_criteria",
          "criteria_required",
          "Informe ao menos um critério de aceitação.",
        ),
      ),
    );
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(submit());

    expect(
      await screen.findByText("Informe ao menos um critério de aceitação."),
    ).toBeInTheDocument();
  });

  it("'Cancelar' fecha o formulário, descarta o rascunho e devolve o foco ao botão", async () => {
    const fetchMock = serve([]);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = await openForm();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("form", { name: "Nova história" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Nova história" })).toHaveFocus(),
    );
    expect(posts(fetchMock)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Nova história" }));
    expect(screen.getByLabelText(/^Título/)).toHaveValue("");
  });
});

describe("Persistência, duplicados e isolamento entre projetos", () => {
  const projectA = makeProject();
  const projectB = makeProject({ id: OTHER_ID, name: "Projeto B" });

  async function createVia(user: ReturnType<typeof userEvent.setup>, title: string) {
    await user.click(
      await screen.findByRole("button", { name: /Nova história|Cadastrar primeira história/ }),
    );
    await fillValid(user, title);
    await user.click(submit());
    await screen.findByText(`História “${title}” criada com sucesso.`);
  }

  it("a história continua com título, prioridade e critérios depois de recarregar (AC07)", async () => {
    const backend = createFakeBackend([projectA, projectB]);
    mockApi(backend.handle);
    const view = renderAt(`/projetos/${PROJECT_ID}`);
    await createVia(userEvent.setup(), "Persistente");
    view.unmount();

    renderAt(`/projetos/${PROJECT_ID}`); // "recarregar a página"

    const card = await screen.findByRole("article");
    expect(card).toHaveTextContent("Persistente");
    expect(card).toHaveTextContent("Prioridade: Média");
    expect(card).toHaveTextContent("Primeiro critério");
  });

  it("aceita títulos repetidos no mesmo projeto, como itens distintos (AC06)", async () => {
    mockApi(createFakeBackend([projectA]).handle);
    renderAt(`/projetos/${PROJECT_ID}`);
    const user = userEvent.setup();

    await createVia(user, "Mesmo título");
    await createVia(user, "Mesmo título");

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => within(c).getByRole("heading").textContent)).toEqual([
      "Mesmo título",
      "Mesmo título",
    ]);
  });

  it("histórias de um projeto não aparecem em outro (AC08)", async () => {
    const backend = createFakeBackend([projectA, projectB]);
    mockApi(backend.handle);
    const viewA = renderAt(`/projetos/${PROJECT_ID}`);
    await createVia(userEvent.setup(), "Só do projeto A");
    viewA.unmount();

    renderAt(`/projetos/${OTHER_ID}`);
    expect(await screen.findByText("Nenhuma história neste projeto")).toBeInTheDocument();
    expect(screen.queryByText("Só do projeto A")).not.toBeInTheDocument();
  });

  it("ao navegar de um projeto para outro pela lista, só as histórias do projeto aberto aparecem (AC08)", async () => {
    const backend = createFakeBackend([projectA, projectB]);
    backend.stories.set(PROJECT_ID, [makeStory({ title: "História de A" })]);
    backend.stories.set(OTHER_ID, [
      makeStory({
        id: "c1a2b3c4-0000-4000-8000-0000000000bb",
        project_id: OTHER_ID,
        title: "História de B",
      }),
    ]);
    mockApi((request) =>
      request.path === "/api/v1/projects"
        ? jsonResponse(200, [projectA, projectB])
        : backend.handle(request),
    );
    renderAt("/projetos");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("link", { name: /Portal da Coordenadoria/ }));
    expect(await screen.findByText("História de A")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Projetos", current: "page" }));
    await user.click(await screen.findByRole("link", { name: /Projeto B/ }));

    expect(await screen.findByText("História de B")).toBeInTheDocument();
    expect(screen.queryByText("História de A")).not.toBeInTheDocument();
  });

  it("uma resposta lenta de outro projeto não contamina a tela (requisição antiga é cancelada)", async () => {
    let releaseA: (response: Response) => void = () => {};
    mockApi((request) => {
      if (request.path === `/api/v1/projects/${PROJECT_ID}`) return jsonResponse(200, projectA);
      if (request.path === `/api/v1/projects/${OTHER_ID}`) return jsonResponse(200, projectB);
      if (request.path === STORIES_PATH) {
        return new Promise<Response>((resolve) => (releaseA = resolve)) as unknown as Response;
      }
      return jsonResponse(200, []);
    });
    const view = renderAt(`/projetos/${PROJECT_ID}`);
    await screen.findByRole("heading", { level: 1, name: projectA.name });
    view.unmount();

    renderAt(`/projetos/${OTHER_ID}`);
    expect(await screen.findByText("Nenhuma história neste projeto")).toBeInTheDocument();
    releaseA(jsonResponse(200, [makeStory({ title: "Atrasada de A" })]));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("Atrasada de A")).not.toBeInTheDocument();
  });
});

describe("Acessibilidade básica da seção", () => {
  it("usa hierarquia de títulos, formulário nomeado e erros ligados aos campos", async () => {
    serve([makeStory()]);
    renderAt(`/projetos/${PROJECT_ID}`);
    await screen.findByRole("article");
    const user = await openForm();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Portal da Coordenadoria");
    expect(screen.getByRole("heading", { level: 2, name: /Histórias de usuário/ })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Nova história" })).toBeVisible();
    expect(screen.getByRole("group", { name: /Prioridade/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Critérios de aceitação/ })).toBeInTheDocument();

    await user.click(submit());
    expect(screen.getByLabelText(/^Título/)).toHaveAccessibleDescription(
      /O título não pode ficar vazio/,
    );
  });
});
