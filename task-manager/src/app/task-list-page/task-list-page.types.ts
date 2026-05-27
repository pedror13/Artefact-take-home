import type { RouterOutputs } from "~/trpc/react";

export type TaskListResponse = RouterOutputs["task"]["list"];
export type TaskListItem = TaskListResponse["items"][number];

export type FeedbackMessage = {
  type: "success" | "error";
  message: string;
};

export type FeedbackState = FeedbackMessage | null;
