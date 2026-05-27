import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  createTaskInputSchema,
  deleteTaskInputSchema,
  updateTaskInputSchema,
} from "~/server/api/domains/task/task.schema";
import type { Task, TaskStore } from "~/server/api/domains/task/task.types";

declare global {
  var __taskStore: TaskStore | undefined;
}

const taskStore =
  globalThis.__taskStore ??
  {
    tasks: [],
  } satisfies TaskStore;

globalThis.__taskStore ??= taskStore;

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

  list: publicProcedure.query(() => {
    return taskStore.tasks;
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
