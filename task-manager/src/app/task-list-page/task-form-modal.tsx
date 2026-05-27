import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type SubmitEventHandler,
} from "react";

import { getErrorMessage, getZodFieldErrors } from "./task-list-page.errors";
import type { TaskFormInput } from "./task-list-page.types";

type TaskFormInitialValues = {
  titulo: string;
  descricao: string;
  prazo: string;
};

type TaskFormModalProps = {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  initialValues: TaskFormInitialValues;
  onClose: () => void;
  onSubmit: (input: TaskFormInput) => Promise<void>;
};

export function TaskFormModal({
  isOpen,
  title,
  submitLabel,
  isSubmitting,
  initialValues,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const titleId = useId();
  const tituloInputId = useId();
  const descricaoInputId = useId();
  const prazoInputId = useId();
  const tituloErrorId = useId();
  const descricaoErrorId = useId();
  const prazoErrorId = useId();
  const formErrorId = useId();

  const [tituloInput, setTituloInput] = useState(initialValues.titulo);
  const [descricaoInput, setDescricaoInput] = useState(initialValues.descricao);
  const [prazoInput, setPrazoInput] = useState(initialValues.prazo);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const tituloRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setTituloInput(initialValues.titulo);
    setDescricaoInput(initialValues.descricao);
    setPrazoInput(initialValues.prazo);
    setFieldErrors({});
    setFormError(null);
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (!isOpen) return;

    tituloRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isSubmitting) return;
      event.stopPropagation();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // Trava o scroll do body para evitar rolagem por tras do modal.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const trimmedTitle = tituloInput.trim();
    if (!trimmedTitle) {
      setFieldErrors({ titulo: "O título é obrigatório." });
      setFormError(null);
      tituloRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);

    try {
      await onSubmit({
        titulo: trimmedTitle,
        descricao: descricaoInput.trim() ? descricaoInput.trim() : undefined,
        prazo: prazoInput ? new Date(prazoInput) : undefined,
      });
      onClose();
    } catch (error) {
      const zodFieldErrors = getZodFieldErrors(error);
      if (Object.keys(zodFieldErrors).length > 0) {
        setFieldErrors(zodFieldErrors);
        setFormError(null);
      } else {
        setFormError(getErrorMessage(error));
      }
    }
  };

  const handleOverlayClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (isSubmitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={styles.modalOverlay}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <form
        style={styles.modalContainer}
        onSubmit={(event) => void handleSubmit(event)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={formError ? formErrorId : undefined}
        noValidate
      >
        <h3 id={titleId} style={styles.modalTitle}>
          {title}
        </h3>

        <label htmlFor={tituloInputId} style={styles.formLabel}>
          Título
          <input
            id={tituloInputId}
            ref={tituloRef}
            type="text"
            value={tituloInput}
            onChange={(event) => setTituloInput(event.target.value)}
            className="tm-input"
            style={styles.formInput}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.titulo ? true : undefined}
            aria-describedby={fieldErrors.titulo ? tituloErrorId : undefined}
            autoComplete="off"
          />
          {fieldErrors.titulo ? (
            <span id={tituloErrorId} style={styles.fieldError}>
              {fieldErrors.titulo}
            </span>
          ) : null}
        </label>

        <label htmlFor={descricaoInputId} style={styles.formLabel}>
          Descrição
          <textarea
            id={descricaoInputId}
            value={descricaoInput}
            onChange={(event) => setDescricaoInput(event.target.value)}
            className="tm-input"
            style={styles.formTextarea}
            rows={4}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.descricao ? true : undefined}
            aria-describedby={fieldErrors.descricao ? descricaoErrorId : undefined}
          />
          {fieldErrors.descricao ? (
            <span id={descricaoErrorId} style={styles.fieldError}>
              {fieldErrors.descricao}
            </span>
          ) : null}
        </label>

        <label htmlFor={prazoInputId} style={styles.formLabel}>
          Prazo
          <input
            id={prazoInputId}
            type="datetime-local"
            value={prazoInput}
            onChange={(event) => setPrazoInput(event.target.value)}
            className="tm-input"
            style={styles.formInput}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.prazo ? true : undefined}
            aria-describedby={fieldErrors.prazo ? prazoErrorId : undefined}
          />
          {fieldErrors.prazo ? (
            <span id={prazoErrorId} style={styles.fieldError}>
              {fieldErrors.prazo}
            </span>
          ) : null}
        </label>

        {formError ? (
          <p id={formErrorId} style={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}

        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className="tm-button"
            style={{ ...styles.actionButton, ...styles.modalCancelButton }}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="tm-button"
            style={{ ...styles.actionButton, ...styles.modalSaveButton }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

const StyleSheet = {
  create<T extends Record<string, CSSProperties>>(value: T): T {
    return value;
  },
};

const styles = StyleSheet.create({
  actionButton: {
    cursor: "pointer",
    opacity: 1,
    borderRadius: 8,
    border: "1px solid #414B6D",
    padding: "0.45rem 0.9rem",
    fontWeight: 600,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(8, 12, 25, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 1000,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 12,
    border: "1px solid #30374F",
    backgroundColor: "#0F121E",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  modalTitle: {
    margin: 0,
    color: "#F0F3FF",
  },
  formLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    color: "#A6B1D1",
    fontWeight: 600,
  },
  formInput: {
    border: "1px solid #414B6D",
    borderRadius: 8,
    padding: "0.55rem 0.7rem",
    backgroundColor: "#12172A",
    color: "#F0F3FF",
  },
  formTextarea: {
    border: "1px solid #414B6D",
    borderRadius: 8,
    padding: "0.55rem 0.7rem",
    backgroundColor: "#12172A",
    color: "#F0F3FF",
    resize: "vertical",
    minHeight: 90,
    fontFamily: "inherit",
  },
  fieldError: {
    color: "#FFC9C9",
    fontSize: "0.85rem",
    fontWeight: 500,
  },
  formError: {
    margin: 0,
    padding: "0.6rem 0.8rem",
    borderRadius: 8,
    backgroundColor: "rgba(255, 110, 110, 0.12)",
    border: "1px solid rgba(255, 110, 110, 0.35)",
    color: "#FFC9C9",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.7rem",
  },
  modalCancelButton: {
    backgroundColor: "#2A3048",
    color: "#E5E9FF",
  },
  modalSaveButton: {
    backgroundColor: "#1A4932",
    color: "#B3FCCA",
  },
});
