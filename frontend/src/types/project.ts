/** Projeto como devolvido por `/api/v1/projects`. */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** Corpo de criação (`POST`). A descrição é omitida quando não informada. */
export interface ProjectCreateInput {
  name: string;
  description?: string;
}

/** Corpo de edição parcial (`PATCH`). `description: null` apaga a descrição. */
export interface ProjectUpdateInput {
  name?: string;
  description?: string | null;
}
