import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";
import { createStory, listStories } from "./stories";
import {
  OTHER_ID,
  PROJECT_ID,
  jsonResponse,
  makeStory,
  mockApi,
  networkFailure,
} from "../test/helpers";

afterEach(() => {
  vi.unstubAllGlobals();
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

describe("listStories", () => {
  it("faz GET no caminho do projeto e devolve as histórias", async () => {
    const fetchMock = mockApi(() => jsonResponse(200, [makeStory()]));

    const stories = await listStories(PROJECT_ID);

    expect(stories).toEqual([makeStory()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(new RegExp(`/api/v1/projects/${PROJECT_ID}/stories$`));
    expect(init?.method).toBe("GET");
  });

  it("recusa itens de outro projeto (isolamento)", async () => {
    mockApi(() => jsonResponse(200, [makeStory(), makeStory({ id: "x", project_id: OTHER_ID })]));
    expect((await failure(listStories(PROJECT_ID))).kind).toBe("unexpected");
  });

  it.each([
    ["não é lista", { id: 1 }],
    ["prioridade desconhecida", [makeStory({ priority: "Urgente" as unknown as "Alta" })]],
    ["critérios que não são texto", [{ ...makeStory(), acceptance_criteria: [1] }]],
    ["campo ausente", [{ ...makeStory(), title: undefined }]],
  ])("resposta inválida (%s) vira erro", async (_name, body) => {
    mockApi(() => jsonResponse(200, body));
    expect((await failure(listStories(PROJECT_ID))).kind).toBe("unexpected");
  });

  it("projeto inexistente vira not_found", async () => {
    mockApi(() => jsonResponse(404, { error: { code: "not_found", message: "x" } }));
    expect((await failure(listStories(PROJECT_ID))).kind).toBe("not_found");
  });
});

describe("createStory", () => {
  const input = {
    title: "Nova",
    priority: "Média" as const,
    acceptance_criteria: ["a", "b"],
  };

  it("faz POST com o corpo exato, sem status", async () => {
    const fetchMock = mockApi(() =>
      jsonResponse(201, makeStory({ title: "Nova", priority: "Média" })),
    );

    const story = await createStory(PROJECT_ID, input);

    expect(story.title).toBe("Nova");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(new RegExp(`/api/v1/projects/${PROJECT_ID}/stories$`));
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(input);
    expect(String(init?.body)).not.toContain("status");
  });

  it("201 sem uma história válida não conta como criado", async () => {
    mockApi(() => jsonResponse(201, { ok: true }));
    expect((await failure(createStory(PROJECT_ID, input))).kind).toBe("unexpected");
  });

  it("201 com história de outro projeto não conta como criado", async () => {
    mockApi(() => jsonResponse(201, makeStory({ project_id: OTHER_ID })));
    expect((await failure(createStory(PROJECT_ID, input))).kind).toBe("unexpected");
  });

  it("falha de rede vira erro 'network'", async () => {
    mockApi(networkFailure);
    expect((await failure(createStory(PROJECT_ID, input))).kind).toBe("network");
  });
});
