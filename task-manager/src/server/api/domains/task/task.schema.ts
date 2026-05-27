import { z } from "zod";

export const taskStatusSchema = z.enum(["pendente", "concluida"]);

export const taskSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().optional(),
  dataCriacao: z.date(),
  prazo: z.date().optional(),
  status: taskStatusSchema,
});

export const createTaskInputSchema = z.object({
  titulo: z.string().trim().min(1, "titulo e obrigatorio"),
  descricao: z.string().trim().optional(),
  prazo: z.coerce.date().optional(),
});

export const updateTaskInputSchema = z.object({
  id: z.string().min(1, "id e obrigatorio"),
  titulo: z.string().trim().min(1, "titulo e obrigatorio"),
  descricao: z.string().trim().optional(),
  prazo: z.coerce.date().optional(),
  status: taskStatusSchema.optional(),
});

export const deleteTaskInputSchema = z.object({
  id: z.string().min(1, "id e obrigatorio"),
});

export const listTasksInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  cursor: z.string().optional(),
});

export const listTasksOutputSchema = z.object({
  items: z.array(taskSchema),
  nextCursor: z.string().nullable(),
  totalCount: z.number().int(),
});
