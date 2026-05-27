import type { CSSProperties } from "react";

import type { TaskListItem } from "./task-list-page.types";

type TaskCardProps = {
  task: TaskListItem;
  isDeleting: boolean;
  onDelete: (id: string) => void;
};

export function TaskCard({ task, isDeleting, onDelete }: TaskCardProps) {
  return (
    <article style={styles.taskCard}>
      <div style={styles.taskCardHeader}>
        <div>
          <strong>{task.titulo}</strong>
          <p style={styles.taskMetaText}>Status: {task.status}</p>
          {task.descricao ? <p style={styles.taskMetaText}>{task.descricao}</p> : null}
          <p style={styles.taskDateText}>
            Criada em {new Date(task.dataCriacao).toLocaleString("pt-BR")}
          </p>
        </div>

        <button
          disabled={isDeleting}
          onClick={() => onDelete(task.id)}
          style={isDeleting ? styles.deleteButtonDisabled : styles.deleteButton}
        >
          {isDeleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
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
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "0.9rem 1rem",
  },
  taskCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "flex-start",
  },
  taskMetaText: {
    margin: "0.35rem 0 0",
    color: "#4b5563",
  },
  taskDateText: {
    margin: "0.35rem 0 0",
    color: "#6b7280",
    fontSize: "0.9rem",
  },
  deleteButton: {
    cursor: "pointer",
    opacity: 1,
  },
  deleteButtonDisabled: {
    cursor: "not-allowed",
    opacity: 0.7,
  },
});
