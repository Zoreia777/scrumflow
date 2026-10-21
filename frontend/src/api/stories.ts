import { PRIORITIES, type Story, type StoryCreateInput } from "../types/story";

import { ApiError, apiRequest } from "./client";

function storiesPath(projectId: string): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/stories`;
}

function isStory(value: unknown): value is Story {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.project_id === "string" &&
    typeof v.title === "string" &&
    (v.description === null || typeof v.description === "string") &&
    typeof v.priority === "string" &&
    (PRIORITIES as readonly string[]).includes(v.priority) &&
    Array.isArray(v.acceptance_criteria) &&
    v.acceptance_criteria.every((item) => typeof item === "string") &&
    typeof v.status === "string" &&
    typeof v.created_at === "string" &&
    typeof v.updated_at === "string"
  );
}

/**
 * Valida o formato e o vínculo com o projeto pedido: uma resposta que não seja uma história
 * deste projeto nunca vira sucesso nem aparece na tela (isolamento entre projetos).
 */
function asStory(value: unknown, projectId: string): Story {
  if (!isStory(value) || value.project_id !== projectId) {
    throw new ApiError("unexpected");
  }
  return value;
}

export async function listStories(projectId: string, signal?: AbortSignal): Promise<Story[]> {
  const payload = await apiRequest("GET", storiesPath(projectId), { signal });
  if (!Array.isArray(payload)) {
    throw new ApiError("unexpected");
  }
  return payload.map((item) => asStory(item, projectId));
}

export async function createStory(projectId: string, input: StoryCreateInput): Promise<Story> {
  return asStory(await apiRequest("POST", storiesPath(projectId), { body: input }), projectId);
}
