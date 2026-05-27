import type { TaskFormInput } from "./task-list-page.types";
import { TaskFormModal } from "./task-form-modal";

type TaskCreateModalProps = {
  isOpen: boolean;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (input: TaskFormInput) => Promise<void>;
};

export function TaskCreateModal({ isOpen, isCreating, onClose, onSubmit }: TaskCreateModalProps) {
  return (
    <TaskFormModal
      isOpen={isOpen}
      title="Nova tarefa"
      submitLabel="Criar tarefa"
      isSubmitting={isCreating}
      initialValues={{
        titulo: "",
        descricao: "",
        prazo: "",
      }}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
