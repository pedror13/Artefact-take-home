import type { RouterOutputs } from "~/trpc/react";

export type TaskListResponse = RouterOutputs["task"]["list"];
export type TaskListItem = TaskListResponse["items"][number];

export type FeedbackMessage = {
  type: "success" | "error";
  message: string;
};

export type FeedbackState = FeedbackMessage | null;

export type TaskEditInput = {
  id: string;
  titulo: string;
  descricao?: string;
  prazo?: Date;
};

export type TaskFormInput = {
  titulo: string;
  descricao?: string;
  prazo?: Date;
};
