import { useId, type Ref } from "react";

import { PRIORITIES, type Priority } from "../types/story";

interface PriorityPickerProps {
  value: Priority | "";
  onChange: (value: Priority) => void;
  error?: string | undefined;
  disabled?: boolean;
  firstRef?: Ref<HTMLInputElement>;
}

/** Grupo de opções (rádio): só as três prioridades válidas, sem valor pré-selecionado. */
export function PriorityPicker({
  value,
  onChange,
  error,
  disabled = false,
  firstRef,
}: PriorityPickerProps) {
  const base = useId();
  const errorId = `${base}-error`;
  return (
    <fieldset
      className={`priority-picker${error ? " priority-picker--invalid" : ""}`}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="field__label">
        Prioridade<span className="field__required"> (obrigatório)</span>
      </legend>
      <div className="priority-picker__options">
        {PRIORITIES.map((priority, index) => (
          <label
            key={priority}
            className={`priority-option priority-option--${priority}${
              value === priority ? " priority-option--selected" : ""
            }`}
          >
            <input
              type="radio"
              name={`${base}-priority`}
              value={priority}
              checked={value === priority}
              disabled={disabled}
              ref={index === 0 ? firstRef : undefined}
              onChange={() => onChange(priority)}
            />
            <span>{priority}</span>
          </label>
        ))}
      </div>
      <p id={errorId} className="field__error">
        {error ?? ""}
      </p>
    </fieldset>
  );
}
