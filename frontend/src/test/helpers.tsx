import { render } from "@testing-library/react";
import { vi, type Mock } from "vitest";

import App from "../App";
import type { Project } from "../types/project";
import type { Story } from "../types/story";

export const PROJECT_ID = "3f2b8c1e-5a4d-4b7e-9c10-2d6e8f0a1b34";
export const OTHER_ID = "9a1c7d20-6b3e-4f58-8d21-0c4e5f6a7b89";

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID,
    name: "Portal da Coordenadoria",
    description: "Projeto de exemplo",
    created_at: "2026-10-21T14:45:07.677779Z",
    updated_at: "2026-10-21T14:45:07.677779Z",
    ...overrides,
  };
}

export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function validationBody(field: string | null, code: string, message: string) {
  return {
    error: {
      code: "validation_error",
      message: "Dados inválidos.",
      fields: [{ field, code, message }],
    },
  };
}

export type FetchMock = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

/**
 * Substitui o `fetch` global; cada chamada usa o próximo manipulador (ou o último).
 * Consultas às histórias (`GET .../stories`) recebem lista vazia sem consumir a sequência,
 * para que os testes da US-01 (que não tratam de histórias) não dependam delas.
 */
export function mockFetch(
  ...handlers: Array<(input: string, init: RequestInit) => Response | Promise<Response>>
): FetchMock {
  let index = 0;
  const fn: FetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (/\/stories$/.test(String(input)) && (init?.method ?? "GET") === "GET") {
      return jsonResponse(200, []);
    }
    const handler = handlers[Math.min(index, handlers.length - 1)];
    index += 1;
    if (!handler) throw new Error("fetch chamado sem manipulador configurado");
    return handler(String(input), init ?? {});
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function networkFailure(): never {
  throw new TypeError("Failed to fetch");
}

/** Chamadas feitas ao fetch, no formato `[método, caminho, corpo]`. */
export function calls(fn: FetchMock): Array<[string, string, unknown]> {
  return fn.mock.calls.map(([input, init]) => {
    const url = new URL(String(input));
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
    return [init?.method ?? "GET", url.pathname, body];
  });
}

export function renderAt(path: string) {
  window.history.pushState(null, "", path);
  return render(<App />);
}

// ---------- Histórias (US-02) ----------

export function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: "c1a2b3c4-0000-4000-8000-000000000001",
    project_id: PROJECT_ID,
    title: "Cadastrar história de usuário",
    description: null,
    priority: "Alta",
    acceptance_criteria: ["Salva a história", "Mostra no backlog"],
    status: "A fazer",
    created_at: "2026-10-21T15:00:00Z",
    updated_at: "2026-10-21T15:00:00Z",
    ...overrides,
  };
}

export interface ApiRequest {
  method: string;
  path: string;
  body: unknown;
}

/** `fetch` guiado por método e caminho; qualquer chamada sem resposta definida falha o teste. */
export function mockApi(
  handler: (request: ApiRequest) => Response | Promise<Response> | undefined,
) {
  const fn: FetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: ApiRequest = {
      method: init?.method ?? "GET",
      path: new URL(String(input)).pathname,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    };
    const response = await handler(request);
    if (!response)
      throw new Error(`Chamada sem resposta definida: ${request.method} ${request.path}`);
    return response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** Backend falso em memória: projetos fixos e histórias por projeto, como a API real. */
export function createFakeBackend(projects: Project[]) {
  const stories = new Map<string, Story[]>();
  let counter = 0;
  const storiesOf = (projectId: string) => stories.get(projectId) ?? [];

  const handle = (request: ApiRequest): Response | undefined => {
    const project = request.path.match(/^\/api\/v1\/projects\/([^/]+)(\/stories)?$/);
    if (!project) return undefined;
    const projectId = project[1] ?? "";
    const found = projects.find((p) => p.id === projectId);
    if (!found) return jsonResponse(404, { error: { code: "not_found", message: "x" } });
    if (!project[2]) return request.method === "GET" ? jsonResponse(200, found) : undefined;
    if (request.method === "GET") return jsonResponse(200, storiesOf(projectId));
    if (request.method === "POST") {
      const input = request.body as Pick<
        Story,
        "title" | "description" | "priority" | "acceptance_criteria"
      >;
      counter += 1;
      const story = makeStory({
        id: `c1a2b3c4-0000-4000-8000-${String(counter).padStart(12, "0")}`,
        project_id: projectId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        acceptance_criteria: input.acceptance_criteria,
      });
      stories.set(projectId, [story, ...storiesOf(projectId)]);
      return jsonResponse(201, story);
    }
    return undefined;
  };
  return { stories, handle };
}
