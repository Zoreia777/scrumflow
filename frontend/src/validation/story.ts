import { PRIORITIES, type Priority } from "../types/story";

import { countCharacters, normalizeText } from "./project";

export const TITLE_MAX_LENGTH = 150;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const CRITERION_MAX_LENGTH = 500;
export const CRITERIA_MAX_ITEMS = 20;

export interface StoryFormInput {
  title: string;
  description: string;
  priority: Priority | "";
  criteria: string[];
}

export interface StoryFormErrors {
  title?: string;
  description?: string;
  priority?: string;
  /** Erro do conjunto de critérios (ex.: nenhum informado). */
  criteria?: string;
  /** Erro de cada critério, na mesma ordem da entrada. */
  criteriaItems: (string | undefined)[];
}

export interface StoryFormValues {
  title: string;
  description: string | null;
  priority: Priority;
  acceptance_criteria: string[];
}

export function hasStoryErrors(errors: StoryFormErrors): boolean {
  return Boolean(
    errors.title ||
    errors.description ||
    errors.priority ||
    errors.criteria ||
    errors.criteriaItems.some(Boolean),
  );
}

/**
 * Mesmas regras do backend (ADR-002, seção 7). Critério vazio é recusado, nunca descartado em
 * silêncio. Devolve `values` apenas quando não há erros.
 */
export function validateStoryForm(input: StoryFormInput): {
  errors: StoryFormErrors;
  values: StoryFormValues | null;
} {
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const criteria = input.criteria.map(normalizeText);
  const errors: StoryFormErrors = { criteriaItems: criteria.map(() => undefined) };

  if (title.length === 0) {
    errors.title = "O título não pode ficar vazio.";
  } else if (countCharacters(title) > TITLE_MAX_LENGTH) {
    errors.title = `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`;
  }

  if (countCharacters(description) > DESCRIPTION_MAX_LENGTH) {
    errors.description = `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  if (input.priority === "" || !PRIORITIES.includes(input.priority)) {
    errors.priority = "Selecione a prioridade: Alta, Média ou Baixa.";
  }

  if (criteria.length === 0 || (criteria.length === 1 && criteria[0] === "")) {
    errors.criteria = "Informe ao menos um critério de aceitação.";
  } else if (criteria.length > CRITERIA_MAX_ITEMS) {
    errors.criteria = `Informe no máximo ${CRITERIA_MAX_ITEMS} critérios de aceitação.`;
  } else {
    criteria.forEach((criterion, index) => {
      const position = index + 1;
      if (criterion === "") {
        errors.criteriaItems[index] =
          `O critério de aceitação ${position} não pode ficar vazio. Preencha-o ou remova-o.`;
      } else if (countCharacters(criterion) > CRITERION_MAX_LENGTH) {
        errors.criteriaItems[index] =
          `O critério de aceitação ${position} deve ter no máximo ${CRITERION_MAX_LENGTH} caracteres.`;
      }
    });
  }

  if (hasStoryErrors(errors)) {
    return { errors, values: null };
  }
  return {
    errors,
    values: {
      title,
      description: description === "" ? null : description,
      priority: input.priority as Priority,
      acceptance_criteria: criteria,
    },
  };
}
