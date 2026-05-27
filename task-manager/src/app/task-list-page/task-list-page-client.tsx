"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { api } from "~/trpc/react";

import { TaskCard } from "./task-card";
import {
  TASKS_PAGE_SIZE,
  TASKS_PREFETCH_ROOT_MARGIN,
} from "./task-list-page.config";
import type { FeedbackState } from "./task-list-page.types";

export function TaskListPageClient() {
  const utils = api.useUtils();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  const { mutate: deleteTask } = api.task.delete.useMutation({
    onMutate: async ({ id }) => {
      setFeedback(null);
      setDeletingTaskId(id);

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
    onSettled: () => {
      setDeletingTaskId(null);
    },
  });

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

  return (
    <main style={styles.pageContainer}>
      <h1 style={styles.title}>Task Manager</h1>
      <p style={styles.subtitle}>Lista de tarefas com SSR e carregamento incremental.</p>

      {feedback ? (
        <p style={feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError}>
          {feedback.message}
        </p>
      ) : null}

      {isPending ? <p>Carregando tarefas...</p> : null}
      {error ? <p>Erro ao carregar tarefas: {error.message}</p> : null}

      {!isPending && !error && tasks.length === 0 ? <p>Nenhuma tarefa cadastrada.</p> : null}

      {tasks.length > 0 ? (
        <ul style={styles.taskList}>
          {tasks.map((task) => {
            const isDeleting = deletingTaskId === task.id;
            return (
              <li key={task.id} style={styles.taskListItem}>
                <TaskCard
                  task={task}
                  isDeleting={isDeleting}
                  onDelete={(taskId) => deleteTask({ id: taskId })}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

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
    maxWidth: 720,
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  title: {
    marginBottom: "0.5rem",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "1.5rem",
    color: "#4b5563",
  },
  feedbackSuccess: {
    marginBottom: "1rem",
    padding: "0.75rem 1rem",
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    color: "#065f46",
  },
  feedbackError: {
    marginBottom: "1rem",
    padding: "0.75rem 1rem",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    color: "#991b1b",
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
