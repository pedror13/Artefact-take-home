import { api, HydrateClient } from "~/trpc/server";
import { TASKS_PAGE_SIZE } from "./task-list-page/task-list-page.config";
import { TaskListPageClient } from "./task-list-page/task-list-page-client";

export default async function Home() {
  await api.task.list.prefetch({ limit: TASKS_PAGE_SIZE });

  return (
    <HydrateClient>
      <TaskListPageClient />
    </HydrateClient>
  );
}
