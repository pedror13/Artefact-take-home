"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { api } from "~/trpc/react";

import { TaskCard } from "./task-card";
import { TaskCreateModal } from "./task-create-modal";
import {
  TASK_DELETE_FADE_MS,
  TASK_FEEDBACK_DURATION_MS,
  TASKS_PAGE_SIZE,
  TASKS_PREFETCH_ROOT_MARGIN,
} from "./task-list-page.config";
import { getErrorMessage } from "./task-list-page.errors";
import type { FeedbackState, TaskEditInput, TaskFormInput } from "./task-list-page.types";

export function TaskListPageClient() {
  const utils = api.useUtils();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [deletingTaskIds, setDeletingTaskIds] = useState<Set<string>>(new Set());
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deleteTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.task.list.useInfiniteQuery(
    { limit: TASKS_PAGE_SIZE },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  );

  const tasks = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const totalTasks = data?.pages[0]?.totalCount ?? 0;

  const { mutate: deleteTask } = api.task.delete.useMutation({
    onMutate: async ({ id }) => {
      setFeedback(null);

      await utils.task.list.cancel({ limit: TASKS_PAGE_SIZE });

      const previousData = utils.task.list.getInfiniteData({
        limit: TASKS_PAGE_SIZE,
      });

      utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, (currentData) => {
        if (!currentData) return currentData;

        return {
          ...currentData,
          pages: currentData.pages.map((page) => ({
            ...page,
            items: page.items.filter((task) => task.id !== id),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Tarefa removida com sucesso.",
      });
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousData) {
        utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, () => context.previousData);
      }

      setFeedback({
        type: "error",
        message: getErrorMessage(mutationError),
      });
    },
  });

  const { mutateAsync: createTask, isPending: isCreatingTask } = api.task.create.useMutation({
    onMutate: async (input) => {
      setFeedback(null);

      await utils.task.list.cancel({ limit: TASKS_PAGE_SIZE });

      const previousData = utils.task.list.getInfiniteData({
        limit: TASKS_PAGE_SIZE,
      });
      const optimisticTaskId = `temp-${crypto.randomUUID()}`;

      utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, (currentData) => {
        if (!currentData) return currentData;

        return {
          ...currentData,
          pages: currentData.pages.map((page, index) => {
            if (index !== 0) return page;

            return {
              ...page,
              totalCount: page.totalCount + 1,
              items: [
                {
                  id: optimisticTaskId,
                  titulo: input.titulo,
                  descricao: input.descricao,
                  dataCriacao: new Date(),
                  prazo: input.prazo,
                  status: "pendente",
                },
                ...page.items,
              ],
            };
          }),
        };
      });

      return { previousData, optimisticTaskId };
    },
    onSuccess: (createdTask, _variables, context) => {
      if (context?.optimisticTaskId) {
        utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, (currentData) => {
          if (!currentData) return currentData;

          return {
            ...currentData,
            pages: currentData.pages.map((page) => ({
              ...page,
              items: page.items.map((task) =>
                task.id === context.optimisticTaskId ? createdTask : task,
              ),
            })),
          };
        });
      }

      setFeedback({
        type: "success",
        message: "Tarefa criada com sucesso.",
      });
    },
    // Erros de criacao sao tratados dentro do modal de formulario, para que
    // o usuario veja a mensagem inline e o modal permaneca aberto.
    onError: (_mutationError, _variables, context) => {
      if (context?.previousData) {
        utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, () => context.previousData);
      }
    },
  });

  const { mutateAsync: updateTask } = api.task.update.useMutation({
    onMutate: async (input) => {
      setFeedback(null);

      await utils.task.list.cancel({ limit: TASKS_PAGE_SIZE });

      const previousData = utils.task.list.getInfiniteData({
        limit: TASKS_PAGE_SIZE,
      });

      utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, (currentData) => {
        if (!currentData) return currentData;

        return {
          ...currentData,
          pages: currentData.pages.map((page) => ({
            ...page,
            items: page.items.map((task) => {
              if (task.id !== input.id) return task;

              return {
                ...task,
                titulo: input.titulo,
                descricao: input.descricao,
                prazo: input.prazo,
                status: input.status ?? task.status,
              };
            }),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: (_updatedTask, variables) => {
      const isFinishingTask = variables.status === "concluida";
      setFeedback({
        type: "success",
        message: isFinishingTask
          ? "Tarefa concluida com sucesso."
          : "Tarefa atualizada com sucesso.",
      });
    },
    // Erros de update sao tratados pelo caller: o modal de edicao exibe
    onError: (_mutationError, _variables, context) => {
      if (context?.previousData) {
        utils.task.list.setInfiniteData({ limit: TASKS_PAGE_SIZE }, () => context.previousData);
      }
    },
  });

  const triggerDeleteWithFade = (taskId: string) => {
    if (deleteTimeoutsRef.current.has(taskId)) return;

    setDeletingTaskIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(taskId);
      return nextIds;
    });

    const timeoutId = setTimeout(() => {
      deleteTimeoutsRef.current.delete(taskId);
      deleteTask(
        { id: taskId },
        {
          onSettled: (_data, _error, variables) => {
            setDeletingTaskIds((currentIds) => {
              const nextIds = new Set(currentIds);
              nextIds.delete(variables.id);
              return nextIds;
            });
          },
        },
      );
    }, TASK_DELETE_FADE_MS);

    deleteTimeoutsRef.current.set(taskId, timeoutId);
  };

  const runTaskUpdate = async (
    taskId: string,
    payload: {
      titulo: string;
      descricao?: string;
      prazo?: Date;
      status?: "pendente" | "concluida";
    },
  ) => {
    setUpdatingTaskIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(taskId);
      return nextIds;
    });

    try {
      await updateTask({
        id: taskId,
        ...payload,
      });
    } finally {
      setUpdatingTaskIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(taskId);
        return nextIds;
      });
    }
  };

  const handleTaskComplete = (task: (typeof tasks)[number]) => {
    void (async () => {
      try {
        await runTaskUpdate(task.id, {
          titulo: task.titulo,
          descricao: task.descricao,
          prazo: task.prazo,
          status: "concluida",
        });
      } catch (error) {
        setFeedback({
          type: "error",
          message: getErrorMessage(error),
        });
      }
    })();
  };

  const handleTaskEdit = (input: TaskEditInput) => {
    return runTaskUpdate(input.id, {
      titulo: input.titulo,
      descricao: input.descricao,
      prazo: input.prazo,
    });
  };

  const handleTaskCreate = async (input: TaskFormInput) => {
    await createTask({
      titulo: input.titulo,
      descricao: input.descricao,
      prazo: input.prazo,
    });
  };

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage) return;
        void fetchNextPage();
      },
      { rootMargin: TASKS_PREFETCH_ROOT_MARGIN, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, tasks.length]);

  useEffect(() => {
    if (!feedback) return;

    const feedbackTimeoutId = setTimeout(() => {
      setFeedback(null);
    }, TASK_FEEDBACK_DURATION_MS);

    return () => clearTimeout(feedbackTimeoutId);
  }, [feedback]);

  useEffect(() => {
    const timeoutsAtMount = deleteTimeoutsRef.current;
    return () => {
      timeoutsAtMount.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsAtMount.clear();
    };
  }, []);

  return (
    <main className="tm-page" style={styles.pageContainer}>
      <div style={styles.header}>
        <h1 style={styles.title}>Task Manager</h1>
        <p style={styles.subtitle}>Gerencie tarefas, acompanhe prazos e evolua.</p>
      </div>

      {feedback ? (
        <p style={feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError}>
          {feedback.message}
        </p>
      ) : null}

      {isPending ? <p>Carregando tarefas...</p> : null}
      {error ? <p>Erro ao carregar tarefas: {error.message}</p> : null}

      {!isPending && !error && tasks.length === 0 ? <p>Nenhuma tarefa cadastrada.</p> : null}
      <div style={styles.taskListContainer}>
        <div className="tm-list-header" style={styles.taskListHeader}>
          <h2 style={styles.taskListTitle}>Suas Tarefas ( mostrando {tasks.length} de {totalTasks})</h2>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isCreatingTask}
            className="tm-button"
            style={{
              ...styles.createTaskButton,
              ...(isCreatingTask ? styles.createTaskButtonDisabled : {}),
            }}
          >
            Nova tarefa
          </button>
        </div>
        {tasks.length > 0 ? (
          <ul style={styles.taskList}>
            {tasks.map((task) => {
              const isDeleting = deletingTaskIds.has(task.id);
              const isUpdating = updatingTaskIds.has(task.id);
              return (
                <li key={task.id} style={styles.taskListItem}>
                  <TaskCard
                    task={task}
                    isDeleting={isDeleting}
                    isUpdating={isUpdating}
                    onDelete={triggerDeleteWithFade}
                    onComplete={handleTaskComplete}
                    onEdit={handleTaskEdit}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <TaskCreateModal
        isOpen={isCreateModalOpen}
        isCreating={isCreatingTask}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleTaskCreate}
      />
      

      <div ref={loadMoreRef} style={styles.loadMoreSentinel} aria-hidden />
     
    </main>
  );
}

const StyleSheet = {
  create<T extends Record<string, CSSProperties>>(value: T): T {
    return value;
  },
};

const styles = StyleSheet.create({
  pageContainer: {
    padding: "4rem 3rem",
    backgroundColor: "#0F121E",
  },
  header: {
    marginBottom: "2rem",
    paddingLeft: 24,
    borderRadius: 16,
    border: "1px solid #30374F",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "0.5rem",
    color: "#F0F3FF",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "1.5rem",
    color: "#8590B2",
  },
  feedbackSuccess: {
    marginBottom: "1rem",
    padding: "0.75rem 1rem",
    borderRadius: 16,
    backgroundColor: "#ecfdf5",
    color: "#065f46",
  },
  feedbackError: {
    marginBottom: "1rem",
    padding: "0.75rem 1rem",
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    color: "#991b1b",
  },
  taskListContainer: {
    border: "1px solid #30374F",
    borderRadius: 10,
    paddingLeft: 24,
    paddingRight: 24,
  },
  taskListTitle: {
    color: "#F0F3FF",
    fontSize: "1.45rem",
    fontWeight: 600,
  },
  taskListHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },
  createTaskButton: {
    cursor: "pointer",
    borderRadius: 8,
    border: "1px solid #3B4A77",
    backgroundColor: "#24396D",
    color: "#DBE7FF",
    padding: "0.5rem 0.95rem",
    fontWeight: 600,
  },
  createTaskButtonDisabled: {
    cursor: "not-allowed",
    opacity: 0.75,
  },
  taskList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    rowGap: "0.75rem",
  },
  taskListItem: {
    margin: 0,
  },
  loadMoreSentinel: {
    height: 1,
  },
  loadMoreButton: {
    marginTop: "0.5rem",
  },
});
