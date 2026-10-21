import { useCallback } from "react";

import { getProject } from "../api/projects";
import { Alert } from "../components/Alert";
import { Button, ButtonLink } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StoriesSection } from "../components/StoriesSection";
import { LoadingBlock } from "../components/Skeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useRequest } from "../hooks/useRequest";
import { formatDateTime } from "../lib/format";
import { paths, useFlash } from "../router";

export function ProjectDetailPage({ id }: { id: string }) {
  const flash = useFlash();
  const load = useCallback((signal: AbortSignal) => getProject(id, signal), [id]);
  const { state, reload } = useRequest(load);
  const title = state.status === "success" ? state.data.name : "Projeto";
  usePageTitle(title);

  const backToList = [{ label: "Projetos", to: paths.list() }];

  if (state.status === "loading") {
    return (
      <>
        <PageHeader title="Projeto" breadcrumbs={[...backToList, { label: "Detalhes" }]} />
        <LoadingBlock label="Carregando projeto…" />
      </>
    );
  }

  if (state.status === "error") {
    const notFound = state.error.kind === "not_found";
    return (
      <>
        <PageHeader
          title={notFound ? "Projeto não encontrado" : "Projeto"}
          breadcrumbs={[...backToList, { label: "Detalhes" }]}
        />
        {notFound ? (
          <EmptyState
            title="Este projeto não existe"
            action={<ButtonLink to={paths.list()}>Voltar para projetos</ButtonLink>}
          >
            O endereço pode estar incorreto ou o projeto não está mais disponível.
          </EmptyState>
        ) : (
          <Alert
            variant="error"
            title="Não foi possível carregar o projeto."
            action={
              <Button variant="secondary" onClick={reload}>
                Tentar novamente
              </Button>
            }
          >
            {state.error.message}
          </Alert>
        )}
      </>
    );
  }

  const project = state.data;
  return (
    <>
      <PageHeader
        title={project.name}
        breadcrumbs={[...backToList, { label: project.name }]}
        actions={
          <ButtonLink to={paths.edit(project.id)} variant="secondary">
            Editar
          </ButtonLink>
        }
      />
      {flash ? <Alert variant="success">{flash}</Alert> : null}
      <section className="card" aria-label="Detalhes do projeto">
        <dl className="details">
          <div className="details__item">
            <dt>Identificador</dt>
            <dd className="details__mono">{project.id}</dd>
          </div>
          <div className="details__item">
            <dt>Nome</dt>
            <dd>{project.name}</dd>
          </div>
          <div className="details__item">
            <dt>Descrição</dt>
            <dd className="details__text">
              {project.description ?? <span className="muted">Sem descrição.</span>}
            </dd>
          </div>
          <div className="details__item">
            <dt>Data de criação</dt>
            <dd>
              <time dateTime={project.created_at}>{formatDateTime(project.created_at)}</time>
            </dd>
          </div>
        </dl>
      </section>
      <StoriesSection key={project.id} projectId={project.id} />
    </>
  );
}
