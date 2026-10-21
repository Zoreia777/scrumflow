import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "./client";
import { createProject, getProject, listProjects, updateProject } from "./projects";
import {
  PROJECT_ID,
  calls,
  jsonResponse,
  makeProject,
  mockFetch,
  networkFailure,
  validationBody,
} from "../test/helpers";

afterEach(() => {
  vi.useRealTimers();
});

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("a chamada deveria ter falhado");
}

describe("apiRequest: classificação de erros", () => {
  it("falha de rede vira erro 'network' com mensagem clara", async () => {
    mockFetch(networkFailure);

    const error = await failure(apiRequest("GET", "/api/v1/projects"));

    expect(error.kind).toBe("network");
    expect(error.message).toMatch(/Não foi possível se comunicar com o servidor/);
    expect(error.retryable).toBe(true);
  });

  it("422 carrega os erros por campo enviados pela API", async () => {
    mockFetch(() =>
      jsonResponse(422, validationBody("name", "blank", "O nome não pode ficar vazio.")),
    );

    const error = await failure(apiRequest("POST", "/api/v1/projects", { body: {} }));

    expect(error.kind).toBe("validation");
    expect(error.fields).toEqual([
      { field: "name", code: "blank", message: "O nome não pode ficar vazio." },
    ]);
    expect(error.retryable).toBe(false);
  });

  it("404 vira 'not_found'", async () => {
    mockFetch(() => jsonResponse(404, { error: { code: "not_found", message: "x" } }));
    expect((await failure(apiRequest("GET", "/x"))).kind).toBe("not_found");
  });

  it("500 vira 'server' sem expor o corpo recebido", async () => {
    mockFetch(() => jsonResponse(500, { error: { code: "internal_error", message: "SEGREDO" } }));

    const error = await failure(apiRequest("GET", "/x"));

    expect(error.kind).toBe("server");
    expect(error.message).not.toContain("SEGREDO");
  });

  it("resposta 200 sem JSON válido não é tratada como sucesso", async () => {
    mockFetch(() => new Response("<html>proxy</html>", { status: 200 }));
    expect((await failure(apiRequest("GET", "/x"))).kind).toBe("unexpected");
  });

  it("status inesperado (ex.: 403) vira 'unexpected'", async () => {
    mockFetch(() => jsonResponse(403, {}));
    expect((await failure(apiRequest("GET", "/x"))).kind).toBe("unexpected");
  });

  it("expira após o tempo limite", async () => {
    vi.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("a", "AbortError")));
        }) as unknown as Response,
    );

    const pending = failure(apiRequest("GET", "/x", { timeoutMs: 1000 }));
    await vi.advanceTimersByTimeAsync(1000);

    expect((await pending).kind).toBe("timeout");
  });

  it("cancelamento pedido por quem chamou não vira erro de rede", async () => {
    const controller = new AbortController();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("a", "AbortError")));
        }) as unknown as Response,
    );

    const pending = apiRequest("GET", "/x", { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("funções de projetos", () => {
  it("listProjects: GET na coleção e valida o formato", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, [makeProject()]));

    const projects = await listProjects();

    expect(projects).toHaveLength(1);
    expect(calls(fetchMock)).toEqual([["GET", "/api/v1/projects", undefined]]);
  });

  it("listProjects: corpo que não é lista de projetos é erro", async () => {
    mockFetch(() => jsonResponse(200, [{ id: 1 }]));
    expect((await failure(listProjects())).kind).toBe("unexpected");
  });

  it("getProject: GET pelo identificador", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, makeProject()));

    expect((await getProject(PROJECT_ID)).id).toBe(PROJECT_ID);
    expect(calls(fetchMock)[0]).toEqual(["GET", `/api/v1/projects/${PROJECT_ID}`, undefined]);
  });

  it("createProject: POST com o corpo e exige projeto na resposta", async () => {
    const fetchMock = mockFetch(() => jsonResponse(201, makeProject({ name: "Novo" })));

    const created = await createProject({ name: "Novo" });

    expect(created.name).toBe("Novo");
    expect(calls(fetchMock)).toEqual([["POST", "/api/v1/projects", { name: "Novo" }]]);
  });

  it("createProject: 201 com corpo inválido não conta como criado", async () => {
    mockFetch(() => jsonResponse(201, { ok: true }));
    expect((await failure(createProject({ name: "Novo" }))).kind).toBe("unexpected");
  });

  it("updateProject: PATCH parcial", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, makeProject()));

    await updateProject(PROJECT_ID, { description: null });

    expect(calls(fetchMock)).toEqual([
      ["PATCH", `/api/v1/projects/${PROJECT_ID}`, { description: null }],
    ]);
  });
});
