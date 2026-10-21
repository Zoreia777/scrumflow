import { API_BASE_URL } from "./config";

export type ApiErrorKind =
  "network" | "timeout" | "validation" | "not_found" | "server" | "unexpected";

export interface ApiFieldError {
  field: string | null;
  code: string;
  message: string;
}

const MESSAGES: Record<Exclude<ApiErrorKind, "validation">, string> = {
  network: "Não foi possível se comunicar com o servidor. Verifique sua conexão e tente novamente.",
  timeout: "O servidor demorou demais para responder. Tente novamente.",
  not_found: "Projeto não encontrado.",
  server: "O servidor encontrou um erro. Tente novamente em instantes.",
  unexpected: "Recebemos uma resposta inesperada do servidor. Tente novamente.",
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly fields: ApiFieldError[];

  constructor(kind: ApiErrorKind, options: { status?: number; fields?: ApiFieldError[] } = {}) {
    super(kind === "validation" ? "Os dados informados são inválidos." : MESSAGES[kind]);
    this.name = "ApiError";
    this.kind = kind;
    this.status = options.status;
    this.fields = options.fields ?? [];
  }

  /** Falhas em que repetir a mesma operação pode funcionar. */
  get retryable(): boolean {
    return this.kind === "network" || this.kind === "timeout" || this.kind === "server";
  }
}

export const REQUEST_TIMEOUT_MS = 15_000;

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFieldErrors(payload: unknown): ApiFieldError[] {
  if (!isRecord(payload) || !isRecord(payload.error) || !Array.isArray(payload.error.fields)) {
    return [];
  }
  const result: ApiFieldError[] = [];
  for (const item of payload.error.fields) {
    if (isRecord(item) && typeof item.message === "string") {
      result.push({
        field: typeof item.field === "string" ? item.field : null,
        code: typeof item.code === "string" ? item.code : "invalid",
        message: item.message,
      });
    }
  }
  return result;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Faz uma chamada à API e devolve o JSON. Qualquer falha vira `ApiError`;
 * um cancelamento pedido por quem chamou relança o `AbortError` original.
 */
export async function apiRequest(
  method: "GET" | "POST" | "PATCH",
  path: string,
  { body, signal, timeoutMs = REQUEST_TIMEOUT_MS }: RequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) {
    controller.abort();
  }
  signal?.addEventListener("abort", forwardAbort);

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: body === undefined ? { Accept: "application/json" } : jsonHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new ApiError("timeout");
      }
      if (signal?.aborted) {
        throw error;
      }
      throw new ApiError("network");
    }

    const payload = await readJson(response);

    if (response.ok) {
      if (payload === undefined) {
        throw new ApiError("unexpected", { status: response.status });
      }
      return payload;
    }
    if (response.status === 422) {
      throw new ApiError("validation", { status: 422, fields: parseFieldErrors(payload) });
    }
    if (response.status === 404) {
      throw new ApiError("not_found", { status: 404 });
    }
    if (response.status >= 500) {
      throw new ApiError("server", { status: response.status });
    }
    throw new ApiError("unexpected", { status: response.status });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

const jsonHeaders = { Accept: "application/json", "Content-Type": "application/json" };

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
