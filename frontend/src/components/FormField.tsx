import { useId, type Ref } from "react";

import { countCharacters } from "../validation/project";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  error?: string | undefined;
  hint?: string;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
}

/**
 * Campo com rótulo, dica, contador e erro associados por ARIA. O limite NÃO é imposto pelo
 * navegador (sem `maxLength`): o usuário vê o contador e a mensagem de validação (AC03).
 */
export function FormField({
  label,
  value,
  onChange,
  maxLength,
  error,
  hint,
  multiline = false,
  required = false,
  disabled = false,
  autoComplete,
  inputRef,
}: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const length = countCharacters(value.trim());
  const over = length > maxLength;
  const describedBy = [hint ? hintId : null, counterId, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const common = {
    id,
    value,
    disabled,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "field__control",
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };

  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? <span className="field__required"> (obrigatório)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea ref={inputRef} rows={5} {...common} />
      ) : (
        <input ref={inputRef} type="text" autoComplete={autoComplete ?? "off"} {...common} />
      )}
      <div className="field__meta">
        <p id={errorId} className="field__error">
          {error ?? ""}
        </p>
        <p id={counterId} className={`field__counter${over ? " field__counter--over" : ""}`}>
          {length}/{maxLength}
          <span className="sr-only"> caracteres</span>
        </p>
      </div>
    </div>
  );
}
