import { useCallback } from "react";

import { getProject, updateProject } from "../api/projects";
import { Alert } from "../components/Alert";
import { Button, ButtonLink } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { ProjectForm } from "../components/ProjectForm";
import { LoadingBlock } from "../components/Skeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useRequest } from "../hooks/useRequest";
import { navigate, paths } from "../router";
import type { Project, ProjectUpdateInput } from "../types/project";
import type { ProjectFormValues } from "../validation/project";

export function EditProjectPage({ id }: { id: string }) {
  usePageTitle("Editar projeto");
  const load = useCallback((signal: AbortSignal) => getProject(id, signal), [id]);
  const { state, reload } = useRequest(load);

  const crumbs = (name?: string) => [
    { label: "Projetos", to: paths.list() },
    ...(name ? [{ label: name, to: paths.detail(id) }] : []),
    { label: "Editar" },
  ];

  if (state.status === "loading") {
    return (
      <>
        <PageHeader title="Editar projeto" breadcrumbs={crumbs()} />
        <LoadingBlock label="Carregando projeto…" />
      </>
    );
  }

  if (state.status === "error") {
    const notFound = state.error.kind === "not_found";
    return (
      <>
        <PageHeader title="Editar projeto" breadcrumbs={crumbs()} />
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

  const handleSubmit = async (values: ProjectFormValues) => {
    const changes = diff(project, values);
    if (changes === null) {
      // Nada mudou: não há gravação, portanto também não há mensagem de sucesso.
      navigate(paths.detail(project.id));
      return;
    }
    await updateProject(project.id, changes);
    navigate(paths.detail(project.id), { flash: "Alterações salvas com sucesso." });
  };

  return (
    <>
      <PageHeader
        title="Editar projeto"
        subtitle="Altere o nome ou a descrição e salve."
        breadcrumbs={crumbs(project.name)}
      />
      <ProjectForm
        initialName={project.name}
        initialDescription={project.description ?? ""}
        submitLabel="Salvar alterações"
        submittingLabel="Salvando…"
        cancelTo={paths.detail(project.id)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

/** Envia só o que mudou; `null` indica que não há alteração. */
function diff(project: Project, values: ProjectFormValues): ProjectUpdateInput | null {
  const changes: ProjectUpdateInput = {};
  if (values.name !== project.name) changes.name = values.name;
  if (values.description !== project.description) changes.description = values.description;
  return Object.keys(changes).length === 0 ? null : changes;
}
