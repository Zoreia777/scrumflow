import type { ComponentProps } from "react";

import { Link } from "../router";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary";
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  variant?: "primary" | "secondary";
  children: string;
}

export function ButtonLink({ to, variant = "primary", children }: ButtonLinkProps) {
  return (
    <Link to={to} className={`btn btn--${variant}`}>
      {children}
    </Link>
  );
}
