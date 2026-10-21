import { useCallback } from "react";

import { listProjects } from "../api/projects";
import { Alert } from "../components/Alert";
import { Button, ButtonLink } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { LoadingBlock } from "../components/Skeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useRequest } from "../hooks/useRequest";
import { formatDate } from "../lib/format";
import { Link, paths, useFlash } from "../router";
import type { Project } from "../types/project";

function ProjectCard({ project }: { project: Project }) {
  return (
    <li>
      <Link to={paths.detail(project.id)} className="project-card">
        <span className="project-card__name">{project.name}</span>
        <span className="project-card__description">{project.description ?? "Sem descrição."}</span>
        <span className="project-card__meta">Criado em {formatDate(project.created_at)}</span>
      </Link>
    </li>
  );
}

export function ProjectListPage() {
  usePageTitle("Projetos");
  const flash = useFlash();
  const load = useCallback((signal: AbortSignal) => listProjects(signal), []);
  const { state, reload } = useRequest(load);

  const newProject = <ButtonLink to={paths.new()}>Novo projeto</ButtonLink>;

  return (
    <>
      <PageHeader
        title="Projetos"
        subtitle="Crie e acompanhe os projetos da sua equipe."
        actions={newProject}
      />
      {flash ? <Alert variant="success">{flash}</Alert> : null}

      {state.status === "loading" ? <LoadingBlock label="Carregando projetos…" lines={4} /> : null}

      {state.status === "error" ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os projetos."
          action={
            <Button variant="secondary" onClick={reload}>
              Tentar novamente
            </Button>
          }
        >
          {state.error.message}
        </Alert>
      ) : null}

      {state.status === "success" && state.data.length === 0 ? (
        <EmptyState title="Nenhum projeto ainda" action={newProject}>
          Crie o primeiro projeto para começar a organizar o trabalho da equipe.
        </EmptyState>
      ) : null}

      {state.status === "success" && state.data.length > 0 ? (
        <section aria-label="Lista de projetos">
          <p className="list-count">
            {state.data.length === 1 ? "1 projeto" : `${state.data.length} projetos`}
          </p>
          <ul className="project-grid">
            {state.data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
