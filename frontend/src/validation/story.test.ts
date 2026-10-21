import { describe, expect, it } from "vitest";

import { validateStoryForm, type StoryFormInput } from "./story";

function input(overrides: Partial<StoryFormInput> = {}): StoryFormInput {
  return {
    title: "Cadastrar",
    description: "",
    priority: "Alta",
    criteria: ["Aparece no backlog"],
    ...overrides,
  };
}

describe("validateStoryForm", () => {
  it("aceita uma história válida e normaliza os textos", () => {
    const { errors, values } = validateStoryForm(
      input({ title: "  Café  ", description: "   ", criteria: ["  um  ", "dois"] }),
    );

    expect(errors.title).toBeUndefined();
    expect(values).toEqual({
      title: "Café",
      description: null,
      priority: "Alta",
      acceptance_criteria: ["um", "dois"],
    });
  });

  it.each(["", "   ", "\n\t"])("rejeita título vazio (%j)", (title) => {
    const { errors, values } = validateStoryForm(input({ title }));
    expect(errors.title).toBe("O título não pode ficar vazio.");
    expect(values).toBeNull();
  });

  it("título: 150 caracteres passa e 151 não", () => {
    expect(validateStoryForm(input({ title: "t".repeat(150) })).errors.title).toBeUndefined();
    expect(validateStoryForm(input({ title: "t".repeat(151) })).errors.title).toBe(
      "O título deve ter no máximo 150 caracteres.",
    );
  });

  it("descrição: 2000 caracteres passa e 2001 não", () => {
    expect(
      validateStoryForm(input({ description: "d".repeat(2000) })).errors.description,
    ).toBeUndefined();
    expect(validateStoryForm(input({ description: "d".repeat(2001) })).errors.description).toBe(
      "A descrição deve ter no máximo 2000 caracteres.",
    );
  });

  it("exige uma prioridade válida", () => {
    const message = "Selecione a prioridade: Alta, Média ou Baixa.";
    expect(validateStoryForm(input({ priority: "" })).errors.priority).toBe(message);
    expect(
      validateStoryForm(input({ priority: "Urgente" as unknown as "Alta" })).errors.priority,
    ).toBe(message);
    for (const priority of ["Alta", "Média", "Baixa"] as const) {
      expect(validateStoryForm(input({ priority })).errors.priority).toBeUndefined();
    }
  });

  it.each([[[]], [[""]], [["   "]]])("exige ao menos um critério (%j)", (criteria) => {
    const { errors, values } = validateStoryForm(input({ criteria }));
    expect(errors.criteria).toBe("Informe ao menos um critério de aceitação.");
    expect(values).toBeNull();
  });

  it("critério vazio entre válidos é recusado, não descartado", () => {
    const { errors, values } = validateStoryForm(input({ criteria: ["ok", "  ", "ok"] }));

    expect(errors.criteriaItems).toEqual([
      undefined,
      "O critério de aceitação 2 não pode ficar vazio. Preencha-o ou remova-o.",
      undefined,
    ]);
    expect(values).toBeNull();
  });

  it("critério: 500 caracteres passa e 501 não", () => {
    expect(validateStoryForm(input({ criteria: ["c".repeat(500)] })).values).not.toBeNull();
    expect(
      validateStoryForm(input({ criteria: ["ok", "c".repeat(501)] })).errors.criteriaItems[1],
    ).toBe("O critério de aceitação 2 deve ter no máximo 500 caracteres.");
  });

  it("até 20 critérios passam e 21 não", () => {
    expect(validateStoryForm(input({ criteria: Array(20).fill("c") })).values).not.toBeNull();
    expect(validateStoryForm(input({ criteria: Array(21).fill("c") })).errors.criteria).toBe(
      "Informe no máximo 20 critérios de aceitação.",
    );
  });

  it("não conta emoji como dois caracteres", () => {
    expect(validateStoryForm(input({ title: "😀".repeat(150) })).errors.title).toBeUndefined();
  });

  it("devolve todos os erros de uma vez", () => {
    const { errors } = validateStoryForm({
      title: "",
      description: "",
      priority: "",
      criteria: [""],
    });
    expect(Object.keys(errors).sort()).toEqual(["criteria", "criteriaItems", "priority", "title"]);
  });
});
