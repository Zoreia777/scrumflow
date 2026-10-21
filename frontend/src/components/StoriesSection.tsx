import { useCallback, useRef, useState } from "react";

import { createStory, listStories } from "../api/stories";
import { useRequest } from "../hooks/useRequest";
import type { StoryCreateInput } from "../types/story";
import type { StoryFormValues } from "../validation/story";

import { Alert } from "./Alert";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { LoadingBlock } from "./Skeleton";
import { StoryCard } from "./StoryCard";
import { StoryForm } from "./StoryForm";

/**
 * Seção "Histórias de usuário" de um projeto. Cada projeto tem a sua própria instância
 * (a página de detalhes usa `key`), então as histórias nunca se misturam entre projetos.
 */
export function StoriesSection({ projectId }: { projectId: string }) {
  const load = useCallback((signal: AbortSignal) => listStories(projectId, signal), [projectId]);
  const { state, reload, mutate } = useRequest(load);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);

  const openForm = () => {
    setNotice(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    // Devolve o foco ao botão que abriu o formulário.
    setTimeout(() => openButton.current?.focus(), 0);
  };

  const handleSubmit = async (values: StoryFormValues) => {
    const input: StoryCreateInput = {
      title: values.title,
      priority: values.priority,
      acceptance_criteria: values.acceptance_criteria,
      ...(values.description === null ? {} : { description: values.description }),
    };
    // Lança ApiError se a API falhar ou responder algo que não seja uma história deste projeto.
    const story = await createStory(projectId, input);

    // A partir daqui a criação está confirmada pela API.
    setFormOpen(false);
    setNotice(`História “${story.title}” criada com sucesso.`);
    if (state.status === "success") {
      mutate((stories) => [story, ...stories.filter((item) => item.id !== story.id)]);
    } else {
      reload();
    }
  };

  const count = state.status === "success" ? state.data.length : null;

  return (
    <section className="stories" aria-labelledby="historias-titulo">
      <div className="stories__header">
        <h2 id="historias-titulo" className="stories__title">
          Histórias de usuário
          {count !== null ? <span className="stories__count"> ({count})</span> : null}
        </h2>
        {!formOpen ? (
          <Button ref={openButton} onClick={openForm}>
            Nova história
          </Button>
        ) : null}
      </div>

      {notice ? <Alert variant="success">{notice}</Alert> : null}

      {formOpen ? <StoryForm onSubmit={handleSubmit} onCancel={closeForm} /> : null}

      {state.status === "loading" ? <LoadingBlock label="Carregando histórias…" lines={3} /> : null}

      {state.status === "error" ? (
        <Alert
          variant="error"
          title="Não foi possível carregar as histórias."
          action={
            <Button variant="secondary" onClick={reload}>
              Tentar novamente
            </Button>
          }
        >
          {state.error.message}
        </Alert>
      ) : null}

      {state.status === "success" && state.data.length === 0 && !formOpen ? (
        <EmptyState
          title="Nenhuma história neste projeto"
          action={<Button onClick={openForm}>Cadastrar primeira história</Button>}
        >
          Cadastre histórias de usuário para montar o backlog do projeto.
        </EmptyState>
      ) : null}

      {state.status === "success" && state.data.length > 0 ? (
        <ul className="story-list" aria-label="Histórias do projeto">
          {state.data.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
