import { ButtonLink } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import { paths } from "../router";

export function NotFoundPage() {
  usePageTitle("Página não encontrada");
  return (
    <>
      <PageHeader title="Página não encontrada" />
      <EmptyState
        title="Não encontramos esta página"
        action={<ButtonLink to={paths.list()}>Ir para projetos</ButtonLink>}
      >
        O endereço pode estar incorreto.
      </EmptyState>
    </>
  );
}
