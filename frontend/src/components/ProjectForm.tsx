import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateProjectForm,
  type ProjectFormErrors,
  type ProjectFormValues,
} from "../validation/project";

import { Alert } from "./Alert";
import { Button, ButtonLink } from "./Button";
import { FormField } from "./FormField";

interface ProjectFormProps {
  initialName?: string;
  initialDescription?: string;
  submitLabel: string;
  submittingLabel: string;
  cancelTo: string;
  /** Deve rejeitar com `ApiError` se a gravação falhar; só resolve em caso de sucesso real. */
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

export function ProjectForm({
  initialName = "",
  initialDescription = "",
  submitLabel,
  submittingLabel,
  cancelTo,
  onSubmit,
}: ProjectFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return; // evita envio duplicado

    const { errors: found, values } = validateProjectForm({ name, description });
    setFormError(null);
    setErrors(found);
    if (found.name) {
      nameRef.current?.focus();
      return;
    }
    if (found.description) {
      descriptionRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!mounted.current) return;
      const apiError = error instanceof ApiError ? error : new ApiError("unexpected");
      const fieldErrors: ProjectFormErrors = {};
      const general: string[] = [];
      for (const item of apiError.fields) {
        if (item.field === "name" || item.field === "description") {
          fieldErrors[item.field] ??= item.message;
        } else {
          general.push(item.message);
        }
      }
      setErrors(fieldErrors);
      if (apiError.kind !== "validation") {
        setFormError(apiError.message);
      } else if (general.length > 0) {
        setFormError(general[0] ?? apiError.message);
      } else if (!fieldErrors.name && !fieldErrors.description) {
        setFormError(apiError.message);
      }
      if (fieldErrors.name) nameRef.current?.focus();
      else if (fieldErrors.description) descriptionRef.current?.focus();
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return (
    <form className="form card" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      {formError ? (
        <Alert variant="error" title="Não foi possível salvar o projeto.">
          {formError}
        </Alert>
      ) : null}
      <FormField
        label="Nome do projeto"
        value={name}
        onChange={setName}
        maxLength={NAME_MAX_LENGTH}
        error={errors.name}
        required
        disabled={submitting}
        hint="Até 100 caracteres."
        inputRef={nameRef}
      />
      <FormField
        label="Descrição"
        value={description}
        onChange={setDescription}
        maxLength={DESCRIPTION_MAX_LENGTH}
        error={errors.description}
        multiline
        disabled={submitting}
        hint="Opcional. Até 1000 caracteres."
        inputRef={descriptionRef}
      />
      <div className="form__actions">
        <Button type="submit" loading={submitting} loadingLabel={submittingLabel}>
          {submitLabel}
        </Button>
        <ButtonLink to={cancelTo} variant="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
