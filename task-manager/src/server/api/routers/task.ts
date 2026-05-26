import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const taskRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return [];
  }),
});
