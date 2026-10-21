import { useId } from "react";

import { CRITERIA_MAX_ITEMS, CRITERION_MAX_LENGTH } from "../validation/story";
import { countCharacters } from "../validation/project";

import { Button } from "./Button";

export interface CriterionRow {
  /** Identificador estável da linha (não muda ao remover outras). */
  key: number;
  value: string;
}

interface CriteriaEditorProps {
  rows: CriterionRow[];
  /** Erro de cada linha, na mesma ordem de `rows`. */
  rowErrors: (string | undefined)[];
  groupError?: string | undefined;
  disabled?: boolean;
  onChange: (key: number, value: string) => void;
  onAdd: () => void;
  onRemove: (key: number) => void;
  registerInput: (key: number, element: HTMLInputElement | null) => void;
  addButtonRef?: (element: HTMLButtonElement | null) => void;
  /** Mensagem lida por leitores de tela quando linhas são adicionadas ou removidas. */
  announcement?: string;
}

/** Lista dinâmica de critérios de aceitação: ao menos 1 linha, no máximo 20. */
export function CriteriaEditor({
  rows,
  rowErrors,
  groupError,
  disabled = false,
  onChange,
  onAdd,
  onRemove,
  registerInput,
  addButtonRef,
  announcement,
}: CriteriaEditorProps) {
  const base = useId();
  const groupErrorId = `${base}-group-error`;
  const hintId = `${base}-hint`;
  const atLimit = rows.length >= CRITERIA_MAX_ITEMS;

  return (
    <fieldset
      className={`criteria${groupError ? " criteria--invalid" : ""}`}
      aria-describedby={[hintId, groupError ? groupErrorId : null].filter(Boolean).join(" ")}
    >
      <legend className="field__label">
        Critérios de aceitação<span className="field__required"> (obrigatório)</span>
      </legend>
      <p id={hintId} className="field__hint">
        Pelo menos 1 critério, até {CRITERIA_MAX_ITEMS}, com até {CRITERION_MAX_LENGTH} caracteres
        cada.
      </p>

      <ul className="criteria__list">
        {rows.map((row, index) => {
          const position = index + 1;
          const id = `${base}-${row.key}`;
          const error = rowErrors[index];
          const length = countCharacters(row.value.trim());
          const over = length > CRITERION_MAX_LENGTH;
          return (
            <li key={row.key} className="criteria__item">
              <label htmlFor={id} className="criteria__label">
                Critério {position}
              </label>
              <div className="criteria__row">
                <input
                  id={id}
                  ref={(element) => registerInput(row.key, element)}
                  type="text"
                  autoComplete="off"
                  className="field__control"
                  value={row.value}
                  disabled={disabled}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={`${id}-counter${error ? ` ${id}-error` : ""}`}
                  onChange={(event) => onChange(row.key, event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => onRemove(row.key)}
                  disabled={disabled || rows.length === 1}
                  aria-label={`Remover critério ${position}`}
                >
                  Remover
                </button>
              </div>
              <div className="field__meta">
                <p id={`${id}-error`} className="field__error">
                  {error ?? ""}
                </p>
                <p
                  id={`${id}-counter`}
                  className={`field__counter${over ? " field__counter--over" : ""}`}
                >
                  {length}/{CRITERION_MAX_LENGTH}
                  <span className="sr-only"> caracteres</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {groupError ? (
        <p id={groupErrorId} className="field__error criteria__group-error">
          {groupError}
        </p>
      ) : null}

      <div className="criteria__footer">
        <Button
          variant="secondary"
          onClick={onAdd}
          disabled={disabled || atLimit}
          ref={addButtonRef}
        >
          Adicionar critério
        </Button>
        <p className="criteria__count">
          {rows.length}/{CRITERIA_MAX_ITEMS} critérios
          {atLimit ? " · limite atingido" : ""}
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement ?? ""}
      </p>
    </fieldset>
  );
}
