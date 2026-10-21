import { describe, expect, it } from "vitest";

import { countCharacters, normalizeText, validateProjectForm } from "./project";

describe("normalizeText", () => {
  it("remove espaços nas extremidades e preserva os internos", () => {
    expect(normalizeText("  Meu   projeto \n")).toBe("Meu   projeto");
  });

  it("normaliza Unicode para NFC", () => {
    expect(normalizeText("Café")).toBe("Café");
  });
});

describe("countCharacters", () => {
  it("conta pontos de código, não unidades UTF-16", () => {
    expect(countCharacters("😀😀")).toBe(2);
  });
});

describe("validateProjectForm", () => {
  it("aceita nome válido e transforma descrição em branco em null", () => {
    const { errors, values } = validateProjectForm({ name: " Alfa ", description: "   " });

    expect(errors).toEqual({});
    expect(values).toEqual({ name: "Alfa", description: null });
  });

  it.each(["", "   ", "\t\n"])("rejeita nome vazio ou só com espaços (%j)", (name) => {
    expect(validateProjectForm({ name, description: "" }).errors.name).toBe(
      "O nome não pode ficar vazio.",
    );
  });

  it("aceita nome com exatamente 100 caracteres", () => {
    expect(validateProjectForm({ name: "a".repeat(100), description: "" }).errors).toEqual({});
  });

  it("rejeita nome com 101 caracteres e informa o limite", () => {
    expect(validateProjectForm({ name: "a".repeat(101), description: "" }).errors.name).toBe(
      "O nome deve ter no máximo 100 caracteres.",
    );
  });

  it("mede o limite depois de remover os espaços das pontas", () => {
    const name = ` ${"a".repeat(100)} `;
    expect(validateProjectForm({ name, description: "" }).errors).toEqual({});
  });

  it("aceita descrição com 1000 e rejeita com 1001 caracteres", () => {
    expect(validateProjectForm({ name: "x", description: "d".repeat(1000) }).errors).toEqual({});
    expect(
      validateProjectForm({ name: "x", description: "d".repeat(1001) }).errors.description,
    ).toBe("A descrição deve ter no máximo 1000 caracteres.");
  });

  it("não conta emoji como dois caracteres", () => {
    expect(validateProjectForm({ name: "😀".repeat(100), description: "" }).errors).toEqual({});
  });
});
