export const PRIORITIES = ["Alta", "Média", "Baixa"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** História de usuário como devolvida por `/api/v1/projects/{id}/stories`. */
export interface Story {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  acceptance_criteria: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

/** Corpo de criação. O status é definido pelo servidor e nunca é enviado. */
export interface StoryCreateInput {
  title: string;
  description?: string;
  priority: Priority;
  acceptance_criteria: string[];
}
