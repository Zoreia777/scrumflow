import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import type { Priority } from "../types/story";
import {
  CRITERIA_MAX_ITEMS,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  hasStoryErrors,
  validateStoryForm,
  type StoryFormErrors,
  type StoryFormValues,
} from "../validation/story";

import { Alert } from "./Alert";
import { Button } from "./Button";
import { CriteriaEditor, type CriterionRow } from "./CriteriaEditor";
import { FormField } from "./FormField";
import { PriorityPicker } from "./PriorityPicker";

interface StoryFormProps {
  /** Deve rejeitar com `ApiError` se a gravação falhar; só resolve em caso de sucesso real. */
  onSubmit: (values: StoryFormValues) => Promise<void>;
  onCancel: () => void;
}

const NO_ERRORS: StoryFormErrors = { criteriaItems: [] };

export function StoryForm({ onSubmit, onCancel }: StoryFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [rows, setRows] = useState<CriterionRow[]>([{ key: 1, value: "" }]);
  const [errors, setErrors] = useState<StoryFormErrors>(NO_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submittingRef = useRef(false);
  const mounted = useRef(true);
  const nextKey = useRef(2);
  const pendingFocus = useRef<number | "add" | null>(null);
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const priorityRef = useRef<HTMLInputElement>(null);
  const criterionInputs = useRef(new Map<number, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    titleRef.current?.focus(); // ao abrir o formulário, o foco vai para o primeiro campo
    return () => {
      mounted.current = false;
    };
  }, []);

  // Move o foco depois que a lista de critérios foi redesenhada (adicionar/remover).
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === "add") addButton.current?.focus();
    else criterionInputs.current.get(target)?.focus();
  }, [rows]);

  const registerInput = (key: number, element: HTMLInputElement | null) => {
    if (element) criterionInputs.current.set(key, element);
    else criterionInputs.current.delete(key);
  };

  const addRow = () => {
    if (rows.length >= CRITERIA_MAX_ITEMS) return;
    const key = nextKey.current++;
    pendingFocus.current = key;
    setRows([...rows, { key, value: "" }]);
    setAnnouncement(`Critério ${rows.length + 1} adicionado. Total: ${rows.length + 1}.`);
  };

  const removeRow = (key: number) => {
    if (rows.length <= 1) return;
    const index = rows.findIndex((row) => row.key === key);
    const remaining = rows.filter((row) => row.key !== key);
    pendingFocus.current = remaining[Math.max(0, index - 1)]?.key ?? "add";
    setRows(remaining);
    setErrors((current) => ({
      ...current,
      criteriaItems: current.criteriaItems.filter((_, i) => i !== index),
    }));
    setAnnouncement(`Critério ${index + 1} removido. Total: ${remaining.length}.`);
  };

  const changeRow = (key: number, value: string) => {
    const index = rows.findIndex((row) => row.key === key);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, value } : row)));
    // O erro some assim que o usuário mexe no critério (o conjunto é revalidado ao enviar).
    setErrors((current) => ({
      ...current,
      criteria: undefined,
      criteriaItems: current.criteriaItems.map((error, i) => (i === index ? undefined : error)),
    }));
  };

  const clearError = (field: "title" | "description" | "priority") =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const focusFirstError = (found: StoryFormErrors) => {
    if (found.title) return titleRef.current?.focus();
    if (found.description) return descriptionRef.current?.focus();
    if (found.priority) return priorityRef.current?.focus();
    const index = found.criteriaItems.findIndex(Boolean);
    const target = rows[index >= 0 ? index : 0];
    if (target) criterionInputs.current.get(target.key)?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return; // evita envio duplicado

    setFormError(null);
    const { errors: found, values } = validateStoryForm({
      title,
      description,
      priority,
      criteria: rows.map((row) => row.value),
    });
    setErrors(found);
    if (!values) {
      focusFirstError(found);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!mounted.current) return;
      const apiError = error instanceof ApiError ? error : new ApiError("unexpected");
      const serverErrors: StoryFormErrors = { criteriaItems: rows.map(() => undefined) };
      const general: string[] = [];
      for (const item of apiError.fields) {
        if (item.field === "title") serverErrors.title ??= item.message;
        else if (item.field === "description") serverErrors.description ??= item.message;
        else if (item.field === "priority") serverErrors.priority ??= item.message;
        else if (item.field === "acceptance_criteria") serverErrors.criteria ??= item.message;
        else general.push(item.message);
      }
      setErrors(serverErrors);
      if (apiError.kind !== "validation") {
        setFormError(apiError.message);
      } else if (general.length > 0) {
        setFormError(general[0] ?? apiError.message);
      } else if (!hasStoryErrors(serverErrors)) {
        setFormError(apiError.message);
      }
      focusFirstError(serverErrors);
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return (
    <form
      className="form card story-form"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="nova-historia-titulo"
      aria-busy={submitting}
    >
      <h3 id="nova-historia-titulo" className="story-form__title">
        Nova história
      </h3>
      {formError ? (
        <Alert variant="error" title="Não foi possível salvar a história.">
          {formError}
        </Alert>
      ) : null}
      <FormField
        label="Título"
        value={title}
        onChange={(value) => {
          setTitle(value);
          clearError("title");
        }}
        maxLength={TITLE_MAX_LENGTH}
        error={errors.title}
        required
        disabled={submitting}
        hint="Até 150 caracteres."
        inputRef={titleRef}
      />
      <FormField
        label="Descrição"
        value={description}
        onChange={(value) => {
          setDescription(value);
          clearError("description");
        }}
        maxLength={DESCRIPTION_MAX_LENGTH}
        error={errors.description}
        multiline
        disabled={submitting}
        hint="Opcional. Até 2000 caracteres."
        inputRef={descriptionRef}
      />
      <PriorityPicker
        value={priority}
        onChange={(value) => {
          setPriority(value);
          clearError("priority");
        }}
        error={errors.priority}
        disabled={submitting}
        firstRef={priorityRef}
      />
      <CriteriaEditor
        rows={rows}
        rowErrors={rows.map((_, index) => errors.criteriaItems[index])}
        groupError={errors.criteria}
        disabled={submitting}
        onChange={changeRow}
        onAdd={addRow}
        onRemove={removeRow}
        registerInput={registerInput}
        addButtonRef={(element) => {
          addButton.current = element;
        }}
        announcement={announcement}
      />
      <div className="form__actions">
        <Button type="submit" loading={submitting} loadingLabel="Salvando…">
          Salvar história
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
