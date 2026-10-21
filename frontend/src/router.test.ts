import { describe, expect, it } from "vitest";

import { matchRoute } from "./router";

const ID = "3f2b8c1e-5a4d-4b7e-9c10-2d6e8f0a1b34";

describe("matchRoute", () => {
  it.each(["/", "/projetos", "/projetos/"])("%s é a listagem", (path) => {
    expect(matchRoute(path)).toEqual({ name: "list" });
  });

  it("reconhece criação, detalhes e edição", () => {
    expect(matchRoute("/projetos/novo")).toEqual({ name: "new" });
    expect(matchRoute(`/projetos/${ID}`)).toEqual({ name: "detail", id: ID });
    expect(matchRoute(`/projetos/${ID}/editar`)).toEqual({ name: "edit", id: ID });
  });

  it.each(["/outra", "/projetos/abc", `/projetos/${ID}/x`, `/projetos/${ID}/editar/y`])(
    "%s não existe",
    (path) => {
      expect(matchRoute(path)).toEqual({ name: "not-found" });
    },
  );
});
