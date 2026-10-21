import type { Project, ProjectCreateInput, ProjectUpdateInput } from "../types/project";

import { ApiError, apiRequest } from "./client";

const BASE_PATH = "/api/v1/projects";

function isProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    (v.description === null || typeof v.description === "string") &&
    typeof v.created_at === "string" &&
    typeof v.updated_at === "string"
  );
}

/** Garante o formato da resposta: nada é tratado como sucesso se o corpo não for um projeto. */
function asProject(value: unknown): Project {
  if (!isProject(value)) {
    throw new ApiError("unexpected");
  }
  return value;
}

export async function listProjects(signal?: AbortSignal): Promise<Project[]> {
  const payload = await apiRequest("GET", BASE_PATH, { signal });
  if (!Array.isArray(payload) || !payload.every(isProject)) {
    throw new ApiError("unexpected");
  }
  return payload;
}

export async function getProject(id: string, signal?: AbortSignal): Promise<Project> {
  return asProject(await apiRequest("GET", `${BASE_PATH}/${encodeURIComponent(id)}`, { signal }));
}

export async function createProject(input: ProjectCreateInput): Promise<Project> {
  return asProject(await apiRequest("POST", BASE_PATH, { body: input }));
}

export async function updateProject(id: string, input: ProjectUpdateInput): Promise<Project> {
  return asProject(
    await apiRequest("PATCH", `${BASE_PATH}/${encodeURIComponent(id)}`, { body: input }),
  );
}
