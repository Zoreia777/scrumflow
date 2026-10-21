import { useEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

/**
 * Roteador mínimo baseado na History API. Evita uma dependência para quatro rotas
 * e mantém URLs reais (recarregar a página continua funcionando).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Route =
  | { name: "list" }
  | { name: "new" }
  | { name: "detail"; id: string }
  | { name: "edit"; id: string }
  | { name: "not-found" };

export function matchRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "list" };
  if (parts[0] !== "projetos") return { name: "not-found" };
  if (parts.length === 1) return { name: "list" };
  if (parts.length === 2 && parts[1] === "novo") return { name: "new" };
  const id = parts[1] ?? "";
  if (!UUID_PATTERN.test(id)) return { name: "not-found" };
  if (parts.length === 2) return { name: "detail", id };
  if (parts.length === 3 && parts[2] === "editar") return { name: "edit", id };
  return { name: "not-found" };
}

export const paths = {
  list: () => "/projetos",
  new: () => "/projetos/novo",
  detail: (id: string) => `/projetos/${id}`,
  edit: (id: string) => `/projetos/${id}/editar`,
};

let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("popstate", emit);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("popstate", emit);
    }
  };
}

export interface NavigationState {
  flash?: string;
}

export function navigate(path: string, state: NavigationState | null = null, replace = false) {
  if (replace) {
    window.history.replaceState(state, "", path);
  } else {
    window.history.pushState(state, "", path);
  }
  window.scrollTo?.(0, 0);
  emit();
}

/**
 * Mensagem de confirmação enviada por `navigate(..., { flash })`. É lida sem efeito colateral
 * (seguro no StrictMode) e removida do histórico logo após a exibição, para não reaparecer
 * ao recarregar a página.
 */
export function useFlash(): string | undefined {
  const [flash] = useState(() => (window.history.state as NavigationState | null)?.flash);
  useEffect(() => {
    if ((window.history.state as NavigationState | null)?.flash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  return flash;
}

export function useRoute(): Route {
  useSyncExternalStore(subscribe, () => version);
  return matchRoute(window.location.pathname);
}

interface LinkProps {
  to: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
}

export function Link({ to, className, children, ...rest }: LinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
