import { useCallback, useEffect, useState } from "react";

import { ApiError, isAbortError } from "../api/client";

export type RequestState<T> =
  { status: "loading" } | { status: "error"; error: ApiError } | { status: "success"; data: T };

/**
 * Carrega dados ao montar e permite repetir a chamada. `load` deve ser estável
 * (use `useCallback`); para outro recurso, remonte o componente com `key`.
 */
export function useRequest<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RequestState<T>>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => setState({ status: "success", data }),
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState({
          status: "error",
          error: error instanceof ApiError ? error : new ApiError("unexpected"),
        });
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  /** Altera os dados já carregados (ex.: acrescentar um item confirmado pela API). */
  const mutate = useCallback((update: (data: T) => T) => {
    setState((current) =>
      current.status === "success" ? { status: "success", data: update(current.data) } : current,
    );
  }, []);

  return { state, reload, mutate };
}
