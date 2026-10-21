export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;

export interface ProjectFormErrors {
  name?: string;
  description?: string;
}

export interface ProjectFormValues {
  name: string;
  /** `null` quando a descrição fica em branco. */
  description: string | null;
}

/** Mesma regra do backend: normalização Unicode NFC e remoção de espaços nas pontas. */
export function normalizeText(value: string): string {
  return value.normalize("NFC").trim();
}

/** Conta caracteres (pontos de código), como o backend, e não unidades UTF-16. */
export function countCharacters(value: string): number {
  return Array.from(value).length;
}

export function validateProjectForm(raw: { name: string; description: string }): {
  errors: ProjectFormErrors;
  values: ProjectFormValues;
} {
  const name = normalizeText(raw.name);
  const description = normalizeText(raw.description);
  const errors: ProjectFormErrors = {};

  if (name.length === 0) {
    errors.name = "O nome não pode ficar vazio.";
  } else if (countCharacters(name) > NAME_MAX_LENGTH) {
    errors.name = `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  }

  if (countCharacters(description) > DESCRIPTION_MAX_LENGTH) {
    errors.description = `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  return { errors, values: { name, description: description === "" ? null : description } };
}
