import { useEffect, useRef, type ReactNode } from "react";

import { Link } from "../router";

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Ao trocar de página, leva o foco ao título para quem usa leitor de tela ou teclado.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <header className="page-header">
      {breadcrumbs ? (
        <nav aria-label="Trilha de navegação" className="breadcrumbs">
          <ol>
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label}>
                {crumb.to ? (
                  <Link to={crumb.to}>{crumb.label}</Link>
                ) : (
                  <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="page-header__row">
        <div className="page-header__text">
          <h1 ref={headingRef} tabIndex={-1} className="page-header__title">
            {title}
          </h1>
          {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
