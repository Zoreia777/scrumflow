import type { ReactNode } from "react";

interface AlertProps {
  variant: "error" | "success" | "info";
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Erros usam role="alert" (anunciado na hora); sucesso e informação usam role="status". */
export function Alert({ variant, title, children, action }: AlertProps) {
  return (
    <div className={`alert alert--${variant}`} role={variant === "error" ? "alert" : "status"}>
      <div className="alert__body">
        {title ? <p className="alert__title">{title}</p> : null}
        {children ? <p className="alert__text">{children}</p> : null}
      </div>
      {action ? <div className="alert__action">{action}</div> : null}
    </div>
  );
}
