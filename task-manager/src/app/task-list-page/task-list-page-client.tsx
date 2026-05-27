"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { api } from "~/trpc/react";

import { TaskCard } from "./task-card";
import {
  TASK_DELETE_FADE_MS,
  TASK_FEEDBACK_DURATION_MS,
  TASKS_PAGE_SIZE,
  TASKS_PREFETCH_ROOT_MARGIN,
} from "./task-list-page.config";
import type { FeedbackState } from "./task-list-page.types";

export function TaskListPageClient() {
  const utils = api.useUtils();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [deletingTaskIds, setDeletingTaskIds] = useState<Set<string>>(new Set());
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
        message: mutationError.message,
      });
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
    return () => {
      deleteTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      deleteTimeoutsRef.current.clear();
    };
  }, []);

  return (
    <main style={styles.pageContainer}>
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
        <h2 style={styles.taskListTitle}>Suas Tarefas ( mostrando {tasks.length} de {totalTasks})</h2>
        {tasks.length > 0 ? (
          <ul style={styles.taskList}>
            {tasks.map((task) => {
              const isDeleting = deletingTaskIds.has(task.id);
              return (
                <li key={task.id} style={styles.taskListItem}>
                  <TaskCard
                    task={task}
                    isDeleting={isDeleting}
                    onDelete={triggerDeleteWithFade}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      

      <div ref={loadMoreRef} style={styles.loadMoreSentinel} aria-hidden />

      {isFetchingNextPage ? <p>Carregando mais tarefas...</p> : null}

      {hasNextPage ? (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={styles.loadMoreButton}
        >
          {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
        </button>
      ) : null}
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
    paddingHorizontal: 18,
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
