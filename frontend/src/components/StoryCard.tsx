import { formatDate } from "../lib/format";
import type { Story } from "../types/story";

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`badge badge--priority badge--${priority}`}>
      <span className="sr-only">Prioridade: </span>
      {priority}
    </span>
  );
}

export function StoryCard({ story }: { story: Story }) {
  return (
    <li>
      <article className="story-card" aria-labelledby={`historia-${story.id}`}>
        <header className="story-card__header">
          <h3 id={`historia-${story.id}`} className="story-card__title">
            {story.title}
          </h3>
          <div className="story-card__badges">
            <PriorityBadge priority={story.priority} />
            <span className="badge badge--status">
              <span className="sr-only">Status: </span>
              {story.status}
            </span>
          </div>
        </header>
        {story.description ? <p className="story-card__description">{story.description}</p> : null}
        <div className="story-card__criteria">
          <p className="story-card__label" id={`criterios-${story.id}`}>
            Critérios de aceitação
          </p>
          <ul aria-labelledby={`criterios-${story.id}`} className="criteria-list">
            {story.acceptance_criteria.map((criterion, index) => (
              <li key={index}>{criterion}</li>
            ))}
          </ul>
        </div>
        <p className="story-card__meta">Criada em {formatDate(story.created_at)}</p>
      </article>
    </li>
  );
}
