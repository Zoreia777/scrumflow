export const DEFAULT_API_BASE_URL = "http://localhost:8000";

/** Normaliza o endereço da API: usa o padrão se vazio e remove barras no final. */
export function resolveApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
