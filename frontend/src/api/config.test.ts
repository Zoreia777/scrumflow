import { describe, expect, it } from "vitest";

import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from "./config";

describe("resolveApiBaseUrl", () => {
  it("usa o endereço padrão quando a variável não está definida", () => {
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl("   ")).toBe(DEFAULT_API_BASE_URL);
  });

  it("remove espaços e barras finais", () => {
    expect(resolveApiBaseUrl("  http://api.local:9000// ")).toBe("http://api.local:9000");
  });
});
