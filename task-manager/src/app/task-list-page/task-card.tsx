import { useState, type CSSProperties } from "react";

import { TASK_DELETE_FADE_MS } from "./task-list-page.config";
import { TaskEditModal } from "./task-edit-modal";
import type { TaskEditInput, TaskListItem } from "./task-list-page.types";

type TaskCardProps = {
  task: TaskListItem;
  isDeleting: boolean;
  isUpdating: boolean;
  onDelete: (id: string) => void;
  onComplete: (task: TaskListItem) => void;
  onEdit: (input: TaskEditInput) => Promise<void>;
};

export function TaskCard({ task, isDeleting, isUpdating, onDelete, onComplete, onEdit }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isPending = task.status === "pendente";
  const isCompleted = task.status === "concluida";
  const isBusy = isDeleting || isUpdating;
  const statusLabel = isPending ? "Em andamento" : "Concluída";
  const statusStyle = isPending
    ? styles.taskStatusPending
    : styles.taskStatusCompleted;

  return (
    <article style={isDeleting ? { ...styles.taskCard, ...styles.taskCardDeleting } : styles.taskCard}>
      <div className="tm-card-header" style={styles.taskCardHeader}>
        <div>
          <strong style={styles.taskTitle}>
            {task.titulo ? task.titulo : "Sem título"}
          </strong>
          <p style={styles.taskMetaText}>
            {task.descricao ?? "Sem descrição"}
          </p>
        </div>
        <div className="tm-card-status" style={styles.taskCardStatus}>
          <p style={styles.taskDateText}>
            Criada em {new Date(task.dataCriacao).toLocaleString("pt-BR")}
          </p>
          <p style={{ ...styles.taskStatus, ...statusStyle }}>{statusLabel}</p>
        </div>
      </div>
      <div style={styles.taskCardDeadline}>
        <p style={styles.taskMetaText}>
          Prazo: {task.prazo ? new Date(task.prazo).toLocaleString("pt-BR") : "Não definido"}
        </p>
      </div>
      <div className="tm-card-footer" style={styles.taskCardFooter}>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setIsEditModalOpen(true);
          }}
          className="tm-button"
          style={{
            ...styles.actionButton,
            ...styles.editButton,
            ...(isBusy ? styles.actionButtonDisabled : {}),
          }}
        >
          Editar
        </button>
        <button
          type="button"
          disabled={isBusy || isCompleted}
          onClick={() => {
            onComplete(task);
          }}
          className="tm-button"
          style={{
            ...styles.actionButton,
            ...styles.completeButton,
            ...((isBusy || isCompleted) ? styles.actionButtonDisabled : {}),
          }}
        >
          {isUpdating ? "Atualizando..." : "Concluir"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDelete(task.id)}
          className="tm-button"
          style={{
            ...styles.actionButton,
            ...styles.deleteButton,
            ...(isBusy ? styles.actionButtonDisabled : {}),
          }}
        >
          {isDeleting ? "Excluindo..." : "Deletar"}
        </button>
      </div>
      <TaskEditModal
        isOpen={isEditModalOpen}
        task={task}
        isUpdating={isUpdating}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onEdit}
      />
    </article>
  );
}

const StyleSheet = {
  create<T extends Record<string, CSSProperties>>(value: T): T {
    return value;
  },
};

const styles = StyleSheet.create({
  taskCard: {
    border: "1px solid #30374F",
    backgroundColor: "#0F121E",
    borderRadius: 10,
    padding: 18,
    transition: `opacity ${TASK_DELETE_FADE_MS}ms ease, transform ${TASK_DELETE_FADE_MS}ms ease`,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  taskCardDeleting: {
    opacity: 0,
    transform: "translateY(-4px)",
  },
  taskStatus: {
    color: "#A6B1D1",
    fontWeight: 600,
    display: "flex",
    justifyContent: "center",
    borderRadius: 99,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: "#0F121E",
    height: "100%",
  },
  taskStatusPending: {
    backgroundColor: "#674719",
  },
  taskStatusCompleted: {
    backgroundColor: "#1F4E37",
  },
  taskCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "flex-start",

  },
  taskCardStatus: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  taskCardFooter: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "1rem",
  },
  taskCardDeadline: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "1rem",
  },
  taskTitle: {
    color: "#F0F3FF",
    fontSize: "1.2rem",
    fontWeight: 600,
  },
  taskMetaText: {
    margin: "0.35rem 0 0",
    color: "#A6B1D1",
  },
  taskDateText: {
    margin: "0.35rem 0 0",
    color: "#A6B1D1",
    fontSize: "0.9rem",
  },
  actionButton: {
    cursor: "pointer",
    opacity: 1,
    borderRadius: 8,
    border: "1px solid #414B6D",
    padding: "0.45rem 0.9rem",
    fontWeight: 600,
  },
  editButton: {
    backgroundColor: "#2E3D67",
    color: "#BDD5FF",
  },
  completeButton: {
    backgroundColor: "#1A4932",
    color: "#B3FCCA",
  },
  deleteButton: {
    backgroundColor: "#622832",
    color: "#FFC9C9",
  },
  actionButtonDisabled: {
    cursor: "not-allowed",
    opacity: 0.7,
  },
});
