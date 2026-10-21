import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  children: string;
  action?: ReactNode;
}

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__text">{children}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
