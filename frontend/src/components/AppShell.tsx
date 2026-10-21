import type { ReactNode } from "react";

import { Link, paths, type Route } from "../router";

function LogoMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M9 21c3.5 0 3.5-4 7-4s3.5 4 7 4M9 14.5c3.5 0 3.5-4 7-4s3.5 4 7 4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const inProjects = route.name !== "not-found";
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Link to={paths.list()} className="brand">
            <LogoMark />
            <span className="brand__name">ScrumFlow</span>
          </Link>
          <nav aria-label="Principal" className="topbar__nav">
            <Link to={paths.list()} aria-current={inProjects ? "page" : undefined}>
              Projetos
            </Link>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">ScrumFlow · Sprint 1</footer>
    </div>
  );
}
