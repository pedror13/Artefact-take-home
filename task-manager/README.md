# Task Manager

Task manager built with Next.js and tRPC.

## Stack

- [Next.js](https://nextjs.org)
- [tRPC](https://trpc.io)

## Scripts

- `npm run dev`: start the development server with an empty in-memory store.
- `npm run dev:mock`: same as `dev`, but seeds the in-memory store with 100
  mock tasks on boot. Use this to exercise SSR + infinite scroll without
  creating tasks manually.
- `npm run typecheck`: run TypeScript checks.
- `npm run lint`: run lint checks.

## In-memory store

Tasks live in a process-level in-memory store (`globalThis.__taskStore`). All
data is lost when the dev server restarts. This is intentional: the challenge
spec explicitly asks for an in-memory backend.

To seed mock data without changing the script, set `SEED_MOCK_TASKS=true` in
`.env` before running `npm run dev`.
