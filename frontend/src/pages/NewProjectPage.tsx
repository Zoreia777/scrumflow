import { createProject } from "../api/projects";
import { PageHeader } from "../components/PageHeader";
import { ProjectForm } from "../components/ProjectForm";
import { usePageTitle } from "../hooks/usePageTitle";
import { navigate, paths } from "../router";
import type { ProjectFormValues } from "../validation/project";

export function NewProjectPage() {
  usePageTitle("Novo projeto");

  const handleSubmit = async (values: ProjectFormValues) => {
    await createProject(
      values.description === null
        ? { name: values.name }
        : { name: values.name, description: values.description },
    );
    // Só chegamos aqui se a API confirmou a criação (201 com um projeto válido).
    navigate(paths.list(), { flash: `Projeto “${values.name}” criado com sucesso.` });
  };

  return (
    <>
      <PageHeader
        title="Novo projeto"
        subtitle="Informe um nome e, se quiser, uma descrição."
        breadcrumbs={[{ label: "Projetos", to: paths.list() }, { label: "Novo projeto" }]}
      />
      <ProjectForm
        submitLabel="Criar projeto"
        submittingLabel="Criando…"
        cancelTo={paths.list()}
        onSubmit={handleSubmit}
      />
    </>
  );
}
