import type { TaskEditInput, TaskListItem } from "./task-list-page.types";
import { TaskFormModal } from "./task-form-modal";

type TaskEditModalProps = {
  isOpen: boolean;
  task: TaskListItem;
  isUpdating: boolean;
  onClose: () => void;
  onSubmit: (input: TaskEditInput) => Promise<void>;
};

const formatDateTimeLocal = (date: Date | undefined) => {
  if (!date) return "";
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffsetMs);
  return localDate.toISOString().slice(0, 16);
};

export function TaskEditModal({ isOpen, task, isUpdating, onClose, onSubmit }: TaskEditModalProps) {
  return (
    <TaskFormModal
      isOpen={isOpen}
      title="Editar tarefa"
      submitLabel="Salvar"
      isSubmitting={isUpdating}
      initialValues={{
        titulo: task.titulo,
        descricao: task.descricao ?? "",
        prazo: formatDateTimeLocal(task.prazo),
      }}
      onClose={onClose}
      onSubmit={(input) =>
        onSubmit({
          id: task.id,
          ...input,
        })
      }
    />
  );
}
