import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  createTaskInputSchema,
  deleteTaskInputSchema,
  listTasksInputSchema,
  listTasksOutputSchema,
  updateTaskInputSchema,
} from "~/server/api/domains/task/task.schema";
import type {
  Task,
  TaskListResult,
  TaskStore,
} from "~/server/api/domains/task/task.types";

declare global {
  var __taskStore: TaskStore | undefined;
}

/*
 Usado a nivel de desenvolvimento para simular o carregamento de tarefas.
*/
const createMockTasks = (total: number): Task[] => {
  const now = Date.now();

  return Array.from({ length: total }, (_, index) => {
    const createdAt = new Date(now - index * 60_000);
    const hasDescription = index % 2 === 0;
    const hasDeadline = index % 3 === 0;

    return {
      id: crypto.randomUUID(),
      titulo: `Tarefa mock ${index + 1}`,
      descricao: hasDescription
        ? `Descricao da tarefa mock ${index + 1} para testes de scroll.`
        : undefined,
      dataCriacao: createdAt,
      prazo: hasDeadline ? new Date(createdAt.getTime() + 86_400_000) : undefined,
      status: index % 4 === 0 ? "concluida" : "pendente",
    };
  });
};

const taskStore =
  globalThis.__taskStore ??
  {
    tasks: [],
  } satisfies TaskStore;

globalThis.__taskStore ??= taskStore;

if (globalThis.__taskStore.tasks.length === 0) {
  // Seed temporario para validar SSR + carregamento incremental.
  globalThis.__taskStore.tasks = createMockTasks(100);
}

const sortTasksByNewest = (tasks: Task[]) => {
  return [...tasks].sort((a, b) => {
    const dateDifference = b.dataCriacao.getTime() - a.dataCriacao.getTime();
    if (dateDifference !== 0) return dateDifference;
    return b.id.localeCompare(a.id);
  });
};

const createCursorFromTask = (task: Task) => {
  return `${task.dataCriacao.toISOString()}::${task.id}`;
};

const parseCursor = (cursor: string) => {
  const [cursorDate, cursorId] = cursor.split("::");

  if (!cursorDate || !cursorId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "cursor invalido",
    });
  }

  const parsedDate = new Date(cursorDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "cursor invalido",
    });
  }

  return {
    dataCriacao: parsedDate,
    id: cursorId,
  };
};

const isTaskAfterCursor = (
  task: Task,
  cursorData: { dataCriacao: Date; id: string },
) => {
  const taskTime = task.dataCriacao.getTime();
  const cursorTime = cursorData.dataCriacao.getTime();

  if (taskTime < cursorTime) return true;
  if (taskTime > cursorTime) return false;
  return task.id.localeCompare(cursorData.id) < 0;
};

export const taskRouter = createTRPCRouter({
  create: publicProcedure.input(createTaskInputSchema).mutation(({ input }) => {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: input.titulo,
      descricao: input.descricao,
      dataCriacao: new Date(),
      prazo: input.prazo,
      status: "pendente",
    };

    taskStore.tasks.push(task);

    return task;
  }),

  list: publicProcedure
    .input(listTasksInputSchema)
    .output(listTasksOutputSchema)
    .query(({ input }): TaskListResult => {
      const sortedTasks = sortTasksByNewest(taskStore.tasks);
      const parsedCursor = input.cursor ? parseCursor(input.cursor) : null;
      const tasksAfterCursor = parsedCursor
        ? sortedTasks.filter((task) => isTaskAfterCursor(task, parsedCursor))
        : sortedTasks;

      const items = tasksAfterCursor.slice(0, input.limit);
      const hasMore = tasksAfterCursor.length > input.limit;
      const nextCursor = hasMore ? createCursorFromTask(items[items.length - 1]!) : null;

      return {
        items,
        nextCursor,
        totalCount: taskStore.tasks.length,
      };
    }),

  update: publicProcedure.input(updateTaskInputSchema).mutation(({ input }) => {
    const taskIndex = taskStore.tasks.findIndex((task) => task.id === input.id);

    if (taskIndex === -1) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "tarefa nao encontrada",
      });
    }

    const currentTask = taskStore.tasks[taskIndex];

    if (!currentTask) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "erro ao localizar a tarefa para atualizacao",
      });
    }

    const updatedTask: Task = {
      ...currentTask,
      titulo: input.titulo ?? currentTask.titulo,
      descricao: input.descricao ?? currentTask.descricao,
      prazo: input.prazo ?? currentTask.prazo,
      status: input.status ?? currentTask.status,
    };

    taskStore.tasks[taskIndex] = updatedTask;

    return updatedTask;
  }),

  delete: publicProcedure.input(deleteTaskInputSchema).mutation(({ input }) => {
    const taskIndex = taskStore.tasks.findIndex((task) => task.id === input.id);

    if (taskIndex === -1) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "tarefa nao encontrada",
      });
    }

    const [deletedTask] = taskStore.tasks.splice(taskIndex, 1);

    if (!deletedTask) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "erro ao remover tarefa",
      });
    }

    return deletedTask;
  }),
});
